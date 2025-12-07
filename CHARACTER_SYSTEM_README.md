# Character System Documentation

## Overview

The Character System is a comprehensive object-oriented implementation that manages all character-related operations including stats, equipment, inventory, and progression. Built with OOP principles for maintainability and extensibility.

## Architecture

### Core Classes

#### 1. **Character** (`game/Character.js`)
The main character class that encapsulates all character data and operations.

**Key Features:**
- Stat calculation (base + equipment bonuses)
- Level progression with XP tracking
- HP management (current/max)
- Gold management
- Equipment and inventory integration
- Database serialization

**Usage Example:**
```javascript
const Character = require('./game/Character');

// Create a new warrior
const warrior = Character.createNew('Conan', 'warrior');

// Get stats
const stats = warrior.getFinalStats();
console.log(`Attack: ${stats.attack}, Defense: ${stats.defense}`);

// Gain XP and level up
const result = warrior.gainXP(50);
if (result.leveledUp) {
  console.log(`Leveled up to ${result.newLevel}!`);
}

// Equip an item
warrior.addToInventory('iron_sword');
const equipResult = warrior.equipItem('iron_sword');

// Save to database
const dbData = warrior.toDatabase();
```

**Key Methods:**
- `getBaseStats()` - Calculate stats from class and level
- `getEquipmentStats()` - Get bonuses from equipped items
- `getFinalStats()` - Calculate total stats (base + equipment)
- `getStatsBreakdown()` - Get detailed breakdown for display
- `equipItem(itemId)` - Equip item from inventory
- `unequipItem(slot)` - Unequip item to inventory
- `gainXP(amount)` - Gain experience and handle leveling
- `heal(amount)` - Heal character
- `takeDamage(amount)` - Apply damage with defense calculation
- `addGold(amount)` / `spendGold(amount)` - Gold management

#### 2. **EquipmentManager** (`game/EquipmentManager.js`)
Manages character equipment slots and stat calculations.

**Equipment Slots:**
- Main Hand (weapons)
- Off Hand (shields, secondary weapons)
- Headgear
- Armor (chest)
- Legs
- Footwear
- Hands (gloves)
- Cape
- Amulet
- Ring1, Ring2
- Belt
- Flavor1, Flavor2, Flavor3 (cosmetic)

**Key Features:**
- Equipment validation (level requirements)
- Automatic slot management
- Stat aggregation from all equipped items
- Item data caching for performance

**Usage Example:**
```javascript
const EquipmentManager = require('./game/EquipmentManager');

const equipment = new EquipmentManager();

// Equip an item
const result = equipment.equip('iron_sword', playerLevel);
if (result.success) {
  console.log(result.message);
  if (result.unequipped) {
    console.log(`Unequipped: ${result.unequipped}`);
  }
}

// Get all stats from equipment
const stats = equipment.getTotalStats();
console.log(`Total attack from equipment: ${stats.attack}`);

// Get equipment summary
const summary = equipment.getSummary();
console.log(`Equipped items: ${summary.occupiedSlots}`);
```

**Key Methods:**
- `equip(itemId, playerLevel)` - Equip an item
- `unequip(slot)` - Unequip from slot
- `getTotalStats()` - Calculate all stat bonuses
- `getAllEquipped()` - Get all equipped items with data
- `getSummary()` - Get formatted equipment summary
- `isSlotEmpty(slot)` - Check if slot is empty

#### 3. **InventoryManager** (`game/InventoryManager.js`)
Manages character inventory with capacity limits and item stacking.

**Key Features:**
- Configurable capacity (default 30 slots)
- Item stacking support
- Item categorization (equipment, consumables, misc)
- Rarity-based sorting
- Item counting and filtering

**Usage Example:**
```javascript
const InventoryManager = require('./game/InventoryManager');

const inventory = new InventoryManager([], 30);

// Add items
inventory.addItem('Potion', 5);
inventory.addItem('iron_sword');

// Check for item
if (inventory.hasItem('Potion')) {
  const count = inventory.getItemCount('Potion');
  console.log(`Has ${count} potions`);
}

// Remove items
inventory.removeItem('Potion', 2);

// Get inventory summary
const summary = inventory.getSummary();
console.log(`Using ${summary.size}/${summary.maxCapacity} slots`);
console.log(`Total value: ${summary.totalValue} gold`);
```

**Key Methods:**
- `addItem(itemId, quantity)` - Add item to inventory
- `removeItem(itemId, quantity)` - Remove item from inventory
- `hasItem(itemId)` - Check if item exists
- `getItemCount(itemId)` - Get quantity of specific item
- `getItemsWithCounts()` - Get all items with counts and data
- `getSummary()` - Get formatted inventory summary
- `isFull()` - Check if inventory is at capacity

#### 4. **CharacterInitializer** (`game/CharacterInitializer.js`)
Handles character creation and class initialization.

**Key Features:**
- Class data loading and validation
- Starting equipment assignment
- Stat progression calculation
- Class comparison tools
- Preview system for class progression

**Usage Example:**
```javascript
const CharacterInitializer = require('./game/CharacterInitializer');

// Get all available classes
const classes = CharacterInitializer.getAvailableClasses();
console.log(`Available classes: ${classes.map(c => c.name).join(', ')}`);

// Get class details
const warriorInfo = CharacterInitializer.getClassInfo('warrior');
console.log(`${warriorInfo.name}: ${warriorInfo.description}`);

// Preview class progression
const preview = CharacterInitializer.previewClassProgression('mage', 10);
console.log('Mage stats at level 10:', preview.progression[9]);

// Compare classes
const comparison = CharacterInitializer.compareClasses(['warrior', 'mage', 'rogue']);
comparison.forEach(cls => {
  console.log(`${cls.name} strengths: ${cls.strengths.join(', ')}`);
});
```

**Key Methods:**
- `getAvailableClasses()` - List all classes
- `getClassInfo(classType)` - Get detailed class data
- `isValidClass(classType)` - Validate class exists
- `getStartingEquipment(classType)` - Get starting items
- `previewClassProgression(classType, maxLevel)` - Preview stats at levels
- `compareClasses(classTypes)` - Compare multiple classes

## Database Integration

### Schema Updates

Added `base_stats` JSONB field to `player_progress` table for storing character base stats.

### Database Functions

**New functions in `db.js`:**
- `getCharacter(playerId, channelName)` - Load character as Character instance
- `saveCharacter(playerId, channelName, character)` - Save Character instance
- `createCharacter(playerId, channelName, playerName, classType, location)` - Create new character

**Usage Example:**
```javascript
const db = require('./db');

// Create a new character
const character = await db.createCharacter(
  'user123', 
  'streamername', 
  'PlayerName', 
  'warrior',
  'Town Square'
);

// Load existing character
const loadedChar = await db.getCharacter('user123', 'streamername');

// Modify and save
loadedChar.gainXP(100);
loadedChar.addGold(50);
await db.saveCharacter('user123', 'streamername', loadedChar);
```

## API Endpoints

### Class Information

#### `GET /api/classes`
Get all available character classes.

**Response:**
```json
{
  "success": true,
  "classes": [
    {
      "id": "warrior",
      "name": "Warrior",
      "description": "A battle-hardened fighter...",
      "startingStats": { "max_hp": 110, "strength": 5, ... },
      "specialAbility": "Berserker Rage"
    }
  ]
}
```

#### `GET /api/classes/:classType`
Get detailed information about a specific class.

**Parameters:**
- `classType` - Class ID (warrior, mage, rogue, cleric, ranger)

**Response:**
```json
{
  "success": true,
  "class": {
    "id": "warrior",
    "name": "Warrior",
    "description": "...",
    "starting_stats": { ... },
    "stat_bonuses": { ... },
    "special_ability": { ... },
    "starting_equipment": { ... }
  }
}
```

#### `GET /api/classes/:classType/preview?maxLevel=10`
Preview class stat progression.

**Query Parameters:**
- `maxLevel` - Maximum level to preview (default: 10)

**Response:**
```json
{
  "success": true,
  "preview": {
    "classId": "warrior",
    "className": "Warrior",
    "description": "...",
    "specialAbility": { ... },
    "progression": [
      { "level": 1, "hp": 110, "strength": 5, ... },
      { "level": 2, "hp": 120, "strength": 6, ... }
    ]
  }
}
```

### Character Management

#### `POST /api/player/create`
Create a new character.

**Body:**
```json
{
  "channel": "streamername",
  "classType": "warrior",
  "name": "CharacterName"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Created warrior character: CharacterName",
  "character": { ... }
}
```

#### `GET /api/player/stats?channel=streamername`
Get detailed character stats breakdown.

**Response:**
```json
{
  "success": true,
  "stats": {
    "character": {
      "name": "PlayerName",
      "class": "Warrior",
      "level": 5,
      "hp": 150,
      "maxHp": 150,
      "gold": 250
    },
    "baseStats": {
      "strength": 12,
      "defense": 8,
      "magic": 1,
      "agility": 3
    },
    "equipmentStats": {
      "attack": 15,
      "defense": 8,
      ...
    },
    "finalStats": {
      "attack": 27,
      "defense": 16,
      "critChance": "7.5%",
      ...
    }
  }
}
```

#### `GET /api/player/inventory?channel=streamername`
Get player inventory with item details.

**Response:**
```json
{
  "success": true,
  "inventory": {
    "size": 8,
    "maxCapacity": 30,
    "availableSlots": 22,
    "totalValue": 145,
    "items": [
      {
        "id": "Potion",
        "name": "Potion",
        "count": 3,
        "rarity": "common",
        "type": "consumable",
        "value": 10
      }
    ]
  }
}
```

#### `GET /api/player/equipment?channel=streamername`
Get equipped items with details.

**Response:**
```json
{
  "success": true,
  "equipment": {
    "equipped": {
      "main_hand": {
        "id": "iron_sword",
        "name": "Iron Sword",
        "rarity": "common",
        "stats": { "attack": 15 }
      },
      "armor": { ... },
      ...
    },
    "totalStats": { "attack": 15, "defense": 8, ... },
    "totalValue": 250,
    "emptySlots": 12,
    "occupiedSlots": 3
  }
}
```

#### `POST /api/player/equip`
Equip an item from inventory.

**Body:**
```json
{
  "channel": "streamername",
  "itemId": "iron_sword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Equipped Iron Sword in main_hand.",
  "slot": "main_hand",
  "unequipped": "rusty_sword"
}
```

#### `POST /api/player/unequip`
Unequip an item to inventory.

**Body:**
```json
{
  "channel": "streamername",
  "slot": "main_hand"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unequipped Iron Sword from main_hand.",
  "item": { "id": "iron_sword", ... },
  "slot": "main_hand"
}
```

## Available Character Classes

### Warrior
- **Role:** Tank / Melee DPS
- **Starting HP:** 110
- **High Stats:** Strength (5), Defense (4)
- **Low Stats:** Magic (1)
- **Special:** Berserker Rage (150% damage, 3 turns)
- **Growth:** Great HP and Strength
- **Starting Equipment:** Rusty Sword, Padded Vest

### Mage
- **Role:** Magic DPS
- **Starting HP:** 80
- **High Stats:** Magic (6)
- **Low Stats:** Strength (1), HP
- **Special:** Arcane Blast (200% magic damage)
- **Growth:** Excellent Magic
- **Starting Equipment:** Wooden Staff, Rough Tunic

### Rogue
- **Role:** Physical DPS / Agility
- **Starting HP:** 90
- **High Stats:** Agility (6)
- **Low Stats:** Magic (1)
- **Special:** Shadow Strike (guaranteed crit + dodge)
- **Growth:** Great Agility
- **Starting Equipment:** Rusty Dagger, Padded Vest

### Cleric
- **Role:** Support / Healer
- **Starting HP:** 100
- **High Stats:** Magic (5), Defense (4)
- **Balanced:** All stats
- **Special:** Divine Intervention (heal + invulnerability)
- **Growth:** Balanced Magic and Defense
- **Starting Equipment:** Wooden Mace, Rough Tunic

### Ranger
- **Role:** Ranged DPS
- **Starting HP:** 95
- **High Stats:** Agility (5)
- **Balanced:** Strength (3), Defense (3)
- **Special:** Multishot (3 attacks at 80% damage)
- **Growth:** Balanced Agility and Strength
- **Starting Equipment:** Short Bow, Padded Vest

## Stat System

### Base Stats
Calculated from class starting stats + (stat_per_level × (level - 1))

- **Strength:** Increases attack power and physical damage
- **Defense:** Reduces incoming damage (1% per point)
- **Magic:** Increases magical damage and effects
- **Agility:** Affects crit chance (0.5% per point) and dodge chance (0.3% per point)
- **HP:** Health points, increases per level

### Equipment Stats
Items provide flat bonuses:
- Attack, Defense, Magic, Strength, Agility, HP
- Special stats: Crit Chance, Dodge Chance, Block Chance

### Final Stats
Base Stats + Equipment Stats = Final Stats

### Derived Stats
- **Attack:** Equipment attack + Strength
- **Crit Chance:** Agility × 0.5 + Equipment bonus (max 100%)
- **Dodge Chance:** Agility × 0.3 + Equipment bonus (max 75%)
- **Block Chance:** Defense × 0.2 + Equipment bonus (max 50%)

## Testing

Run the test suite to verify all systems:

```bash
node Testing/test_character_system.js
```

The test suite covers:
1. Class initialization
2. Character creation for all classes
3. Stat calculations
4. Level up system
5. Inventory management
6. Equipment system
7. Combat damage calculation
8. Gold system
9. Stats breakdown
10. Class comparison
11. Database export/import
12. Class progression preview

## Next Steps

To integrate this system into your game:

1. **Combat System:** Use `getFinalStats()` for damage calculations
2. **Quest System:** Use `gainXP()`, `addGold()`, `addToInventory()`
3. **Shop System:** Use `canAfford()`, `spendGold()`, equipment methods
4. **UI Integration:** Use API endpoints to display character info
5. **Save System:** Use `toDatabase()` and Character constructor for persistence

## Example Integration

```javascript
// In combat system
const character = await db.getCharacter(playerId, channel);
const stats = character.getFinalStats();
const damage = calculateDamage(stats.attack, enemyDefense);
const result = character.takeDamage(enemyDamage);

if (result.isDead) {
  // Handle death
} else {
  await db.saveCharacter(playerId, channel, character);
}

// In quest completion
character.gainXP(100);
character.addGold(50);
character.addToInventory('health_potion', 3);
await db.saveCharacter(playerId, channel, character);

// In shop
if (character.canAfford(itemPrice)) {
  character.spendGold(itemPrice);
  character.addToInventory(itemId);
  await db.saveCharacter(playerId, channel, character);
}
```
