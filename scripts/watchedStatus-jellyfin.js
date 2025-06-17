const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
const { jellyfinBase, jellyfinApiKey, userMappings } = config;

const checkWatchedStatus = async () => {
  const headers = { 'X-Emby-Token': jellyfinApiKey };
  const username = userMappings[0].jellyfinUsername;

  const users = await axios.get(`${jellyfinBase}/Users`, { headers });
  const user = users.data.find(u => u.Name === username);
  if (!user) return console.error("User not found");

  const res = await axios.get(`${jellyfinBase}/Users/${user.Id}/Items`, {
    headers,
    params: { IsPlayed: true, Recursive: true }
  });

  const items = res.data.Items || [];

  const counts = {
    Movie: 0,
    Episode: 0,
    Audio: 0,
    Other: 0,
  };

  const previews = {
    Movie: [],
    Episode: [],
    Audio: [],
    Other: [],
  };

  for (const item of items) {
    const type = item.Type;
    const entry = `🎬 ${item.Name} (${item.ProductionYear || 'n/a'})`;

    if (counts.hasOwnProperty(type)) {
      counts[type]++;
      if (previews[type].length < 5) previews[type].push(entry);
    } else {
      counts.Other++;
      if (previews.Other.length < 5) previews.Other.push(entry);
    }
  }

  console.log(`\n📊 Watched stats for user "${username}":`);
  console.log(`🎥 Movies: ${counts.Movie}`);
  console.log(`📺 Episodes: ${counts.Episode}`);
  console.log(`🎵 Audio: ${counts.Audio}`);
  console.log(`📁 Other: ${counts.Other}`);

  for (const type of Object.keys(previews)) {
    if (previews[type].length) {
      console.log(`\n🔍 Sample ${type}s:`);
      for (const line of previews[type]) console.log(`  ${line}`);
    }
  }
};

checkWatchedStatus();
