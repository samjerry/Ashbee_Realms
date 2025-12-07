# Monster Data System

## Overview
The monster system uses a modular approach with separate files for different concerns:

- `monster_abilities.json` - All ability definitions with effects
- `monster_templates.json` - Reusable templates and rarity modifiers
- `monster_stats_compact.json` - Compact monster data using references
- `monster_loot.json` - Loot table definitions
- `data_loader.js` - Combines everything into usable format

## Benefits

1. **Easy Editing**: Change one ability definition affects all monsters using it
2. **Consistency**: Templates ensure similar monsters have similar stats
3. **No Duplication**: Each piece of data defined once
4. **Flexible**: Easy to add new monsters or modify existing ones
5. **Backward Compatible**: Can generate full JSON if needed

## Adding a New Monster

```json
{
  "id": "new_monster",
  "name": "New Monster",
  "template": "beast_base",
  "rarity": "common",
  "description": "Description here",
  "biomes": ["whispering_woods"],
  "level_range": [1, 5],
  "stats": [hp, attack, defense, agility],
  "abilities": ["bite", "charge"],
  "loot": "beast_common"
}

Adding a New Ability
"new_ability": {
  "name": "New Ability",
  "type": "physical|magic|passive|active",
  "element": "fire|ice|lightning|etc",
  "damage_multiplier": 1.5,
  "effect": "effect_name",
  "value": 0.3,
  "description": "What it does"
}
```

```js
Usage in Code
const MonsterDataLoader = require('./data_loader');

const loader = new MonsterDataLoader('./data');
loader.load();

// Get specific monster
const wolf = loader.getMonster('forest_wolf');

// Get monsters by biome
const forestMonsters = loader.getMonstersByBiome('whispering_woods');

// Get monsters by rarity
const rareMonsters = loader.getMonstersByRarity('rare');

// Generate full JSON for backward compatibility
loader.generateFullJSON('./data/monsters_full.json');
```