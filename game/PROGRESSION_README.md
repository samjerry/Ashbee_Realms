# Progression System Documentation

## Overview

The Progression System manages character advancement through experience points (XP), leveling, stat increases, skill points, death mechanics, and permanent account-wide progression. It includes hardcore mode support and a passive system that survives character death.

## Core Features

### 🎯 Experience & Leveling
- Dynamic XP requirements that scale with level
- Multiple level-ups in a single XP gain
- Full heal and max HP recalculation on level up
- Skill point rewards (1 per level)
- Level cap: 50 (configurable in constants.json)

### 📈 Stat Increases
**All base stats increase by +1 per level:**
- Strength: +1
- Defense: +1
- Magic: +1
- Agility: +1
- HP: +10

**Plus class-specific bonuses:**
- **Warrior**: +1.8 Str, +1.2 Def, +0.3 Agi, +10 HP
- **Mage**: +2.2 Mag, +0.4 Def, +0.5 Agi, +6 HP
- **Rogue**: +1.5 Agi, +0.8 Str, +0.4 Def, +7 HP
- **Cleric**: +1.5 Mag, +1.0 Def, +0.6 Agi, +8 HP
- **Ranger**: +1.2 Agi, +1.0 Str, +0.5 Def, +8 HP

**Example: Warrior Level Up**
- Strength: +2 (+1 base + 1.8 class = 2)
- Defense: +2 (+1 base + 1.2 class = 2)
- Magic: +1 (+1 base + 0 class = 1)
- Agility: +1 (+1 base + 0.3 class = 1)
- HP: +20 (+10 base + 10 class = 20)

### 💀 Death Mechanics

#### Normal Mode
- Lose 10% of current gold
- Lose 25% of current level XP
- Respawn with 50% HP
- Respawn location: Town Square
- Character remains intact

#### Hardcore Mode
- **Character is deleted permanently**
- All character progress lost
- **Permanent stats are preserved:**
  - Unlocked passives
  - Total kills, deaths, crits
  - Total gold/XP earned
  - Highest level reached
- New character inherits passive bonuses

### 🌟 Permanent Progression (Passives)

Account-wide permanent upgrades that survive death:

**Combat Passives:**
- Efficient Killer: +2% damage per 100 kills (max 20%)
- Improved Crits: +3% crit chance, +20% crit damage
- Veteran's Experience: -5% damage taken

**Progression Passives:**
- Fast Learner: +10% XP gain
- Golden Touch: +15% gold gain

**Survival Passives:**
- Second Wind: Heal 10% max HP on kill
- Last Stand: Survive lethal damage once per combat

**Unlock Requirements:**
- Level milestones (e.g., reach level 25)
- Kill counts (e.g., 1000 monsters slain)
- Critical hits (e.g., 100 crits)
- Gold earned (e.g., 10000 total gold)
- Death count (e.g., die 5 times)

### ⚔️ Skill Management

**Skill Cooldown System:**
- Per-skill cooldowns (measured in turns)
- Global cooldown (1 turn after any skill)
- Automatic cooldown reduction each turn
- Cooldown reset on combat end

**Skill Points:**
- Earned 1 per level
- Can be spent to learn new abilities
- Unspent points carry over

## Architecture

### Classes

#### ProgressionManager
Main progression handler with XP, leveling, and death logic.

```javascript
const progressionMgr = new ProgressionManager();

// Calculate XP needed for next level
const xpNeeded = progressionMgr.calculateXPToNextLevel(5); // 354 XP

// Add XP and handle level ups
const result = progressionMgr.addXP(character, 500);
// result = {
//   xpGained: 500,
//   levelsGained: 2,
//   levelUpRewards: [...],
//   totalSkillPoints: 2
// }

// Handle death
const deathResult = progressionMgr.handleDeath(character, isHardcore, permanentStats);

// Get passive bonuses
const bonuses = progressionMgr.calculatePassiveBonuses(unlockedPassives, accountStats);
```

#### SkillManager
Manages skill cooldowns and availability.

```javascript
const skillMgr = new SkillManager();

// Use a skill
const result = skillMgr.useSkill('fireball', 3); // 3 turn cooldown

// Check availability
if (skillMgr.isAvailable('fireball')) {
  // Skill is ready
}

// Tick cooldowns (end of turn)
skillMgr.tickCooldowns();

// Reset all (combat end)
skillMgr.resetAllCooldowns();
```

### Database Schema

#### player_progress Table
Stores per-character progress:
```sql
- level, xp, xp_to_next
- hp, max_hp, gold
- skill_points
- skills (JSONB) -- skill cooldown data
```

#### permanent_stats Table
Stores account-wide progression:
```sql
- unlocked_passives (JSONB array)
- account_stats (JSONB object)
- total_deaths, total_kills, total_crits
- total_gold_earned, total_xp_earned
- highest_level_reached
```

## API Endpoints

### GET /api/progression/xp-info
Get XP and level information for character.

**Query Parameters:**
- `channel` (required): Channel name

**Response:**
```json
{
  "success": true,
  "level": 5,
  "currentXP": 123,
  "xpToNext": 354,
  "xpProgress": "34.7%",
  "totalXPEarned": 1824
}
```

### POST /api/progression/add-xp
Add XP to character (triggers level ups automatically).

**Body:**
```json
{
  "channel": "mychannel",
  "amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "xpGained": 500,
  "levelsGained": 2,
  "newLevel": 7,
  "levelUpRewards": [
    {
      "level": 6,
      "statsGained": { "strength": 2, "defense": 2, "magic": 1, "agility": 1, "hp": 20 },
      "skillPoints": 1,
      "healedToFull": true,
      "newMaxHp": 150
    },
    {
      "level": 7,
      "statsGained": { ... },
      "skillPoints": 1,
      "healedToFull": true,
      "newMaxHp": 170
    }
  ],
  "totalSkillPoints": 2,
  "character": {
    "level": 7,
    "xp": 46,
    "xpToNext": 500,
    "hp": 170,
    "maxHp": 170,
    "skillPoints": 2
  }
}
```

### POST /api/progression/death
Handle character death (normal or hardcore).

**Body:**
```json
{
  "channel": "mychannel",
  "isHardcore": false
}
```

**Response (Normal):**
```json
{
  "success": true,
  "died": true,
  "isHardcore": false,
  "characterDeleted": false,
  "goldLost": 150,
  "xpLost": 25,
  "respawnLocation": "Town Square",
  "respawnedWith": {
    "hp": 85,
    "maxHp": 170,
    "gold": 1350,
    "xp": 75
  },
  "message": "You died and lost 150 gold and 25 XP. You respawn in Town Square with 50% HP."
}
```

**Response (Hardcore):**
```json
{
  "success": true,
  "died": true,
  "isHardcore": true,
  "characterDeleted": true,
  "message": "HeroName has fallen in hardcore mode. All progress lost except permanent unlocks.",
  "permanentStatsToRetain": {
    "unlockedPassives": ["efficient_killer", "improved_crits"],
    "accountStats": { "monster_kills": 1500 },
    "totalDeaths": 3,
    "totalKills": 1500,
    "totalGoldEarned": 25000,
    "highestLevelReached": 25
  }
}
```

### POST /api/progression/respawn
Manually respawn character after death.

**Body:**
```json
{
  "channel": "mychannel"
}
```

**Response:**
```json
{
  "success": true,
  "message": "HeroName respawns in Town Square with 85/170 HP.",
  "hp": 85,
  "maxHp": 170,
  "location": "Town Square"
}
```

### GET /api/progression/passives
Get all passives with unlock status.

**Query Parameters:**
- `channel` (required): Channel name

**Response:**
```json
{
  "success": true,
  "passives": [
    {
      "id": "efficient_killer",
      "name": "Efficient Killer",
      "description": "Deal 2% more damage for every 100 monsters slain (max 20%)",
      "icon": "⚔️",
      "unlock_requirement": {
        "type": "monster_kills",
        "count": 1000
      },
      "isUnlocked": true,
      "canUnlock": true,
      "unlockMessage": "Already unlocked"
    },
    {
      "id": "veteran_experience",
      "name": "Veteran's Experience",
      "description": "Take 5% less damage from all sources",
      "isUnlocked": false,
      "canUnlock": false,
      "unlockMessage": "Requires highest level: 25"
    }
  ],
  "accountStats": {
    "totalKills": 1200,
    "totalDeaths": 2,
    "totalGoldEarned": 15000,
    "highestLevelReached": 20,
    "totalCrits": 85
  }
}
```

### POST /api/progression/unlock-passive
Unlock a permanent passive.

**Body:**
```json
{
  "channel": "mychannel",
  "passiveId": "improved_crits"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unlocked Improved Critical Strikes!",
  "passive": {
    "id": "improved_crits",
    "name": "Improved Critical Strikes",
    "description": "+3% critical strike chance and +20% critical damage",
    "effect": {
      "type": "combat_stats",
      "crit_chance": 0.03,
      "crit_damage": 0.20
    }
  },
  "unlockedPassives": ["efficient_killer", "improved_crits"]
}
```

### GET /api/progression/skills
Get character skills and cooldown status.

**Query Parameters:**
- `channel` (required): Channel name

**Response:**
```json
{
  "success": true,
  "skillPoints": 5,
  "skills": {
    "fireball": { "cooldown": 0, "lastUsed": 15 },
    "power_strike": { "cooldown": 2, "lastUsed": 12 }
  },
  "abilities": [
    {
      "name": "Berserker Rage",
      "description": "Enter a rage, dealing 150% damage for 3 turns",
      "cooldown": 5,
      "unlocked": true,
      "level_required": 1
    }
  ]
}
```

## Usage Examples

### Server-Side: Handle Level Up

```javascript
const { ProgressionManager } = require('./game');

// After combat victory
const progressionMgr = new ProgressionManager();
const xpGained = monster.xp_reward;

const result = progressionMgr.addXP(character, xpGained);

if (result.levelsGained > 0) {
  console.log(`Level up! Now level ${character.level}`);
  console.log(`Gained ${result.totalSkillPoints} skill points`);
  
  // Announce to chat
  await announceToChat(`${character.name} reached level ${character.level}!`);
}

// Save character
await db.saveCharacter(playerId, channelName, character);
```

### Server-Side: Handle Death

```javascript
const { ProgressionManager } = require('./game');

// After combat defeat
const progressionMgr = new ProgressionManager();
const permanentStats = await db.getPermanentStats(playerId);
const isHardcore = channel.settings.hardcoreMode || false;

const deathResult = progressionMgr.handleDeath(character, isHardcore, permanentStats);

if (deathResult.characterDeleted) {
  // Hardcore death
  await db.savePermanentStats(playerId, deathResult.permanentStatsToRetain);
  await db.deleteCharacter(playerId, channelName);
  
  await announceToChat(`${character.name} has fallen permanently in hardcore mode!`);
} else {
  // Normal death
  await db.saveCharacter(playerId, channelName, character);
  
  await announceToChat(`${character.name} died! Lost ${deathResult.goldLost} gold.`);
}
```

### Client-Side: Display Level Progress

```javascript
// Fetch XP info
const response = await fetch(`/api/progression/xp-info?channel=mychannel`);
const data = await response.json();

// Display progress bar
const progressBar = document.getElementById('xp-bar');
progressBar.style.width = data.xpProgress;
progressBar.textContent = `${data.currentXP} / ${data.xpToNext} XP`;

// Display level
document.getElementById('level').textContent = `Level ${data.level}`;
```

### Client-Side: Unlock Passive

```javascript
async function unlockPassive(passiveId) {
  const response = await fetch('/api/progression/unlock-passive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'mychannel',
      passiveId: passiveId
    })
  });

  const data = await response.json();
  
  if (data.success) {
    alert(`Unlocked: ${data.passive.name}!`);
    refreshPassiveList();
  } else {
    alert(`Cannot unlock: ${data.message}`);
  }
}
```

## XP Formula

```javascript
// XP required for next level
xpToNextLevel = BASE_XP_TO_LEVEL * (level ^ XP_SCALING)
// Default: 100 * (level ^ 1.5)

// Examples:
Level 1 → 2:   100 XP
Level 2 → 3:   282 XP
Level 5 → 6:   1118 XP
Level 10 → 11: 3162 XP
Level 20 → 21: 8944 XP
```

## Integration with Combat

The combat system automatically handles XP rewards:

```javascript
// In Combat.js victory handler
const xpReward = this.monster.xp_reward || 0;
character.gainXP(xpReward); // Simple version

// Or use ProgressionManager for full features
const progressionMgr = new ProgressionManager();
const result = progressionMgr.addXP(character, xpReward);
```

## Testing

Run the comprehensive test suite:

```bash
node Testing/test_progression_system.js
```

**Test Coverage:**
- ✅ XP calculation and scaling
- ✅ Single and multiple level ups
- ✅ Stat increases (base + class bonuses)
- ✅ Skill point rewards
- ✅ Normal death mechanics
- ✅ Hardcore death mechanics
- ✅ Respawn mechanics
- ✅ Passive bonus calculation
- ✅ Passive unlock requirements
- ✅ Skill cooldown management
- ✅ Full progression integration

## Future Enhancements

### Planned Features
- [ ] Prestige system (reset level for permanent bonuses)
- [ ] Skill trees with branching paths
- [ ] Talent point allocation
- [ ] Paragon levels (post-max level progression)
- [ ] Achievement-based passive unlocks
- [ ] Seasonal leaderboards
- [ ] XP boost events

### Balance Improvements
- [ ] Dynamic XP scaling based on monster difficulty
- [ ] Bonus XP for first-time kills
- [ ] Rested XP system
- [ ] Party XP sharing
- [ ] Level sync for group content

## Troubleshooting

**Character not leveling up**
- Check XP calculation: `progressionMgr.calculateXPToNextLevel(level)`
- Verify character.xp and character.xpToNext values
- Ensure addXP is being called after combat

**Skill points not awarded**
- Verify character has `skillPoints` property initialized
- Check that ProgressionManager increments `character.skillPoints`
- Ensure character is saved after level up

**Passive not unlocking**
- Check unlock requirements with `canUnlockPassive`
- Verify accountStats are being tracked correctly
- Ensure permanent_stats table exists in database

**Hardcore mode not deleting character**
- Verify `isHardcore` flag is set correctly
- Check that `deleteCharacter` DB function works
- Ensure permanentStats are saved before deletion

## Performance Notes

- XP calculations are O(1) constant time
- Level ups iterate once per level gained (typically 1-3 times max)
- Passive bonus calculation iterates over unlocked passives (< 50 typically)
- Database writes only on character save (not every XP gain)

---

**Created**: December 7, 2025  
**Version**: 1.0.0  
**Status**: ✅ Fully Implemented  
**Tests**: 13 passing
