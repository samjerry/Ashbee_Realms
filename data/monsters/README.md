# Monster System Documentation

## Overview

The monster system uses a **rarity-based organization** with **multi-type support** and a comprehensive **tag system** for flexible categorization.

## File Structure

### Rarity-Based Monster Files
```
data/monsters/
├── common.json       - Common rarity monsters (34)
├── uncommon.json     - Uncommon rarity monsters (54)
├── rare.json         - Rare rarity monsters (55)
├── epic.json         - Epic rarity monsters (55)
├── legendary.json    - Legendary rarity monsters (54)
├── mythic.json       - Mythic rarity monsters (36)
├── boss.json         - Boss rarity monsters (154)
└── type_templates.json - Type modifiers and definitions
```

## Monster Data Structure

Each monster has the following structure:

```json
{
  "id": "aboleth",
  "name": "Aboleth",
  "types": ["aberration", "aquatic"],
  "primary_type": "aberration",
  "tags": ["psychic", "ancient", "enslaver"],
  "rarity": "rare",
  "description": "An ancient psychic aberration that enslaves minds",
  "biomes": ["twilight_wetlands", "void_realm"],
  "level_range": [18, 24],
  "base_stats": {
    "hp": 185,
    "attack": 72,
    "defense": 55,
    "speed": 62,
    "magic": 92
  },
  "abilities": ["psychic_enslavement", "mucus_cloud", "ancient_knowledge"],
  "loot": "rare_aquatic"
}
```

### Field Descriptions

- **id**: Unique identifier for the monster
- **name**: Display name
- **types**: Array of creature types (supports multiple types)
- **primary_type**: Main creature type (used for primary categorization)
- **tags**: Additional descriptive tags (e.g., "psychic", "poisonous", "regenerating")
- **rarity**: Monster rarity level
- **description**: Flavor text
- **biomes**: Array of biomes where the monster can be found
- **level_range**: [min, max] level range
- **base_stats**: Core stats object
  - **hp**: Hit points
  - **attack**: Attack power
  - **defense**: Defense rating
  - **speed**: Speed/agility rating
  - **magic**: Magic power (optional)
- **abilities**: Array of ability identifiers
- **loot**: Loot table identifier

## Multi-Type System

Monsters can belong to multiple types simultaneously, allowing for rich categorization:

### Examples

- **Aboleth**: `["aberration", "aquatic"]` - Psychic aberration that lives underwater
- **Dragon Turtle**: `["dragon", "aquatic"]` - Dragon-like creature adapted for water
- **Troll**: `["giant", "monstrosity"]` - Large humanoid with monstrous regeneration

### Type Modifiers

When a monster has multiple types, stat modifiers from `type_templates.json` are **averaged** across all types:

```javascript
// Example: Aboleth has types ["aberration", "aquatic"]
// Aberration: hp_multiplier = 1.0, magic_bonus = 15
// Aquatic: hp_multiplier = 1.2, magic_bonus = 5
// 
// Final modifiers:
// hp_multiplier = (1.0 + 1.2) / 2 = 1.1
// magic_bonus = (15 + 5) / 2 = 10
```

## Available Types

The system supports 17 creature types:

1. **aberration** - Creatures from beyond reality
2. **aquatic** - Water-dwelling creatures
3. **beast** - Natural animals and creatures
4. **celestial** - Holy beings from higher planes
5. **construct** - Artificial beings and golems
6. **dragon** - Powerful reptilian creatures
7. **elemental** - Living manifestations of elements
8. **fey** - Magical beings from the feywild
9. **fiend** - Evil outsiders from lower planes
10. **giant** - Huge humanoid creatures
11. **humanoid** - Human-like creatures
12. **insectoid** - Giant insects and arachnids
13. **lycanthrope** - Cursed shapeshifters
14. **monstrosity** - Unnatural hybrid creatures
15. **ooze** - Gelatinous creatures
16. **plant** - Animated vegetation
17. **undead** - Reanimated dead creatures

## Tag System

Tags provide additional categorization beyond types:

- **psychic** - Mind-based abilities
- **poisonous** - Poison attacks/abilities
- **fire/ice/lightning** - Elemental affinities
- **stealthy** - Stealth capabilities
- **regenerating** - Regeneration abilities
- **magical** - Magic-focused
- **ancient** - Ancient/elder creatures
- **boss** - Boss-tier encounter (different from rarity)
- **enslaver** - Mind control abilities
- **draining** - Life/energy drain

**Note**: Tags should NOT duplicate information already present in the `types` or `primary_type` fields.

## Usage Examples

### Loading Monsters

```javascript
const MonsterDataLoader = require('./data/data_loader');
const loader = new MonsterDataLoader('./data');
loader.load();
```

### Querying by Type

```javascript
// Get all dragons
const dragons = loader.getMonstersByType('dragon');

// Get all aberrations
const aberrations = loader.getMonstersByType('aberration');
```

### Multi-Type Queries

```javascript
// Get monsters that are BOTH aberration AND aquatic
const aberrationAquatic = loader.getMonstersByTypes(
  ['aberration', 'aquatic'], 
  true  // requireAll = true
);

// Get monsters that are dragon OR aquatic
const dragonOrAquatic = loader.getMonstersByTypes(
  ['dragon', 'aquatic'], 
  false  // requireAll = false
);
```

### Query by Rarity

```javascript
const rareMonsters = loader.getMonstersByRarity('rare');
```

### Query by Biome

```javascript
const wetlandMonsters = loader.getMonstersByBiome('twilight_wetlands');
```

## Migration

The system was migrated from category-based files (aberrations.json, beasts.json, etc.) to rarity-based files. The migration script (`data/migrate_monsters.js`) handles:

- Grouping monsters by rarity
- Converting stats arrays to base_stats objects
- Adding types and primary_type fields
- Inferring tags from abilities and descriptions
- Special handling for multi-type monsters

## Backward Compatibility

A generated `data/monsters.json` file provides backward compatibility for systems expecting the old format. This file is automatically regenerated by the data loader.

## Statistics

- **Total Monsters**: 442
- **Multi-Type Monsters**: 7
- **Creature Types**: 17
- **Rarity Levels**: 7

### Distribution by Rarity
- Common: 34
- Uncommon: 54
- Rare: 55
- Epic: 55
- Legendary: 54
- Mythic: 36
- Boss: 154
