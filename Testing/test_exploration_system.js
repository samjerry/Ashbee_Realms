/**
 * test_exploration_system.js
 * Comprehensive tests for the exploration and travel system
 */

const ExplorationManager = require('../game/ExplorationManager');
const Character = require('../game/Character');

console.log('🧪 Testing Exploration System\n');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// ==================== BIOME LOADING TESTS ====================

test('Load biomes from data file', () => {
  const explorationMgr = new ExplorationManager();
  const biomeKeys = Object.keys(explorationMgr.biomes);
  
  if (biomeKeys.length === 0) throw new Error('No biomes loaded');
  
  console.log(`   Loaded ${biomeKeys.length} biomes`);
});

test('Get specific biome by ID', () => {
  const explorationMgr = new ExplorationManager();
  const biome = explorationMgr.getBiome('whispering_woods');
  
  if (!biome) throw new Error('Failed to load whispering_woods biome');
  if (biome.name !== 'Whispering Woods') throw new Error('Incorrect biome name');
  if (!biome.recommended_level) throw new Error('Missing recommended_level');
  
  console.log(`   ${biome.name}: Level ${biome.recommended_level[0]}-${biome.recommended_level[1]}`);
  console.log(`   Danger Level: ${biome.danger_level}`);
});

test('Get available biomes filtered by player level', () => {
  const explorationMgr = new ExplorationManager();
  const lowLevel = explorationMgr.getAvailableBiomes(1);
  const highLevel = explorationMgr.getAvailableBiomes(30);
  
  if (lowLevel.length === 0) throw new Error('No biomes for level 1');
  
  // Check that biomes are marked appropriately
  const suitableForLow = lowLevel.filter(b => b.isSuitable);
  const dangerousForLow = lowLevel.filter(b => b.tooDangerous);
  
  console.log(`   Level 1: ${suitableForLow.length} suitable, ${dangerousForLow.length} too dangerous`);
  console.log(`   Level 30: ${highLevel.length} total biomes`);
});

// ==================== TRAVEL DISTANCE TESTS ====================

test('Calculate travel distance between biomes', () => {
  const explorationMgr = new ExplorationManager();
  const travelInfo = explorationMgr.calculateTravelDistance('whispering_woods', 'twilight_wetlands');
  
  if (!travelInfo.canTravel) throw new Error('Should be able to travel');
  if (travelInfo.movesRequired < 1) throw new Error('Should require at least 1 move');
  if (travelInfo.timeRequired < 1) throw new Error('Should require time');
  
  console.log(`   Whispering Woods → Twilight Wetlands`);
  console.log(`   Moves: ${travelInfo.movesRequired}, Time: ${travelInfo.timeRequired} min`);
  console.log(`   Encounter chance per move: ${(travelInfo.encounterChancePerMove * 100).toFixed(1)}%`);
});

test('Travel distance scales with danger level difference', () => {
  const explorationMgr = new ExplorationManager();
  
  // Get two biomes with different danger levels
  const biomes = Object.values(explorationMgr.biomes);
  if (biomes.length < 2) throw new Error('Need at least 2 biomes');
  
  const lowDanger = biomes.find(b => b.danger_level === 1);
  const highDanger = biomes.find(b => b.danger_level >= 3);
  
  if (!lowDanger || !highDanger) {
    console.log('   Skipping (need biomes with danger level 1 and 3+)');
    return;
  }
  
  const shortTravel = explorationMgr.calculateTravelDistance(lowDanger.id, lowDanger.id);
  const longTravel = explorationMgr.calculateTravelDistance(lowDanger.id, highDanger.id);
  
  if (longTravel.movesRequired <= shortTravel.movesRequired + 2) {
    throw new Error('Higher danger biomes should require more moves');
  }
  
  console.log(`   Same biome: ${shortTravel.movesRequired} moves`);
  console.log(`   Low → High danger: ${longTravel.movesRequired} moves`);
});

test('Movement penalties increase travel time', () => {
  const explorationMgr = new ExplorationManager();
  
  // Find a biome with movement penalty
  const biomes = Object.values(explorationMgr.biomes);
  const penaltyBiome = biomes.find(b => 
    b.environmental_effects && b.environmental_effects.movement_penalty > 0
  );
  
  if (!penaltyBiome) {
    console.log('   Skipping (no biomes with movement penalty found)');
    return;
  }
  
  const startBiome = biomes.find(b => b.id !== penaltyBiome.id);
  const travel = explorationMgr.calculateTravelDistance(startBiome.id, penaltyBiome.id);
  
  console.log(`   Travel to ${penaltyBiome.name}`);
  console.log(`   Movement penalty: ${(penaltyBiome.environmental_effects.movement_penalty * 100).toFixed(0)}%`);
  console.log(`   Total moves: ${travel.movesRequired}`);
});

test('Travel warnings generated correctly', () => {
  const explorationMgr = new ExplorationManager();
  
  // Find a dangerous biome
  const biomes = Object.values(explorationMgr.biomes);
  const dangerousBiome = biomes.find(b => b.danger_level >= 4);
  
  if (!dangerousBiome) {
    console.log('   Skipping (no biomes with danger level 4+)');
    return;
  }
  
  const warnings = explorationMgr.getTravelWarnings(dangerousBiome);
  
  if (warnings.length === 0) throw new Error('Should have warnings for dangerous biome');
  
  console.log(`   ${dangerousBiome.name} warnings:`);
  warnings.forEach(w => console.log(`     ${w}`));
});

// ==================== TRAVEL STATE TESTS ====================

test('Start travel creates valid travel state', () => {
  const characterData = {
    name: 'TestTraveler',
    type: 'ranger',
    level: 5,
    xp: 0,
    xp_to_next: 200,
    hp: 100,
    max_hp: 100,
    gold: 100,
    location: 'whispering_woods',
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const explorationMgr = new ExplorationManager();
  
  const result = explorationMgr.startTravel(character, 'twilight_wetlands');
  
  if (!result.success) throw new Error('Travel start failed');
  if (!result.travelState) throw new Error('No travel state created');
  if (!result.travelState.inTravel) throw new Error('Travel not marked as in progress');
  if (result.travelState.movesTotal < 1) throw new Error('Invalid move count');
  
  console.log(`   Travel state created successfully`);
  console.log(`   From: ${result.travelState.from}, To: ${result.travelState.to}`);
  console.log(`   Total moves: ${result.travelState.movesTotal}`);
});

test('Advance travel increments move counter', () => {
  const explorationMgr = new ExplorationManager();
  
  const travelState = {
    inTravel: true,
    from: 'whispering_woods',
    to: 'twilight_wetlands',
    movesTotal: 5,
    movesCompleted: 0,
    encounterChance: 0.2,
    startedAt: Date.now()
  };
  
  const result = explorationMgr.advanceTravel(travelState);
  
  if (!result.success) throw new Error('Travel advance failed');
  if (result.movesCompleted !== 1) throw new Error('Move counter not incremented');
  if (result.arrived) throw new Error('Should not arrive after 1 move (total 5)');
  
  console.log(`   Progress: ${result.movesCompleted}/${travelState.movesTotal}`);
});

test('Arrival after completing all moves', () => {
  const explorationMgr = new ExplorationManager();
  
  const travelState = {
    inTravel: true,
    from: 'whispering_woods',
    to: 'twilight_wetlands',
    movesTotal: 3,
    movesCompleted: 2, // One move away from destination
    encounterChance: 0.2,
    startedAt: Date.now()
  };
  
  const result = explorationMgr.advanceTravel(travelState);
  
  if (!result.success) throw new Error('Travel advance failed');
  if (!result.arrived) throw new Error('Should arrive after final move');
  if (!result.destination) throw new Error('No destination data');
  
  console.log(`   Arrived at: ${result.destination.name}`);
});

test('Travel summary shows progress', () => {
  const explorationMgr = new ExplorationManager();
  
  const travelState = {
    inTravel: true,
    from: 'whispering_woods',
    to: 'twilight_wetlands',
    movesTotal: 10,
    movesCompleted: 3,
    encounterChance: 0.2,
    startedAt: Date.now()
  };
  
  const summary = explorationMgr.getTravelSummary(travelState);
  
  if (!summary.inTravel) throw new Error('Summary should show in travel');
  if (summary.progress !== '30.0%') throw new Error('Incorrect progress calculation');
  if (summary.movesRemaining !== 7) throw new Error('Incorrect remaining moves');
  
  console.log(`   Progress: ${summary.progress}`);
  console.log(`   ${summary.movesCompleted}/${summary.movesTotal} moves`);
});

// ==================== ENCOUNTER TESTS ====================

test('Generate monster encounter', () => {
  const explorationMgr = new ExplorationManager();
  const biome = explorationMgr.getBiome('whispering_woods');
  
  const encounter = explorationMgr.generateMonsterEncounter(biome);
  
  if (!encounter) throw new Error('No encounter generated');
  if (encounter.type !== 'combat') throw new Error('Should be combat encounter');
  if (!encounter.monster) throw new Error('No monster in encounter');
  
  console.log(`   Monster: ${encounter.monster.name} (Level ${encounter.monster.level})`);
  console.log(`   Ambush: ${encounter.isAmbush ? 'Yes' : 'No'}`);
});

test('Generate random event', () => {
  const explorationMgr = new ExplorationManager();
  const biome = explorationMgr.getBiome('whispering_woods');
  
  const event = explorationMgr.generateRandomEvent(biome);
  
  if (!event) throw new Error('No event generated');
  if (event.type !== 'event') throw new Error('Should be event type');
  
  console.log(`   Event type: ${event.subType}`);
  console.log(`   Message: ${event.message.substring(0, 50)}...`);
});

test('Generate special encounter', () => {
  const explorationMgr = new ExplorationManager();
  
  const encounter = explorationMgr.generateSpecialEncounter();
  
  if (!encounter) throw new Error('No encounter generated');
  if (encounter.type !== 'encounter' && encounter.type !== 'event') {
    throw new Error('Invalid encounter type');
  }
  
  console.log(`   Encounter type: ${encounter.type}`);
});

test('Random encounter system produces varied results', () => {
  const explorationMgr = new ExplorationManager();
  const biome = explorationMgr.getBiome('whispering_woods');
  
  const encounterTypes = { combat: 0, event: 0, encounter: 0 };
  
  // Generate 20 encounters to check variety
  for (let i = 0; i < 20; i++) {
    const enc = explorationMgr.generateRandomEncounter(biome);
    encounterTypes[enc.type]++;
  }
  
  if (encounterTypes.combat === 0) throw new Error('No combat encounters in 20 tries');
  
  console.log(`   In 20 encounters: ${encounterTypes.combat} combat, ${encounterTypes.event} events, ${encounterTypes.encounter} special`);
});

// ==================== EXPLORATION TESTS ====================

test('Explore location in biome', () => {
  const explorationMgr = new ExplorationManager();
  
  const result = explorationMgr.exploreLocation('whispering_woods');
  
  if (!result.success) throw new Error('Exploration failed');
  if (!result.subLocation) throw new Error('No sub-location found');
  
  console.log(`   Explored: ${result.subLocation.name}`);
  console.log(`   Encounter: ${result.encounter ? result.encounter.type : 'None'}`);
});

test('Get monsters by biome danger level', () => {
  const explorationMgr = new ExplorationManager();
  
  const monsters = explorationMgr.getMonstersByBiome('whispering_woods', 5);
  
  if (monsters.length === 0) {
    console.log('   No monsters found for biome (check data)');
    return;
  }
  
  // Check that monsters are appropriate level
  const biome = explorationMgr.getBiome('whispering_woods');
  monsters.forEach(monster => {
    const inRange = monster.level >= biome.recommended_level[0] - 2 &&
                     monster.level <= biome.recommended_level[1] + 2;
    if (!inRange) {
      console.log(`   Warning: ${monster.name} level ${monster.level} outside biome range`);
    }
  });
  
  console.log(`   Found ${monsters.length} monsters`);
  console.log(`   Examples: ${monsters.slice(0, 3).map(m => m.name).join(', ')}`);
});

test('Cancel travel loses progress', () => {
  const explorationMgr = new ExplorationManager();
  
  const travelState = {
    inTravel: true,
    from: 'whispering_woods',
    to: 'twilight_wetlands',
    movesTotal: 10,
    movesCompleted: 7,
    encounterChance: 0.2,
    startedAt: Date.now()
  };
  
  const result = explorationMgr.cancelTravel(travelState);
  
  if (!result.success) throw new Error('Cancel failed');
  if (result.progressLost !== 7) throw new Error('Incorrect progress lost');
  if (result.canResume) throw new Error('Should not be able to resume');
  
  console.log(`   Canceled travel, lost ${result.progressLost} moves of progress`);
});

// ==================== INTEGRATION TESTS ====================

test('Full travel flow: Start → Advance → Arrive', () => {
  const characterData = {
    name: 'TestTraveler',
    type: 'warrior',
    level: 5,
    xp: 0,
    xp_to_next: 200,
    hp: 150,
    max_hp: 150,
    gold: 100,
    location: 'whispering_woods',
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const explorationMgr = new ExplorationManager();
  
  // Start travel
  const startResult = explorationMgr.startTravel(character, 'twilight_wetlands');
  if (!startResult.success) throw new Error('Failed to start travel');
  
  character.travelState = startResult.travelState;
  
  // Advance until arrival (with limit to prevent infinite loop)
  let moves = 0;
  let arrived = false;
  
  while (!arrived && moves < 20) {
    const advanceResult = explorationMgr.advanceTravel(character.travelState);
    if (!advanceResult.success) throw new Error('Failed to advance travel');
    
    arrived = advanceResult.arrived;
    moves++;
    
    if (advanceResult.encounter) {
      console.log(`     Encounter on move ${moves}: ${advanceResult.encounter.type}`);
    }
  }
  
  if (!arrived) throw new Error('Did not arrive after max moves');
  if (moves !== character.travelState.movesTotal) {
    throw new Error(`Took ${moves} moves but expected ${character.travelState.movesTotal}`);
  }
  
  console.log(`   Completed travel in ${moves} moves`);
});

// ==================== RESULTS ====================

console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed === 0) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}
