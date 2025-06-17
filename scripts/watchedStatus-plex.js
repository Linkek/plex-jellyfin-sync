const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

const { plexBase, userMappings } = config;

const getWatchedCounts = async (plexToken) => {
  const headers = { 'X-Plex-Token': plexToken };
  const counts = [];

  const { data: sections } = await axios.get(`${plexBase}/library/sections`, { headers });
  const directories = sections.MediaContainer.Directory;

  for (const dir of directories) {
    const sectionTitle = dir.title;
    const sectionKey = dir.key;
    const sectionType = dir.type;

    const { data } = await axios.get(`${plexBase}/library/sections/${sectionKey}/all`, { headers });
    const items = data.MediaContainer.Metadata || [];

    if (sectionType === 'show') {
      let totalEpisodes = 0;
      let watchedEpisodes = 0;
      let previewEpisodes = [];

      for (const show of items) {
        const { data: episodesData } = await axios.get(`${plexBase}/library/metadata/${show.ratingKey}/allLeaves`, { headers });
        const episodes = episodesData.MediaContainer.Metadata || [];
        totalEpisodes += episodes.length;
        const watched = episodes.filter(e => e.viewCount > 0);
        watchedEpisodes += watched.length;

        for (const ep of watched.slice(0, 5 - previewEpisodes.length)) {
          previewEpisodes.push(`📺 ${ep.grandparentTitle} - ${ep.title}`);
          if (previewEpisodes.length >= 5) break;
        }
      }

      counts.push({
        section: sectionTitle,
        type: 'show',
        shows: items.length,
        watchedShows: items.filter(i => i.viewCount > 0).length,
        totalEpisodes,
        watchedEpisodes,
        previewEpisodes
      });

    } else {
      const watched = items.filter(i => i.viewCount > 0);
      counts.push({
        section: sectionTitle,
        type: 'movie',
        total: items.length,
        watched: watched.length,
        previews: watched.slice(0, 5).map(i => `🎬 ${i.title} (${i.year || 'n/a'})`)
      });
    }
  }

  return counts;
};

const run = async () => {
  for (const user of userMappings) {
    console.log(`\n📊 Watched stats for Plex user "${user.jellyfinUsername}":`);

    try {
      const results = await getWatchedCounts(user.plexToken);

      for (const result of results) {
        if (result.type === 'show') {
          console.log(`📺 ${result.section}:`);
          console.log(`   - Watched shows: ${result.watchedShows}/${result.shows}`);
          console.log(`   - Watched episodes: ${result.watchedEpisodes}/${result.totalEpisodes}`);
          if (result.previewEpisodes.length) {
            console.log(`   - Sample watched episodes:`);
            result.previewEpisodes.forEach(p => console.log(`     ${p}`));
          }
        } else {
          console.log(`🎥 ${result.section}: ${result.watched} watched out of ${result.total}`);
          if (result.previews.length) {
            console.log(`   - Sample watched movies:`);
            result.previews.forEach(p => console.log(`     ${p}`));
          }
        }
      }

    } catch (err) {
      console.error(`❌ Error fetching data:`, err.message);
    }
  }
};

run();
