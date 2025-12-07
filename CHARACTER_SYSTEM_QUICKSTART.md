# Character System - Quick Start Guide

## 🚀 Getting Started

### 1. Create a New Character

```javascript
const Character = require('./game/Character');

// Create a warrior character
const warrior = Character.createNew('PlayerName', 'warrior', 'Town Square');

console.log(`Created ${warrior.name}, Level ${warrior.level}`);
console.log(`HP: ${warrior.hp}/${warrior.maxHp}`);
```

### 2. Load Character from Database

```javascript
const db = require('./db');

// Get character instance
const character = await db.getCharacter(playerId, channelName);

if (!character) {
  // Character doesn't exist, create one
  const newChar = await db.createCharacter(
    playerId, 
    channelName, 
    'PlayerName', 
    'warrior'
  );
}
```

### 3. Character Stats

```javascript
// Get all stats
const stats = character.getFinalStats();
console.log(`Attack: ${stats.attack}`);
console.log(`Defense: ${stats.defense}`);
console.log(`Magic: ${stats.magic}`);

// Get detailed breakdown
const breakdown = character.getStatsBreakdown();
console.log('Base Stats:', breakdown.baseStats);
console.log('Equipment Stats:', breakdown.equipmentStats);
console.log('Final Stats:', breakdown.finalStats);
```

### 4. Inventory Operations

```javascript
// Add items
character.addToInventory('Potion', 5);
character.addToInventory('iron_sword');

// Check items
if (character.inventory.hasItem('Potion')) {
  const count = character.inventory.getItemCount('Potion');
  console.log(`Has ${count} potions`);
}

// Remove items
character.removeFromInventory('Potion', 2);

// Get inventory summary
const inventory = character.inventory.getSummary();
console.log(`Inventory: ${inventory.size}/${inventory.maxCapacity}`);
```

### 5. Equipment Operations

```javascript
// Equip item (must be in inventory first)
const equipResult = character.equipItem('iron_sword');
if (equipResult.success) {
  console.log(equipResult.message);
  // If something was unequipped, it's back in inventory
}

// Unequip item
const unequipResult = character.unequipItem('main_hand');

// Get equipped items
const equipped = character.equipment.getAllEquipped();
for (const [slot, item] of Object.entries(equipped)) {
  console.log(`${slot}: ${item.name}`);
}
```

### 6. Level & XP System

```javascript
// Gain XP
const result = character.gainXP(100);

if (result.leveledUp) {
  console.log(`Level up! Now level ${result.newLevel}`);
  console.log(`Gained ${result.levelsGained} level(s)`);
  // Character is fully healed on level up
}

console.log(`XP: ${character.xp}/${character.xpToNext}`);
```

### 7. Combat Operations

```javascript
// Take damage
const dmgResult = character.takeDamage(50);
console.log(`Took ${dmgResult.damage} damage (${dmgResult.blocked} blocked)`);

if (dmgResult.isDead) {
  console.log('Character died!');
}

// Heal
const healed = character.heal(30);
console.log(`Healed ${healed} HP`);
```

### 8. Gold Management

```javascript
// Add gold
character.addGold(100);

// Check affordability
if (character.canAfford(50)) {
  // Spend gold
  if (character.spendGold(50)) {
    console.log(`Purchased item, ${character.gold} gold remaining`);
  }
}
```

### 9. Save Character

```javascript
// Save to database
await db.saveCharacter(playerId, channelName, character);
```

## 📝 Complete Combat Example

```javascript
async function handleCombat(playerId, channelName, enemy) {
  // Load character
  const character = await db.getCharacter(playerId, channelName);
  
  // Get combat stats
  const stats = character.getFinalStats();
  
  // Calculate damage
  const playerDamage = stats.attack * 2;
  const enemyDamage = 30;
  
  // Player attacks
  console.log(`${character.name} attacks for ${playerDamage} damage!`);
  
  // Enemy attacks back
  const dmgResult = character.takeDamage(enemyDamage);
  console.log(`Took ${dmgResult.damage} damage!`);
  
  if (dmgResult.isDead) {
    console.log('You died!');
    // Handle death
    character.hp = character.maxHp; // Respawn
    character.gold = Math.floor(character.gold * 0.5); // Lose half gold
  } else {
    // Victory! Gain rewards
    const xpResult = character.gainXP(50);
    character.addGold(25);
    character.addToInventory('health_potion');
    
    console.log('Victory!');
    console.log(`Gained 50 XP and 25 gold`);
    
    if (xpResult.leveledUp) {
      console.log(`Level up! Now level ${xpResult.newLevel}!`);
    }
  }
  
  // Save progress
  await db.saveCharacter(playerId, channelName, character);
  
  return character;
}
```

## 📝 Shop Purchase Example

```javascript
async function purchaseItem(playerId, channelName, itemId, price) {
  const character = await db.getCharacter(playerId, channelName);
  
  if (!character.canAfford(price)) {
    return { 
      success: false, 
      message: `Not enough gold. Need ${price}, have ${character.gold}` 
    };
  }
  
  if (character.inventory.isFull()) {
    return { 
      success: false, 
      message: 'Inventory is full!' 
    };
  }
  
  // Purchase
  character.spendGold(price);
  character.addToInventory(itemId);
  
  await db.saveCharacter(playerId, channelName, character);
  
  return { 
    success: true, 
    message: `Purchased ${itemId} for ${price} gold!`,
    goldRemaining: character.gold
  };
}
```

## 🎯 Quest Completion Example

```javascript
async function completeQuest(playerId, channelName, questRewards) {
  const character = await db.getCharacter(playerId, channelName);
  
  // Give rewards
  const xpResult = character.gainXP(questRewards.xp);
  character.addGold(questRewards.gold);
  
  // Give item rewards
  for (const item of questRewards.items) {
    character.addToInventory(item.id, item.quantity || 1);
  }
  
  await db.saveCharacter(playerId, channelName, character);
  
  return {
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    character: character
  };
}
```

## 🎮 Available Character Classes

| Class   | HP  | STR | DEF | MAG | AGI | Special Ability         |
|---------|-----|-----|-----|-----|-----|-------------------------|
| Warrior | 110 | 5   | 4   | 1   | 2   | Berserker Rage         |
| Mage    | 80  | 1   | 2   | 6   | 3   | Arcane Blast           |
| Rogue   | 90  | 3   | 2   | 1   | 6   | Shadow Strike          |
| Cleric  | 100 | 2   | 4   | 5   | 2   | Divine Intervention    |
| Ranger  | 95  | 3   | 3   | 2   | 5   | Multishot              |

## 🔧 API Endpoints Quick Reference

```javascript
// Get all classes
GET /api/classes

// Get class details
GET /api/classes/:classType

// Preview class progression
GET /api/classes/:classType/preview?maxLevel=10

// Create character
POST /api/player/create
Body: { channel, classType, name }

// Get character stats
GET /api/player/stats?channel=streamername

// Get inventory
GET /api/player/inventory?channel=streamername

// Get equipment
GET /api/player/equipment?channel=streamername

// Equip item
POST /api/player/equip
Body: { channel, itemId }

// Unequip item
POST /api/player/unequip
Body: { channel, slot }
```

## 🧪 Testing

```bash
# Run full test suite
node Testing/test_character_system.js
```

## 📚 More Information

See `CHARACTER_SYSTEM_README.md` for complete documentation.
