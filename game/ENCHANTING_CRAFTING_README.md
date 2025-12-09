# 🔮 Enchanting & Crafting System

Comprehensive gear improvement and item crafting system with materials, recipes, and skill progression.

## 📋 Table of Contents
- [Overview](#overview)
- [Enchanting System](#enchanting-system)
- [Crafting System](#crafting-system)
- [API Endpoints](#api-endpoints)
- [Integration Guide](#integration-guide)
- [Examples](#examples)

---

## 🌟 Overview

The Enchanting & Crafting System allows players to:
- **Enchant** gear with magical properties (success rates, materials required)
- **Craft** items, potions, and equipment from materials
- **Level up** crafting skills through experience
- **Discover** new recipes
- **Salvage** items for materials
- **Disenchant** gear to recover materials

### Key Features
- ✅ 35+ enchantments for weapons, armor, and accessories
- ✅ Success rate system (95% → 30% based on rarity)
- ✅ Failure consequences (lose enchantment or destroy item)
- ✅ Crafting skill progression (XP and levels)
- ✅ Recipe discovery system
- ✅ Material gathering and conversion
- ✅ Salvaging system for item breakdown

---

## 🔮 Enchanting System

### Enchantment Types

**Weapon Enchantments** (main_hand, off_hand)
- **Sharpness I-III**: +5/+12/+20 attack damage
- **Fire Aspect I-II**: 3-8 / 8-15 fire damage + burn chance
- **Frost I-II**: 3-8 / 8-15 ice damage + slow chance
- **Life Steal I-II**: 10%/20% damage returned as HP
- **Critical Strike I-II**: +5%/+10% crit chance
- **Vorpal**: +15% damage to bosses

**Armor Enchantments** (headgear, armor, legs, footwear)
- **Protection I-III**: +5/+12/+20 defense
- **Thorns I-II**: 10%/20% damage reflection
- **Regeneration I-II**: Heal 2/4 HP per turn
- **Fortitude I-II**: +10/+20 max HP
- **Resistance I-II**: +5%/+10% magic resistance

**Utility Enchantments** (accessories)
- **Speed I-II**: +2/+4 agility
- **Lucky**: +5% better loot
- **Invisibility**: +10% dodge chance
- **Scavenger**: +10% gold from monsters

### Success Rates

| Rarity     | Success Rate | Failure: Nothing | Failure: Lose Enchant | Failure: Destroy Item |
|------------|--------------|------------------|----------------------|-----------------------|
| Common     | 95%          | 60%              | 30%                  | 10%                   |
| Uncommon   | 85%          | 60%              | 30%                  | 10%                   |
| Rare       | 70%          | 60%              | 30%                  | 10%                   |
| Epic       | 50%          | 60%              | 30%                  | 10%                   |
| Legendary  | 30%          | 60%              | 30%                  | 10%                   |

### Material Requirements

| Enchantment Rarity | Materials Required                                              | Gold Cost |
|--------------------|----------------------------------------------------------------|-----------|
| Common             | 1x Enchanting Dust                                             | 100-200   |
| Uncommon           | 2x Enchanting Dust, 1x Mystic Essence                          | 300-500   |
| Rare               | 2x Mystic Essence, 1x Arcane Crystal                           | 800-1200  |
| Epic               | 2x Arcane Crystal, 1x Ethereal Shard                           | 2000-3000 |
| Legendary          | 2x Ethereal Shard, 1x Celestial Fragment                       | 5000+     |

### Enchantment Limits

Items can hold a maximum number of enchantments based on their rarity:
- **Common**: 1 enchantment
- **Uncommon**: 2 enchantments
- **Rare**: 3 enchantments
- **Epic**: 4 enchantments
- **Legendary**: 5 enchantments
- **Mythic**: 6 enchantments

### Operations

#### 1. **Enchant Item**
Apply an enchantment to gear with a success rate.

**Requirements**:
- Gold cost (varies by enchantment)
- Required materials
- Item not at max enchantments
- Prerequisites met (for upgrade enchantments)

**Possible Outcomes**:
- ✅ Success: Enchantment applied, materials consumed
- ❌ Nothing happens: Materials consumed, gold spent
- ❌ Lose random enchantment: Materials consumed, lose 1 enchantment
- ❌ Item destroyed: Materials consumed, item removed from inventory

#### 2. **Remove Enchantment**
Remove a specific enchantment from gear for 50% of the application cost.

#### 3. **Disenchant Item**
Destroy an enchanted item to recover 50% of the materials used.

---

## 🔨 Crafting System

### Recipe Categories

1. **Potions** (`consumables_extended.json`)
   - Health potions, mana potions, stat buffs
   - Skill requirement: 1-15
   - Materials: herbs, crystals, vials

2. **Consumables** (Food)
   - Food items for HP/stat restoration
   - Skill requirement: 1-10
   - Materials: meat, vegetables, spices

3. **Equipment** (Hardcoded recipes)
   - **Iron Sword**: 3x Iron Ore, 1x Wood (Level 5, 50 gold)
   - **Steel Sword**: 3x Steel Ingot, 1x Wood (Level 10, 150 gold)
   - **Leather Armor**: 4x Leather, 2x Thread (Level 3, 40 gold)
   - **Chainmail**: 6x Iron Ore, 2x Leather (Level 8, 120 gold)

4. **Materials** (Refinement)
   - **Refined Iron**: 2x Iron Ore (Level 2, 10 gold)
   - **Enchanting Dust**: 1x Arcane Powder, 1x Crystal Fragment (Level 5, 20 gold)
   - **Mystic Essence**: 2x Enchanting Dust, 1x Arcane Powder (Level 10, 25 gold)

### Skill Progression

- **XP per Level**: 100 XP
- **XP Rewards**:
  - Common craft: 10 XP
  - Uncommon craft: 25 XP
  - Rare craft: 50 XP
  - Epic craft: 100 XP
  - Legendary craft: 250 XP

**Crafting Level** = floor(craftingXP / 100)

### Operations

#### 1. **Craft Item**
Create an item from a recipe.

**Requirements**:
- Crafting level ≥ skill_required
- All ingredients in inventory
- Gold cost

**Result**:
- Item added to inventory
- Ingredients consumed
- Gold deducted
- XP gained
- Possible level up

#### 2. **Salvage Item**
Break down an item for materials.

**Returns**:
- **Consumables**: 25% of ingredients
- **Equipment (common)**: 50% of ingredients
- **Equipment (uncommon+)**: 60% of ingredients
- **Enchanted items**: +10% material recovery per enchantment

#### 3. **Discover Recipe**
Learn a new crafting recipe.

**Cost**: Free (may add gold cost later)

**Result**: Recipe added to character's `knownRecipes` array

---

## 🌐 API Endpoints

### Enchanting Endpoints

#### **GET** `/api/enchanting/enchantments`
List all enchantments (optional `?slot=main_hand` filter).

**Response**:
```json
{
  "success": true,
  "enchantments": [
    {
      "id": "sharpness_1",
      "name": "Sharpness I",
      "description": "+5 attack damage",
      "rarity": "common",
      "slot": "main_hand",
      "stats": { "attack": 5 },
      "cost": 100,
      "materials": [{ "id": "enchanting_dust", "quantity": 1 }]
    }
  ]
}
```

#### **GET** `/api/enchanting/enchantment/:enchantmentId`
Get details for a specific enchantment.

**Response**:
```json
{
  "success": true,
  "enchantment": { ... },
  "materials": [ ... ],
  "upgradePath": ["sharpness_1", "sharpness_2", "sharpness_3"]
}
```

#### **POST** `/api/enchanting/enchant`
Apply an enchantment to an item.

**Request Body**:
```json
{
  "player": "player123",
  "channel": "streamer",
  "itemId": "iron_sword",
  "enchantmentId": "sharpness_1"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully enchanted Iron Sword with Sharpness I!",
  "item": {
    "id": "iron_sword",
    "name": "Iron Sword",
    "enchantments": [{ "id": "sharpness_1", "name": "Sharpness I", "stats": { "attack": 5 } }]
  },
  "materialsUsed": [{ "id": "enchanting_dust", "quantity": 1 }],
  "goldSpent": 100
}
```

**Failure Response** (if enchanting fails):
```json
{
  "success": true,
  "failed": true,
  "consequence": "nothing", // or "lost_enchantment" or "item_destroyed"
  "message": "The enchantment failed and nothing happened.",
  "goldSpent": 100,
  "materialsLost": [ ... ]
}
```

#### **POST** `/api/enchanting/remove`
Remove an enchantment from an item.

**Request Body**:
```json
{
  "player": "player123",
  "channel": "streamer",
  "itemId": "iron_sword",
  "enchantmentIndex": 0
}
```

#### **POST** `/api/enchanting/disenchant`
Disenchant an item to recover materials.

**Request Body**:
```json
{
  "player": "player123",
  "channel": "streamer",
  "itemId": "enchanted_sword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Disenchanted Enchanted Sword",
  "materials": [
    { "id": "enchanting_dust", "name": "Enchanting Dust", "quantity": 1 }
  ],
  "itemDestroyed": true
}
```

### Crafting Endpoints

#### **GET** `/api/crafting/recipes`
List all recipes (optional filters: `?category=potions`, `?player=X&channel=Y` for craftable only).

**Response**:
```json
{
  "success": true,
  "recipes": [
    {
      "id": "iron_sword",
      "name": "Iron Sword",
      "type": "weapon",
      "rarity": "common",
      "ingredients": ["iron_ore", "iron_ore", "iron_ore", "wood"],
      "skill_required": 5,
      "gold_cost": 50
    }
  ]
}
```

#### **GET** `/api/crafting/recipe/:recipeId`
Get details for a specific recipe.

**Response**:
```json
{
  "success": true,
  "recipe": { ... },
  "canCraft": true,
  "missingIngredients": [],
  "needsLevel": 0,
  "needsGold": 0
}
```

#### **POST** `/api/crafting/craft`
Craft an item from a recipe.

**Request Body**:
```json
{
  "player": "player123",
  "channel": "streamer",
  "recipeId": "iron_sword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully crafted Iron Sword!",
  "item": { "id": "iron_sword", "name": "Iron Sword", "attack": 15 },
  "xpGained": 10,
  "leveledUp": false,
  "craftingLevel": 1
}
```

#### **POST** `/api/crafting/salvage`
Salvage an item for materials.

**Request Body**:
```json
{
  "player": "player123",
  "channel": "streamer",
  "itemId": "iron_sword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Salvaged Iron Sword",
  "materials": [
    { "id": "iron_ore", "quantity": 2 },
    { "id": "wood", "quantity": 1 }
  ]
}
```

#### **GET** `/api/crafting/summary`
Get crafting statistics for a character.

**Query**: `?player=player123&channel=streamer`

**Response**:
```json
{
  "success": true,
  "level": 5,
  "xp": 500,
  "xpToNext": 600,
  "knownRecipes": 12,
  "totalRecipes": 45,
  "craftedCount": 28
}
```

#### **POST** `/api/crafting/discover`
Discover a new recipe.

**Request Body**:
```json
{
  "player": "player123",
  "channel": "streamer",
  "recipeId": "steel_sword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Discovered recipe: Steel Sword",
  "recipe": { ... }
}
```

---

## 🔗 Integration Guide

### Adding to Character Class

Already implemented in `game/Character.js`:

```javascript
// Constructor
this.craftingXP = data.crafting_xp || 0;
this.knownRecipes = data.known_recipes || [];

// toDatabase()
return {
  // ... other fields
  crafting_xp: this.craftingXP,
  known_recipes: this.knownRecipes
};
```

### Database Schema

Added to `player_progress` table in `db.js`:

```sql
crafting_xp INTEGER DEFAULT 0,
known_recipes JSONB DEFAULT '[]'
```

### Using in Bot Commands

```javascript
const { EnchantingManager, CraftingManager } = require('./game');

// Enchant command
const enchantingMgr = new EnchantingManager();
const result = enchantingMgr.enchantItem(character, 'iron_sword', 'sharpness_1');

// Craft command
const craftingMgr = new CraftingManager();
const result = craftingMgr.craftItem(character, 'iron_sword');
```

---

## 📚 Examples

### Example 1: Enchanting a Weapon

```javascript
const EnchantingManager = require('./game/EnchantingManager');
const enchantingMgr = new EnchantingManager();

// Load enchantments
enchantingMgr.loadEnchantments();

// Get enchantments for main hand weapons
const weaponEnchants = enchantingMgr.getEnchantmentsForSlot('main_hand');

// Check if character can enchant
const sharpness = enchantingMgr.getEnchantment('sharpness_1');
const check = enchantingMgr.canEnchant(character, ironSword, sharpness);

if (check.canEnchant) {
  // Attempt to enchant
  const result = enchantingMgr.enchantItem(character, 'iron_sword', 'sharpness_1');
  
  if (result.success && !result.failed) {
    console.log(`✅ ${result.message}`);
    console.log(`Item now has: ${result.item.enchantments.map(e => e.name).join(', ')}`);
  } else if (result.failed) {
    console.log(`❌ Enchanting failed: ${result.message}`);
    if (result.consequence === 'item_destroyed') {
      console.log('💀 The item was destroyed!');
    }
  }
} else {
  console.log(`Cannot enchant: ${check.reasons.join(', ')}`);
}
```

### Example 2: Crafting an Item

```javascript
const CraftingManager = require('./game/CraftingManager');
const craftingMgr = new CraftingManager();

// Load recipes
const recipes = craftingMgr.loadRecipes();

// Get recipe
const recipe = craftingMgr.getRecipe('iron_sword');

// Check if character can craft
const check = craftingMgr.canCraft(character, recipe);

if (check.canCraft) {
  // Craft the item
  const result = craftingMgr.craftItem(character, 'iron_sword');
  
  if (result.success) {
    console.log(`✅ Crafted: ${result.item.name}`);
    console.log(`XP gained: ${result.xpGained}`);
    
    if (result.leveledUp) {
      console.log(`🎉 Crafting level up! Now level ${result.craftingLevel}`);
    }
  }
} else {
  console.log(`Cannot craft: ${check.reasons.join(', ')}`);
}
```

### Example 3: Salvaging Equipment

```javascript
const craftingMgr = new CraftingManager();

// Salvage an item
const result = craftingMgr.salvageItem(character, 'iron_sword');

if (result.success) {
  console.log(`Salvaged: ${result.itemName}`);
  console.log(`Recovered materials:`);
  result.materials.forEach(mat => {
    console.log(`  - ${mat.quantity}x ${mat.name || mat.id}`);
  });
}
```

---

## 🎮 Twitch Bot Commands (Future)

Suggested commands for bot integration:

- `!enchant <item> <enchantment>` - Apply an enchantment
- `!disenchant <item>` - Disenchant item for materials
- `!enchantments [slot]` - List available enchantments
- `!craft <recipe>` - Craft an item
- `!recipes [category]` - List crafting recipes
- `!salvage <item>` - Salvage item for materials
- `!crafting` - View crafting level and stats

---

## ✅ Testing

Run the test suite:
```bash
node Testing/test_enchanting_crafting.js
```

**Test Coverage**:
- ✅ 18 tests covering all major functionality
- ✅ Enchantment loading and filtering
- ✅ Success rates and failure consequences
- ✅ Material requirements and consumption
- ✅ Enchantment limits and prerequisites
- ✅ Recipe loading and categorization
- ✅ Crafting requirements and progression
- ✅ Salvaging and recipe discovery

---

## 🔧 Configuration

### Enchantment Configuration

Stored in `data/enchantments.json`:

```json
{
  "enchanting_system": {
    "success_rates": {
      "common": 0.95,
      "uncommon": 0.85,
      "rare": 0.70,
      "epic": 0.50,
      "legendary": 0.30
    },
    "failure_consequences": {
      "nothing": 0.60,
      "lose_enchantment": 0.30,
      "destroy_item": 0.10
    },
    "max_enchantments": {
      "common": 1,
      "uncommon": 2,
      "rare": 3,
      "epic": 4,
      "legendary": 5,
      "mythic": 6
    },
    "removal_cost_multiplier": 0.5,
    "disenchant_recovery_rate": 0.5
  }
}
```

### Crafting Configuration

Recipes loaded from:
- `data/consumables_extended.json` (potions, food)
- `data/items_extended.json` (materials)
- Hardcoded in `CraftingManager.js` (equipment, refinement)

---

## 📈 Future Enhancements

- [ ] Mass crafting (craft multiple items at once)
- [ ] Enchantment combinations and synergies
- [ ] Legendary crafting (random bonuses)
- [ ] Salvage all junk items
- [ ] Recipe books and discovery through exploration
- [ ] Crafting stations (forge, alchemy lab, enchanting table)
- [ ] Master craftsman NPCs for rare recipes
- [ ] Seasonal recipes
- [ ] Guild crafting bonuses

---

## 📝 Notes

- Enchantments are permanent until removed or item is destroyed
- Crafting XP is account-wide (persists across characters)
- Known recipes are character-specific
- Materials stack in inventory
- Enchanting failures consume materials and gold even if unsuccessful
- Salvaging always destroys the item

---

**Version**: 1.0.0  
**Last Updated**: December 9, 2025  
**Phase**: 3.3 Complete
