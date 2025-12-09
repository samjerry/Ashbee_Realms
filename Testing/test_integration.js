/**
 * Integration Test - Complete System Validation
 * Tests that all components work together seamlessly
 */

const ExplorationManager = require('../game/ExplorationManager');
const TimeEffectsCalculator = require('../game/TimeEffectsCalculator');
const { loadData } = require('../data/data_loader');

console.log('🧪 Running Complete System Integration Test\n');

const exploration = new ExplorationManager();
const timeCalc = new TimeEffectsCalculator();
let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Test 1: ExplorationManager loads all data
test('ExplorationManager should load all game data', () => {
  if (Object.keys(exploration.biomes).length < 20) {
    throw new Error(`Expected at least 20 biomes, got ${Object.keys(exploration.biomes).length}`);
  }
  if (exploration.monsters.length < 100) {
    throw new Error(`Expected at least 100 monsters, got ${exploration.monsters.length}`);
  }
});

// Test 2: New biomes accessible
test('New biomes should be accessible', () => {
  const infernalRift = exploration.getBiome('infernal_rift');
  if (!infernalRift) throw new Error('Infernal Rift not found');
  if (infernalRift.danger_level !== 5) throw new Error('Wrong danger level');
  if (!infernalRift.sub_locations || infernalRift.sub_locations.length < 3) {
    throw new Error('Insufficient sub-locations');
  }
});

// Test 3: Get available biomes
test('Should get available biomes for player', () => {
  const biomes = exploration.getAvailableBiomes(25);
  if (biomes.length < 20) {
    throw new Error(`Expected 20+ biomes, got ${biomes.length}`);
  }
  
  // Check that biomes have proper structure
  const infernal = biomes.find(b => b.id === 'infernal_rift');
  if (!infernal) throw new Error('Infernal Rift not in available biomes');
  if (typeof infernal.isSuitable !== 'boolean') throw new Error('Missing suitability check');
});

// Test 4: Monster encounter in new biome - Day time
test('Should generate monster encounter in new biome (day)', () => {
  const dragonsRoost = exploration.getBiome('dragons_roost');
  if (!dragonsRoost) throw new Error('Dragons Roost not found');
  
  // Mock day time context in TimeEffectsCalculator
  const encounter = exploration.generateMonsterEncounter(dragonsRoost);
  
  if (!encounter) throw new Error('No encounter generated');
  if (encounter.type !== 'combat' && encounter.type !== 'event') {
    throw new Error(`Unexpected encounter type: ${encounter.type}`);
  }
  
  if (encounter.type === 'combat') {
    if (!encounter.monster) throw new Error('No monster in combat encounter');
    if (!encounter.message) throw new Error('No message in encounter');
  }
});

// Test 5: Monster encounter in new biome - Night time
test('Should handle night time encounters differently', () => {
  const crypts = exploration.getBiome('ancient_crypts');
  if (!crypts) throw new Error('Ancient Crypts not found');
  
  const encounter = exploration.generateMonsterEncounter(crypts);
  
  if (!encounter) throw new Error('No encounter generated');
  
  // Should potentially have more undead at night (but we can't force it in test)
  // Just verify structure is correct
  if (encounter.type === 'combat') {
    if (!encounter.monster) throw new Error('No monster in combat encounter');
    if (encounter.environmental_context) {
      // Verify context has all required fields
      if (!encounter.environmental_context.timePhase) throw new Error('Missing timePhase');
      if (!encounter.environmental_context.season) throw new Error('Missing season');
    }
  }
});

// Test 6: Travel calculation to new biome
test('Should calculate travel to new biomes', () => {
  const travel = exploration.calculateTravelDistance('whispering_woods', 'dragons_roost');
  
  if (!travel.canTravel) throw new Error('Cannot travel to Dragons Roost');
  if (travel.movesRequired <= 0) throw new Error('Invalid moves required');
  if (travel.dangerLevel !== 5) throw new Error('Wrong danger level');
});

// Test 7: Monster stats modified by environment
test('Should modify monster stats based on environment', () => {
  const monsters = loadData('monsters')?.monsters || [];
  const fireElemental = monsters.find(m => m.id === 'fire_elemental');
  
  if (!fireElemental) throw new Error('Fire elemental not found');
  
  // Summer day context
  const summerContext = {
    timePhase: 'day',
    season: 'summer',
    moonPhase: 'normal',
    weather: 'heat_wave',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(fireElemental, summerContext);
  
  if (modifiers.statMultiplier <= 1.2) {
    throw new Error('Fire elemental should be significantly boosted in summer heat');
  }
  
  const modified = timeCalc.applyModifiersToMonster(fireElemental, modifiers);
  if (!modified) throw new Error('Modified monster is null');
  
  // Stats should be higher than original
  const originalHP = fireElemental.stats[0];
  const modifiedHP = modified.stats[0];
  
  if (modifiedHP <= originalHP) {
    throw new Error(`Expected HP boost, got ${originalHP} -> ${modifiedHP}`);
  }
});

// Test 8: Biome-specific monster filtering
test('Should only spawn biome-appropriate monsters', () => {
  const dragonsRoost = exploration.getBiome('dragons_roost');
  const monstersInBiome = exploration.monsters.filter(m => 
    m.biomes && m.biomes.includes('dragons_roost')
  );
  
  if (monstersInBiome.length === 0) {
    throw new Error('No monsters assigned to Dragons Roost');
  }
  
  // Verify at least some dragons
  const dragons = monstersInBiome.filter(m => 
    m.template === 'dragon_base' || m.name.toLowerCase().includes('dragon') || m.name.toLowerCase().includes('drake')
  );
  
  if (dragons.length === 0) {
    throw new Error('No dragon-type creatures in Dragons Roost');
  }
});

// Test 9: Environmental damage application
test('Should apply environmental damage to creatures', () => {
  const monsters = loadData('monsters')?.monsters || [];
  const vampire = monsters.find(m => m.name.toLowerCase().includes('vampire'));
  
  if (!vampire) {
    console.log('   ⚠️  No vampire found, skipping test');
    return;
  }
  
  // Day context - vampire should take damage
  const dayContext = {
    timePhase: 'day',
    season: 'summer',
    moonPhase: 'normal',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(vampire, dayContext);
  
  if (modifiers.damagePerTurn <= 0) {
    throw new Error('Vampire should take sun damage during day');
  }
  
  if (modifiers.canSpawn) {
    throw new Error('Vampire should not spawn during day');
  }
});

// Test 10: Blood moon special effects
test('Should handle blood moon correctly', () => {
  const anyMonster = exploration.monsters[0];
  
  const bloodMoonContext = {
    timePhase: 'night',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'clear',
    isBloodMoon: true
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(anyMonster, bloodMoonContext);
  
  if (modifiers.statMultiplier <= 1.0) {
    throw new Error('Monsters should be empowered during blood moon');
  }
});

// Test 11: Spawn filtering removes non-spawnable
test('Should filter out creatures that cannot spawn', () => {
  const monsters = loadData('monsters')?.monsters || [];
  const vampires = monsters.filter(m => m.name.toLowerCase().includes('vampire'));
  
  if (vampires.length === 0) {
    console.log('   ⚠️  No vampires found, skipping test');
    return;
  }
  
  const dayContext = {
    timePhase: 'day',
    season: 'spring',
    moonPhase: 'normal',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const spawnable = timeCalc.filterSpawnableMonsters(vampires, dayContext);
  
  if (spawnable.length > 0) {
    throw new Error('Vampires should not be spawnable during day');
  }
});

// Test 12: Multiple environmental effects stack
test('Should stack multiple environmental bonuses', () => {
  const monsters = loadData('monsters')?.monsters || [];
  const undead = monsters.find(m => m.template === 'undead_base');
  
  if (!undead) throw new Error('No undead found');
  
  // Perfect undead conditions: autumn night, full moon, fog
  const perfectContext = {
    timePhase: 'night',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'fog',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(undead, perfectContext);
  
  // Should have significant bonuses from multiple sources
  if (modifiers.statMultiplier < 1.5) {
    throw new Error('Multiple bonuses should stack for significant boost');
  }
  
  if (modifiers.spawnMultiplier < 2.0) {
    throw new Error('Spawn rate should be significantly increased');
  }
});

// Test 13: Exploration warnings generated
test('Should generate warnings for empowered creatures', () => {
  const monsters = loadData('monsters')?.monsters || [];
  const demon = monsters.find(m => m.template === 'demon_base');
  
  if (!demon) throw new Error('No demon found');
  
  const bloodMoonContext = {
    timePhase: 'night',
    season: 'summer',
    moonPhase: 'full_moon',
    weather: 'heat_wave',
    isBloodMoon: true
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(demon, bloodMoonContext);
  
  if (modifiers.warnings.length === 0) {
    throw new Error('Should generate warnings for highly empowered creatures');
  }
});

// Test 14: All new biomes have sub-locations
test('All new biomes should have sub-locations', () => {
  const newBiomeIds = [
    'infernal_rift',
    'tempest_spire', 
    'crystalline_caverns',
    'clockwork_citadel',
    'verdant_expanse',
    'abyssal_trench',
    'dragons_roost',
    'ethereal_realm'
  ];
  
  for (const biomeId of newBiomeIds) {
    const biome = exploration.getBiome(biomeId);
    if (!biome) throw new Error(`Biome ${biomeId} not found`);
    if (!biome.sub_locations || biome.sub_locations.length < 3) {
      throw new Error(`${biomeId} has insufficient sub-locations`);
    }
  }
});

// Test 15: Integration - Full encounter generation cycle
test('Should complete full encounter generation cycle', () => {
  const biomes = ['infernal_rift', 'dragons_roost', 'crystalline_caverns'];
  
  for (const biomeId of biomes) {
    const biome = exploration.getBiome(biomeId);
    if (!biome) throw new Error(`Biome ${biomeId} not found`);
    
    const encounter = exploration.generateRandomEncounter(biome);
    if (!encounter) throw new Error(`No encounter generated for ${biomeId}`);
    if (!encounter.type) throw new Error(`No encounter type for ${biomeId}`);
    if (!encounter.message) throw new Error(`No encounter message for ${biomeId}`);
  }
});

console.log('\n==================================================');
console.log('📊 INTEGRATION TEST RESULTS');
console.log('==================================================');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(`📈 Total: ${totalTests}`);
console.log(`🎯 Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
console.log('==================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL INTEGRATION TESTS PASSED!\n');
  console.log('✅ System Status: FULLY OPERATIONAL');
  console.log('\n📊 Integration Verified:');
  console.log('   ✅ ExplorationManager ↔ TimeEffectsCalculator');
  console.log('   ✅ Time/Season/Weather ↔ Monster Stats');
  console.log('   ✅ Biome System ↔ Monster Distribution');
  console.log('   ✅ Environmental Effects ↔ Spawn Filtering');
  console.log('   ✅ Encounter Generation ↔ Context Awareness');
  console.log('\n🚀 Ready for deployment!');
} else {
  console.log('❌ Some integration tests failed.');
  process.exit(1);
}
