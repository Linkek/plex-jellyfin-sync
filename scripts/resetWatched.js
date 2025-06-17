const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

const { jellyfinBase, jellyfinApiKey, userMappings, debug } = config

const jellyfinHeaders = {
    'X-Emby-Token': jellyfinApiKey
};

const logFile = 'reset-log.txt';
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(msg);
    logStream.write(line + '\n');
};

const resetWatched = async () => {
    for (const { jellyfinUsername } of userMappings) {
        try {
            log(`🔍 Fetching watched items for ${jellyfinUsername}...`);
            const users = await axios.get(`${jellyfinBase}/Users`, { headers: jellyfinHeaders });
            const user = users.data.find(u => u.Name === jellyfinUsername);

            if (!user) {
                log(`❌ User ${jellyfinUsername} not found`);
                continue;
            }

            const watchedItems = await axios.get(`${jellyfinBase}/Users/${user.Id}/Items`, {
                headers: jellyfinHeaders,
                params: { IsPlayed: true, Recursive: true }
            });

            const items = watchedItems.data.Items || [];
            log(`🧹 Found ${items.length} watched items`);

            for (const item of items) {
                const name = item.Name || 'Unnamed';
                const type = item.Type || 'Unknown';
                const id = item.Id || 'NoID';
                const wasPlayed = item.UserData?.Played === true;

                if (debug) {
                    log(`➡️ ID: ${id} | Name: "${name}" | Type: ${type} | Played: ${wasPlayed}`);
                    
                    if (!['Episode', 'Movie', 'MusicVideo'].includes(type) || !wasPlayed) {
                        log(`⏭️ Skipped (type not supported or not actually marked played)`);
                        continue;
                    }
                }

                try {
                    await axios.delete(`${jellyfinBase}/Users/${user.Id}/PlayedItems/${item.Id}`, {
                        headers: jellyfinHeaders
                    })
                    logStream.write(`✔️ Unmarked as watched: ${item.Name} (${item.Id})\n`)
                } catch (err) {
                    const msg = err.response?.data || err.message
                    const code = err.response?.status || 'Unknown'
                    logStream.write(`🔥 Error on ${item.Name} (${item.Id}) [${code}]: ${msg}\n`)
                }
            }

        } catch (err) {
            log(`🔥 GENERAL ERROR for ${jellyfinUsername}: ${err.message}`);
        }
    }

    log(`✅ Done. Full log saved to ${logFile}`);
    logStream.end();
};

resetWatched();
