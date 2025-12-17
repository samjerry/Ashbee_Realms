# Broadcaster Setup Flow

## Overview
When the broadcaster authenticates for the first time, they are redirected to a setup page where they can configure the initial game state for their channel.

## Flow

1. **Broadcaster Authentication** (`/auth/broadcaster`)
   - Broadcaster logs in with extended OAuth permissions
   - System checks if game state already exists for their channel
   - If exists: Redirect to `/adventure`
   - If not exists: Redirect to `/setup`

2. **Setup Page** (`/setup`)
   - Broadcaster-only accessible page
   - Configure:
     - **Weather**: Clear, Rain, Snow, Fog, Storm
     - **Time of Day**: Dawn, Day, Dusk, Night
     - **Season**: Spring, Summer, Autumn, Winter
     - **Game Mode**: Softcore or Hardcore
   - On submit: Game state is saved to database and broadcaster is redirected to `/adventure`

3. **Game Mode Impact**
   - **Softcore**: Players lose gold and XP on death, but keep their character
   - **Hardcore**: Character is permanently deleted on death; only permanent progression (souls, passive levels) is retained
   - The game mode is now controlled by the broadcaster and stored in the database
   - Client can no longer override the hardcore setting

## Database Changes

### `game_state` table
Added `game_mode` column:
```sql
ALTER TABLE game_state ADD COLUMN game_mode TEXT DEFAULT 'softcore';
```

### New Functions
- `getGameState(channelName)`: Retrieve game state for a channel
- `setGameState(channelName, gameState)`: Update game state for a channel

## API Endpoints

### GET `/api/game-state?channel={channel}`
Get the current game state for a channel.

**Response:**
```json
{
  "gameState": {
    "channel_name": "mychannel",
    "weather": "Clear",
    "time_of_day": "Day",
    "season": "Spring",
    "game_mode": "softcore",
    "last_updated": "2024-01-15T12:00:00Z"
  }
}
```

### POST `/api/game-state`
Update game state (broadcaster only).

**Request:**
```json
{
  "channel": "mychannel",
  "weather": "Rain",
  "time_of_day": "Night",
  "season": "Winter",
  "game_mode": "hardcore"
}
```

**Response:**
```json
{
  "success": true,
  "gameState": { ... }
}
```

## Security

- Only authenticated users can view game state
- Only the broadcaster can modify game state
- Game mode from database is used server-side for death handling (client cannot override)
- Input validation on all game state fields

## Components

### `BroadcasterSetup.jsx`
- React component for the setup page
- Located at `/public/src/components/Broadcaster/BroadcasterSetup.jsx`
- Full-screen setup interface with visual selection for all game state options
- Automatically redirects to `/adventure` after successful setup

## Routes

- `/setup` - Broadcaster setup page (broadcaster-only)
- Renders the same React app but shows `BroadcasterSetup` component based on pathname

## Future Enhancements

- Allow broadcaster to change game state from operator menu
- Add visual effects in-game based on weather/time/season
- Add achievements for hardcore mode survivors
