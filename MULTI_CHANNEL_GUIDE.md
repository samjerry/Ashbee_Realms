# Multi-Channel System Guide

## Overview

Ashbee Realms now supports **multiple Twitch channels** simultaneously. Each player will have **separate save files** for each streamer's channel they play on.

## How It Works

### 1. **Separate Saves Per Channel**
- When a viewer plays the game on StreamerA's channel, their progress is saved specifically for StreamerA
- The same viewer can play on StreamerB's channel with completely separate progress
- This allows viewers to experience different adventures across multiple streamers

### 2. **Channel Configuration**
The bot connects to multiple channels via the `.env` file:

```env
# Single channel
CHANNELS=MarrowOfAlbion

# Multiple channels (comma-separated, no spaces recommended)
CHANNELS=MarrowOfAlbion,StreamerB,StreamerC

# Multiple channels (with spaces - will be trimmed)
CHANNELS=MarrowOfAlbion, StreamerB, StreamerC
```

### 3. **Bot Behavior**
- The bot connects to ALL channels listed in `CHANNELS`
- When someone types `!adventure` in any channel, the bot responds with a channel-specific link
- Announcements can be sent to:
  - A specific channel: `announce('message', 'channelName')`
  - All channels: `announce('message')` (no channel parameter)

### 4. **Game Flow**

#### Step 1: Viewer sees command in chat
```
Viewer: !adventure
Bot: 🗺️ Join the adventure: https://ashbeerealms.com/adventure?channel=marrowofalb
```

#### Step 2: Link includes channel parameter
The `?channel=marrowofalb` parameter tells the game which streamer's channel this is for.

#### Step 3: Game loads channel-specific save
- Frontend extracts channel from URL
- All API calls include the channel parameter
- Database queries use both `player_id` and `channel_name` to load the correct save

## Database Schema

### Before (Single Channel)
```sql
CREATE TABLE player_progress (
  player_id TEXT PRIMARY KEY,
  name TEXT,
  level INTEGER,
  ...
);
```

### After (Multi-Channel)
```sql
CREATE TABLE player_progress (
  player_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  name TEXT,
  level INTEGER,
  ...,
  PRIMARY KEY (player_id, channel_name)
);
```

**Key Change:** Composite primary key `(player_id, channel_name)` allows same player to have multiple saves.

## API Changes

### GET `/api/player/progress?channel=channelName`
**Before:**
```javascript
GET /api/player/progress
// Returns: One save file for the player
```

**After:**
```javascript
GET /api/player/progress?channel=marrowofalb
// Returns: Save file for this player on this specific channel
```

### POST `/api/player/progress?channel=channelName`
**Before:**
```javascript
POST /api/player/progress
Body: { name: "Hero", level: 5, ... }
```

**After:**
```javascript
POST /api/player/progress?channel=marrowofalb
Body: { 
  channel: "marrowofalb",
  progress: { name: "Hero", level: 5, ... }
}
```

### POST `/api/action`
**Before:**
```javascript
POST /api/action
Body: { actionId: "fightBoss" }
```

**After:**
```javascript
POST /api/action
Body: { 
  actionId: "fightBoss",
  channel: "marrowofalb"
}
```

## Code Examples

### Bot: Announce to Specific Channel
```javascript
const { announce } = require('./bot');

// Announce to all connected channels
announce('🎉 A legendary item has appeared!');

// Announce to specific channel only
announce('🎉 MarrowOfAlbion just defeated the boss!', 'marrowofalb');
```

### Server: Load Channel-Specific Progress
```javascript
const db = require('./db');

// Load player's progress for specific channel
const progress = await db.loadPlayerProgress('twitch-12345', 'marrowofalb');

// Save player's progress for specific channel
await db.savePlayerProgress('twitch-12345', 'marrowofalb', {
  name: 'Hero',
  level: 10,
  hp: 100,
  ...
});

// Initialize new player on a channel
await db.initializeNewPlayer('twitch-12345', 'marrowofalb', 'Hero');
```

### Frontend: Include Channel in Requests
```javascript
// Get channel from URL
const urlParams = new URLSearchParams(window.location.search);
const channel = urlParams.get('channel');

// Load progress for this channel
const response = await fetch(`/api/player/progress?channel=${channel}`);
const data = await response.json();

// Save progress for this channel
await fetch(`/api/player/progress?channel=${channel}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    channel,
    progress: playerData 
  })
});

// Perform action on this channel
await fetch('/api/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    actionId: 'fightBoss',
    channel
  })
});
```

## Adding New Channels

### Step 1: Add to .env
```env
CHANNELS=MarrowOfAlbion,NewStreamer,AnotherStreamer
```

### Step 2: Restart the Bot
```bash
# Stop the bot (Ctrl+C)
# Start again
npm start
```

### Step 3: Verify Connection
Check the console output:
```
✅ Bot connected to irc-ws.chat.twitch.tv:443
📺 Connected to channels: MarrowOfAlbion, NewStreamer, AnotherStreamer
```

## Testing Multi-Channel System

### Test 1: Bot Connects to Multiple Channels
```bash
# Edit .env
CHANNELS=ChannelA,ChannelB

# Start bot
npm start

# Expected output:
🎮 Bot will connect to channels: ChannelA, ChannelB
✅ Bot connected
📺 Connected to channels: ChannelA, ChannelB
```

### Test 2: Separate Saves
```bash
# 1. Join game from ChannelA
# URL: /adventure?channel=channela
# Create character "WarriorA", level up to 5

# 2. Join game from ChannelB (same Twitch account)
# URL: /adventure?channel=channelb
# Create character "MageB", level up to 3

# 3. Verify separate saves
# Go back to /adventure?channel=channela -> See "WarriorA" level 5
# Go back to /adventure?channel=channelb -> See "MageB" level 3
```

### Test 3: Channel-Specific Announcements
```javascript
// In server.js or game logic
const { announce } = require('./bot');

// Announce only to ChannelA
announce('ChannelA event: Boss spawned!', 'channela');

// Announce to all channels
announce('Global event: Treasure hunt begins!');
```

## Migration from Single Channel

If you had existing player data before multi-channel support:

### Option 1: Manual Migration (Recommended)
```sql
-- SQLite
UPDATE player_progress 
SET channel_name = 'marrowofalb' 
WHERE channel_name IS NULL;

-- PostgreSQL
UPDATE player_progress 
SET channel_name = 'marrowofalb' 
WHERE channel_name IS NULL;
```

### Option 2: Fresh Start
```bash
# Delete old database
rm data.sqlite

# Restart server (will create new tables)
npm start
```

## Troubleshooting

### Issue: "Channel parameter required" error
**Cause:** Frontend not passing channel in API calls  
**Fix:** Ensure URL has `?channel=channelname` parameter

### Issue: Bot not responding in channel
**Cause:** Channel not in CHANNELS list  
**Fix:** Add channel to `.env` and restart bot

### Issue: Player progress not loading
**Cause:** Case mismatch (ChannelName vs channelname)  
**Fix:** Channel names are stored lowercase. Ensure consistency.

### Issue: Bot connects but doesn't join channels
**Cause:** Invalid channel names or OAuth token  
**Fix:** Verify CHANNELS doesn't have # prefix, check BOT_OAUTH_TOKEN

## Best Practices

1. **Lowercase Channel Names**: Always store and compare channel names in lowercase
2. **Validate Channel Parameter**: Always check if channel is provided before database operations
3. **Error Handling**: Gracefully handle missing channel parameter in API requests
4. **Announcements**: Be mindful of which channels should receive announcements
5. **URL Persistence**: Store channel in sessionStorage so it persists across page refreshes

## Future Enhancements

- **Cross-Channel Leaderboards**: Compare progress across all channels
- **Channel-Specific Content**: Different quests/events per channel
- **Channel Collaboration**: Special events when multiple channels play together
- **Channel Statistics**: Track which channels have the most players
- **Channel Perks**: Streamers can configure custom starting gear/bonuses

---

**Questions?** Check the main README.md or open an issue on GitHub.
