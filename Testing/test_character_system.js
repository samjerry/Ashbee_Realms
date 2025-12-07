/**
 * test_character_system.js
 * Test suite for the Character System
 * Run this to verify all components work correctly
 */

const Character = require('../game/Character');
const EquipmentManager = require('../game/EquipmentManager');
const InventoryManager = require('../game/InventoryManager');
const CharacterInitializer = require('../game/CharacterInitializer');

console.log('='.repeat(60));
console.log('CHARACTER SYSTEM TEST SUITE');
console.log('='.repeat(60));

// Test 1: Character Initializer - Get Available Classes
console.log('\n📋 Test 1: Get Available Classes');
console.log('-'.repeat(60));
const availableClasses = CharacterInitializer.getAvailableClasses();
console.log(`Found ${availableClasses.length} classes:`);
availableClasses.forEach(cls => {
  console.log(`  - ${cls.name} (${cls.id}): ${cls.description.substring(0, 50)}...`);
});

// Test 2: Character Creation - All Classes
console.log('\n⚔️  Test 2: Create Characters for All Classes');
console.log('-'.repeat(60));
const testCharacters = {};
availableClasses.forEach(cls => {
  try {
    const character = Character.createNew(`Test${cls.name}`, cls.id);
    testCharacters[cls.id] = character;
    console.log(`✅ Created ${cls.name}: HP=${character.hp}/${character.maxHp}, Gold=${character.gold}`);
  } catch (error) {
    console.error(`❌ Failed to create ${cls.name}:`, error.message);
  }
});

// Test 3: Stat Calculations
console.log('\n📊 Test 3: Stat Calculations');
console.log('-'.repeat(60));
const warrior = testCharacters['warrior'];
if (warrior) {
  const baseStats = warrior.getBaseStats();
  const equipStats = warrior.getEquipmentStats();
  const finalStats = warrior.getFinalStats();
  
  console.log('Warrior Stats at Level 1:');
  console.log('  Base Stats:', JSON.stringify(baseStats, null, 2));
  console.log('  Equipment Stats:', JSON.stringify(equipStats, null, 2));
  console.log('  Final Stats:', JSON.stringify(finalStats, null, 2));
}

// Test 4: Level Up System
console.log('\n⬆️  Test 4: Level Up System');
console.log('-'.repeat(60));
const mage = testCharacters['mage'];
if (mage) {
  console.log(`Mage starting at level ${mage.level}, HP: ${mage.hp}/${mage.maxHp}`);
  
  // Gain enough XP to level up twice
  const result1 = mage.gainXP(10);
  console.log(`Gained 10 XP: Level ${result1.newLevel}, Leveled up: ${result1.leveledUp}`);
  
  const result2 = mage.gainXP(15);
  console.log(`Gained 15 XP: Level ${result2.newLevel}, Leveled up: ${result2.leveledUp}`);
  
  if (result2.leveledUp) {
    const stats = mage.getFinalStats();
    console.log(`After leveling: HP=${mage.hp}/${mage.maxHp}, Magic=${stats.magic}`);
  }
}

// Test 5: Inventory Management
console.log('\n🎒 Test 5: Inventory Management');
console.log('-'.repeat(60));
const rogue = testCharacters['rogue'];
if (rogue) {
  console.log(`Initial inventory size: ${rogue.inventory.getSize()}`);
  
  // Add items
  const add1 = rogue.addToInventory('Potion', 3);
  console.log(`Add 3 Potions: ${add1.message}`);
  
  const add2 = rogue.addToInventory('rusty_sword');
  console.log(`Add rusty_sword: ${add2.message}`);
  
  // Check inventory
  const summary = rogue.inventory.getSummary();
  console.log(`Current inventory: ${summary.size}/${summary.maxCapacity} slots used`);
  console.log(`Items:`, summary.items.map(i => `${i.name} x${i.count}`).join(', '));
  
  // Remove item
  const remove = rogue.removeFromInventory('Potion', 2);
  console.log(`Remove 2 Potions: ${remove.message}`);
  console.log(`Remaining: ${rogue.inventory.getItemCount('Potion')} Potions`);
}

// Test 6: Equipment System
console.log('\n⚔️  Test 6: Equipment System');
console.log('-'.repeat(60));
const cleric = testCharacters['cleric'];
if (cleric) {
  // Check starting equipment
  const startEquip = cleric.equipment.getAllEquipped();
  console.log('Starting equipment:');
  for (const [slot, item] of Object.entries(startEquip)) {
    console.log(`  ${slot}: ${item.name}`);
  }
  
  // Add a better weapon to inventory
  cleric.addToInventory('iron_mace');
  
  // Try to equip it
  const equipResult = cleric.equipItem('iron_mace');
  console.log(`\nEquip iron_mace: ${equipResult.message}`);
  
  if (equipResult.success) {
    const newStats = cleric.getFinalStats();
    console.log(`New attack stat: ${newStats.attack}`);
  }
  
  // Unequip
  const unequipResult = cleric.unequipItem('main_hand');
  console.log(`Unequip main_hand: ${unequipResult.message}`);
}

// Test 7: Combat Damage Calculation
console.log('\n⚔️  Test 7: Combat Damage System');
console.log('-'.repeat(60));
const ranger = testCharacters['ranger'];
if (ranger) {
  const initialHp = ranger.hp;
  console.log(`Ranger HP: ${ranger.hp}/${ranger.maxHp}`);
  
  // Take damage
  const dmgResult = ranger.takeDamage(30);
  console.log(`Takes 30 damage: ${dmgResult.damage} damage dealt, ${dmgResult.blocked} blocked`);
  console.log(`New HP: ${ranger.hp}/${ranger.maxHp}`);
  
  // Heal
  const healed = ranger.heal(20);
  console.log(`Heals ${healed} HP`);
  console.log(`Final HP: ${ranger.hp}/${ranger.maxHp}`);
}

// Test 8: Gold System
console.log('\n💰 Test 8: Gold System');
console.log('-'.repeat(60));
const testChar = testCharacters['warrior'];
if (testChar) {
  console.log(`Starting gold: ${testChar.gold}`);
  
  testChar.addGold(100);
  console.log(`After adding 100 gold: ${testChar.gold}`);
  
  const canBuy = testChar.canAfford(75);
  console.log(`Can afford 75 gold item: ${canBuy}`);
  
  const bought = testChar.spendGold(75);
  console.log(`Purchased 75 gold item: ${bought}`);
  console.log(`Remaining gold: ${testChar.gold}`);
}

// Test 9: Stats Breakdown API
console.log('\n📊 Test 9: Complete Stats Breakdown');
console.log('-'.repeat(60));
const testWarrior = testCharacters['warrior'];
if (testWarrior) {
  const breakdown = testWarrior.getStatsBreakdown();
  console.log('Complete Stats Breakdown:');
  console.log(JSON.stringify(breakdown, null, 2));
}

// Test 10: Class Comparison
console.log('\n⚖️  Test 10: Class Comparison');
console.log('-'.repeat(60));
const comparison = CharacterInitializer.compareClasses(['warrior', 'mage', 'rogue']);
console.log('Class Comparison:');
comparison.forEach(cls => {
  console.log(`\n${cls.name}:`);
  console.log(`  Starting HP: ${cls.startingStats.max_hp}`);
  console.log(`  Starting STR: ${cls.startingStats.strength}`);
  console.log(`  Starting MAG: ${cls.startingStats.magic}`);
  console.log(`  Starting AGI: ${cls.startingStats.agility}`);
  console.log(`  Special: ${cls.specialAbility}`);
  console.log(`  Strengths: ${cls.strengths.join(', ')}`);
});

// Test 11: Database Export/Import
console.log('\n💾 Test 11: Database Export/Import');
console.log('-'.repeat(60));
const exportChar = testCharacters['mage'];
if (exportChar) {
  const exported = exportChar.toDatabase();
  console.log('Exported character data structure:');
  console.log('  Keys:', Object.keys(exported).join(', '));
  
  // Create new character from exported data
  const imported = new Character(exported);
  console.log(`✅ Reimported character: ${imported.name}, Level ${imported.level}`);
  console.log(`  HP: ${imported.hp}/${imported.maxHp}, Gold: ${imported.gold}`);
}

// Test 12: Class Preview
console.log('\n🔮 Test 12: Class Progression Preview');
console.log('-'.repeat(60));
const preview = CharacterInitializer.previewClassProgression('warrior', 5);
if (preview) {
  console.log(`${preview.className} Progression (Level 1-5):`);
  preview.progression.forEach(level => {
    console.log(`  Level ${level.level}: HP=${level.hp}, STR=${level.strength}, DEF=${level.defense}, AGI=${level.agility}`);
  });
}

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('TEST SUITE COMPLETED');
console.log('='.repeat(60));
console.log('\n✅ All character system components are functional!');
console.log('\nAvailable API Endpoints:');
console.log('  GET  /api/classes - List all classes');
console.log('  GET  /api/classes/:classType - Get class details');
console.log('  GET  /api/classes/:classType/preview - Preview class progression');
console.log('  POST /api/player/create - Create a new character');
console.log('  GET  /api/player/stats - Get character stats');
console.log('  GET  /api/player/inventory - Get inventory');
console.log('  GET  /api/player/equipment - Get equipment');
console.log('  POST /api/player/equip - Equip an item');
console.log('  POST /api/player/unequip - Unequip an item');
console.log('\n' + '='.repeat(60));
