# Combat System Documentation

## Overview

The Combat System provides turn-based combat with speed-based turn order, damage calculations, monster AI, status effects, and loot generation. It integrates with the Character System and Monster data to create engaging tactical combat encounters.

## Architecture

### Core Components

1. **Combat.js** - Main combat engine
   - Turn-based state machine
   - Speed-based turn order
   - Player and monster actions
   - Victory/defeat handling
   - Combat log tracking

2. **StatusEffectManager.js** - Buff/Debuff system
   - Status effect application and tracking
   - Duration management
   - Stacking effects
   - Damage over time (DOT)
   - Healing over time (HOT)

3. **LootGenerator.js** - Reward system
   - Loot table interpretation
   - Gold generation
   - Item drops with probability
   - Rarity-based equipment drops
   - Boss loot mechanics

## Combat Flow

### Turn Order
```
1. Combat starts with speed comparison
2. Higher agility/speed goes first
3. Each actor takes turns: Action → End Turn
4. Status effects proc at turn boundaries
5. Combat continues until victory, defeat, or flee
```

### Player Actions
- **Attack**: Basic attack dealing physical damage
- **Skill**: Use class-specific abilities (with cooldowns)
- **Item**: Consume potions or other combat items
- **Flee**: Attempt to escape (agility-based success rate)

### Monster Actions
- **Monster AI** decides between:
  - Basic attack (60% default)
  - Use ability if available (40%)
- Abilities respect cooldowns
- Passive abilities always active

## Damage Calculation

```javascript
// Base damage formula
baseDamage = attack - (defense * 0.5)

// Apply variance (90-110%)
variance = random(0.9, 1.1)
damage = baseDamage * variance

// Critical hit check
if (random() < critChance) {
  damage *= 2.0
}

// Apply status effect modifiers
damage *= (1 + statusModifiers.damage_multiplier)

// Final damage (minimum 1)
finalDamage = Math.max(1, Math.floor(damage))
```

### Critical Hits
- **Player**: 10% base critical chance
- **Monster**: 5% base critical chance
- **Multiplier**: 2.0x damage

## Status Effects

### Types
- **Buffs**: Positive effects (strength, defense, regeneration)
- **Debuffs**: Negative effects (poison, slow, weakness)
- **DOT**: Damage over time (poison, bleeding, fire)
- **HOT**: Healing over time (regeneration)

### Effect Properties
```javascript
{
  id: "poison",
  name: "Poison",
  type: "debuff",
  duration: 3,              // Turns remaining
  stacks: true,             // Can stack?
  max_stacks: 5,            // Stack limit
  damage_per_turn: 5,       // DOT damage
  effects: {
    attack_bonus: 10,       // Flat bonuses
    attack_multiplier: 0.15,// Percentage bonuses
    damage_reduction: 0.10  // Damage mitigation
  }
}
```

### Status Effect Manager API
```javascript
// Add effect
statusEffects.addEffect(effectData);

// Process turn (apply DOT, HOT, tick down)
const results = statusEffects.processTurn();

// Get modifiers for combat
const mods = statusEffects.getModifiers();

// Get active effects list
const active = statusEffects.getActiveEffects();

// Remove effect
statusEffects.removeEffect('poison');
```

## Monster Abilities

### Ability Types
- **Physical**: Physical damage attack (uses attack stat)
- **Magic**: Magical damage attack (uses magic stat)
- **Debuff**: Apply negative status effect
- **Passive**: Always-on bonuses

### Example Abilities
```json
{
  "bite": {
    "name": "Bite",
    "type": "physical",
    "damage_multiplier": 1.2,
    "description": "A savage bite attack"
  },
  "poison": {
    "name": "Poison",
    "type": "debuff",
    "effect": "poison_damage",
    "damage_per_turn": 5,
    "duration": 3
  },
  "regen": {
    "name": "Regeneration",
    "type": "passive",
    "effect": "heal_per_turn",
    "value": 0.05
  }
}
```

## Loot System

### Loot Generation
```javascript
const lootGen = new LootGenerator();
const loot = lootGen.generateLoot(monster);
// Returns: { gold: 15, items: [...] }
```

### Loot Tables
- Defined in `data/monster_loot.json`
- Each monster has a `loot_table` property
- Gold ranges: `[min, max]`
- Items have drop chances (0.0 - 1.0)

### Equipment Drops
- Chance based on monster rarity:
  - Common: 5%
  - Uncommon: 10%
  - Rare: 20%
  - Epic: 35%
  - Legendary: 50%
  - Mythic: 75%
- Equipment rarity capped at monster rarity
- Random equipment type selected from all gear categories

## API Endpoints

### Start Combat
```http
POST /api/combat/start
Content-Type: application/json

{
  "monsterId": "goblin_scout",
  "channelName": "mychannel"  // optional
}

Response:
{
  "success": true,
  "message": "Combat started with Goblin Scout!",
  "state": {
    "state": "in_combat",
    "turn": 0,
    "currentActor": "player",
    "player": {
      "name": "PlayerName",
      "hp": 100,
      "max_hp": 100,
      "status_effects": []
    },
    "monster": {
      "name": "Goblin Scout",
      "hp": 30,
      "max_hp": 30,
      "level": 2
    },
    "log": [...]
  }
}
```

### Get Combat State
```http
GET /api/combat/state

Response:
{
  "inCombat": true,
  "state": { ... }
}
```

### Attack
```http
POST /api/combat/attack

Response (ongoing):
{
  "success": true,
  "state": "in_combat",
  "log": [...],
  "player": { ... },
  "monster": { ... }
}

Response (victory):
{
  "success": true,
  "state": "victory",
  "victory": true,
  "rewards": {
    "xp": 25,
    "gold": 15,
    "items": [
      { "id": "goblin_ear", "name": "Goblin Ear", "quantity": 1 }
    ],
    "leveledUp": false
  },
  "log": [...]
}
```

### Use Skill
```http
POST /api/combat/skill
Content-Type: application/json

{
  "skillId": "power_strike"
}
```

### Use Item
```http
POST /api/combat/item
Content-Type: application/json

{
  "itemId": "health_potion"
}
```

### Flee
```http
POST /api/combat/flee

Response (success):
{
  "success": true,
  "state": "fled",
  "message": "You escaped!",
  "log": [...]
}

Response (failure):
{
  "success": true,
  "state": "in_combat",
  "log": ["Failed to flee!", "Monster attacks..."]
}
```

## Combat States

```javascript
Combat.STATES = {
  IDLE: 'idle',
  IN_COMBAT: 'in_combat',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  FLED: 'fled'
};
```

## Usage Example

### Server-side (Node.js)
```javascript
const Combat = require('./game/Combat');
const { Character } = require('./game');

// Load character and monster
const character = Character.fromObject(playerData);
const monster = loadMonster('goblin_scout');

// Start combat
const combat = new Combat(character, monster);

// Player attacks
let result = combat.playerAttack();

// Continue combat loop
while (result.state === 'in_combat') {
  if (combat.currentActor === 'player') {
    result = combat.playerAttack();
  } else {
    result = combat.monsterTurn();
  }
}

// Handle rewards
if (result.victory) {
  character.gold += result.rewards.gold;
  result.rewards.items.forEach(item => {
    character.inventory.addItem(item.id, item.quantity);
  });
}
```

### Client-side (JavaScript/Fetch)
```javascript
// Start combat
const startResponse = await fetch('/api/combat/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monsterId: 'goblin_scout' })
});
const combatData = await startResponse.json();

// Attack
const attackResponse = await fetch('/api/combat/attack', {
  method: 'POST'
});
const result = await attackResponse.json();

// Check for victory
if (result.victory) {
  console.log(`Victory! Gained ${result.rewards.xp} XP`);
}
```

## Testing

Run the comprehensive test suite:
```bash
node Testing/test_combat_system.js
```

### Test Coverage
- ✅ Combat initialization
- ✅ Turn order calculation
- ✅ Player attack mechanics
- ✅ Monster attack mechanics
- ✅ Victory handling with rewards
- ✅ Defeat handling with respawn
- ✅ Flee mechanics
- ✅ Monster AI and abilities
- ✅ Damage calculation variance
- ✅ Status effects application
- ✅ Loot generation
- ✅ Full combat simulation
- ✅ State serialization

## Integration Points

### With Character System
- Uses `Character.getFinalStats()` for combat stats
- Calls `Character.takeDamage()` and `Character.heal()`
- Uses `Character.gainXP()` for rewards
- Integrates with `InventoryManager` for items

### With Monster Data
- Loads from `data/monsters.json`
- Reads abilities from `data/monster_abilities.json`
- Uses loot tables from `data/monster_loot.json`
- Accesses status effects from `data/status_effects.json`

### With Server
- Session-based combat persistence
- Auto-saves character on combat end
- Handles combat state between requests
- Cleanup on victory/defeat/flee

## Future Enhancements

### Planned Features
- [ ] Multi-target abilities
- [ ] Environment effects (weather, terrain)
- [ ] Combat events (reinforcements, traps)
- [ ] Combo system (chain attacks)
- [ ] Parry/block mechanics
- [ ] Elemental damage types
- [ ] Monster formations (groups)
- [ ] Boss mechanics (phases, enrage)

### Balance Improvements
- [ ] Difficulty scaling by player level
- [ ] Monster stat tuning
- [ ] Loot drop rate adjustment
- [ ] Critical hit balancing
- [ ] Status effect duration tuning

## Troubleshooting

### Common Issues

**Combat not starting**
- Ensure player is logged in (`req.session.user`)
- Verify monster ID exists in `monsters.json`
- Check player has character created

**Damage seems wrong**
- Review defense formula (50% reduction)
- Check for status effect modifiers
- Verify equipment stats are calculated

**Loot not generating**
- Confirm monster has `loot_table` property
- Check loot table exists in `monster_loot.json`
- Verify item IDs in loot table are valid

**Session issues**
- Combat stored in `req.session.combat`
- Session must be saved after modifications
- Clear combat session on end (victory/defeat/flee)

## Performance Notes

- Combat state is session-based (memory)
- No database writes during combat
- Save only on combat end
- Cache monster/ability data where possible
- Loot generation is fast (< 1ms)

## Security Considerations

- Validate all user input (monster IDs, skill IDs, item IDs)
- Check turn ownership before actions
- Verify inventory for item usage
- Prevent combat manipulation via session
- Rate limit combat endpoints

---

**Created**: December 7, 2025  
**Version**: 1.0.0  
**Status**: ✅ Fully Implemented
