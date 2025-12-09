/**
 * Test Suite for Passive Progression System
 * Tests PassiveManager, currency earning, passive upgrades, respec, and cost scaling
 */

const PassiveManager = require('../game/PassiveManager');
const ProgressionManager = require('../game/ProgressionManager');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
    testsFailed++;
  }
}

console.log('========================================');
console.log('Passive Progression System - Test Suite');
console.log('========================================\n');

// Initialize managers
const passiveMgr = new PassiveManager();
const progressionMgr = new ProgressionManager();

// Test 1: PassiveManager initialization
console.log('\n--- Test Group 1: Initialization ---');
assert(passiveMgr !== null, 'PassiveManager initializes');
assert(passiveMgr.passives !== null, 'Passives loaded');
assert(passiveMgr.categories !== null, 'Categories loaded');
assert(passiveMgr.startingCurrency.souls === 5, 'Starting currency: 5 souls');
assert(passiveMgr.startingCurrency.legacy_points === 0, 'Starting currency: 0 LP');

// Test 2: Passive data structure
console.log('\n--- Test Group 2: Passive Data Structure ---');
const allPassives = passiveMgr.getAllPassives({});
assert(allPassives.length > 0, 'Passives exist');
assert(allPassives.length === 19, 'Correct number of passives (19)');

const strengthPassive = passiveMgr.getPassive('strength_boost');
assert(strengthPassive !== null, 'Can get specific passive');
assert(strengthPassive.max_level === 50, 'Strength passive max level is 50');
assert(strengthPassive.base_cost.souls === 2, 'Strength passive base cost is 2 souls');

// Test 3: Cost calculation
console.log('\n--- Test Group 3: Cost Calculation ---');
const costLevel0 = passiveMgr.calculateUpgradeCost(strengthPassive, 0);
assertEquals(costLevel0, { souls: 2, legacy_points: 0 }, 'Level 0->1 costs 2 souls, 0 LP');

const costLevel4 = passiveMgr.calculateUpgradeCost(strengthPassive, 4);
assertEquals(costLevel4, { souls: 2, legacy_points: 1 }, 'Level 4->5 costs 2 souls, 1 LP (milestone)');

const costLevel9 = passiveMgr.calculateUpgradeCost(strengthPassive, 9);
assertEquals(costLevel9, { souls: 2, legacy_points: 1 }, 'Level 9->10 costs 2 souls, 1 LP (milestone)');

const costLevel10 = passiveMgr.calculateUpgradeCost(strengthPassive, 10);
assertEquals(costLevel10, { souls: 4, legacy_points: 0 }, 'Level 10->11 costs 4 souls (scaling)');

const costLevel20 = passiveMgr.calculateUpgradeCost(strengthPassive, 20);
assertEquals(costLevel20, { souls: 6, legacy_points: 0 }, 'Level 20->21 costs 6 souls (scaling)');

const costLevel49 = passiveMgr.calculateUpgradeCost(strengthPassive, 49);
assertEquals(costLevel49, { souls: 10, legacy_points: 1 }, 'Level 49->50 costs 10 souls, 1 LP');

const costLevel50 = passiveMgr.calculateUpgradeCost(strengthPassive, 50);
assert(costLevel50 === null, 'Cannot upgrade past max level');

// Test 4: Passive upgrades
console.log('\n--- Test Group 4: Passive Upgrades ---');
const permanentStats = {
  passiveLevels: {},
  souls: 100,
  legacyPoints: 10,
  totalDeaths: 0,
  totalKills: 0
};

const canUpgrade1 = passiveMgr.canUpgradePassive('strength_boost', permanentStats);
assert(canUpgrade1.canUpgrade === true, 'Can upgrade when having enough currency');

const upgrade1 = passiveMgr.upgradePassive('strength_boost', permanentStats);
assert(upgrade1.success === true, 'Upgrade succeeds');
assert(upgrade1.newLevel === 1, 'New level is 1');
assert(permanentStats.passiveLevels.strength_boost === 1, 'Passive level updated');
assert(permanentStats.souls === 98, 'Souls deducted (100 - 2 = 98)');

// Upgrade to level 5 (requires LP)
permanentStats.passiveLevels.strength_boost = 4;
permanentStats.souls = 100;
permanentStats.legacyPoints = 10;

const upgrade5 = passiveMgr.upgradePassive('strength_boost', permanentStats);
assert(upgrade5.success === true, 'Can upgrade to level 5');
assert(upgrade5.newLevel === 5, 'New level is 5');
assert(permanentStats.legacyPoints === 9, 'Legacy point deducted (10 - 1 = 9)');

// Test insufficient currency
permanentStats.souls = 1;
const canUpgradeFail = passiveMgr.canUpgradePassive('strength_boost', permanentStats);
assert(canUpgradeFail.canUpgrade === false, 'Cannot upgrade with insufficient souls');

// Test 5: Bonus calculation
console.log('\n--- Test Group 5: Bonus Calculation ---');
const bonusLevels = {
  strength_boost: 10,  // +10 strength
  defense_boost: 5,    // +5 defense
  exp_gain: 5,         // +10% XP (5 * 2%)
  gold_gain: 10,       // +20% gold (10 * 2%)
  max_hp: 20,          // +100 HP (20 * 5)
  crit_chance: 10,     // +5% crit (10 * 0.5%)
  damage_boost: 5      // +5% damage (5 * 1%)
};

const bonuses = passiveMgr.calculatePassiveBonuses(bonusLevels);
assert(bonuses.strength === 10, 'Strength bonus: +10');
assert(bonuses.defense === 5, 'Defense bonus: +5');
assert(bonuses.maxHp === 100, 'Max HP bonus: +100');
assert(Math.abs(bonuses.xpMultiplier - 1.10) < 0.001, 'XP multiplier: 1.10 (10% bonus)');
assert(Math.abs(bonuses.goldMultiplier - 1.20) < 0.001, 'Gold multiplier: 1.20 (20% bonus)');
assert(Math.abs(bonuses.critChance - 0.05) < 0.001, 'Crit chance: +5%');
assert(Math.abs(bonuses.damageMultiplier - 1.05) < 0.001, 'Damage multiplier: 1.05 (5% bonus)');

// Test 6: Total souls/LP spent calculation
console.log('\n--- Test Group 6: Currency Spent Calculation ---');
const spentLevels = {
  strength_boost: 10,  // Levels 0->10
  exp_gain: 5          // Levels 0->5
};

const totalSoulsSpent = passiveMgr.calculateTotalSoulsSpent(spentLevels);
// strength_boost: levels 0-9: 10 levels * 2 souls = 20 souls
// exp_gain: levels 0-4: 5 levels * 5 souls = 25 souls
// Total: 45 souls
assert(totalSoulsSpent === 45, `Total souls spent: 45 (actual: ${totalSoulsSpent})`);

const totalLPSpent = passiveMgr.calculateTotalLegacyPointsSpent(spentLevels);
// strength_boost: level 5 (1 LP) + level 10 (1 LP) = 2 LP
// exp_gain: level 5 (1 LP) = 1 LP
// Total: 3 LP
assert(totalLPSpent === 3, `Total LP spent: 3 (actual: ${totalLPSpent})`);

// Test 7: Respec system
console.log('\n--- Test Group 7: Respec System ---');
const respecStats = {
  passiveLevels: {
    strength_boost: 10,
    defense_boost: 10
  },
  souls: 10,
  legacyPoints: 2
};

// Calculate expected refund
const soulsSpentBeforeRespec = passiveMgr.calculateTotalSoulsSpent(respecStats.passiveLevels);
const lpSpentBeforeRespec = passiveMgr.calculateTotalLegacyPointsSpent(respecStats.passiveLevels);

const respecResult = passiveMgr.respecPassives(respecStats);
assert(respecResult.success === true, 'Respec succeeds');
assert(Object.keys(respecStats.passiveLevels).length === 0, 'All passives reset');

const expectedSoulsRefund = Math.floor(soulsSpentBeforeRespec * 0.5);
assert(respecStats.souls === 10 + expectedSoulsRefund, `Souls refunded at 50% (${expectedSoulsRefund})`);
assert(respecStats.legacyPoints === 2 + lpSpentBeforeRespec, `LP fully refunded (${lpSpentBeforeRespec})`);

// Test 8: Currency earning - Souls on death
console.log('\n--- Test Group 8: Currency Earning - Souls ---');
const deathStats1 = { souls: 5, legacyPoints: 0 };
const soulsLevel5 = passiveMgr.awardSouls(deathStats1, 5, false);
assert(soulsLevel5 === 2, 'Level 5 death: 2 souls (1 + 5/5)');
assert(deathStats1.souls === 7, 'Souls updated correctly (5 + 2 = 7)');

const deathStats2 = { souls: 0, legacyPoints: 0 };
const soulsLevel25Hardcore = passiveMgr.awardSouls(deathStats2, 25, true);
assert(soulsLevel25Hardcore === 12, 'Level 25 hardcore death: 12 souls (6 * 2)');

const deathStats3 = { souls: 0, legacyPoints: 0 };
const soulsLevel50 = passiveMgr.awardSouls(deathStats3, 50, false);
assert(soulsLevel50 === 11, 'Level 50 death: 11 souls (1 + 50/5)');

// Test 9: Currency earning - Legacy Points
console.log('\n--- Test Group 9: Currency Earning - Legacy Points ---');
const lpStats1 = { souls: 0, legacyPoints: 0 };
const lp1 = passiveMgr.awardLegacyPoints(lpStats1, 1);
assert(lp1 === 1, 'Award 1 legacy point');
assert(lpStats1.legacyPoints === 1, 'LP updated correctly');

const lpStats2 = { souls: 0, legacyPoints: 5 };
const lp5 = passiveMgr.awardLegacyPoints(lpStats2, 5);
assert(lp5 === 5, 'Award 5 legacy points');
assert(lpStats2.legacyPoints === 10, 'LP updated correctly (5 + 5 = 10)');

// Test 10: Integration with ProgressionManager
console.log('\n--- Test Group 10: ProgressionManager Integration ---');
assert(progressionMgr.passiveManager !== undefined, 'ProgressionManager has passiveManager');

const mockCharacter = {
  name: 'TestChar',
  level: 10,
  hp: 50,
  maxHp: 100,
  xp: 0,
  gold: 100,
  location: 'Town',
  inCombat: false,
  combat: null
};

const mockPermanentStats = {
  passiveLevels: {},
  souls: 5,
  legacyPoints: 0,
  totalDeaths: 0,
  totalKills: 0
};

const deathResult = progressionMgr.handleDeath(mockCharacter, false, mockPermanentStats);
assert(deathResult.died === true, 'Death handled');
assert(deathResult.soulsAwarded > 0, 'Souls awarded on death');
assert(mockPermanentStats.souls > 5, 'Souls added to permanent stats');

// Test 11: Passive tree summary
console.log('\n--- Test Group 11: Passive Tree Summary ---');
const summaryLevels = {
  strength_boost: 10,
  defense_boost: 5
};
const summary = passiveMgr.getPassiveTreeSummary(summaryLevels, 50, 3);
assert(summary.currency.souls === 50, 'Summary shows correct souls');
assert(summary.currency.legacy_points === 3, 'Summary shows correct LP');
assert(summary.progression.total_passive_levels === 15, 'Summary shows total levels (10 + 5)');
assert(summary.respec.enabled === true, 'Respec enabled in summary');
assert(summary.respec.refund_percentage === 0.5, 'Respec refund is 50%');

// Test 12: Category filtering
console.log('\n--- Test Group 12: Category Filtering ---');
const combatPassives = passiveMgr.getPassivesByCategory('combat', {});
assert(combatPassives.length === 8, 'Combat category has 8 passives');

const survivalPassives = passiveMgr.getPassivesByCategory('survival', {});
assert(survivalPassives.length === 3, 'Survival category has 3 passives');

const progressionPassives = passiveMgr.getPassivesByCategory('progression', {});
assert(progressionPassives.length === 4, 'Progression category has 4 passives');

const utilityPassives = passiveMgr.getPassivesByCategory('utility', {});
assert(utilityPassives.length === 4, 'Utility category has 4 passives');

// Test 13: Max level enforcement
console.log('\n--- Test Group 13: Max Level Enforcement ---');
const maxLevelStats = {
  passiveLevels: {
    strength_boost: 50  // At max level
  },
  souls: 1000,
  legacyPoints: 100
};

const canUpgradeMax = passiveMgr.canUpgradePassive('strength_boost', maxLevelStats);
assert(canUpgradeMax.canUpgrade === false, 'Cannot upgrade past max level');
assert(canUpgradeMax.reason.includes('max level'), 'Error message mentions max level');

// Test 14: Non-existent passive
console.log('\n--- Test Group 14: Error Handling ---');
const invalidPassive = passiveMgr.getPassive('non_existent_passive');
assert(invalidPassive === null, 'Non-existent passive returns null');

const invalidUpgrade = passiveMgr.canUpgradePassive('non_existent_passive', permanentStats);
assert(invalidUpgrade.canUpgrade === false, 'Cannot upgrade non-existent passive');

// Test 15: Percentage passives max levels
console.log('\n--- Test Group 15: Max Level Validation ---');
const expPassive = passiveMgr.getPassive('exp_gain');
assert(expPassive.max_level === 25, 'XP gain max level is 25');

const goldPassive = passiveMgr.getPassive('gold_gain');
assert(goldPassive.max_level === 25, 'Gold gain max level is 25');

const hpPassive = passiveMgr.getPassive('max_hp');
assert(hpPassive.max_level === 100, 'Max HP max level is 100');

const critChancePassive = passiveMgr.getPassive('crit_chance');
assert(critChancePassive.max_level === 20, 'Crit chance max level is 20');

// Test 16: All passive effects
console.log('\n--- Test Group 16: All Passive Effects ---');
const allEffectLevels = {
  strength_boost: 1,
  defense_boost: 1,
  magic_boost: 1,
  agility_boost: 1,
  crit_chance: 1,
  crit_damage: 1,
  damage_boost: 1,
  damage_reduction: 1,
  max_hp: 1,
  hp_on_kill: 1,
  potion_effectiveness: 1,
  exp_gain: 1,
  gold_gain: 1,
  reputation_gain: 1,
  quest_rewards: 1,
  movement_speed: 1,
  loot_luck: 1,
  inventory_space: 1,
  merchant_prices: 1
};

const allBonuses = passiveMgr.calculatePassiveBonuses(allEffectLevels);
assert(allBonuses.strength === 1, 'Strength effect works');
assert(allBonuses.defense === 1, 'Defense effect works');
assert(allBonuses.magic === 1, 'Magic effect works');
assert(allBonuses.agility === 1, 'Agility effect works');
assert(allBonuses.maxHp === 5, 'Max HP effect works');
assert(allBonuses.inventorySpace === 1, 'Inventory space effect works');
assert(allBonuses.damageMultiplier > 1.0, 'Damage multiplier effect works');
assert(allBonuses.xpMultiplier > 1.0, 'XP multiplier effect works');
assert(allBonuses.goldMultiplier > 1.0, 'Gold multiplier effect works');
assert(allBonuses.reputationMultiplier > 1.0, 'Reputation multiplier effect works');
assert(allBonuses.questRewardBonus > 1.0, 'Quest reward bonus effect works');
assert(allBonuses.movementSpeed > 1.0, 'Movement speed effect works');
assert(allBonuses.lootLuck > 1.0, 'Loot luck effect works');
assert(allBonuses.merchantDiscount > 1.0, 'Merchant discount effect works');
assert(allBonuses.potionBonus > 1.0, 'Potion bonus effect works');
assert(allBonuses.critChance > 0, 'Crit chance effect works');
assert(allBonuses.critDamage > 0, 'Crit damage effect works');
assert(allBonuses.damageReduction > 0, 'Damage reduction effect works');
assert(allBonuses.hpOnKill > 0, 'HP on kill effect works');

// Final Results
console.log('\n========================================');
console.log('Test Results Summary');
console.log('========================================');
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('========================================\n');

if (testsFailed === 0) {
  console.log('🎉 All tests passed! The passive system is working correctly.');
  process.exit(0);
} else {
  console.error('⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}
