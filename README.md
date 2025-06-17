# 🎬 Plex → Jellyfin Watched Sync Tool

A command-line tool for syncing your **watched history** from **Plex to Jellyfin** using IMDb IDs for accurate matching.  
Great for migrating from Plex or keeping Jellyfin in sync with your real watch progress.

---

## ✨ Features

- ✅ Sync watched movies and episodes from Plex to Jellyfin  
- ✅ Uses IMDb ID for reliable item matching  
- ✅ Interactive command-line interface  
- ✅ Works on Windows, macOS, and Linux  
- ✅ Includes reset and stats features  

---

## 🚀 Quick Start

### 1. Clone the repo and install dependencies:

```bash
git clone https://github.com/linkek/plex-jellyfin-sync
cd plex-jellyfin-sync
npm install
```

### 2. Create your config file:

```bash
cp config.json.example config.json
```

Then edit `config.json` to match your setup.

---

## ⚙️ Configuration

Your `config.json` should look like this:

```json
{
  "plexBase": "http://localhost:32400",
  "jellyfinBase": "http://localhost:8096",
  "jellyfinApiKey": "123456789abcdef1234567890abcdef",
  "debug": false,
  "userMappings": [
    {
      "plexToken": "plexToken1234567890abcdef",
      "jellyfinUsername": "username1"
    }
  ]
}
```

You can add more users by extending the `userMappings` array.

---

## 🔑 How to Get Tokens

### Plex Token

1. Go to [https://app.plex.tv](https://app.plex.tv)  
2. Open DevTools (F12), go to the **Network** tab  
3. Find any request and look for `X-Plex-Token` in the URL  
4. Copy the token and paste it in `config.json`  

📖 [Plex Support Guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)

---

### Jellyfin API Key

1. Open Jellyfin web UI  
2. Go to **Dashboard → API Keys**  
3. Create a new API key for this tool  

---

## 📦 Scripts

Run the interactive menu:

```bash
npm start
```

Available options:

```plaintext
1. Sync watched data from Plex → Jellyfin (one-way)
2. Reset all watched data in Jellyfin for configured users
3. Show watched stats in Plex
4. Show watched stats in Jellyfin
5. Exit
```

---

## 🧠 Notes

- This tool **only syncs from Plex to Jellyfin** (not the other way).  
- Only Plex items that have **IMDb IDs** will be synced.  
- Jellyfin items must also have correct IMDb metadata for matching.  
- Resetting will **delete watch history in Jellyfin** — use with caution.  
- Works with multiple users if configured.  

---

## 🧰 Requirements

- [Node.js](https://nodejs.org/en/download/) (v18 or higher recommended)  
- Access to both a Plex server and a Jellyfin server  
- IMDb metadata available in both libraries  

---

## 🧪 Debug Mode

Set `"debug": true` in your `config.json` to print detailed logs for troubleshooting.

---

Pull requests, suggestions, and improvements are welcome!
