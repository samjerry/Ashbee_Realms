/**
 * Test Environmental Effects System
 * Verifies time, season, weather, and moon effects on creatures
 */

const TimeEffectsCalculator = require('../game/TimeEffectsCalculator');
const { loadData } = require('../data/data_loader');

console.log('🧪 Testing Environmental Effects System\n');

const timeCalc = new TimeEffectsCalculator();
const monsters = loadData('monsters')?.monsters || [];

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

// Test 1: Time phase calculation
test('Should calculate time phases correctly', () => {
  const dawn = timeCalc.getCurrentTimePhase(6);
  const day = timeCalc.getCurrentTimePhase(12);
  const dusk = timeCalc.getCurrentTimePhase(18);
  const night = timeCalc.getCurrentTimePhase(23);
  
  if (dawn !== 'dawn') throw new Error(`Expected dawn, got ${dawn}`);
  if (day !== 'day') throw new Error(`Expected day, got ${day}`);
  if (dusk !== 'dusk') throw new Error(`Expected dusk, got ${dusk}`);
  if (night !== 'night') throw new Error(`Expected night, got ${night}`);
});

// Test 2: Season calculation
test('Should calculate seasons correctly', () => {
  const spring = timeCalc.getCurrentSeason(45);
  const summer = timeCalc.getCurrentSeason(136);
  const autumn = timeCalc.getCurrentSeason(227);
  const winter = timeCalc.getCurrentSeason(318);
  
  if (spring !== 'spring') throw new Error(`Expected spring, got ${spring}`);
  if (summer !== 'summer') throw new Error(`Expected summer, got ${summer}`);
  if (autumn !== 'autumn') throw new Error(`Expected autumn, got ${autumn}`);
  if (winter !== 'winter') throw new Error(`Expected winter, got ${winter}`);
});

// Test 3: Moon phase calculation
test('Should calculate moon phases correctly', () => {
  const fullMoon = timeCalc.getCurrentMoonPhase(0);
  const newMoon = timeCalc.getCurrentMoonPhase(4);
  
  if (fullMoon !== 'full_moon') throw new Error(`Expected full_moon, got ${fullMoon}`);
  if (newMoon !== 'new_moon') throw new Error(`Expected new_moon, got ${newMoon}`);
});

// Test 4: Monsters have environmental effects
test('Should have loaded monsters with environmental effects', () => {
  if (!monsters || monsters.length === 0) {
    throw new Error('No monsters loaded');
  }
  
  const monsterWithEffects = monsters.find(m => 
    m.seasonal_boosts && m.time_effects && m.moon_effects && m.weather_effects
  );
  
  if (!monsterWithEffects) {
    throw new Error('No monsters found with environmental effects');
  }
});

// Test 5: Calculate modifiers for undead at day
test('Should calculate undead weakness during day', () => {
  const undead = monsters.find(m => m.template === 'undead_base');
  if (!undead) throw new Error('No undead monster found');
  
  const context = {
    timePhase: 'day',
    season: 'spring',
    moonPhase: 'normal',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(undead, context);
  
  if (modifiers.statMultiplier >= 1.0) {
    throw new Error(`Expected undead to be weakened during day, got ${modifiers.statMultiplier}`);
  }
  
  if (modifiers.damagePerTurn <= 0) {
    throw new Error(`Expected undead to take sun damage during day`);
  }
});

// Test 6: Calculate modifiers for undead at night
test('Should calculate undead empowerment at night', () => {
  const undead = monsters.find(m => m.template === 'undead_base');
  if (!undead) throw new Error('No undead monster found');
  
  const context = {
    timePhase: 'night',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'fog',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(undead, context);
  
  if (modifiers.statMultiplier <= 1.0) {
    throw new Error(`Expected undead to be empowered at night, got ${modifiers.statMultiplier}`);
  }
  
  if (modifiers.spawnMultiplier <= 1.0) {
    throw new Error(`Expected undead spawn rate to increase at night`);
  }
});

// Test 7: Fire elemental in summer
test('Should calculate fire elemental boost in summer', () => {
  const fireElemental = monsters.find(m => 
    m.template === 'elemental_base' && (m.name.toLowerCase().includes('fire') || m.id.includes('fire'))
  );
  
  if (!fireElemental) throw new Error('No fire elemental found');
  
  const context = {
    timePhase: 'day',
    season: 'summer',
    moonPhase: 'normal',
    weather: 'heat_wave',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(fireElemental, context);
  
  if (modifiers.statMultiplier <= 1.2) {
    throw new Error(`Expected fire elemental to be significantly boosted in summer, got ${modifiers.statMultiplier}`);
  }
});

// Test 8: Fire elemental in rain
test('Should calculate fire elemental weakness in rain', () => {
  const fireElemental = monsters.find(m => 
    m.template === 'elemental_base' && (m.name.toLowerCase().includes('fire') || m.id.includes('fire'))
  );
  
  if (!fireElemental) throw new Error('No fire elemental found');
  
  const context = {
    timePhase: 'day',
    season: 'spring',
    moonPhase: 'normal',
    weather: 'rain',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(fireElemental, context);
  
  if (modifiers.statMultiplier >= 1.0) {
    throw new Error(`Expected fire elemental to be weakened in rain, got ${modifiers.statMultiplier}`);
  }
  
  if (modifiers.damagePerTurn <= 0) {
    throw new Error(`Expected fire elemental to take damage in rain`);
  }
});

// Test 9: Blood moon effects
test('Should apply blood moon effects to all creatures', () => {
  const anyMonster = monsters[0];
  
  const context = {
    timePhase: 'night',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'clear',
    isBloodMoon: true
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(anyMonster, context);
  
  // Blood moon should boost creatures
  if (modifiers.statMultiplier <= 1.0) {
    throw new Error(`Expected blood moon to empower creatures`);
  }
});

// Test 10: Apply modifiers to monster stats
test('Should apply modifiers to monster stats', () => {
  const wolf = monsters.find(m => m.id === 'forest_wolf');
  if (!wolf) throw new Error('No wolf found');
  
  const originalStats = [...wolf.stats];
  
  const context = {
    timePhase: 'dusk',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const modifiers = timeCalc.calculateCreatureModifiers(wolf, context);
  const modified = timeCalc.applyModifiersToMonster(wolf, modifiers);
  
  if (!modified) throw new Error('Modified monster is null');
  if (!modified.stats) throw new Error('Modified monster has no stats');
  
  // Stats should be different if modifiers are applied
  const statsChanged = modified.stats.some((stat, i) => stat !== originalStats[i]);
  if (!statsChanged && modifiers.statMultiplier !== 1.0) {
    throw new Error('Stats were not modified despite stat multiplier');
  }
});

// Test 11: Filter spawnable monsters
test('Should filter spawnable monsters based on conditions', () => {
  const vampires = monsters.filter(m => 
    m.name.toLowerCase().includes('vampire') || m.id.includes('vampire')
  );
  
  if (vampires.length === 0) {
    console.log('   ⚠️  No vampires in monster list, skipping test');
    return;
  }
  
  // Day context - vampires shouldn't spawn
  const dayContext = {
    timePhase: 'day',
    season: 'summer',
    moonPhase: 'normal',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const daySpawnable = timeCalc.filterSpawnableMonsters(vampires, dayContext);
  
  if (daySpawnable.length > 0) {
    throw new Error('Vampires spawned during day without blood moon');
  }
  
  // Night context - vampires should spawn
  const nightContext = {
    timePhase: 'night',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'fog',
    isBloodMoon: false
  };
  
  const nightSpawnable = timeCalc.filterSpawnableMonsters(vampires, nightContext);
  
  if (nightSpawnable.length === 0) {
    throw new Error('Vampires should spawn at night');
  }
});

// Test 12: Check new biomes exist
test('Should have loaded new biomes', () => {
  const biomes = loadData('biomes')?.biomes || {};
  
  const newBiomes = [
    'infernal_rift',
    'tempest_spire',
    'crystalline_caverns',
    'clockwork_citadel',
    'verdant_expanse',
    'abyssal_trench',
    'dragons_roost',
    'ethereal_realm'
  ];
  
  for (const biomeId of newBiomes) {
    if (!biomes[biomeId]) {
      throw new Error(`New biome ${biomeId} not found`);
    }
  }
});

// Test 13: Check monsters redistributed to new biomes
test('Should have monsters in new biomes', () => {
  const newBiomes = [
    'infernal_rift',
    'dragons_roost',
    'abyssal_trench'
  ];
  
  for (const biomeId of newBiomes) {
    const monstersInBiome = monsters.filter(m => 
      m.biomes && m.biomes.includes(biomeId)
    );
    
    if (monstersInBiome.length === 0) {
      throw new Error(`No monsters found in ${biomeId}`);
    }
  }
});

// Test 14: Werewolf transformation
test('Should handle werewolf transformation mechanics', () => {
  const werewolf = monsters.find(m => 
    m.name.toLowerCase().includes('werewolf') || m.id.includes('werewolf')
  );
  
  if (!werewolf) {
    console.log('   ⚠️  No werewolf in monster list, skipping test');
    return;
  }
  
  // Day - should be human form
  const dayContext = {
    timePhase: 'day',
    season: 'spring',
    moonPhase: 'normal',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const dayModifiers = timeCalc.calculateCreatureModifiers(werewolf, dayContext);
  
  if (dayModifiers.canSpawn && dayModifiers.specialEffects.includes('not_hostile')) {
    // Correct - werewolf is human during day
  } else {
    // Check if spawn rate is very low
    if (dayModifiers.spawnMultiplier > 0.1) {
      throw new Error('Werewolf should not be hostile during day');
    }
  }
  
  // Full moon night - should be forced to transform
  const fullMoonContext = {
    timePhase: 'night',
    season: 'autumn',
    moonPhase: 'full_moon',
    weather: 'clear',
    isBloodMoon: false
  };
  
  const fullMoonModifiers = timeCalc.calculateCreatureModifiers(werewolf, fullMoonContext);
  
  if (fullMoonModifiers.statMultiplier <= 1.5) {
    throw new Error(`Werewolf should be significantly empowered at full moon`);
  }
});

console.log('\n==================================================');
console.log('📊 ENVIRONMENTAL EFFECTS TEST RESULTS');
console.log('==================================================');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(`📈 Total: ${totalTests}`);
console.log(`🎯 Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
console.log('==================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 All environmental effects tests passed!');
  console.log('\n📊 System Summary:');
  console.log(`   - ${monsters.length} monsters with environmental effects`);
  console.log(`   - 4 time phases (dawn/day/dusk/night)`);
  console.log(`   - 4 seasons (spring/summer/autumn/winter)`);
  console.log(`   - 3 moon phases (new/normal/full + blood moon)`);
  console.log(`   - 7 weather types affecting spawns and stats`);
  console.log(`   - 8 new biomes added to the world`);
  console.log(`   - Dynamic creature spawning based on all conditions`);
} else {
  console.log('❌ Some tests failed. Please review the errors above.');
  process.exit(1);
}
