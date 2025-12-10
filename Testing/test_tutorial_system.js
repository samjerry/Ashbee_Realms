/**
 * test_tutorial_system.js
 * Test suite for Phase 5.3 Tutorial & Onboarding system
 */

const QuestManager = require('../game/QuestManager');

function runTests() {
  console.log('🎓 Testing Tutorial & Onboarding System\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;

  // Test 1: QuestManager identifies tutorial quests
  console.log('\n📝 Test 1: Tutorial Quest Identification');
  try {
    const questManager = new QuestManager();
    const isTutorial = questManager.isTutorialQuest('awakening');
    const isNotTutorial = questManager.isTutorialQuest('wolves_den');
    
    if (isTutorial && !isNotTutorial) {
      console.log('✅ PASS: Tutorial quest correctly identified');
      passed++;
    } else {
      console.log('❌ FAIL: Tutorial quest identification failed');
      console.log(`   awakening isTutorial: ${isTutorial} (expected: true)`);
      console.log(`   wolves_den isTutorial: ${isNotTutorial} (expected: false)`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error in tutorial quest identification');
    console.log(`   Error: ${error.message}`);
    failed++;
  }

  // Test 2: Quest data includes tutorial flag
  console.log('\n📝 Test 2: Quest Data Includes Tutorial Flag');
  try {
    const questManager = new QuestManager();
    const awakeningQuest = questManager.getQuest('awakening');
    const wolvesQuest = questManager.getQuest('wolves_den');
    
    if (awakeningQuest && awakeningQuest.is_tutorial && wolvesQuest && !wolvesQuest.is_tutorial) {
      console.log('✅ PASS: Quest data includes correct tutorial flag');
      console.log(`   The Awakening: is_tutorial = ${awakeningQuest.is_tutorial}`);
      console.log(`   Wolf's Den: is_tutorial = ${wolvesQuest.is_tutorial}`);
      passed++;
    } else {
      console.log('❌ FAIL: Quest tutorial flag incorrect');
      console.log(`   awakening.is_tutorial: ${awakeningQuest?.is_tutorial} (expected: true)`);
      console.log(`   wolves_den.is_tutorial: ${wolvesQuest?.is_tutorial} (expected: false)`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking quest tutorial flag');
    console.log(`   Error: ${error.message}`);
    failed++;
  }

  // Test 3: Available quests include tutorial flag
  console.log('\n📝 Test 3: Available Quests Include Tutorial Flag');
  try {
    const questManager = new QuestManager();
    const mockCharacter = { level: 1 };
    const availableQuests = questManager.getAvailableQuests(mockCharacter, [], []);
    
    const awakeningQuest = availableQuests.find(q => q.id === 'awakening');
    
    if (awakeningQuest && awakeningQuest.is_tutorial === true) {
      console.log('✅ PASS: Available quests include tutorial flag');
      console.log(`   Found The Awakening with is_tutorial = ${awakeningQuest.is_tutorial}`);
      passed++;
    } else {
      console.log('❌ FAIL: Available quests missing tutorial flag');
      console.log(`   awakening quest:`, awakeningQuest);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error in available quests');
    console.log(`   Error: ${error.message}`);
    failed++;
  }

  // Test 4: The Awakening quest has correct tutorial objectives
  console.log('\n📝 Test 4: Tutorial Quest Has Correct Objectives');
  try {
    const questManager = new QuestManager();
    const quest = questManager.getQuest('awakening');
    
    if (quest && quest.objectives && quest.objectives.length === 3) {
      const hasNpcObjective = quest.objectives.some(obj => obj.type === 'talk_to_npc');
      const hasExploreObjective = quest.objectives.some(obj => obj.type === 'explore_location');
      const hasCombatObjective = quest.objectives.some(obj => obj.type === 'kill_monster');
      
      if (hasNpcObjective && hasExploreObjective && hasCombatObjective) {
        console.log('✅ PASS: Tutorial quest has all objective types');
        console.log('   ✓ Talk to NPC');
        console.log('   ✓ Explore location');
        console.log('   ✓ Kill monsters');
        passed++;
      } else {
        console.log('❌ FAIL: Tutorial quest missing objective types');
        console.log(`   NPC: ${hasNpcObjective}, Explore: ${hasExploreObjective}, Combat: ${hasCombatObjective}`);
        failed++;
      }
    } else {
      console.log('❌ FAIL: Tutorial quest objectives incorrect');
      console.log(`   Objectives count: ${quest?.objectives?.length} (expected: 3)`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking tutorial objectives');
    console.log(`   Error: ${error.message}`);
    failed++;
  }

  // Test 5: Frontend components exist
  console.log('\n📝 Test 5: Frontend Components Exist');
  try {
    const fs = require('fs');
    const path = require('path');
    
    const components = [
      'public/src/components/Common/Tooltip.jsx',
      'public/src/components/Common/TutorialOverlay.jsx',
      'public/src/components/Common/CharacterCreation.jsx',
      'public/src/components/Common/GameTips.jsx'
    ];
    
    const allExist = components.every(component => {
      const fullPath = path.join(process.cwd(), component);
      const exists = fs.existsSync(fullPath);
      if (exists) {
        console.log(`   ✓ ${component}`);
      } else {
        console.log(`   ✗ ${component}`);
      }
      return exists;
    });
    
    if (allExist) {
      console.log('✅ PASS: All tutorial components created');
      passed++;
    } else {
      console.log('❌ FAIL: Some tutorial components missing');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking component files');
    console.log(`   Error: ${error.message}`);
    failed++;
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Tutorial system is working correctly.\n');
    console.log('✨ Phase 5.3 Tutorial & Onboarding: IMPLEMENTED ✅\n');
  } else {
    console.log(`\n❌ ${failed} test(s) failed\n`);
  }

  return failed === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);
