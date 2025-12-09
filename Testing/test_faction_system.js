/**
 * Faction System Test Suite
 * Tests: Reputation tracking, tier progression, faction abilities, rewards
 */

const FactionManager = require('../game/FactionManager');
const Character = require('../game/Character');

console.log('🧪 Testing Faction & Reputation System\n');
console.log('═'.repeat(70));

let testsPassed = 0;
let testsFailed = 0;

async function runTests() {
  const factionManager = new FactionManager();
  
  // Test 1: Load factions
  console.log('\n📦 Test 1: Load Factions');
  try {
    const factions = await factionManager.loadFactions();
    if (factions && Object.keys(factions).length > 0) {
      console.log(`✅ Loaded ${Object.keys(factions).length} factions`);
      testsPassed++;
    } else {
      throw new Error('No factions loaded');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 2: Initialize reputation
  console.log('\n🆕 Test 2: Initialize Reputation');
  try {
    const reputation = factionManager.initializeReputation();
    if (reputation && typeof reputation === 'object' && reputation.highland_militia === 0) {
      console.log('✅ Reputation initialized correctly');
      console.log(`   Sample: Highland Militia = ${reputation.highland_militia}, Goblin Clans = ${reputation.goblin_clans}`);
      testsPassed++;
    } else {
      throw new Error('Invalid reputation initialization');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 3: Get reputation tier
  console.log('\n📊 Test 3: Reputation Tier Calculation');
  try {
    const tiers = [
      { rep: -3000, expected: 'hostile' },
      { rep: -500, expected: 'unfriendly' },
      { rep: 0, expected: 'neutral' },
      { rep: 1500, expected: 'friendly' },
      { rep: 4000, expected: 'honored' },
      { rep: 7000, expected: 'exalted' }
    ];

    let allCorrect = true;
    for (const test of tiers) {
      const tier = factionManager.getReputationTier(test.rep);
      if (tier !== test.expected) {
        console.log(`   ❌ ${test.rep} rep = ${tier}, expected ${test.expected}`);
        allCorrect = false;
      }
    }

    if (allCorrect) {
      console.log('✅ All reputation tiers calculated correctly');
      testsPassed++;
    } else {
      throw new Error('Tier calculation mismatch');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 4: Get faction standing
  console.log('\n🏆 Test 4: Get Faction Standing');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();
    character.reputation.highland_militia = 1500;

    const standing = await factionManager.getFactionStanding(character, 'highland_militia');
    if (standing.tier === 'friendly' && standing.title === 'Militia Member') {
      console.log('✅ Faction standing retrieved correctly');
      console.log(`   ${standing.faction_name}: ${standing.reputation} (${standing.title})`);
      testsPassed++;
    } else {
      throw new Error(`Unexpected standing: ${standing.tier}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 5: Add reputation
  console.log('\n➕ Test 5: Add Reputation');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    const result = await factionManager.addReputation(character, 'highland_militia', 500, 'quest_complete');
    if (result.new_reputation === 500 && result.amount === 500) {
      console.log('✅ Reputation added successfully');
      console.log(`   Gained ${result.amount} reputation with ${result.faction_name}`);
      testsPassed++;
    } else {
      throw new Error('Reputation not added correctly');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 6: Tier progression
  console.log('\n⬆️ Test 6: Tier Progression');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    // Add enough reputation to reach friendly
    const result = await factionManager.addReputation(character, 'highland_militia', 1000, 'test');
    if (result.tier_changed && result.new_tier === 'friendly') {
      console.log('✅ Tier progression works correctly');
      console.log(`   Progressed from ${result.old_tier} to ${result.new_tier}`);
      if (result.tier_rewards && result.tier_rewards.length > 0) {
        console.log(`   Unlocked ${result.tier_rewards.length} reward(s)`);
      }
      testsPassed++;
    } else {
      throw new Error('Tier did not progress');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 7: Allied faction reputation gain
  console.log('\n🤝 Test 7: Allied Faction Reputation');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    const oldAllyRep = character.reputation.whispering_woods_rangers;
    await factionManager.addReputation(character, 'highland_militia', 100, 'quest');
    const newAllyRep = character.reputation.whispering_woods_rangers;

    if (newAllyRep > oldAllyRep) {
      console.log('✅ Allied factions gain reputation');
      console.log(`   Allied faction gained ${newAllyRep - oldAllyRep} reputation`);
      testsPassed++;
    } else {
      throw new Error('Allied factions did not gain reputation');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 8: Enemy faction reputation loss
  console.log('\n⚔️ Test 8: Enemy Faction Reputation Loss');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    const oldEnemyRep = character.reputation.goblin_clans;
    await factionManager.addReputation(character, 'highland_militia', 100, 'quest');
    const newEnemyRep = character.reputation.goblin_clans;

    if (newEnemyRep < oldEnemyRep) {
      console.log('✅ Enemy factions lose reputation');
      console.log(`   Enemy faction lost ${oldEnemyRep - newEnemyRep} reputation`);
      testsPassed++;
    } else {
      throw new Error('Enemy factions did not lose reputation');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 9: Handle action-based reputation
  console.log('\n🎬 Test 9: Action-Based Reputation');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    const results = await factionManager.handleAction(character, 'kill_goblin');
    if (results.length > 0 && results.some(r => r.amount > 0)) {
      console.log('✅ Action-based reputation works');
      console.log(`   Killing goblin affected ${results.length} faction(s)`);
      results.forEach(r => {
        if (r.amount !== 0) {
          console.log(`   ${r.faction_name}: ${r.amount > 0 ? '+' : ''}${r.amount}`);
        }
      });
      testsPassed++;
    } else {
      throw new Error('Action did not trigger reputation changes');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 10: Merchant price multiplier
  console.log('\n💰 Test 10: Merchant Price Multiplier');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();
    character.reputation.highland_militia = 1500; // Friendly

    const multiplier = await factionManager.getMerchantPriceMultiplier(character, 'highland_militia');
    if (multiplier < 1.0) {
      console.log('✅ Merchant discount applies');
      console.log(`   Price multiplier: ${multiplier} (${Math.round((1 - multiplier) * 100)}% discount)`);
      testsPassed++;
    } else {
      throw new Error(`No discount applied: ${multiplier}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 11: Quest access check
  console.log('\n📜 Test 11: Faction Quest Access');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    // Neutral - should have basic access
    const neutralAccess = await factionManager.canAccessQuests(character, 'highland_militia');
    
    // Set to friendly
    character.reputation.highland_militia = 1500;
    const friendlyAccess = await factionManager.canAccessQuests(character, 'highland_militia');

    if (neutralAccess && friendlyAccess) {
      console.log('✅ Quest access system works');
      console.log(`   Neutral: ${neutralAccess ? 'Basic access' : 'No access'}`);
      console.log(`   Friendly: ${friendlyAccess ? 'Full access' : 'Limited access'}`);
      testsPassed++;
    } else {
      throw new Error('Quest access check failed');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 12: Faction abilities
  console.log('\n✨ Test 12: Faction Abilities');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();
    character.reputation.highland_militia = 1500; // Friendly - unlock ability

    const abilities = await factionManager.getFactionAbilities(character);
    if (abilities.length > 0) {
      console.log('✅ Faction abilities unlocked');
      abilities.forEach(ability => {
        console.log(`   ${ability.faction_name}: ${ability.ability_id} (${ability.tier_required})`);
      });
      testsPassed++;
    } else {
      throw new Error('No abilities unlocked');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 13: Hostility check
  console.log('\n⚡ Test 13: Hostility Check');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();
    character.reputation.goblin_clans = -3000; // Hostile

    const isHostile = await factionManager.isHostile(character, 'goblin_clans');
    if (isHostile) {
      console.log('✅ Hostility detection works');
      console.log('   Goblin Clans will attack on sight');
      testsPassed++;
    } else {
      throw new Error('Hostility not detected');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 14: All standings
  console.log('\n📊 Test 14: Get All Standings');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();
    character.reputation.highland_militia = 2000;
    character.reputation.whispering_woods_rangers = 1500;

    const standings = await factionManager.getAllStandings(character);
    if (standings.length > 0 && standings[0].faction_id === 'highland_militia') {
      console.log('✅ All standings retrieved and sorted');
      console.log(`   Top faction: ${standings[0].faction_name} (${standings[0].reputation})`);
      console.log(`   Total factions: ${standings.length}`);
      testsPassed++;
    } else {
      throw new Error('Standings not retrieved correctly');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 15: Faction summary
  console.log('\n📈 Test 15: Faction Summary');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();
    character.reputation.highland_militia = 2000;
    character.reputation.whispering_woods_rangers = -3000; // Make a real faction hostile

    const summary = await factionManager.getFactionSummary(character);
    if (summary.total_factions > 0 && summary.hostile_factions.length > 0) {
      console.log('✅ Faction summary generated');
      console.log(`   Total factions: ${summary.total_factions}`);
      console.log(`   Hostile factions: ${summary.hostile_factions.length}`);
      console.log(`   Highest rep: ${summary.highest_reputation.faction_name}`);
      testsPassed++;
    } else {
      throw new Error('Summary not generated correctly');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 16: Reputation bounds
  console.log('\n🔒 Test 16: Reputation Bounds');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    // Try to go below minimum
    await factionManager.addReputation(character, 'highland_militia', -10000, 'test');
    const minRep = character.reputation.highland_militia;

    // Try to go above maximum
    character.reputation.highland_militia = 0;
    await factionManager.addReputation(character, 'highland_militia', 1000000, 'test');
    const maxRep = character.reputation.highland_militia;

    if (minRep >= -3000 && maxRep <= 999999) {
      console.log('✅ Reputation bounds enforced');
      console.log(`   Min: ${minRep}, Max: ${maxRep}`);
      testsPassed++;
    } else {
      throw new Error(`Bounds not enforced: min=${minRep}, max=${maxRep}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 17: Faction conflicts
  console.log('\n⚔️ Test 17: Faction Conflicts');
  try {
    const character = new Character({
      name: 'TestHero',
      class: 'warrior',
      level: 10
    });
    character.reputation = factionManager.initializeReputation();

    const conflicts = await factionManager.getFactionConflicts(character, 'highland_militia');
    if (conflicts.length > 0) {
      console.log('✅ Faction conflicts identified');
      console.log(`   Highland Militia has ${conflicts.length} enemy faction(s):`);
      conflicts.forEach(c => {
        console.log(`   - ${c.faction_name} (${c.current_reputation})`);
      });
      testsPassed++;
    } else {
      throw new Error('No conflicts found');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Test 18: Reputation to next tier
  console.log('\n🎯 Test 18: Reputation to Next Tier');
  try {
    const reputation = 500; // Neutral
    const tier = 'neutral';
    const toNext = factionManager.getReputationToNextTier(reputation, tier);
    
    if (toNext === 500) { // Need 1000 to reach friendly
      console.log('✅ Reputation to next tier calculated');
      console.log(`   Currently at ${reputation}, need ${toNext} more for ${factionManager.getNextTier(tier)}`);
      testsPassed++;
    } else {
      throw new Error(`Expected 500, got ${toNext}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    testsFailed++;
  }

  // Final Results
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TEST RESULTS');
  console.log('═'.repeat(70));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(70));

  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Faction system ready for integration.');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
  }
}

// Run all tests
runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
