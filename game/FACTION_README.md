# Faction & Reputation System

## Overview

The Faction & Reputation System allows players to build standing with different factions in Ashbee Realms. Reputation affects merchant prices, quest access, faction abilities, and more. Actions in the game world influence reputation with multiple factions simultaneously.

## Features

- **6 Reputation Tiers**: Hostile → Unfriendly → Neutral → Friendly → Honored → Exalted
- **6 Main Factions**: Each with unique rewards, quests, and abilities
- **Allied/Enemy System**: Gaining reputation with one faction affects others
- **Action-Based Reputation**: Combat, quests, and world interactions affect standing
- **Tier Rewards**: Unlock abilities, mounts, unique gear, and discounts
- **Dynamic Pricing**: Merchant prices scale from 70% (exalted) to 150% (hostile)

## Factions

### Whispering Woods Rangers
- **Alignment**: Good
- **Territory**: Ancient Forest, Whispering Glade, Ranger Outpost
- **Leader**: Warden Silmara Windwhisper
- **Allies**: Highland Militia, Druid Circle
- **Enemies**: Goblin Clans, Undead Legion
- **Rewards**: Nature-based abilities, animal companions, forest navigation

### Highland Militia
- **Alignment**: Good
- **Territory**: Highland Reaches, Town Square, Fortified Village
- **Leader**: Commander Aldric Ironheart
- **Allies**: Whispering Woods Rangers, Merchants Guild
- **Enemies**: Goblin Clans, Bandit Brotherhood, Undead Legion
- **Rewards**: Combat abilities, guard assistance, town benefits

### Merchants Guild
- **Alignment**: Neutral
- **Territory**: Market District, Trading Posts, Port Cities
- **Leader**: Guildmaster Thaddeus Goldvein
- **Allies**: Highland Militia, Arcane Academy
- **Enemies**: Thieves Syndicate, Bandit Brotherhood
- **Rewards**: Merchant discounts, rare items, trading perks

### Arcane Academy
- **Alignment**: Neutral
- **Territory**: Tower of Mysteries, Arcane Library, Mage Quarter
- **Leader**: Archmage Valdris Starweaver
- **Allies**: Merchants Guild, Druid Circle
- **Enemies**: Demon Cult, Undead Legion
- **Rewards**: Magical abilities, spell enhancements, arcane knowledge

### Druid Circle
- **Alignment**: Neutral
- **Territory**: Sacred Groves, Ancient Forests, Nature Sanctuaries
- **Leader**: High Druid Morana Earthsong
- **Allies**: Whispering Woods Rangers, Arcane Academy
- **Enemies**: Undead Legion, Demon Cult
- **Rewards**: Nature magic, shapeshifting, elemental powers

### Shadow Syndicate (Thieves)
- **Alignment**: Chaotic Neutral
- **Territory**: Shadowy Alleys, Black Market, Underground Network
- **Leader**: The Shadow
- **Allies**: None
- **Enemies**: Merchants Guild, Highland Militia
- **Rewards**: Stealth abilities, lockpicking, black market access

## Reputation Tiers

### Hostile (-3000 to -1000)
- Attacked on sight in faction territory
- Guards will attack
- No quest access
- 150% merchant prices (if you can trade at all)
- Bounties on your head

### Unfriendly (-999 to -1)
- Guards are suspicious
- No quest access
- 140% merchant prices
- Limited town access

### Neutral (0 to 999)
- Basic town access
- Basic quest access
- 100% merchant prices (standard)
- Starting reputation for most factions

### Friendly (1000 to 2999)
- Full quest access
- Faction ability unlocked
- 90% merchant prices (10% discount)
- NPCs are helpful

### Honored (3000 to 5999)
- Advanced quest access
- Second faction ability unlocked
- 85% merchant prices (15% discount)
- Command guards/NPCs
- Unique gear access

### Exalted (6000+)
- All quest access
- Ultimate faction ability unlocked
- 70% merchant prices (30% discount)
- Free services (inn, repairs)
- Passive ability unlocked
- Statue/monument erected

## Reputation Mechanics

### Gaining Reputation

#### Combat Actions
- `kill_goblin`: +5 (Highland Militia, Whispering Woods Rangers)
- `kill_bandit`: +8 (Highland Militia)
- `kill_undead`: +10 (Highland Militia, Arcane Academy, Druid Circle)
- `kill_demon`: +15 (All good factions)
- `kill_beast_in_territory`: -10 (Whispering Woods Rangers, Druid Circle)

#### Quest Actions
- `complete_quest`: +50 (Quest's affiliated faction)
- `quest_betrayal`: -200 (All factions)
- Quest rewards can specify custom faction reputation

#### Social Actions
- `donate_gold`: +1 per gold donated
- `protect_npc`: +25
- `save_villager`: +30
- `steal`: -50
- `kill_citizen`: -300
- `kill_guard`: -500

### Allied & Enemy Factions

When you gain reputation with a faction:
- **Allied factions**: Gain 25% of the reputation earned
- **Enemy factions**: Lose 50% of the reputation earned

**Example**: Gaining 100 reputation with Highland Militia
- Highland Militia: +100
- Whispering Woods Rangers (ally): +25
- Merchants Guild (ally): +25
- Goblin Clans (enemy): -50
- Undead Legion (enemy): -50

### Reputation Bounds
- **Minimum**: -3000 (Deep Hostile)
- **Maximum**: 999,999 (Legendary Standing)

## Using the Faction System

### JavaScript/Node.js

```javascript
const { FactionManager } = require('./game');
const factionMgr = new FactionManager();

// Initialize reputation for new character
character.reputation = factionMgr.initializeReputation();

// Get faction standing
const standing = await factionMgr.getFactionStanding(character, 'highland_militia');
console.log(`${standing.title} (${standing.reputation})`);

// Add reputation
const result = await factionMgr.addReputation(
  character,
  'highland_militia',
  100,
  'quest_complete'
);

if (result.tier_changed) {
  console.log(`Reached ${result.new_tier}! Unlocked ${result.tier_rewards.length} rewards`);
}

// Handle action-based reputation
const results = await factionMgr.handleAction(character, 'kill_goblin');
results.forEach(r => {
  console.log(`${r.faction_name}: ${r.reputation_change > 0 ? '+' : ''}${r.reputation_change}`);
});

// Get merchant discount
const multiplier = await factionMgr.getMerchantPriceMultiplier(character, 'merchants_guild');
const price = basePrice * multiplier; // Apply discount/markup

// Check quest access
const canAccess = await factionMgr.canAccessQuests(character, 'arcane_academy');

// Get unlocked abilities
const abilities = await factionMgr.getFactionAbilities(character);
abilities.forEach(a => {
  console.log(`${a.faction_name}: ${a.ability_id} (${a.tier_required})`);
});

// Check hostility
const isHostile = await factionMgr.isHostile(character, 'goblin_clans');
if (isHostile) {
  console.log('They will attack on sight!');
}

// Get complete summary
const summary = await factionMgr.getFactionSummary(character);
console.log(`Exalted with ${summary.exalted_count} factions`);
console.log(`${summary.hostile_factions.length} hostile factions`);
```

### API Endpoints

#### GET /api/factions
Get all factions with basic info.

**Response**:
```json
{
  "factions": [
    {
      "id": "highland_militia",
      "name": "Highland Militia",
      "description": "Brave defenders of human settlements",
      "alignment": "good",
      "leader": "commander_aldric_ironheart"
    }
  ]
}
```

#### GET /api/factions/:factionId
Get detailed faction information.

**Parameters**: `factionId` (path)

**Response**:
```json
{
  "faction": {
    "id": "highland_militia",
    "name": "Highland Militia",
    "description": "Brave defenders of human settlements",
    "alignment": "good",
    "territory": ["highland_reaches", "town_square"],
    "leader": "commander_aldric_ironheart",
    "enemy_factions": ["goblin_clans", "bandit_brotherhood"],
    "allied_factions": ["whispering_woods_rangers", "merchants_guild"],
    "reputation_tiers": { ... },
    "reputation_gains": { ... },
    "reputation_losses": { ... }
  }
}
```

#### GET /api/factions/standings
Get all faction standings for a character.

**Query**: `player`, `channel`

**Response**:
```json
{
  "standings": [
    {
      "faction_id": "highland_militia",
      "faction_name": "Highland Militia",
      "reputation": 2500,
      "tier": "friendly",
      "title": "Militia Member",
      "effects": {
        "merchant_prices": 0.9,
        "faction_ability": "militia_backup"
      },
      "next_tier": "honored",
      "reputation_to_next_tier": 500
    }
  ]
}
```

#### GET /api/factions/:factionId/standing
Get character's standing with specific faction.

**Parameters**: `factionId` (path)  
**Query**: `player`, `channel`

**Response**: Same as single standing object above

#### POST /api/factions/:factionId/reputation
Add reputation to a faction (admin/quest rewards).

**Parameters**: `factionId` (path)  
**Body**:
```json
{
  "player": "PlayerName",
  "channel": "channelname",
  "amount": 100,
  "reason": "quest_complete"
}
```

**Response**:
```json
{
  "result": {
    "faction_id": "highland_militia",
    "faction_name": "Highland Militia",
    "old_reputation": 900,
    "new_reputation": 1000,
    "reputation_change": 100,
    "old_tier": "neutral",
    "new_tier": "friendly",
    "tier_changed": true,
    "tier_rewards": [
      { "type": "ability", "value": "militia_backup" }
    ],
    "reason": "quest_complete"
  }
}
```

#### GET /api/factions/abilities
Get all unlocked faction abilities.

**Query**: `player`, `channel`

**Response**:
```json
{
  "abilities": [
    {
      "faction_id": "highland_militia",
      "faction_name": "Highland Militia",
      "ability_id": "militia_backup",
      "tier_required": "friendly"
    }
  ]
}
```

#### GET /api/factions/mounts
Get all unlocked faction mounts.

**Query**: `player`, `channel`

**Response**:
```json
{
  "mounts": [
    {
      "faction_id": "whispering_woods_rangers",
      "faction_name": "Whispering Woods Rangers",
      "mount_id": "dire_wolf",
      "tier_required": "honored"
    }
  ]
}
```

#### GET /api/factions/summary
Get faction summary/statistics.

**Query**: `player`, `channel`

**Response**:
```json
{
  "summary": {
    "total_factions": 6,
    "tier_distribution": {
      "hostile": 1,
      "unfriendly": 0,
      "neutral": 2,
      "friendly": 2,
      "honored": 1,
      "exalted": 0
    },
    "highest_reputation": {
      "faction_id": "highland_militia",
      "faction_name": "Highland Militia",
      "reputation": 3500,
      "tier": "honored"
    },
    "hostile_factions": [
      {
        "faction_id": "goblin_clans",
        "reputation": -1500,
        "tier": "hostile"
      }
    ],
    "unlocked_abilities": [...],
    "unlocked_mounts": [...],
    "exalted_count": 0
  }
}
```

## Integration Examples

### Quest Completion
```javascript
// In QuestManager.completeQuest()
if (quest.faction_rewards) {
  const factionMgr = new FactionManager();
  const results = await factionMgr.awardQuestReputation(character, quest);
  
  results.forEach(r => {
    if (r.tier_changed) {
      // Notify player of tier progression
      sendMessage(`You are now ${r.new_tier} with ${r.faction_name}!`);
    }
  });
}
```

### Combat Integration
```javascript
// In Combat.onKill()
const factionMgr = new FactionManager();
const action = `kill_${monster.type}`; // e.g., kill_goblin
const results = await factionMgr.handleAction(character, action);

results.forEach(r => {
  if (Math.abs(r.reputation_change) >= 10) {
    sendMessage(`${r.faction_name}: ${r.reputation_change > 0 ? '+' : ''}${r.reputation_change} reputation`);
  }
});
```

### Shop Integration
```javascript
// In ShopManager.buyItem()
const factionMgr = new FactionManager();
const multiplier = await factionMgr.getMerchantPriceMultiplier(character, shop.faction_id);
const finalPrice = Math.floor(item.cost * multiplier);

if (multiplier < 1.0) {
  sendMessage(`Faction discount applied! (${Math.round((1 - multiplier) * 100)}% off)`);
}
```

### Territory & Hostility
```javascript
// In ExplorationManager.travel()
const factionMgr = new FactionManager();

// Check if location has faction control
for (const [factionId, faction] of Object.entries(factionMgr.factions)) {
  if (faction.territory.includes(location.id)) {
    const isHostile = await factionMgr.isHostile(character, factionId);
    
    if (isHostile) {
      // Spawn guards to attack player
      startCombat(character, faction.guards);
      sendMessage(`⚔️ ${faction.name} guards attack on sight!`);
    }
  }
}
```

## Twitch Bot Commands

### Player Commands
- `!reputation` or `!rep` - View all faction standings
- `!reputation <faction>` - View specific faction standing
- `!factions` - List all available factions
- `!faction <name>` - Get detailed faction info

### Moderator Commands
- `!setreputation <user> <faction> <amount>` - Set reputation (admin)
- `!addreputation <user> <faction> <amount>` - Add reputation (admin)

## Database Schema

The `player_progress` table includes a `reputation` JSONB column:

```sql
reputation JSONB DEFAULT '{}'
```

**Structure**:
```json
{
  "whispering_woods_rangers": 1500,
  "highland_militia": 2000,
  "merchants_guild": 500,
  "arcane_academy": 0,
  "druid_circle": 300,
  "thieves_syndicate": -500
}
```

## Testing

Run the comprehensive test suite:
```bash
node Testing/test_faction_system.js
```

**Test Coverage**:
- Faction loading (6 factions)
- Reputation initialization
- Tier calculation (6 tiers)
- Faction standing retrieval
- Reputation addition
- Tier progression with rewards
- Allied faction reputation gain (+25%)
- Enemy faction reputation loss (-50%)
- Action-based reputation
- Merchant price multipliers
- Quest access checks
- Faction ability unlocking
- Hostility detection
- All standings retrieval
- Faction summary generation
- Reputation bounds enforcement
- Faction conflicts
- Reputation to next tier calculation

**Current Status**: ✅ 18/18 tests passing (100%)

## Future Enhancements

- [ ] Faction-specific world events
- [ ] Faction wars (temporary allied/enemy shifts)
- [ ] Player-driven faction reputation changes
- [ ] Faction reputation decay over time
- [ ] Cross-channel faction leaderboards
- [ ] Faction-specific titles and cosmetics
- [ ] Diplomatic missions between factions
- [ ] Faction territory control mechanics

## Related Files

- `game/FactionManager.js` - Core faction system implementation
- `data/factions.json` - Faction data and configuration
- `Testing/test_faction_system.js` - Comprehensive test suite
- `game/Character.js` - Character reputation property
- `db.js` - Database reputation storage
- `server.js` - Faction API endpoints

## Support

For issues or questions about the faction system:
1. Check test results: `node Testing/test_faction_system.js`
2. Review faction data: `data/factions.json`
3. Check API endpoints: `GET /api/factions`
4. Verify character reputation is initialized properly

---

**Phase 3.2: Faction & Reputation System** - Implemented December 2025
