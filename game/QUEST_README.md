# 📜 Quest System

## Overview

The Quest System provides a comprehensive framework for creating, tracking, and completing quests. Players can accept quests, track multiple objectives, earn rewards, and unlock new content through quest chains.

## Core Concepts

### Quest Types

**Main Story Quests**
- Linear narrative progression
- Chapter-based organization
- Unlock subsequent story quests
- Often have boss encounters and significant rewards

**Side Quests**
- Optional content
- Independent storylines
- Various rewards (XP, gold, items, reputation)
- Can be completed at any time (if level requirement met)

**Daily Quests**
- Repeatable quests
- Reset daily
- Consistent rewards for regular progression
- Good for grinding XP/gold

### Quest States

```
available → active → ready_to_complete → completed
                 ↓
               failed
                 ↓
             abandoned
```

- **Available**: Can be accepted by the player
- **Active**: Currently being worked on
- **Ready to Complete**: All objectives finished
- **Completed**: Turned in, rewards claimed
- **Failed**: Time limit expired or fail condition met
- **Abandoned**: Player chose to give up

### Objective Types

**talk_to_npc**
- Interact with specific NPC
- Often starts or ends quest chains
- Example: "Speak with Elder Thorne"

**kill_monster**
- Defeat specific monster type
- Track kill count
- Example: "Defeat 10 Goblin Scouts"

**kill_boss**
- Defeat a specific named enemy
- Usually single target
- Example: "Defeat the Alpha Wolf"

**collect_item**
- Gather items (from monsters, chests, etc.)
- May have drop chance
- Example: "Collect 5 Wolf Pelts"

**explore_location**
- Visit specific biome or sub-location
- Auto-completes on arrival
- Example: "Enter the Cursed Swamp"

## Quest Data Structure

### Quest Definition (from quests.json)
```javascript
{
  "id": "awakening",
  "name": "The Awakening",
  "description": "Discover why you've been brought to Ashbee Realms",
  "chapter": 1,
  "required_level": 1,
  "prerequisites": [],  // Quest IDs that must be completed first
  "repeatable": false,
  "time_limit": null,   // Minutes (null = no limit)
  "objectives": [
    {
      "type": "talk_to_npc",
      "target": "elder_thorne",
      "description": "Speak with Elder Thorne"
    },
    {
      "type": "kill_monster",
      "target": "forest_wolf",
      "count": 3,
      "description": "Defeat 3 Forest Wolves"
    }
  ],
  "rewards": {
    "xp": 100,
    "gold": 50,
    "items": ["health_potion"],
    "reputation": {"faction": "rangers", "amount": 100},
    "title": "wolf_slayer",
    "unlocks": ["quest:wolves_den"]
  },
  "dialogue": {
    "start": "Ah, another soul drawn to our realm...",
    "complete": "You've proven yourself capable!"
  }
}
```

### Quest State (runtime tracking)
```javascript
{
  "questId": "awakening",
  "status": "active",
  "startedAt": 1234567890,
  "objectives": [
    {
      "id": 0,
      "type": "kill_monster",
      "target": "forest_wolf",
      "required": 3,
      "current": 2,        // Current progress
      "completed": false,
      "description": "Defeat 3 Forest Wolves"
    }
  ],
  "failConditions": []
}
```

## API Endpoints

### GET `/api/quests/available`
Get all quests the player can currently accept.

**Query Parameters:**
- `player` (required): Player username
- `channel` (required): Twitch channel

**Response:**
```json
{
  "success": true,
  "quests": [
    {
      "id": "awakening",
      "name": "The Awakening",
      "description": "Discover why you've been brought to Ashbee Realms",
      "required_level": 1,
      "chapter": 1,
      "is_main": true,
      "is_daily": false,
      "rewards": {
        "xp": 100,
        "gold": 50,
        "items": ["health_potion"]
      },
      "objectives": [
        {
          "type": "talk_to_npc",
          "description": "Speak with Elder Thorne"
        }
      ]
    }
  ]
}
```

### POST `/api/quests/accept`
Accept a quest to start tracking it.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "questId": "awakening"
}
```

**Response:**
```json
{
  "success": true,
  "quest": {
    "id": "awakening",
    "name": "The Awakening"
  },
  "dialogue": "Ah, another soul drawn to our realm...",
  "questState": {
    "questId": "awakening",
    "status": "active",
    "startedAt": 1234567890,
    "objectives": [/* ... */]
  }
}
```

### GET `/api/quests/active`
Get all currently active quests with progress.

**Query Parameters:**
- `player` (required): Player username
- `channel` (required): Twitch channel

**Response:**
```json
{
  "success": true,
  "quests": [
    {
      "questId": "awakening",
      "name": "The Awakening",
      "description": "...",
      "status": "active",
      "progress": "1/3",
      "progressPercent": 33,
      "objectives": [
        {
          "description": "Defeat 3 Forest Wolves",
          "progress": "2/3",
          "completed": false
        }
      ],
      "startedAt": 1234567890
    }
  ]
}
```

### POST `/api/quests/complete`
Complete a quest and receive rewards.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "questId": "awakening"
}
```

**Response:**
```json
{
  "success": true,
  "quest": {
    "id": "awakening",
    "name": "The Awakening"
  },
  "rewards": {
    "xp": 100,
    "gold": 50,
    "items": ["health_potion"],
    "reputation": null,
    "title": null,
    "unlocks": ["quest:wolves_den"]
  },
  "dialogue": "You've proven yourself capable!",
  "levelUp": {
    "newLevel": 2,
    "statsGained": {/*...*/}
  }
}
```

### POST `/api/quests/abandon`
Abandon an active quest (lose all progress).

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "questId": "awakening"
}
```

**Response:**
```json
{
  "success": true,
  "quest": {
    "id": "awakening",
    "name": "The Awakening"
  },
  "message": "Quest abandoned"
}
```

### GET `/api/quests/progress/:questId`
Get detailed progress for a specific active quest.

**Query Parameters:**
- `channel` (required): Twitch channel

**Response:**
```json
{
  "success": true,
  "progress": {
    "questId": "awakening",
    "name": "The Awakening",
    "status": "active",
    "progress": "1/3",
    "progressPercent": 33,
    "objectives": [/*...*/]
  }
}
```

### GET `/api/quests/chain/:questId`
Get quest chain information (prerequisites and unlocks).

**Response:**
```json
{
  "success": true,
  "chain": {
    "questId": "wolves_den",
    "name": "The Wolf's Den",
    "chapter": 1,
    "prerequisites": [
      {
        "id": "awakening",
        "name": "The Awakening"
      }
    ],
    "unlocks": [
      {
        "id": "goblin_threat",
        "name": "The Goblin Menace",
        "required_level": 5
      }
    ]
  }
}
```

### GET `/api/quests/story`
Get all main story quests in order.

**Response:**
```json
{
  "success": true,
  "quests": [
    {
      "id": "awakening",
      "name": "The Awakening",
      "description": "...",
      "chapter": 1,
      "required_level": 1,
      "prerequisites": [],
      "is_finale": false
    }
  ]
}
```

## Usage Examples

### Basic Quest Flow

**1. Check Available Quests**
```bash
GET /api/quests/available?player=user&channel=chan
# Returns quests player can accept
```

**2. Accept a Quest**
```bash
POST /api/quests/accept
Body: { "player": "user", "channel": "chan", "questId": "awakening" }
# Quest added to active quests
```

**3. Progress is Tracked Automatically**
```javascript
// When player kills a monster:
character.activeQuests.forEach(questState => {
  questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 1);
});
// Objectives update automatically
```

**4. Check Progress**
```bash
GET /api/quests/active?player=user&channel=chan
# Shows progress: "Defeated 2/3 Forest Wolves"
```

**5. Complete Quest**
```bash
POST /api/quests/complete
Body: { "player": "user", "channel": "chan", "questId": "awakening" }
# Receive rewards, quest moved to completed
```

### Integration with Combat

```javascript
// In combat victory handler:
const character = await db.getCharacter(userId, channel);
const questMgr = new QuestManager();

// Update all active quests
character.activeQuests.forEach(questState => {
  const result = questMgr.updateProgress(
    questState, 
    'kill_monster', 
    monster.id, 
    1
  );
  
  if (result.updated && result.events) {
    result.events.forEach(event => {
      if (event.type === 'objective_completed') {
        console.log(`✅ Objective completed: ${event.description}`);
      }
      if (event.type === 'quest_ready') {
        console.log(`📜 Quest ready to complete!`);
      }
    });
  }
});

await db.saveCharacter(userId, channel, character);
```

### Integration with Exploration

```javascript
// When player arrives at a location:
const character = await db.getCharacter(userId, channel);
const questMgr = new QuestManager();

character.activeQuests.forEach(questState => {
  questMgr.updateProgress(
    questState,
    'explore_location',
    character.location,
    1
  );
});

await db.saveCharacter(userId, channel, character);
```

### Twitch Bot Integration

```javascript
// !quest command - show active quests
if (command === '!quest' || command === '!quests') {
  const response = await fetch(`/api/quests/active?player=${username}&channel=${channel}`);
  const data = await response.json();
  
  if (data.quests.length === 0) {
    client.say(channel, `@${username} You have no active quests. Use !quest available to see quests!`);
  } else {
    data.quests.forEach(quest => {
      client.say(channel, 
        `📜 ${quest.name} - ${quest.progress} objectives (${quest.progressPercent}% complete)`
      );
    });
  }
}

// !quest available - show available quests
if (args[0] === 'available') {
  const response = await fetch(`/api/quests/available?player=${username}&channel=${channel}`);
  const data = await response.json();
  
  if (data.quests.length === 0) {
    client.say(channel, `@${username} No quests available at your level!`);
  } else {
    const mainQuests = data.quests.filter(q => q.is_main);
    const sideQuests = data.quests.filter(q => !q.is_main && !q.is_daily);
    
    client.say(channel, 
      `@${username} Available: ${mainQuests.length} story quest(s), ${sideQuests.length} side quest(s)`
    );
  }
}

// !quest accept <quest_id> - accept a quest
if (args[0] === 'accept' && args[1]) {
  const questId = args[1];
  const response = await fetch('/api/quests/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, questId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    client.say(channel, 
      `✅ @${username} Accepted quest: ${data.quest.name}! ${data.dialogue || ''}`
    );
  } else {
    client.say(channel, `❌ @${username} ${data.error}`);
  }
}

// !quest complete <quest_id> - complete a quest
if (args[0] === 'complete' && args[1]) {
  const questId = args[1];
  const response = await fetch('/api/quests/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, questId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    const rewards = [];
    if (data.rewards.xp) rewards.push(`${data.rewards.xp} XP`);
    if (data.rewards.gold) rewards.push(`${data.rewards.gold} gold`);
    if (data.rewards.items.length) rewards.push(`${data.rewards.items.length} item(s)`);
    
    client.say(channel, 
      `🎉 @${username} Completed "${data.quest.name}"! Rewards: ${rewards.join(', ')}`
    );
    
    if (data.levelUp) {
      client.say(channel, `⬆️ Level Up! Now level ${data.levelUp.newLevel}!`);
    }
  } else {
    client.say(channel, `❌ @${username} ${data.error}`);
  }
}
```

## Quest Design Patterns

### Linear Story Chain
```
Quest A → Quest B → Quest C → Quest D (Finale)
```
Each quest unlocks the next. Players experience story in order.

### Branching Paths
```
      ┌→ Quest B1 → Quest C1
Quest A
      └→ Quest B2 → Quest C2
```
Player choices affect which quests are available.

### Hub and Spoke
```
        Quest B1
       ↗
Quest A → Quest B2
       ↘
        Quest B3
```
Central quest unlocks multiple optional side quests.

### Parallel Storylines
```
Story Chain 1: A1 → B1 → C1
Story Chain 2: A2 → B2 → C2
```
Independent quest lines that can be done in any order.

## Quest Reward Types

### Experience Points (XP)
- Main driver of character progression
- Scales with quest difficulty
- Can trigger level-ups

### Gold
- Currency for shops and vendors
- Used for repairs, potions, etc.
- Varies by quest length

### Items
- Equipment upgrades
- Consumables (potions, food)
- Quest items for other quests
- Unique rewards

### Reputation
- Faction standing increase
- Unlocks faction vendors/quests
- Can affect NPC interactions

### Titles
- Cosmetic rewards
- Display achievements
- Show quest completion

### Unlocks
- New quests
- New areas
- New features
- Endgame content

## Best Practices

### Quest Design
1. **Clear Objectives**: Descriptions should be unambiguous
2. **Appropriate Difficulty**: Match player level
3. **Meaningful Rewards**: Worth the effort
4. **Engaging Story**: Even side quests need narrative
5. **Variety**: Mix objective types

### Technical Implementation
1. **Save Quest State**: Persist progress to database
2. **Event-Driven Updates**: Trigger on game actions
3. **Validate Completion**: Check all objectives
4. **Handle Edge Cases**: What if player dies? Logs out?
5. **Test Quest Chains**: Ensure prerequisites work

### Player Experience
1. **Show Progress**: Keep players informed
2. **Celebrate Completion**: Satisfying feedback
3. **Allow Abandonment**: Don't force players
4. **Track History**: Show completed quests
5. **Reward Exploration**: Hidden objectives

## Database Schema

### Quest Columns in player_progress
```sql
active_quests JSONB DEFAULT '[]'     -- Array of active quest states
completed_quests JSONB DEFAULT '[]'  -- Array of completed quest IDs
```

### Example Data
```sql
-- Active quest
active_quests: [
  {
    "questId": "awakening",
    "status": "active",
    "startedAt": 1234567890,
    "objectives": [...]
  }
]

-- Completed quests
completed_quests: ["awakening", "wolves_den", "goblin_threat"]
```

## Testing

Run comprehensive tests:
```bash
node Testing/test_quest_system.js
```

**Test Coverage:**
- ✅ Quest loading from data files
- ✅ Available quest filtering (level, prerequisites)
- ✅ Quest acceptance and state initialization
- ✅ Objective progress tracking
- ✅ Multi-objective quests
- ✅ Quest completion and rewards
- ✅ Quest failure and abandonment
- ✅ Quest chains and prerequisites
- ✅ Progress summary calculation
- ✅ Event triggering across multiple quests

**Test Results:** 26/26 passing ✅

## Performance Considerations

- Quest data cached in memory (no DB queries per action)
- Quest states stored as JSONB for efficient updates
- Progress updates batch multiple objectives
- Event system minimizes unnecessary checks
- Scales to 100+ quests easily

## Troubleshooting

**Quest won't accept:**
- Check player level meets requirement
- Verify prerequisites are completed
- Ensure quest isn't already active

**Progress not updating:**
- Check objective type matches action
- Verify target ID is correct
- Ensure quest state is 'active'

**Can't complete quest:**
- Verify all objectives are completed
- Check quest status is 'ready_to_complete'
- Ensure quest hasn't failed

**Rewards not granted:**
- Check character.gold was updated
- Verify items added to inventory
- Ensure XP was applied
- Check database save occurred

---

**Status:** ✅ Complete and Tested  
**Version:** 1.0  
**Last Updated:** Phase 2.1 Implementation
