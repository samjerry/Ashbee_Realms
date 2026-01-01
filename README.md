Twitch Adventure — prototype

What this is
- Minimal prototype connecting a Twitch chat bot with a small web frontend.
- Users can click a link from chat, log in with Twitch OAuth, and interact with a text adventure game.
- When significant events happen (boss encounters, legendary items), the backend triggers the bot to announce in Twitch chat.

Files of interest
- `bot.js` — tmi.js bot that responds to `!adventure` and sends announcements.
- `server.js` — Express server with Twitch OAuth flows, API endpoints, SQLite player state, and announcement cooldowns.
- `get-bot-token.js` — OAuth token generator script (uses official Authorization Code flow).
- `public/index.html` + `public/src/main.jsx` + `public/src/App.jsx` — React-based frontend.
- `.env.example` — environment variables template; copy to `.env` and fill in values.

Setup (Windows PowerShell)

**1. Generate your Twitch application credentials**

Visit https://dev.twitch.tv/console/apps and create a new application:
- Name: e.g., `DungeonCrawlerBackend`
- OAuth Redirect URLs: `http://localhost:3000/auth/twitch/callback`
- Copy the `Client ID` and `Client Secret` into your `.env`:
  ```
  TWITCH_CLIENT_ID=your_client_id_here
  TWITCH_CLIENT_SECRET=your_client_secret_here
  ```

**2. Generate a bot OAuth token**

First, install dependencies:
```powershell
npm install
```

Then run the token generator (make sure you're logged in as the bot account in your browser):
```powershell
npm run get-bot-token
```

This script will:
- Open a Twitch authorization page in your browser
- Listen for the redirect callback
- Exchange the code for an access token
- Validate the token (verify it has `chat:read` and `chat:edit` scopes)
- Auto-update your `.env` with the new `BOT_OAUTH_TOKEN`

**3. Ensure `BOT_USERNAME` and `CHANNEL` are set**

Check your `.env` file:
```
BOT_USERNAME=your_bot_account_name
CHANNEL=channel_to_post_in
```

**4. Run the server**

```powershell
npm start
```

Expected output:
```
Server running on 3000
Bot connected to irc-ws.chat.twitch.tv:443
```

**5. Test locally**

- Open `http://localhost:3000/adventure` in your browser.
- Click "Log in with Twitch" button to authorize with your Twitch account.
- Click "Fight the boss" — the backend will announce in chat via the bot.

How it works

- **Player login:** `/auth/twitch` redirects to Twitch, `/auth/twitch/callback` handles the response and stores the player in the SQLite database.
- **Game state:** Player state is persisted in `data.sqlite` for each player.
- **Announcements:** When a player triggers a "broadcast-worthy" event, the server checks cooldowns (5s global, 60s per-user) and calls `rawAnnounce()` to post in Twitch chat via the bot.
- **Stub login:** For testing without OAuth, visit `/auth/fake?name=TestPlayer`.

Environment variables

```dotenv
# Twitch application credentials (from https://dev.twitch.tv/console/apps)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret

# Bot account credentials
BOT_USERNAME=your_bot_account_name
BOT_OAUTH_TOKEN=oauth:your_token_here    # auto-populated by get-bot-token.js
CHANNEL=channel_name_to_post_in

# Session & server config
SESSION_SECRET=replace_this_with_a_secret_value
BASE_URL=http://localhost:3000
PORT=3000

# Optional: announcement cooldowns (milliseconds)
GLOBAL_COOLDOWN_MS=5000   # 5s min between any announcements
USER_COOLDOWN_MS=60000    # 60s min between same user announcements
```

Security notes

- Never commit `.env` to git; add it to `.gitignore`.
- Keep `TWITCH_CLIENT_SECRET` and `BOT_OAUTH_TOKEN` private.
- The `get-bot-token.js` script uses the official OAuth Authorization Code flow; tokens are only generated client-side.
- Always validate user input and check session before processing game events.

Troubleshooting

- **"Login authentication failed"** — The bot token is invalid, expired, or belongs to a different account. Run `npm run get-bot-token` again.
- **Announcements not posting** — Check that the bot is connected (look for `Bot connected` in logs) and that `CHANNEL` is correct (case-insensitive but must be a valid Twitch channel).
- **OAuth callback fails** — Ensure your registered redirect URI in the Twitch Developer Console exactly matches `BASE_URL/auth/twitch/callback`.

Next steps

- Add more game logic and event types.
- Implement persistent quest/achievement tracking.
- Add user commands like `!mystats`, `!leaderboard`.
- Expand the text adventure narrative.

## Adding Map Images

The world map system supports custom tile images that display on the grid map. Adding images is simple and requires no code changes.

### Image Requirements
- **Format:** PNG with transparency support
- **Size:** 128x128 pixels (recommended for best quality)
- **Naming:** Use the exact biome ID from `data/biomes.json` (e.g., `whispering_woods.png`, `town_square.png`)

### How to Add Images

1. Create or find a 128x128px PNG image for your biome
2. Name it exactly as the biome ID (found in `data/biomes.json`)
   - Example: For "Whispering Woods" biome with id `whispering_woods`, name the file `whispering_woods.png`
3. Place it in the `/public/maps/tiles/` directory
4. Refresh the map page - the image will automatically appear!

### Automatic Fallback System

The grid map automatically falls back to text abbreviations if:
- No image file exists for a biome
- The image fails to load
- The image path is incorrect

This means you can:
- Add images gradually (some biomes with images, others with text)
- Test the system without needing all images ready
- Mix and match based on your preferences

### Example Biome IDs

Common biome IDs from the game:
- `town_square` - Town Square (starting location)
- `whispering_woods` - Whispering Woods
- `twilight_wetlands` - Twilight Wetlands
- `highland_reaches` - Highland Reaches
- `ashen_barrens` - Ashen Barrens
- `goblin_tunnels` - Goblin Tunnels
- `deep_caverns` - Deep Caverns
- `ancient_crypts` - Ancient Crypts
- `cursed_swamp` - Cursed Swamp
- `forsaken_ruins` - Forsaken Ruins
- `volcanic_peaks` - Volcanic Peaks
- `frozen_wastes` - Frozen Wastes
- `void_realm` - Void Realm

See `data/biomes.json` for the complete list of biome IDs.

