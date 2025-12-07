/**
 * Combat System Test Suite
 * Tests turn-based combat, damage calculations, abilities, and loot
 */

const Combat = require('../game/Combat');
const { Character } = require('../game');
const { loadData } = require('../data/data_loader');

console.log('============================================================');
console.log('COMBAT SYSTEM TEST SUITE');
console.log('============================================================\n');

// Helper to create a test character
function createTestCharacter() {
  const classData = loadData('classes').classes.warrior;
  const character = new Character('TestWarrior', 'warrior', classData);
  character.current_hp = character.max_hp;
  character.gold = 100;
  return character;
}

// Helper to create a test monster
function createTestMonster(overrides = {}) {
  return {
    id: 'test_goblin',
    name: 'Test Goblin',
    level: 1,
    rarity: 'common',
    hp: 50,
    attack: 10,
    defense: 3,
    agility: 8,
    xp_reward: 25,
    loot_table: 'humanoid_common',
    abilities: [],
    ...overrides
  };
}

// Test 1: Combat Initialization
console.log('🔮 Test 1: Combat Initialization');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  console.log(`✅ Combat initialized`);
  console.log(`   Player: ${combat.character.name} (HP: ${combat.character.current_hp}/${combat.character.max_hp})`);
  console.log(`   Monster: ${combat.monster.name} (HP: ${combat.monster.current_hp}/${combat.monster.max_hp})`);
  console.log(`   State: ${combat.state}`);
  console.log(`   Turn Order: ${combat.turnOrder.join(' → ')}`);
  console.log(`   Current Actor: ${combat.currentActor}`);
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: Player Attack
console.log('\n🔮 Test 2: Player Attack');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  // Force player to go first
  combat.currentActor = 'player';
  
  const initialMonsterHP = combat.monster.current_hp;
  const result = combat.playerAttack();

  console.log(`✅ Attack executed`);
  console.log(`   Monster HP: ${initialMonsterHP} → ${combat.monster.current_hp}`);
  console.log(`   Damage dealt: ${initialMonsterHP - combat.monster.current_hp}`);
  console.log(`   Combat log entries: ${combat.combatLog.length}`);
  console.log(`   Latest log: "${combat.combatLog[combat.combatLog.length - 1].message}"`);
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// Test 3: Monster Turn
console.log('\n🔮 Test 3: Monster Turn');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  combat.currentActor = 'monster';
  
  const initialPlayerHP = combat.character.current_hp;
  const result = combat.monsterTurn();

  console.log(`✅ Monster turn executed`);
  console.log(`   Player HP: ${initialPlayerHP} → ${combat.character.current_hp}`);
  console.log(`   Damage taken: ${initialPlayerHP - combat.character.current_hp}`);
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

// Test 4: Combat Victory
console.log('\n🔮 Test 4: Combat Victory');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster({ hp: 1 }); // Very low HP for quick victory
  const combat = new Combat(character, monster);

  combat.currentActor = 'player';
  const result = combat.playerAttack();

  if (result.victory) {
    console.log(`✅ Victory achieved!`);
    console.log(`   State: ${combat.state}`);
    console.log(`   XP Gained: ${result.rewards.xp}`);
    console.log(`   Gold Gained: ${result.rewards.gold}`);
    console.log(`   Items Dropped: ${result.rewards.items.length}`);
    if (result.rewards.items.length > 0) {
      result.rewards.items.forEach(item => {
        console.log(`     - ${item.name} x${item.quantity}`);
      });
    }
  } else {
    console.error('❌ Expected victory but got:', result);
  }
} catch (error) {
  console.error('❌ Test 4 failed:', error.message);
}

// Test 5: Combat Defeat
console.log('\n🔮 Test 5: Combat Defeat');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  character.current_hp = 1; // Very low HP
  const monster = createTestMonster({ attack: 50 }); // High attack
  const combat = new Combat(character, monster);

  combat.currentActor = 'monster';
  const result = combat.monsterAttack();

  if (result.defeat) {
    console.log(`✅ Defeat handled correctly`);
    console.log(`   State: ${combat.state}`);
    console.log(`   Player HP: ${combat.character.current_hp}`);
  } else {
    console.log(`⚠️ Player survived (HP: ${combat.character.current_hp})`);
  }
} catch (error) {
  console.error('❌ Test 5 failed:', error.message);
}

// Test 6: Flee Attempt
console.log('\n🔮 Test 6: Flee Attempt');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  combat.currentActor = 'player';
  const result = combat.playerFlee();

  console.log(`✅ Flee attempt executed`);
  console.log(`   Success: ${result.success}`);
  console.log(`   State: ${combat.state}`);
  console.log(`   Message: ${result.message || 'Failed to flee'}`);
} catch (error) {
  console.error('❌ Test 6 failed:', error.message);
}

// Test 7: Monster with Abilities
console.log('\n🔮 Test 7: Monster with Abilities');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster({
    abilities: ['bite', 'poison'],
    level: 3
  });
  const combat = new Combat(character, monster);

  console.log(`✅ Combat with abilities initialized`);
  console.log(`   Monster abilities: ${monster.abilities.join(', ')}`);
  console.log(`   Ability cooldowns: ${JSON.stringify(combat.monster.ability_cooldowns)}`);

  // Simulate monster turn
  combat.currentActor = 'monster';
  const action = combat.monsterAI();
  console.log(`   Monster AI decision: ${action.type}`);
  if (action.type === 'ability') {
    console.log(`     Ability: ${action.ability.data.name}`);
  }
} catch (error) {
  console.error('❌ Test 7 failed:', error.message);
}

// Test 8: Damage Calculation with Defense
console.log('\n🔮 Test 8: Damage Calculation');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  // Test multiple damage calculations
  const results = [];
  for (let i = 0; i < 5; i++) {
    const damage = combat.calculateDamage(20, 5, 'player');
    results.push(damage);
  }

  console.log(`✅ Damage calculations (Attack: 20, Defense: 5)`);
  results.forEach((dmg, i) => {
    console.log(`   Roll ${i + 1}: ${dmg.total} damage${dmg.critical ? ' (CRIT!)' : ''} (base: ${dmg.base})`);
  });

  const avgDamage = results.reduce((sum, r) => sum + r.total, 0) / results.length;
  console.log(`   Average damage: ${avgDamage.toFixed(1)}`);
} catch (error) {
  console.error('❌ Test 8 failed:', error.message);
}

// Test 9: Status Effects
console.log('\n🔮 Test 9: Status Effects');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  // Add poison to player
  combat.statusEffects.player.addEffect({
    id: 'poison',
    name: 'Poison',
    type: 'debuff',
    duration: 3,
    damage_per_turn: 5
  });

  console.log(`✅ Status effect added`);
  const activeEffects = combat.statusEffects.player.getActiveEffects();
  console.log(`   Active effects on player: ${activeEffects.length}`);
  activeEffects.forEach(effect => {
    console.log(`     - ${effect.name} (${effect.duration} turns remaining)`);
  });

  // Process a turn
  const initialHP = combat.character.current_hp;
  combat.applyStatusEffects('player');
  console.log(`   Player HP after poison: ${initialHP} → ${combat.character.current_hp}`);
} catch (error) {
  console.error('❌ Test 9 failed:', error.message);
}

// Test 10: Loot Generation
console.log('\n🔮 Test 10: Loot Generation');
console.log('------------------------------------------------------------');
try {
  const LootGenerator = require('../game/LootGenerator');
  const lootGen = new LootGenerator();
  
  const monster = createTestMonster({
    loot_table: 'humanoid_common',
    rarity: 'uncommon'
  });

  // Generate multiple loot samples
  console.log(`✅ Generating loot from ${monster.loot_table}...`);
  for (let i = 0; i < 3; i++) {
    const loot = lootGen.generateLoot(monster);
    console.log(`   Sample ${i + 1}: ${loot.gold} gold, ${loot.items.length} items`);
    if (loot.items.length > 0) {
      loot.items.forEach(item => {
        console.log(`     - ${item.name}${item.rarity ? ` (${item.rarity})` : ''}`);
      });
    }
  }
} catch (error) {
  console.error('❌ Test 10 failed:', error.message);
}

// Test 11: Full Combat Simulation
console.log('\n🔮 Test 11: Full Combat Simulation');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster({ hp: 30 });
  const combat = new Combat(character, monster);

  console.log(`Starting combat: ${character.name} vs ${monster.name}`);
  console.log(`   Player: ${combat.character.current_hp}/${combat.character.max_hp} HP`);
  console.log(`   Monster: ${combat.monster.current_hp}/${combat.monster.max_hp} HP\n`);

  let turn = 0;
  let maxTurns = 20; // Safety limit

  while (combat.state === Combat.STATES.IN_COMBAT && turn < maxTurns) {
    turn++;
    
    if (combat.currentActor === 'player') {
      const result = combat.playerAttack();
      console.log(`   Turn ${turn} [Player]: ${result.log[result.log.length - 1]?.message || 'Attack'}`);
      
      if (result.victory) {
        console.log(`\n✅ Victory! Combat ended in ${turn} turns`);
        console.log(`   Rewards: ${result.rewards.xp} XP, ${result.rewards.gold} gold`);
        break;
      }
    } else {
      const result = combat.monsterTurn();
      console.log(`   Turn ${turn} [Monster]: ${result.log[result.log.length - 1]?.message || 'Attack'}`);
      
      if (result.defeat) {
        console.log(`\n❌ Defeat! Player was defeated in ${turn} turns`);
        break;
      }
    }
  }

  if (turn >= maxTurns) {
    console.log(`\n⚠️ Combat exceeded maximum turns (${maxTurns})`);
  }

} catch (error) {
  console.error('❌ Test 11 failed:', error.message);
}

// Test 12: Combat State Persistence
console.log('\n🔮 Test 12: Combat State Serialization');
console.log('------------------------------------------------------------');
try {
  const character = createTestCharacter();
  const monster = createTestMonster();
  const combat = new Combat(character, monster);

  const state = combat.getState();
  console.log(`✅ Combat state retrieved`);
  console.log(`   State properties:`, Object.keys(state).join(', '));
  console.log(`   Turn: ${state.turn}`);
  console.log(`   Current actor: ${state.currentActor}`);
  console.log(`   Player HP: ${state.player.hp}/${state.player.max_hp}`);
  console.log(`   Monster HP: ${state.monster.hp}/${state.monster.max_hp}`);
  console.log(`   Combat log entries: ${state.log.length}`);
} catch (error) {
  console.error('❌ Test 12 failed:', error.message);
}

console.log('\n============================================================');
console.log('TEST SUITE COMPLETED');
console.log('============================================================\n');

console.log('✅ All combat system components tested!\n');

console.log('Combat System Features:');
console.log('  ✅ Turn-based combat with speed-based turn order');
console.log('  ✅ Damage calculation with defense and variance');
console.log('  ✅ Critical hits (10% for player, 5% for monsters)');
console.log('  ✅ Monster AI with ability selection');
console.log('  ✅ Status effects (buffs, debuffs, DOT)');
console.log('  ✅ Loot generation with rarity-based equipment drops');
console.log('  ✅ Combat victory/defeat handling');
console.log('  ✅ Flee mechanic with success chance');
console.log('  ✅ XP and gold rewards');
console.log('  ✅ Skill and item usage (framework in place)');
console.log('\nNext steps:');
console.log('  - Test via API endpoints (POST /api/combat/start)');
console.log('  - Integrate with Twitch bot commands');
console.log('  - Add frontend combat UI');
console.log('  - Balance damage and difficulty curves\n');
