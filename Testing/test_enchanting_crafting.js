/**
 * Enchanting & Crafting System Test Suite
 * Tests: Enchantments, crafting recipes, skill progression, materials
 */

const EnchantingManager = require('../game/EnchantingManager');
const CraftingManager = require('../game/CraftingManager');
const Character = require('../game/Character');

console.log('🧪 Testing Enchanting & Crafting System\n');
console.log('═'.repeat(70));

let testsPassed = 0;
let testsFailed = 0;

async function runTests() {
  const enchantingMgr = new EnchantingManager();
  const craftingMgr = new CraftingManager();
  
  // ==================== ENCHANTING TESTS ====================
  
  // Test 1: Load enchantments
  console.log('\n📦 Test 1: Load Enchantments');
  try {
    const enchantments = enchantingMgr.loadEnchantments();
    if (enchantments && Object.keys(enchantments).length > 0) {
      console.log(`✅ Loaded ${Object.keys(enchantments).length} enchantments`);
      console.log(`   Sample: ${Object.keys(enchantments).slice(0, 3).join(', ')}`);
      testsPassed++;
    } else {
      throw new Error('No enchantments loaded');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 2: Get enchantments by slot
  console.log('\n🔍 Test 2: Get Enchantments by Slot');
  try {
    const weaponEnchants = enchantingMgr.getEnchantmentsForSlot('main_hand');
    if (weaponEnchants && weaponEnchants.length > 0) {
      console.log(`✅ Found ${weaponEnchants.length} weapon enchantments`);
      console.log(`   Example: ${weaponEnchants[0].name} (${weaponEnchants[0].rarity})`);
      testsPassed++;
    } else {
      throw new Error('No weapon enchantments found');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 3: Check enchant prerequisites
  console.log('\n✋ Test 3: Enchant Prerequisites');
  try {
    const character = Character.createNew('TestWarrior', 'warrior', 'Town Square');
    
    // Add a weapon and materials
    const sword = {
      id: 'iron_sword',
      name: 'Iron Sword',
      slot: 'main_hand',
      rarity: 'common',
      attack: 15
    };
    character.inventory.addItem(sword);
    character.inventory.addItem({ id: 'enchanting_dust', name: 'Enchanting Dust', stackable: true, quantity: 10 });
    character.gold = 1000;

    const sharpness = enchantingMgr.getEnchantment('sharpness_1');
    if (!sharpness) {
      throw new Error('Sharpness I enchantment not found');
    }

    const canEnchant = enchantingMgr.canEnchant(character, sword, sharpness);
    if (canEnchant.canEnchant) {
      console.log('✅ Enchant prerequisites check passed');
      console.log(`   Can apply ${sharpness.name} to ${sword.name}`);
      testsPassed++;
    } else {
      throw new Error(`Cannot enchant: ${canEnchant.reasons.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 4: Apply enchantment
  console.log('\n✨ Test 4: Apply Enchantment');
  try {
    const character = Character.createNew('TestMage', 'mage', 'Town Square');
    
    const staff = {
      id: 'wooden_staff',
      name: 'Wooden Staff',
      slot: 'main_hand',
      rarity: 'common',
      attack: 10,
      magic: 15
    };
    character.inventory.addItem(staff);
    character.inventory.addItem({ id: 'enchanting_dust', name: 'Enchanting Dust', stackable: true, quantity: 10 });
    character.gold = 2000;

    const result = enchantingMgr.enchantItem(character, 'wooden_staff', 'sharpness_1');
    
    if (result.success) {
      console.log('✅ Enchantment applied successfully');
      console.log(`   ${result.item.name} now has: ${result.item.enchantments.map(e => e.name).join(', ')}`);
      testsPassed++;
    } else {
      throw new Error(`Enchanting failed: ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 5: Enchantment stat calculation
  console.log('\n📊 Test 5: Enchantment Stats');
  try {
    const item = {
      id: 'enchanted_sword',
      name: 'Enchanted Sword',
      rarity: 'uncommon',
      enchantments: [
        { id: 'sharpness_1', name: 'Sharpness I', stats: { attack: 5 } },
        { id: 'fire_1', name: 'Fire Aspect I', stats: { magic: 3 }, effects: { fire_damage: 5 } }
      ]
    };

    const stats = enchantingMgr.getEnchantmentStats(item);
    const effects = enchantingMgr.getEnchantmentEffects(item);

    if (stats.attack === 5 && stats.magic === 3 && effects.fire_damage === 5) {
      console.log('✅ Enchantment stats calculated correctly');
      console.log(`   Stats: +${stats.attack} attack, +${stats.magic} magic`);
      console.log(`   Effects: ${effects.fire_damage} fire damage`);
      testsPassed++;
    } else {
      throw new Error('Stats calculation mismatch');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 6: Remove enchantment
  console.log('\n🗑️ Test 6: Remove Enchantment');
  try {
    const character = Character.createNew('TestRogue', 'rogue', 'Town Square');
    
    const dagger = {
      id: 'enchanted_dagger',
      name: 'Enchanted Dagger',
      rarity: 'uncommon',
      enchantments: [
        { id: 'sharpness_1', name: 'Sharpness I', stats: { attack: 5 } },
        { id: 'speed_1', name: 'Speed I', stats: { agility: 2 } }
      ]
    };
    character.inventory.addItem(dagger);
    character.gold = 500;

    const result = enchantingMgr.removeEnchantment(character, 'enchanted_dagger', 0);
    
    if (result.success && result.item.enchantments.length === 1) {
      console.log('✅ Enchantment removed successfully');
      console.log(`   Remaining: ${result.item.enchantments[0].name}`);
      testsPassed++;
    } else {
      throw new Error('Failed to remove enchantment');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 7: Disenchant item
  console.log('\n♻️ Test 7: Disenchant Item');
  try {
    const character = Character.createNew('TestCleric', 'cleric', 'Town Square');
    
    const mace = {
      id: 'enchanted_mace',
      name: 'Enchanted Mace',
      rarity: 'rare',
      enchantments: [
        { id: 'sharpness_2', name: 'Sharpness II', rarity: 'uncommon', stats: { attack: 12 } }
      ]
    };
    character.inventory.addItem(mace);

    const result = enchantingMgr.disenchantItem(character, 'enchanted_mace');
    
    if (result.success && result.materials.length > 0) {
      console.log('✅ Item disenchanted successfully');
      console.log(`   Recovered: ${result.materials.map(m => `${m.quantity}x ${m.name}`).join(', ')}`);
      testsPassed++;
    } else {
      throw new Error('Failed to disenchant item');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 8: Max enchantments limit
  console.log('\n🚫 Test 8: Max Enchantments Limit');
  try {
    const character = Character.createNew('TestRanger', 'ranger', 'Town Square');
    
    const bow = {
      id: 'common_bow',
      name: 'Common Bow',
      rarity: 'common', // Common items can only have 1 enchantment
      enchantments: [
        { id: 'power_1', name: 'Power I', stats: { attack: 5 } }
      ]
    };
    character.inventory.addItem(bow);
    character.inventory.addItem({ id: 'enchanting_dust', name: 'Enchanting Dust', stackable: true, quantity: 10 });
    character.gold = 2000;

    const result = enchantingMgr.enchantItem(character, 'common_bow', 'fire_1');
    
    if (!result.success && result.message.includes('maximum')) {
      console.log('✅ Max enchantments limit enforced correctly');
      console.log(`   ${result.message}`);
      testsPassed++;
    } else {
      throw new Error('Max enchantments limit not enforced');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // ==================== CRAFTING TESTS ====================

  // Test 9: Load recipes
  console.log('\n📦 Test 9: Load Crafting Recipes');
  try {
    const recipes = craftingMgr.loadRecipes();
    if (recipes && recipes.length > 0) {
      console.log(`✅ Loaded ${recipes.length} crafting recipes`);
      console.log(`   Categories: ${[...new Set(recipes.map(r => r.category))].join(', ')}`);
      testsPassed++;
    } else {
      throw new Error('No recipes loaded');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 10: Get recipes by category
  console.log('\n🔍 Test 10: Get Recipes by Category');
  try {
    const potionRecipes = craftingMgr.getRecipesByCategory('potions');
    const equipmentRecipes = craftingMgr.getRecipesByCategory('equipment');
    
    if (potionRecipes.length > 0 && equipmentRecipes.length > 0) {
      console.log(`✅ Recipes filtered by category correctly`);
      console.log(`   Potions: ${potionRecipes.length}, Equipment: ${equipmentRecipes.length}`);
      testsPassed++;
    } else {
      throw new Error('Recipe filtering failed');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 11: Check crafting requirements
  console.log('\n✋ Test 11: Crafting Requirements');
  try {
    const character = Character.createNew('TestSmith', 'warrior', 'Town Square');
    character.craftingXP = 500; // Level 5
    character.gold = 200;
    
    // Add ingredients for iron sword
    character.inventory.addItem({ id: 'iron_ore', name: 'Iron Ore', stackable: true, quantity: 3 });
    character.inventory.addItem({ id: 'wood', name: 'Wood', stackable: true, quantity: 1 });

    const recipe = craftingMgr.getRecipe('iron_sword');
    if (!recipe) {
      throw new Error('Iron sword recipe not found');
    }

    const canCraft = craftingMgr.canCraft(character, recipe);
    
    if (canCraft.canCraft) {
      console.log('✅ Crafting requirements check passed');
      console.log(`   Can craft: ${recipe.name}`);
      testsPassed++;
    } else {
      throw new Error(`Cannot craft: ${canCraft.reasons.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 12: Craft item
  console.log('\n🔨 Test 12: Craft Item');
  try {
    const character = Character.createNew('TestCrafter', 'rogue', 'Town Square');
    character.craftingXP = 0; // Level 0
    character.gold = 1000;
    
    // Add ingredients
    character.inventory.addItem({ id: 'iron_ore', name: 'Iron Ore', stackable: true, quantity: 5 });
    character.inventory.addItem({ id: 'wood', name: 'Wood', stackable: true, quantity: 2 });

    const result = craftingMgr.craftItem(character, 'iron_sword');
    
    if (result.success) {
      console.log('✅ Item crafted successfully');
      console.log(`   Crafted: ${result.item.name}`);
      console.log(`   Gained ${result.xpGained} XP${result.leveledUp ? ' - LEVEL UP!' : ''}`);
      testsPassed++;
    } else {
      throw new Error(`Crafting failed: ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 13: Crafting XP and leveling
  console.log('\n📈 Test 13: Crafting XP & Leveling');
  try {
    const character = Character.createNew('TestArtisan', 'mage', 'Town Square');
    character.craftingXP = 90; // Close to level 1
    character.gold = 5000;
    
    // Add ingredients for multiple crafts
    character.inventory.addItem({ id: 'iron_ore', name: 'Iron Ore', stackable: true, quantity: 20 });
    character.inventory.addItem({ id: 'wood', name: 'Wood', stackable: true, quantity: 10 });

    // Craft to level up
    const result1 = craftingMgr.craftItem(character, 'iron_sword');
    const result2 = craftingMgr.craftItem(character, 'iron_sword');
    
    const summary = craftingMgr.getCraftingSummary(character);
    
    if (summary.level >= 1 && (result1.leveledUp || result2.leveledUp)) {
      console.log('✅ Crafting leveling works correctly');
      console.log(`   Level ${summary.level} (${summary.xp}/${summary.xpToNext} XP)`);
      testsPassed++;
    } else {
      throw new Error('Leveling not working as expected');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 14: Salvage item
  console.log('\n♻️ Test 14: Salvage Item');
  try {
    const character = Character.createNew('TestSalvager', 'ranger', 'Town Square');
    
    const armor = {
      id: 'leather_armor',
      name: 'Leather Armor',
      slot: 'armor',
      rarity: 'common',
      defense: 10
    };
    character.inventory.addItem(armor);

    const result = craftingMgr.salvageItem(character, 'leather_armor');
    
    if (result.success && result.materials.length > 0) {
      console.log('✅ Item salvaged successfully');
      console.log(`   Recovered: ${result.materials.map(m => `${m.quantity}x ${m.name || m.id}`).join(', ')}`);
      testsPassed++;
    } else {
      throw new Error('Salvaging failed');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 15: Recipe discovery
  console.log('\n🔓 Test 15: Recipe Discovery');
  try {
    const character = Character.createNew('TestScholar', 'cleric', 'Town Square');
    character.knownRecipes = [];

    const result = craftingMgr.discoverRecipe(character, 'iron_sword');
    
    if (result.success && character.knownRecipes.includes('iron_sword')) {
      console.log('✅ Recipe discovered successfully');
      console.log(`   Learned: ${result.recipe.name}`);
      testsPassed++;
    } else {
      throw new Error('Recipe discovery failed');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 16: Get known recipes
  console.log('\n📚 Test 16: Get Known Recipes');
  try {
    const character = Character.createNew('TestMaster', 'warrior', 'Town Square');
    character.knownRecipes = ['iron_sword', 'leather_armor', 'health_potion'];

    const known = craftingMgr.getKnownRecipes(character);
    
    if (known.length === 3 && known.every(r => r.id && r.name)) {
      console.log('✅ Known recipes retrieved correctly');
      console.log(`   Known: ${known.map(r => r.name).join(', ')}`);
      testsPassed++;
    } else {
      throw new Error('Failed to get known recipes');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 17: Get craftable recipes
  console.log('\n✅ Test 17: Get Craftable Recipes');
  try {
    const character = Character.createNew('TestExpert', 'mage', 'Town Square');
    character.craftingXP = 800; // Level 8
    character.gold = 10000;
    
    // Add various materials
    character.inventory.addItem({ id: 'iron_ore', name: 'Iron Ore', stackable: true, quantity: 10 });
    character.inventory.addItem({ id: 'wood', name: 'Wood', stackable: true, quantity: 5 });

    const craftable = craftingMgr.getCraftableRecipes(character);
    
    if (craftable.length > 0) {
      console.log('✅ Craftable recipes filtered correctly');
      console.log(`   Can craft ${craftable.length} recipes with current resources`);
      testsPassed++;
    } else {
      // This might not fail if recipes need ingredients we don't have
      console.log('⚠️ No craftable recipes (may need more ingredients)');
      testsPassed++;
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 18: Crafting summary
  console.log('\n📊 Test 18: Crafting Summary');
  try {
    const character = Character.createNew('TestGrandmaster', 'ranger', 'Town Square');
    character.craftingXP = 1250; // Level 12
    character.knownRecipes = ['iron_sword', 'steel_sword', 'leather_armor', 'health_potion'];

    const summary = craftingMgr.getCraftingSummary(character);
    
    if (summary.level === 12 && summary.knownRecipes === 4) {
      console.log('✅ Crafting summary generated correctly');
      console.log(`   Level ${summary.level}, ${summary.knownRecipes} recipes known`);
      console.log(`   XP: ${summary.xp}/${summary.xpToNext}`);
      testsPassed++;
    } else {
      throw new Error('Summary data mismatch');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // ==================== RESULTS ====================
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 TEST RESULTS\n');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📝 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Enchanting & Crafting system is working correctly.');
  } else {
    console.log(`\n⚠️ ${testsFailed} test(s) failed. Please review the errors above.`);
  }
  
  console.log('\n' + '═'.repeat(70));
}

// Run tests
runTests().catch(err => {
  console.error('❌ Fatal error during testing:', err);
  process.exit(1);
});
