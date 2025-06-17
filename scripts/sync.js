const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

const { plexBase, jellyfinBase, jellyfinApiKey, userMappings } = config;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const askToContinue = async (message) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(`${message} (y/n): `, a => {
    rl.close();
    resolve(a.trim().toLowerCase() === 'y');
  }));
};

const getWatchedFromPlex = async (plexToken) => {
  const headers = { 'X-Plex-Token': plexToken };
  const watchedItems = [];

  const sections = (await axios.get(`${plexBase}/library/sections`, { headers }))
    .data.MediaContainer.Directory;

  for (const section of sections) {
    const items = (await axios.get(`${plexBase}/library/sections/${section.key}/all`, { headers }))
      .data.MediaContainer.Metadata || [];

    for (const item of items) {
      if (item.viewCount > 0 && item.type === 'movie') {
        const fullMeta = await axios.get(`${plexBase}/library/metadata/${item.ratingKey}`, { headers });
        const guid = fullMeta.data.MediaContainer.Metadata[0]?.Guid?.find(g => g.id?.startsWith('imdb://'));
        if (guid) {
          watchedItems.push({
            title: item.title,
            imdbId: guid.id.replace('imdb://', ''),
            type: 'movie'
          });
        }
      }

      if (item.type === 'show') {
        const showKey = item.ratingKey;
        const episodes = (await axios.get(`${plexBase}/library/metadata/${showKey}/allLeaves`, { headers }))
          .data.MediaContainer.Metadata || [];

        for (const ep of episodes) {
          if (ep.viewCount > 0) {
            const fullEpMeta = await axios.get(`${plexBase}/library/metadata/${ep.ratingKey}`, { headers });
            const epGuid = fullEpMeta.data.MediaContainer.Metadata[0]?.Guid?.find(g => g.id?.startsWith('imdb://'));
            if (epGuid) {
              watchedItems.push({
                title: ep.title,
                imdbId: epGuid.id.replace('imdb://', ''),
                type: 'episode'
              });
            }
          }
        }
      }
    }
  }

  return watchedItems;
};

const getJellyfinUserId = async (username) => {
  const res = await axios.get(`${jellyfinBase}/Users`, {
    headers: { 'X-Emby-Token': jellyfinApiKey }
  });
  return res.data.find(u => u.Name === username)?.Id;
};

const getJellyfinImdbIndex = async () => {
  const headers = { 'X-Emby-Token': jellyfinApiKey };
  const res = await axios.get(`${jellyfinBase}/Items`, {
    headers,
    params: {
      Recursive: true,
      IncludeItemTypes: 'Movie,Episode',
      Fields: 'ProviderIds'
    }
  });

  const map = {};
  for (const item of res.data.Items || []) {
    const imdbId = item.ProviderIds?.Imdb;
    if (imdbId && item.Id) {
      map[imdbId] = item.Id;
    }
  }
  return map;
};

const markWatchedInJellyfin = async (userId, imdbToItemIdMap, items) => {
  const headers = { 'X-Emby-Token': jellyfinApiKey };

  for (const item of items) {
    const itemId = imdbToItemIdMap[item.imdbId];
    if (!itemId) {
      console.warn(`❓ No valid match found for "${item.title}" (${item.imdbId})`);
      continue;
    }

    try {
      const meta = await axios.get(`${jellyfinBase}/Users/${userId}/Items/${itemId}`, { headers });
      const alreadyWatched = meta.data?.UserData?.Played;

      if (!alreadyWatched) {
        await axios.post(`${jellyfinBase}/Users/${userId}/PlayedItems/${itemId}`, {}, { headers });
        console.log(`✅ Marked: ${item.title} (${item.imdbId})`);
        await delay(25);
      } else {
        console.warn(`⚠️ Already watched: ${item.title}`);
      }
    } catch (err) {
      console.error(`🔥 Error marking "${item.title}": ${err.message}`);
    }
  }
};

const run = async () => {
  for (const user of userMappings) {
    console.log(`\n🔄 Syncing user: ${user.jellyfinUsername}`);
    const jellyfinUserId = await getJellyfinUserId(user.jellyfinUsername);
    if (!jellyfinUserId) {
      console.warn(`⚠️ Jellyfin user not found`);
      continue;
    }

    const plexWatched = await getWatchedFromPlex(user.plexToken);
    const imdbMap = await getJellyfinImdbIndex();

    const toSync = plexWatched.filter(p => p.imdbId && imdbMap[p.imdbId] !== undefined);

    console.log(`📊 Plex watched items (with IMDb): ${plexWatched.length}`);
    console.log(`🧠 Jellyfin items indexed: ${Object.keys(imdbMap).length}`);
    console.log(`📥 Items to sync: ${toSync.length}`);
    const sample = toSync.slice(0, 5).map(i => `  - ${i.title} (${i.imdbId})`).join('\n');
    console.log(`🔍 Sample to sync:\n${sample || '  (none)'}`);
    fs.writeFileSync('sync-preview.log', toSync.map(i => `${i.title} (${i.imdbId})`).join('\n'));
    console.log('📝 Preview log saved to sync-preview.log');

    const confirmed = await askToContinue('Proceed with syncing these items into Jellyfin?');
    if (!confirmed) {
      console.log('❌ Aborted');
      continue;
    }

    await markWatchedInJellyfin(jellyfinUserId, imdbMap, toSync);
  }
};

run();
