# Raid System Documentation

## Overview

The Raid System enables multiplayer group content where multiple Twitch viewers can team up to face challenging bosses and encounters. It features lobby management, role-based gameplay (tank, healer, DPS), coordinated combat, Twitch viewer integration (voting, channel points, bits), and leaderboards.

## Table of Contents

- [Core Features](#core-features)
- [Raid Types](#raid-types)
- [Lobby System](#lobby-system)
- [Combat System](#combat-system)
- [Twitch Integration](#twitch-integration)
- [Rewards & Leaderboards](#rewards--leaderboards)
- [API Reference](#api-reference)
- [Twitch Bot Commands](#twitch-bot-commands)
- [Database Schema](#database-schema)

---

## Core Features

### ✅ Implemented Features

- **4 Unique Raids**: Goblin Siege, Dragon Assault, Void Incursion, Trial of Legends
- **Multiple Raid Types**: Wave-based, Phase-based, Objective-based, Boss Rush
- **Lobby System**: Pre-raid gathering with role selection
- **Role Management**: Tank, Healer, DPS with requirements
- **Coordinated Combat**: Multiplayer turn-based combat
- **Twitch Viewer Voting**: Community votes on raid events
- **Legacy Points Buffs**: Players can purchase raid buffs with premium currency
- **Leaderboards**: Track fastest clears, fewest deaths, highest damage
- **Difficulty Scaling**: Normal, Hard, Nightmare, Mythic
- **Achievements**: Raid-specific achievements and titles

---

## Raid Types

### 1. Wave-Based Raids (Goblin Siege)

Players defend against waves of enemies culminating in a boss fight.

**Structure:**
```json
{
  "waves": [
    { "wave": 1, "enemies": ["goblin_scout"], "count": 15 },
    { "wave": 2, "enemies": ["goblin_warrior", "goblin_shaman"], "count": 20 },
    { "wave": 3, "enemies": ["goblin_warrior"], "count": 25, "boss": "goblin_warlord" }
  ]
}
```

**Features:**
- Multiple waves of increasing difficulty
- Boss appears in final wave
- Special mechanics (barricades, catapults)

### 2. Phase-Based Raids (Dragon Assault)

Boss fight with multiple phases triggered by HP thresholds.

**Structure:**
```json
{
  "phases": [
    { "phase": 1, "hp_threshold": "100-70%", "mechanics": ["flame_breath", "tail_sweep"] },
    { "phase": 2, "hp_threshold": "70-40%", "mechanics": ["aerial_bombardment"], "adds": ["dragon_whelp"] },
    { "phase": 3, "hp_threshold": "40-0%", "mechanics": ["inferno_nova", "volcanic_eruption"] }
  ]
}
```

**Features:**
- Boss HP threshold phase transitions
- New mechanics each phase
- Add spawns in specific phases
- Role requirements (2 tanks, 3 healers, 10 DPS)

### 3. Objective-Based Raids (Void Incursion)

Complete multiple objectives while fighting enemies.

**Structure:**
```json
{
  "objectives": [
    { "objective": "Close Void Rifts", "description": "Close 5 rifts", "mechanics": ["channel_time"] },
    { "objective": "Defeat Rift Guardians", "bosses": ["void_stalker", "dimension_ripper"] },
    { "objective": "Final Boss", "boss": "void_sovereign" }
  ]
}
```

**Features:**
- Multiple sequential objectives
- Environmental hazards (void corruption)
- Mini-bosses and final boss
- Time pressure mechanics

### 4. Boss Rush (Trial of Legends)

Face multiple legendary bosses back-to-back.

**Structure:**
```json
{
  "boss_rush": [
    "goblin_warlord_legendary",
    "infernus_dragon_legendary",
    "void_sovereign_legendary",
    "ancient_treant_legendary",
    "phantom_king_legendary"
  ]
}
```

**Features:**
- 5 legendary bosses in succession
- No healing between bosses
- Weekly rotation with modifiers
- Highest rewards

---

## Lobby System

### Creating a Lobby

Players create a lobby before starting a raid. The lobby allows players to join, select roles, and prepare.

**API Endpoint:** `POST /api/raids/lobby/create`

**Request:**
```json
{
  "player": "StreamerName",
  "channel": "streamername",
  "raidId": "dragon_assault",
  "difficulty": "hard",
  "requireRoles": true,
  "allowViewerVoting": true
}
```

**Response:**
```json
{
  "lobbyId": "dragon_assault_1234567890_abc123",
  "raidId": "dragon_assault",
  "raidName": "Dragon's Assault",
  "leader": "StreamerName",
  "players": [
    { "name": "StreamerName", "level": 15, "role": "dps", "isLeader": true }
  ],
  "settings": {
    "difficulty": "hard",
    "requireRoles": true,
    "allowViewerVoting": true,
    "maxPlayers": 15,
    "minPlayers": 5
  },
  "status": "waiting",
  "canStart": false
}
```

### Joining a Lobby

**API Endpoint:** `POST /api/raids/lobby/join`

**Request:**
```json
{
  "player": "ViewerName",
  "channel": "streamername",
  "lobbyId": "dragon_assault_1234567890_abc123",
  "role": "healer"
}
```

**Response:**
```json
{
  "lobbyId": "dragon_assault_1234567890_abc123",
  "joined": true,
  "message": "ViewerName joined as healer",
  "players": [
    { "name": "StreamerName", "role": "tank" },
    { "name": "ViewerName", "role": "healer" }
  ],
  "roleDistribution": {
    "tank": 1,
    "healer": 1,
    "dps": 0
  },
  "canStart": false
}
```

### Role System

Each raid can have role requirements:

**Dragon Assault Requirements:**
- 2 Tanks
- 3 Healers
- 10+ DPS

**Role Responsibilities:**
- **Tank**: Hold aggro, face boss away from raid, use taunt
- **Healer**: Keep raid alive, prioritize tanks and low HP players
- **DPS**: Deal damage to boss and adds, focus priority targets

### Changing Roles

**API Endpoint:** `POST /api/raids/lobby/change-role`

**Request:**
```json
{
  "player": "ViewerName",
  "channel": "streamername",
  "lobbyId": "dragon_assault_1234567890_abc123",
  "newRole": "dps"
}
```

### Starting the Raid

Once all requirements are met (minimum players, role requirements), the leader can start the raid.

**API Endpoint:** `POST /api/raids/start`

**Requirements:**
- Minimum player count met
- Role requirements satisfied (if enabled)
- All players ready

---

## Combat System

### Turn-Based Multiplayer Combat

The raid combat system allows multiple players to act simultaneously against bosses and enemies.

### Player Actions

#### 1. Attack
**Action:**
```json
{
  "type": "attack",
  "target": "boss" // or "enemy_0", "enemy_1", etc.
}
```

#### 2. Heal
**Action:**
```json
{
  "type": "heal",
  "target": "player_123" // Target player ID
}
```

#### 3. Use Ability
**Action:**
```json
{
  "type": "ability",
  "ability": "power_strike",
  "target": "boss"
}
```

#### 4. Taunt (Tank Only)
**Action:**
```json
{
  "type": "taunt"
}
```

### Performing Actions

**API Endpoint:** `POST /api/raids/action`

**Request:**
```json
{
  "player": "PlayerName",
  "channel": "streamername",
  "instanceId": "instance_1234567890_xyz",
  "action": {
    "type": "attack",
    "target": "boss"
  }
}
```

**Response:**
```json
{
  "instanceId": "instance_1234567890_xyz",
  "action": "attack",
  "result": {
    "success": true,
    "damage": 45,
    "target": "boss"
  },
  "state": {
    "status": "active",
    "currentPhase": 1,
    "players": [...],
    "boss": {
      "id": "boss",
      "type": "infernus_dragon",
      "hp": 9955,
      "maxHp": 10000,
      "phase": 1,
      "alive": true
    }
  },
  "combatLog": [
    { "timestamp": 1234567890, "message": "PlayerName attacks infernus_dragon for 45 damage" }
  ]
}
```

### Combat Log

All combat actions are logged and can be displayed in Twitch chat:

```
[12:34:56] PlayerName attacks Infernus Dragon for 45 damage
[12:34:57] Infernus Dragon uses Flame Breath on TankPlayer for 60 damage
[12:34:58] HealerName heals TankPlayer for 55 HP
```

---

## Twitch Integration

### Viewer Voting

Viewers can vote on raid events during specific moments.

**Vote Options:**
- `buff_boss`: Make boss stronger
- `buff_players`: Give players temporary buff
- `spawn_adds`: Spawn additional enemies
- `heal_all`: Heal all players
- `chaos_mode`: Random effects

**API Endpoint:** `POST /api/raids/viewer/vote`

**Request:**
```json
{
  "instanceId": "instance_1234567890_xyz",
  "vote": {
    "option": "buff_players",
    "viewer": "helpful_viewer",
    "bits": 0 // Bits weight votes: 100 bits = 2 votes, 200 bits = 3 votes
  }
}
```

**Voting Duration:** 30 seconds per vote

**Winning Option:** Most voted option is applied at the end of voting period

### Legacy Points Buff System

Players can purchase raid buffs using **Legacy Points**, a premium currency earned through achievements and milestones. This allows raid participants to support their team strategically.

**Available Buffs:**

#### 1. Heal Raid (5 Legacy Points)
Restores 25% HP to all living players.

#### 2. Revive Player (10 Legacy Points)
Brings back a fallen player at 50% HP.

#### 3. Damage Boost (8 Legacy Points)
Increases raid damage by 25% for 2 minutes.

#### 4. Raid Shield (12 Legacy Points)
Absorbs 50% of incoming damage for 1 minute.

**API Endpoint:** `GET /api/raids/buffs`

Get available buffs with costs and descriptions.

**Response:**
```json
{
  "buffs": {
    "heal_raid": {
      "cost": 5,
      "name": "Heal Raid",
      "description": "Restore 25% HP to all living players",
      "effect": "heal"
    },
    "revive_player": {
      "cost": 10,
      "name": "Revive Player",
      "description": "Bring back a fallen player at 50% HP",
      "effect": "revive"
    },
    "damage_boost": {
      "cost": 8,
      "name": "Damage Boost",
      "description": "Increase raid damage by 25% for 2 minutes",
      "effect": "buff"
    },
    "shield_raid": {
      "cost": 12,
      "name": "Raid Shield",
      "description": "Absorb 50% of incoming damage for 1 minute",
      "effect": "shield"
    }
  }
}
```

**API Endpoint:** `POST /api/raids/buff/purchase`

Purchase and apply a buff to the raid.

**Request:**
```json
{
  "player": "PlayerName",
  "channel": "streamername",
  "instanceId": "instance_1234567890_xyz",
  "buffType": "heal_raid"
}
```

**Response:**
```json
{
  "instanceId": "instance_1234567890_xyz",
  "buff": "heal_raid",
  "player": "player_123",
  "result": {
    "success": true,
    "effect": "Raid healed for 25%",
    "cost": 5
  },
  "state": { ... },
  "legacyPointsRemaining": 15
}
```

**Error Response (Insufficient Legacy Points):**
```json
{
  "error": "Insufficient legacy points",
  "required": 12,
  "available": 8
}
```

**Earning Legacy Points:**

Legacy Points are earned through:
- Completing achievements (major milestones)
- Reaching character level milestones
- Finishing difficult quests
- Winning seasonal competitions

---

## Rewards & Leaderboards

### Raid Rewards

Rewards scale with difficulty and raid type.

**Base Rewards (Normal Difficulty):**
- **Goblin Siege**: 500 gold, 1000 XP
- **Dragon Assault**: 2000 gold, 5000 XP
- **Void Incursion**: 5000 gold, 10000 XP, 50 raid tokens
- **Trial of Legends**: 10000 gold, 20000 XP, 100 raid tokens

**Difficulty Multipliers:**
- Normal: 1.0x
- Hard: 1.5x
- Nightmare: 2.0x
- Mythic: 3.0x

**Additional Rewards:**
- **Items**: Raid-specific items
- **Unique Loot**: Rare equipment (dragonscale armor, voidwalker cloak)
- **Titles**: Dragonslayer, Voidbane, Legend, Raid Master
- **Raid Tokens**: Currency for raid vendor

### Achievements

Each raid has unique achievements:

**Dragon Assault Achievements:**
- **Dragonslayer**: Defeat Infernus
- **Perfect Defense**: Complete without any player deaths
- **Speed Kill**: Complete in under 20 minutes

### Leaderboards

**API Endpoint:** `GET /api/raids/leaderboard/:raidId`

**Query Params:**
- `category`: fastest_clear | fewest_deaths | highest_damage
- `limit`: Number of entries (default 10)

**Example:**
```
GET /api/raids/leaderboard/dragon_assault?category=fastest_clear&limit=10
```

**Response:**
```json
{
  "raidId": "dragon_assault",
  "category": "fastest_clear",
  "leaderboard": [
    {
      "rank": 1,
      "players": ["Player1", "Player2", "Player3"],
      "completionTime": 1186000,
      "deaths": 0,
      "difficulty": "hard",
      "date": 1234567890000
    }
  ]
}
```

---

## API Reference

### Raid Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/raids` | Get all available raids |
| GET | `/api/raids/:raidId` | Get raid details |
| GET | `/api/raids/lobbies/active` | Get active lobbies |
| POST | `/api/raids/lobby/create` | Create lobby |
| POST | `/api/raids/lobby/join` | Join lobby |
| POST | `/api/raids/lobby/leave` | Leave lobby |
| POST | `/api/raids/lobby/change-role` | Change role |
| POST | `/api/raids/start` | Start raid |
| GET | `/api/raids/instance/:instanceId` | Get raid state |
| POST | `/api/raids/action` | Perform action |
| POST | `/api/raids/viewer/vote` | Submit viewer vote |
| POST | `/api/raids/channel-points` | Redeem channel points |
| POST | `/api/raids/bits` | Process bits effect |
| GET | `/api/raids/leaderboard/:raidId` | Get leaderboard |

---

## Twitch Bot Commands

### For Streamers

```
!raid create <raidId> [difficulty] - Create a raid lobby
Example: !raid create dragon_assault hard

!raid start - Start the raid (must be in lobby)

!raid status - View current raid status
```

### For Viewers

```
!raid join [role] - Join the raid lobby
Example: !raid join healer

!raid role <newRole> - Change your role
Example: !raid role tank

!raid leave - Leave the raid lobby

!raid attack [target] - Attack in combat
Example: !raid attack boss

!raid heal <player> - Heal a player
Example: !raid heal StreamerName

!raid ability <abilityName> [target] - Use ability
Example: !raid ability power_strike boss
```

### Integration Example (bot.js)

```javascript
// Raid command handler
client.on('message', async (channel, tags, message, self) => {
  if (self) return;
  
  const args = message.trim().split(' ');
  const command = args[0].toLowerCase();
  
  if (command === '!raid') {
    const subcommand = args[1]?.toLowerCase();
    
    if (subcommand === 'create') {
      const raidId = args[2];
      const difficulty = args[3] || 'normal';
      
      const response = await fetch('http://localhost:3000/api/raids/lobby/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: tags.username,
          channel: channel.slice(1),
          raidId,
          difficulty
        })
      });
      
      const data = await response.json();
      client.say(channel, `✅ Raid lobby created: ${data.raidName} (${data.lobbyId})`);
    }
    
    if (subcommand === 'join') {
      const role = args[2] || 'dps';
      // ... join logic
    }
  }
});
```

---

## Database Schema

Raids use in-memory state management (no persistent database required for raid instances). However, leaderboards and player raid stats can be stored:

### Recommended Tables

```sql
-- Raid completions
CREATE TABLE raid_completions (
  id SERIAL PRIMARY KEY,
  raid_id VARCHAR(50) NOT NULL,
  player_ids TEXT[] NOT NULL,
  completion_time INTEGER NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  deaths INTEGER DEFAULT 0,
  total_damage BIGINT DEFAULT 0,
  total_healing BIGINT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Raid leaderboards (materialized view or separate table)
CREATE TABLE raid_leaderboards (
  raid_id VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  player_names TEXT[] NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB,
  PRIMARY KEY (raid_id, category, score)
);

-- Player raid stats
CREATE TABLE player_raid_stats (
  user_id INTEGER REFERENCES users(id),
  raid_id VARCHAR(50) NOT NULL,
  completions INTEGER DEFAULT 0,
  best_time INTEGER,
  total_damage BIGINT DEFAULT 0,
  total_healing BIGINT DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, raid_id)
);
```

---

## Best Practices

### For Raid Design

1. **Balance Difficulty**: Ensure raids are challenging but achievable
2. **Clear Mechanics**: Communicate mechanics clearly to players
3. **Role Importance**: Make all roles feel impactful
4. **Viewer Engagement**: Use voting and channel points to involve non-players

### For Streamers

1. **Explain Mechanics**: Brief players before starting
2. **Assign Roles**: Ensure proper role distribution
3. **Encourage Viewers**: Promote viewer participation via voting/points
4. **Celebrate Wins**: Acknowledge achievements and leaderboard entries

### For Developers

1. **Test Thoroughly**: All raid types and mechanics
2. **Monitor Performance**: Large multiplayer groups can strain servers
3. **Log Everything**: Combat logs help debug issues
4. **Graceful Failures**: Handle disconnects and errors elegantly

---

## Troubleshooting

### Common Issues

**Q: "Cannot start raid - role requirements not met"**
A: Check role distribution. Dragon Assault requires 2 tanks, 3 healers. Use `!raid role <role>` to change roles.

**Q: "Lobby is full"**
A: Raid has max player limit (10-20 depending on raid). Create a new lobby or wait for spots.

**Q: "Player cannot act"**
A: Player may be dead. Healers cannot resurrect in combat. Wait for raid completion or wipe.

**Q: "Viewer voting not working"**
A: Ensure `allowViewerVoting: true` in lobby settings. Voting only occurs at specific raid moments.

---

## Future Enhancements

### Planned Features

- [ ] Raid Finder (automatic matchmaking)
- [ ] Custom raid modifiers (ironman, speed run, cursed)
- [ ] Raid vendor with token shop
- [ ] Raid mounts and cosmetics
- [ ] Cross-channel raids (multiple streamers)
- [ ] Raid recorder (replay system)
- [ ] Advanced combat AI
- [ ] Dynamic difficulty adjustment

---

## Credits

**Designed by:** Ashbee Realms Dev Team  
**Raid Data:** raids.json  
**Implementation:** RaidManager.js  
**Test Coverage:** 30/30 tests passing ✅

---

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Contact: [Your contact info]
- Documentation: This file

**Happy Raiding!** 🎯⚔️🏆
