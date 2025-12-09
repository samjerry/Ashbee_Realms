/**
 * Test Suite for Enhanced Status Effects System - Phase 3.5
 * Tests buffs, debuffs, stacking, combos, cleansing, auras, and combat integration
 */

const StatusEffectManager = require('../game/StatusEffectManager');

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
console.log('Status Effects System - Test Suite (Phase 3.5)');
console.log('========================================\n');

// Test 1: Initialization and data loading
console.log('\n--- Test Group 1: Initialization ---');
const effectMgr = new StatusEffectManager();
assert(effectMgr !== null, 'StatusEffectManager initializes');
assert(effectMgr.statusEffectData !== null, 'Status effect data loaded');
assert(effectMgr.effectCombos.length > 0, 'Effect combos loaded');
assert(effectMgr.effectResistances.length > 0, 'Effect resistances loaded');
assert(effectMgr.cleansePriorities.length > 0, 'Cleanse priorities loaded');

// Test 2: Loading effect templates
console.log('\n--- Test Group 2: Effect Templates ---');
const strengthBuff = effectMgr.getEffectTemplate('strength_buff');
assert(strengthBuff !== null, 'Can load strength_buff template');
assert(strengthBuff.name === 'Strength', 'Strength buff has correct name');
assert(strengthBuff.type === 'buff', 'Strength buff is type buff');
assert(strengthBuff.stacks === true, 'Strength buff is stackable');
assert(strengthBuff.max_stacks === 5, 'Strength buff max stacks is 5');

const poison = effectMgr.getEffectTemplate('poison');
assert(poison !== null, 'Can load poison template');
assert(poison.type === 'debuff', 'Poison is type debuff');
assert(poison.can_cleanse === true, 'Poison can be cleansed');

const nonExistent = effectMgr.getEffectTemplate('fake_effect');
assert(nonExistent === null, 'Non-existent effect returns null');

// Test 3: Adding effects
console.log('\n--- Test Group 3: Adding Effects ---');
const mgr1 = new StatusEffectManager();
const result1 = mgr1.addEffect('strength_buff');
assert(result1.success === true, 'Can add strength buff');
assert(result1.action === 'added', 'Action is added');
assert(mgr1.hasEffect('strength_buff'), 'Has strength buff after adding');

const activeEffects1 = mgr1.getActiveEffects();
assert(activeEffects1.length === 1, 'Has 1 active effect');
assert(activeEffects1[0].stacks === 1, 'Initial stack count is 1');

// Test 4: Effect stacking
console.log('\n--- Test Group 4: Effect Stacking ---');
const result2 = mgr1.addEffect('strength_buff');
assert(result2.success === true, 'Can stack strength buff');
assert(result2.action === 'stacked', 'Action is stacked');
assert(result2.stacks === 2, 'Stack count increased to 2');

// Stack up to max
mgr1.addEffect('strength_buff');
mgr1.addEffect('strength_buff');
const result5 = mgr1.addEffect('strength_buff');
assert(result5.stacks === 5, 'Can stack to max (5)');

// Try to over-stack
const result6 = mgr1.addEffect('strength_buff');
assert(result6.action === 'refreshed', 'Over-stacking refreshes duration instead');

// Test non-stackable effect
const hasteResult = mgr1.addEffect('haste');
assert(hasteResult.success === true, 'Can add haste');
const hasteResult2 = mgr1.addEffect('haste');
assert(hasteResult2.action === 'refreshed', 'Non-stackable effect refreshes');

// Test 5: Effect modifiers
console.log('\n--- Test Group 5: Effect Modifiers ---');
const mgr2 = new StatusEffectManager();
mgr2.addEffect('strength_buff', { initialStacks: 5 });
mgr2.addEffect('defense_buff', { initialStacks: 3 });
mgr2.addEffect('haste');

const modifiers = mgr2.getModifiers();
assert(modifiers.attack_bonus === 50, 'Attack bonus: +50 (5 stacks * 10)');
assert(modifiers.defense_bonus === 30, 'Defense bonus: +30 (3 stacks * 10)');
assert(modifiers.damage_multiplier > 1.0, 'Damage multiplier applied');
assert(modifiers.attack_speed > 1.0, 'Attack speed increased from haste');
assert(modifiers.movement_speed > 1.0, 'Movement speed increased from haste');

// Test 6: Duration and tick processing
console.log('\n--- Test Group 6: Duration & Tick Processing ---');
const mgr3 = new StatusEffectManager();
mgr3.addEffect('poison', { duration: 3 });
mgr3.addEffect('regeneration', { duration: 5 });

const tick1 = mgr3.processTurn({ maxHp: 500 });
assert(tick1.damage > 0, 'Poison deals damage per turn');
assert(tick1.heal > 0, 'Regeneration heals per turn');
assert(tick1.effects.length === 2, 'Both effects processed');
assert(tick1.expired.length === 0, 'No effects expired yet');

// Tick until poison expires
mgr3.processTurn({ maxHp: 500 });
const tick3 = mgr3.processTurn({ maxHp: 500 });
assert(tick3.expired.length === 1, 'Poison expired after 3 turns');
assert(tick3.expired[0] === 'poison', 'Poison is the expired effect');
assert(mgr3.hasEffect('regeneration'), 'Regeneration still active');
assert(!mgr3.hasEffect('poison'), 'Poison removed after expiry');

// Test 7: Effect combos
console.log('\n--- Test Group 7: Effect Combos ---');
const mgr4 = new StatusEffectManager();
mgr4.addEffect('wet');
assert(mgr4.hasEffect('wet'), 'Wet effect applied');

const shockResult = mgr4.addEffect('shock');
assert(shockResult.combo !== undefined, 'Combo detected (wet + shock)');
assert(shockResult.combo.resultEffect === 'paralyzed', 'Combo result is paralyzed');
assert(!mgr4.hasEffect('wet'), 'Wet consumed by combo');
assert(!mgr4.hasEffect('shock'), 'Shock consumed by combo');
assert(mgr4.hasEffect('paralyzed'), 'Paralyzed applied from combo');

// Test burning + oil combo
const mgr5 = new StatusEffectManager();
mgr5.addEffect('oil');
const explosionResult = mgr5.addEffect('burning');
assert(explosionResult.combo !== undefined, 'Burning + oil triggers combo');
assert(explosionResult.combo.resultEffect === 'explosion', 'Combo result is explosion');
assert(explosionResult.combo.bonusDamage === 100, 'Explosion deals 100 bonus damage');

// Test 8: Cleansing
console.log('\n--- Test Group 8: Cleansing ---');
const mgr6 = new StatusEffectManager();
mgr6.addEffect('poison');
mgr6.addEffect('bleeding');
mgr6.addEffect('weakened');
mgr6.addEffect('cursed');

assert(mgr6.getEffectCountByType('debuff') === 4, 'Has 4 debuffs');

const cleanseResult = mgr6.cleanse({ count: 2 });
assert(cleanseResult.success === true, 'Cleanse succeeds');
assert(cleanseResult.count === 2, 'Removed 2 effects');
assert(mgr6.getEffectCountByType('debuff') === 2, 'Has 2 debuffs remaining');

// Cleanse prioritizes by priority list
assert(!mgr6.hasEffect('cursed'), 'Cursed removed (high priority)');

// Specific cleanse
const mgr7 = new StatusEffectManager();
mgr7.addEffect('poison');
mgr7.addEffect('burning');
const specificCleanse = mgr7.cleanse({ specific: 'burning' });
assert(specificCleanse.removed[0] === 'burning', 'Specific cleanse removes burning');
assert(mgr7.hasEffect('poison'), 'Poison still active');
assert(!mgr7.hasEffect('burning'), 'Burning removed');

// Test 9: Dispelling (remove buffs)
console.log('\n--- Test Group 9: Dispelling ---');
const mgr8 = new StatusEffectManager();
mgr8.addEffect('strength_buff');
mgr8.addEffect('defense_buff');
mgr8.addEffect('haste');

const dispelResult = mgr8.dispel({ count: 2 });
assert(dispelResult.success === true, 'Dispel succeeds');
assert(dispelResult.count === 2, 'Dispelled 2 buffs');
assert(mgr8.getEffectCountByType('buff') === 1, 'Has 1 buff remaining');

// Test 10: Aura effects
console.log('\n--- Test Group 10: Aura Effects ---');
const mgr9 = new StatusEffectManager();
const auraData = {
  id: 'holy_aura',
  name: 'Holy Aura',
  description: 'Permanent divine protection',
  type: 'buff',
  icon: '✨',
  effects: {
    defense_bonus: 20,
    damage_reduction: 0.15,
    all_stats_multiplier: 0.10
  }
};

const auraResult = mgr9.addAura('holy_aura', auraData);
assert(auraResult.success === true, 'Can add aura');
assert(mgr9.hasEffect('holy_aura'), 'Has holy aura');

const auras = mgr9.getActiveAuras();
assert(auras.length === 1, 'Has 1 active aura');
assert(auras[0].isPermanent === true, 'Aura is permanent');

// Auras don't expire from ticks
mgr9.processTurn({});
assert(mgr9.hasEffect('holy_aura'), 'Aura persists after tick');

// Auras contribute to modifiers
const auraModifiers = mgr9.getModifiers();
assert(auraModifiers.defense_bonus === 20, 'Aura defense bonus applied');
assert(auraModifiers.damage_reduction > 0, 'Aura damage reduction applied');

// Remove aura
const removeAuraResult = mgr9.removeAura('holy_aura');
assert(removeAuraResult.success === true, 'Can remove aura');
assert(!mgr9.hasEffect('holy_aura'), 'Aura removed');

// Test 11: Immunity
console.log('\n--- Test Group 11: Immunity ---');
const mgr10 = new StatusEffectManager();
mgr10.addEffect('divine_blessing'); // Has immunity_to_curses

const curseResult = mgr10.addEffect('cursed');
assert(curseResult.success === false, 'Cannot apply curse with divine blessing');
assert(curseResult.reason.includes('Immune'), 'Reason mentions immunity');
assert(!mgr10.hasEffect('cursed'), 'Cursed not applied');

// Test 12: Resistance/Counter effects
console.log('\n--- Test Group 12: Resistance/Counter ---');
const mgr11 = new StatusEffectManager();
mgr11.addEffect('wet');

const burningResult = mgr11.addEffect('burning');
assert(burningResult.success === false, 'Cannot apply burning when wet');
assert(burningResult.reason.includes('Countered'), 'Reason mentions counter');

// Reverse: frozen countered by burning
const mgr12 = new StatusEffectManager();
mgr12.addEffect('burning');
const frozenResult = mgr12.addEffect('frozen');
assert(frozenResult.success === false, 'Cannot apply frozen when burning');

// Test 13: Cannot be removed effects
console.log('\n--- Test Group 13: Cannot Be Removed ---');
const mgr13 = new StatusEffectManager();
mgr13.addEffect('enraged'); // Has cannot_be_removed flag

const removeResult = mgr13.removeEffect('enraged');
assert(removeResult.success === false, 'Cannot remove enraged effect');
assert(mgr13.hasEffect('enraged'), 'Enraged still active');

// Cleanse also cannot remove it
const cleanseEnraged = mgr13.cleanse({ specific: 'enraged' });
assert(cleanseEnraged.success === false, 'Cannot cleanse enraged');

// Test 14: Clear all effects
console.log('\n--- Test Group 14: Clear All ---');
const mgr14 = new StatusEffectManager();
mgr14.addEffect('strength_buff');
mgr14.addEffect('poison');
mgr14.addEffect('haste');
mgr14.addAura('test_aura', { id: 'test_aura', name: 'Test' });

assert(mgr14.getActiveEffects().length === 3, 'Has 3 active effects');
assert(mgr14.getActiveAuras().length === 1, 'Has 1 aura');

mgr14.clearAll(true); // Keep auras
assert(mgr14.getActiveEffects().length === 0, 'All effects cleared');
assert(mgr14.getActiveAuras().length === 1, 'Aura preserved');

mgr14.clearAll(false); // Clear auras too
assert(mgr14.getActiveAuras().length === 0, 'Auras cleared');

// Test 15: Complex modifier calculation
console.log('\n--- Test Group 15: Complex Modifiers ---');
const mgr15 = new StatusEffectManager();
mgr15.addEffect('strength_buff', { initialStacks: 3 });
mgr15.addEffect('berserk');
mgr15.addEffect('focus', { initialStacks: 2 });
mgr15.addEffect('divine_blessing');

const complexMod = mgr15.getModifiers();
assert(complexMod.attack_bonus === 30, 'Attack bonus from 3x strength (30)');
assert(complexMod.damage_multiplier > 1.5, 'Berserk damage multiplier (1.5x)');
assert(complexMod.defense_multiplier < 1.0, 'Berserk defense penalty (0.5x)');
assert(complexMod.crit_chance > 0.20, 'Crit chance from focus + divine blessing');
assert(complexMod.life_steal === 0.20, 'Life steal from berserk');

// Test 16: Special flags
console.log('\n--- Test Group 16: Special Flags ---');
const mgr16 = new StatusEffectManager();
mgr16.addEffect('invisibility');

const flagsMod = mgr16.getModifiers();
assert(flagsMod.special_flags.includes('untargetable'), 'Untargetable flag set');
assert(flagsMod.special_flags.includes('breaks_on_attack'), 'Breaks on attack flag set');

// Test 17: Multiple effect types simultaneously
console.log('\n--- Test Group 17: Mixed Effect Types ---');
const mgr17 = new StatusEffectManager();
mgr17.addEffect('strength_buff');
mgr17.addEffect('poison');
mgr17.addEffect('invisibility'); // This is a buff, not special
mgr17.addAura('passive_regen', {
  id: 'passive_regen',
  name: 'Passive Regen',
  effects: { hp_per_turn: 5 }
});

const mixedEffects = mgr17.getActiveEffects();
const buffs = mixedEffects.filter(e => e.type === 'buff');
const debuffs = mixedEffects.filter(e => e.type === 'debuff');
const special = mixedEffects.filter(e => e.type === 'special');

assert(buffs.length === 2, 'Has 2 buffs (strength + invisibility)');
assert(debuffs.length === 1, 'Has 1 debuff');
assert(special.length === 0, 'Has 0 special effects');

const mixedTick = mgr17.processTurn({ maxHp: 100 });
assert(mixedTick.damage > 0, 'Poison ticks damage');
assert(mixedTick.heal >= 5, 'Aura ticks healing (at least 5 HP)');

// Test 18: Duration refresh
console.log('\n--- Test Group 18: Duration Refresh ---');
const mgr18 = new StatusEffectManager();
mgr18.addEffect('strength_buff', { duration: 5 });

mgr18.processTurn({});
mgr18.processTurn({});
// Duration should be 3 now

const refreshResult = mgr18.addEffect('strength_buff', { duration: 10 });
assert(refreshResult.action === 'stacked', 'Effect stacked');

const strengthEffect = mgr18.getEffect('strength_buff');
assert(strengthEffect.remaining_duration === 10, 'Duration refreshed to 10');

// Test 19: Percentage-based healing
console.log('\n--- Test Group 19: Percentage-Based Effects ---');
const mgr19 = new StatusEffectManager();
mgr19.addEffect('regeneration', { initialStacks: 2 });

const percentTick = mgr19.processTurn({ maxHp: 500 });
// 2 stacks: 10 HP/turn * 2 = 20, plus 2% of 500 * 2 = 20, total = 40
assert(percentTick.heal >= 40, 'Percentage-based healing calculated');

// Test 20: Effect source tracking
console.log('\n--- Test Group 20: Effect Source Tracking ---');
const mgr20 = new StatusEffectManager();
mgr20.addEffect('strength_buff', { source: 'Warrior Shout' });
mgr20.addEffect('poison', { source: 'Goblin Poison Dagger' });

const tracked = mgr20.getActiveEffects();
const strengthWithSource = tracked.find(e => e.id === 'strength_buff');
const poisonWithSource = tracked.find(e => e.id === 'poison');

assert(strengthWithSource.source === 'Warrior Shout', 'Strength buff source tracked');
assert(poisonWithSource.source === 'Goblin Poison Dagger', 'Poison source tracked');

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
  console.log('🎉 All tests passed! Status Effects system is working correctly.');
  process.exit(0);
} else {
  console.error('⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}
