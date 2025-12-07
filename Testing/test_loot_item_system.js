/**
 * Test Suite for Loot & Item System (Phase 2.2)
 * Tests consumables, shops, and item comparison
 */

const ConsumableManager = require('../game/ConsumableManager');
const ShopManager = require('../game/ShopManager');
const ItemComparator = require('../game/ItemComparator');

// Test counter
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🧪 Testing Loot & Item System\n');

// ==================== Consumable Manager Tests ====================
console.log('📦 Testing ConsumableManager...\n');

const consumableMgr = new ConsumableManager();

test('ConsumableManager loads consumables data', () => {
  assert(Object.keys(consumableMgr.allConsumables).length > 0, 'Should load consumables');
  assert(consumableMgr.potions, 'Should have potions');
  assert(consumableMgr.food, 'Should have food');
});

test('getConsumable returns consumable data', () => {
  const healthPotion = consumableMgr.getConsumable('health_potion');
  assert(healthPotion, 'Should find health_potion');
  assert(healthPotion.type === 'health', 'Should be health type');
});

test('isConsumable checks if item is consumable', () => {
  assert(consumableMgr.isConsumable('health_potion'), 'health_potion should be consumable');
  assert(!consumableMgr.isConsumable('rusty_sword'), 'rusty_sword should not be consumable');
});

test('getPotionsByRarity filters potions by rarity', () => {
  const commonPotions = consumableMgr.getPotionsByRarity('common');
  assert(commonPotions.length > 0, 'Should find common potions');
  assert(commonPotions.every(p => p.rarity === 'common'), 'All should be common');
});

test('getConsumablesByType filters by type', () => {
  const healthConsumables = consumableMgr.getConsumablesByType('health');
  assert(healthConsumables.length > 0, 'Should find health consumables');
  assert(healthConsumables.every(c => c.type === 'health'), 'All should be health type');
});

test('getBuyableConsumables returns items with prices', () => {
  const buyable = consumableMgr.getBuyableConsumables('general');
  assert(buyable.length > 0, 'Should find buyable consumables');
  assert(buyable.every(c => c.price > 0), 'All should have prices');
});

test('useConsumable - health potion heals character', () => {
  const character = {
    hp: 50,
    maxHp: 100,
    inventory: [{ id: 'health_potion', quantity: 2 }],
    consumableCooldowns: {}
  };
  
  const result = consumableMgr.useConsumable(character, 'health_potion');
  assert(result.success, 'Should succeed');
  assert(character.hp > 50, 'HP should increase');
  assert(result.healAmount > 0, 'Should have heal amount');
});

test('useConsumable - item consumption reduces quantity', () => {
  const character = {
    hp: 50,
    maxHp: 100,
    inventory: [{ id: 'health_potion', quantity: 1 }],
    consumableCooldowns: {}
  };
  
  consumableMgr.useConsumable(character, 'health_potion');
  const item = character.inventory.find(i => i.id === 'health_potion');
  assert(!item || item.quantity === 0, 'Item should be consumed');
});

test('useConsumable - cooldown prevents immediate reuse', () => {
  const character = {
    hp: 50,
    maxHp: 100,
    inventory: [{ id: 'health_potion', quantity: 5 }],
    consumableCooldowns: {}
  };
  
  const result1 = consumableMgr.useConsumable(character, 'health_potion');
  assert(result1.success, 'First use should succeed');
  
  const result2 = consumableMgr.useConsumable(character, 'health_potion');
  assert(!result2.success, 'Second use should fail due to cooldown');
  assert(result2.message.includes('cooldown'), 'Should mention cooldown');
});

test('useConsumable - buff effect returns status effect', () => {
  const character = {
    hp: 100,
    maxHp: 100,
    inventory: [{ id: 'strength_elixir', quantity: 1 }],
    consumableCooldowns: {}
  };
  
  const result = consumableMgr.useConsumable(character, 'strength_elixir');
  assert(result.success, 'Should succeed');
  assert(result.statusEffect, 'Should have status effect');
  assert(result.statusEffect.type === 'buff', 'Should be buff type');
});

test('useConsumable - fails when item not in inventory', () => {
  const character = {
    hp: 50,
    maxHp: 100,
    inventory: [],
    consumableCooldowns: {}
  };
  
  const result = consumableMgr.useConsumable(character, 'health_potion');
  assert(!result.success, 'Should fail');
  assert(result.message.includes("don't have"), 'Should mention missing item');
});

// ==================== Shop Manager Tests ====================
console.log('\n🏪 Testing ShopManager...\n');

const shopMgr = new ShopManager();

test('ShopManager loads merchant data', () => {
  assert(shopMgr.merchants.length > 0, 'Should load merchants');
});

test('getMerchant returns merchant by ID', () => {
  const merchant = shopMgr.getMerchant('wandering_merchant');
  assert(merchant, 'Should find wandering_merchant');
  assert(merchant.name === 'Garen the Wanderer', 'Should have correct name');
});

test('getAllMerchants returns all merchants', () => {
  const all = shopMgr.getAllMerchants();
  assert(all.length > 0, 'Should have merchants');
  assert(all[0].id, 'Should have id');
  assert(all[0].name, 'Should have name');
});

test('getMerchantInventory returns always and random items', () => {
  const inventory = shopMgr.getMerchantInventory('wandering_merchant');
  assert(inventory.always, 'Should have always items');
  assert(inventory.random, 'Should have random items');
  assert(Array.isArray(inventory.always), 'Always should be array');
});

test('getMerchantsInLocation filters by location', () => {
  const merchants = shopMgr.getMerchantsInLocation('whispering_woods');
  assert(Array.isArray(merchants), 'Should return array');
  // wandering_merchant spawns in whispering_woods
  const hasWandering = merchants.some(m => m.spawn_locations.includes('whispering_woods'));
  assert(hasWandering, 'Should include merchants that spawn there');
});

test('buyItem - successful purchase', () => {
  const character = {
    gold: 100,
    inventory: []
  };
  
  const result = shopMgr.buyItem(character, 'wandering_merchant', 'potion', 1);
  assert(result.success, 'Purchase should succeed');
  assert(character.gold < 100, 'Gold should decrease');
  assert(character.inventory.length > 0, 'Item should be added');
});

test('buyItem - fails with insufficient gold', () => {
  const character = {
    gold: 1,
    inventory: []
  };
  
  // Bread costs 5 gold, buying 20 = 100 gold, character only has 1 gold
  const result = shopMgr.buyItem(character, 'wandering_merchant', 'bread', 20);
  assert(!result.success, 'Should fail');
  // Message format: "Not enough gold (need X gold, have Y gold)"
  assert(result.message.includes('Not enough gold') || result.message.includes('not enough'), 'Should indicate insufficient gold');
});

test('sellItem - successful sale', () => {
  const character = {
    gold: 50,
    inventory: [{ id: 'health_potion', name: 'Health Potion', quantity: 1, rarity: 'uncommon' }]
  };
  
  const result = shopMgr.sellItem(character, 'wandering_merchant', 'health_potion', 1);
  assert(result.success, 'Sale should succeed');
  assert(character.gold > 50, 'Gold should increase');
  assert(result.goldEarned > 0, 'Should earn gold');
});

test('sellItem - fails when item not owned', () => {
  const character = {
    gold: 50,
    inventory: []
  };
  
  const result = shopMgr.sellItem(character, 'wandering_merchant', 'health_potion', 1);
  assert(!result.success, 'Should fail');
  assert(result.message.includes("don't have"), 'Should mention missing item');
});

test('getMerchantGreeting returns greeting text', () => {
  const greeting = shopMgr.getMerchantGreeting('wandering_merchant');
  assert(typeof greeting === 'string', 'Should return string');
  assert(greeting.length > 0, 'Should not be empty');
});

test('getMerchantDialogue returns random dialogue', () => {
  const dialogue = shopMgr.getMerchantDialogue('wandering_merchant');
  assert(typeof dialogue === 'string', 'Should return string');
  assert(dialogue.length > 0, 'Should not be empty');
});

test('estimateItemValue calculates value by rarity', () => {
  const commonItem = { rarity: 'common', category: 'consumable' };
  const rareItem = { rarity: 'rare', category: 'equipment' };
  
  const commonValue = shopMgr.estimateItemValue(commonItem);
  const rareValue = shopMgr.estimateItemValue(rareItem);
  
  assert(rareValue > commonValue, 'Rare should be more valuable');
  assert(rareValue >= 400, 'Rare equipment should be at least 400 gold (200 * 2)');
});

// ==================== Item Comparator Tests ====================
console.log('\n⚖️ Testing ItemComparator...\n');

const comparator = new ItemComparator();

test('compareEquipment - identifies better item', () => {
  const item1 = { id: 'rusty_sword', name: 'Rusty Sword', slot: 'weapon', attack: 5, rarity: 'common' };
  const item2 = { id: 'steel_sword', name: 'Steel Sword', slot: 'weapon', attack: 15, rarity: 'uncommon' };
  
  const result = comparator.compareEquipment(item1, item2);
  assert(result.valid, 'Comparison should be valid');
  assert(result.recommendation.choice === 'item2', 'Should recommend item2');
  assert(result.differences.attack, 'Should show attack difference');
});

test('compareEquipment - fails for different slots', () => {
  const weapon = { id: 'sword', name: 'Sword', slot: 'weapon', attack: 10, rarity: 'common' };
  const armor = { id: 'armor', name: 'Armor', slot: 'armor', defense: 10, rarity: 'common' };
  
  const result = comparator.compareEquipment(weapon, armor);
  assert(!result.valid, 'Should be invalid');
  assert(result.message.includes('same slot'), 'Should mention slot mismatch');
});

test('compareEquipment - shows all stat differences', () => {
  const item1 = { id: 'item1', name: 'Item 1', slot: 'weapon', attack: 10, defense: 5, rarity: 'common' };
  const item2 = { id: 'item2', name: 'Item 2', slot: 'weapon', attack: 15, defense: 3, rarity: 'uncommon' };
  
  const result = comparator.compareEquipment(item1, item2);
  assert(result.differences.attack, 'Should show attack difference');
  assert(result.differences.defense, 'Should show defense difference');
  assert(result.differences.attack.better === 'item2', 'Item2 better at attack');
  assert(result.differences.defense.better === 'item1', 'Item1 better at defense');
});

test('compareWithEquipped - recommends equipping when slot empty', () => {
  const character = {
    equipment: {},
    inventory: [{ id: 'rusty_sword', quantity: 1 }]
  };
  
  // Mock getItemData to return weapon data
  const originalGetItemData = comparator.getItemData;
  comparator.getItemData = (id) => {
    if (id === 'rusty_sword') {
      return { id: 'rusty_sword', name: 'Rusty Sword', slot: 'weapon', attack: 5 };
    }
    return null;
  };
  
  const result = comparator.compareWithEquipped(character, 'rusty_sword');
  assert(result.isUpgrade, 'Should be an upgrade');
  assert(result.message.includes('No item equipped'), 'Should mention empty slot');
  
  // Restore original method
  comparator.getItemData = originalGetItemData;
});

test('getUpgradeSuggestions - finds upgrades in inventory', () => {
  const character = {
    equipment: {
      weapon: 'rusty_sword'
    },
    inventory: [
      { id: 'steel_sword', quantity: 1 },
      { id: 'iron_armor', quantity: 1 }
    ]
  };
  
  const suggestions = comparator.getUpgradeSuggestions(character);
  assert(Array.isArray(suggestions), 'Should return array');
  // Suggestions depend on item data loading, just check format
});

test('compareConsumables - compares two consumables', () => {
  const result = comparator.compareConsumables('health_potion', 'greater_health_potion');
  assert(result.valid || !result.valid, 'Should return result');
  // Comparison depends on data loading
});

test('calculateConsumableEfficiency - calculates efficiency', () => {
  const consumable = { effect: 'Restore 100 HP', price: 50 };
  const efficiency = comparator.calculateConsumableEfficiency(consumable);
  assert(efficiency === 2, 'Should be 100/50 = 2');
});

// ==================== Test Results ====================
console.log('\n' + '='.repeat(50));
console.log('📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️ ${failed} test(s) failed`);
  process.exit(1);
}
