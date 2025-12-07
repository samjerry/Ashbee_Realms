/**
 * test_quest_system.js
 * Comprehensive tests for the quest management system
 */

const QuestManager = require('../game/QuestManager');
const Character = require('../game/Character');

console.log('🧪 Testing Quest System\n');

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

// ==================== QUEST LOADING TESTS ====================

test('Load quests from data file', () => {
  const questMgr = new QuestManager();
  
  if (questMgr.mainQuests.length === 0) throw new Error('No main quests loaded');
  if (questMgr.sideQuests.length === 0) throw new Error('No side quests loaded');
  
  console.log(`   Main quests: ${questMgr.mainQuests.length}`);
  console.log(`   Side quests: ${questMgr.sideQuests.length}`);
  console.log(`   Daily quests: ${questMgr.dailyQuests.length}`);
});

test('Get quest by ID', () => {
  const questMgr = new QuestManager();
  const quest = questMgr.getQuest('awakening');
  
  if (!quest) throw new Error('Failed to get quest by ID');
  if (quest.name !== 'The Awakening') throw new Error('Incorrect quest name');
  if (!quest.objectives || quest.objectives.length === 0) throw new Error('No objectives');
  
  console.log(`   Quest: ${quest.name}`);
  console.log(`   Objectives: ${quest.objectives.length}`);
});

test('Get quest that does not exist', () => {
  const questMgr = new QuestManager();
  const quest = questMgr.getQuest('nonexistent_quest');
  
  if (quest !== null) throw new Error('Should return null for non-existent quest');
});

// ==================== AVAILABLE QUESTS TESTS ====================

test('Get available quests for level 1 character', () => {
  const questMgr = new QuestManager();
  const character = {
    level: 1,
    location: 'town_square'
  };
  
  const available = questMgr.getAvailableQuests(character, [], []);
  
  if (available.length === 0) throw new Error('Should have available quests for level 1');
  
  // Check that all returned quests meet level requirement
  available.forEach(quest => {
    if (quest.required_level && quest.required_level > 1) {
      throw new Error(`Quest ${quest.id} requires level ${quest.required_level}`);
    }
  });
  
  console.log(`   Available quests for level 1: ${available.length}`);
});

test('Filter quests by level requirement', () => {
  const questMgr = new QuestManager();
  const lowLevel = { level: 1 };
  const highLevel = { level: 20 };
  
  const lowAvailable = questMgr.getAvailableQuests(lowLevel, [], []);
  const highAvailable = questMgr.getAvailableQuests(highLevel, [], []);
  
  if (highAvailable.length <= lowAvailable.length) {
    throw new Error('Higher level should have more available quests');
  }
  
  console.log(`   Level 1: ${lowAvailable.length} quests`);
  console.log(`   Level 20: ${highAvailable.length} quests`);
});

test('Filter out active quests', () => {
  const questMgr = new QuestManager();
  const character = { level: 5 };
  const activeQuests = ['awakening'];
  
  const available = questMgr.getAvailableQuests(character, activeQuests, []);
  
  const hasActiveQuest = available.some(q => q.id === 'awakening');
  if (hasActiveQuest) throw new Error('Active quest should not appear in available');
  
  console.log(`   Correctly filtered active quest`);
});

test('Filter out completed non-repeatable quests', () => {
  const questMgr = new QuestManager();
  const character = { level: 10 };
  const completedQuests = ['awakening'];
  
  const available = questMgr.getAvailableQuests(character, [], completedQuests);
  
  const hasCompleted = available.some(q => q.id === 'awakening');
  if (hasCompleted) throw new Error('Completed quest should not appear in available');
  
  console.log(`   Correctly filtered completed quest`);
});

test('Check quest prerequisites', () => {
  const questMgr = new QuestManager();
  const character = { level: 5 };
  
  // wolves_den requires awakening to be completed
  const withoutPrereq = questMgr.getAvailableQuests(character, [], []);
  const withPrereq = questMgr.getAvailableQuests(character, [], ['awakening']);
  
  const hasWolvesDenWithout = withoutPrereq.some(q => q.id === 'wolves_den');
  const hasWolvesDenWith = withPrereq.some(q => q.id === 'wolves_den');
  
  if (hasWolvesDenWithout) throw new Error('Quest with prerequisites should not be available');
  if (!hasWolvesDenWith) throw new Error('Quest should be available after completing prerequisite');
  
  console.log(`   Prerequisites working correctly`);
});

// ==================== QUEST ACCEPT TESTS ====================

test('Accept a quest', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  
  if (!result.success) throw new Error('Failed to accept quest');
  if (!result.questState) throw new Error('No quest state returned');
  if (result.questState.status !== 'active') throw new Error('Quest status should be active');
  if (!result.questState.objectives) throw new Error('No objectives in quest state');
  
  console.log(`   Accepted: ${result.quest.name}`);
  console.log(`   Objectives: ${result.questState.objectives.length}`);
});

test('Accept invalid quest', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('nonexistent_quest');
  
  if (result.success) throw new Error('Should fail to accept invalid quest');
  if (!result.error) throw new Error('Should return error message');
  
  console.log(`   Correctly rejected invalid quest`);
});

test('Quest state initialized correctly', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  
  const state = result.questState;
  if (state.status !== 'active') throw new Error('Status should be active');
  if (!state.startedAt) throw new Error('Missing startedAt timestamp');
  
  // Check objectives
  state.objectives.forEach(obj => {
    if (obj.current !== 0) throw new Error('Objective progress should start at 0');
    if (obj.completed) throw new Error('Objectives should not start completed');
    if (!obj.description) throw new Error('Objective missing description');
  });
  
  console.log(`   Quest state initialized correctly`);
});

// ==================== QUEST PROGRESS TESTS ====================

test('Update quest progress for kill objective', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  // Quest has objective: kill 3 forest wolves
  const updateResult = questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 1);
  
  if (!updateResult.updated) throw new Error('Progress should be updated');
  
  const objective = updateResult.questState.objectives.find(
    obj => obj.type === 'kill_monster' && obj.target === 'forest_wolf'
  );
  
  if (objective.current !== 1) throw new Error('Kill count should be 1');
  if (objective.completed) throw new Error('Should not be completed yet (need 3)');
  
  console.log(`   Kill progress: ${objective.current}/${objective.required}`);
});

test('Complete objective when requirement met', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  let questState = result.questState;
  
  // Kill 3 wolves
  questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 3);
  
  const objective = questState.objectives.find(
    obj => obj.type === 'kill_monster' && obj.target === 'forest_wolf'
  );
  
  if (objective.current !== 3) throw new Error('Should have 3 kills');
  if (!objective.completed) throw new Error('Objective should be completed');
  
  console.log(`   Objective completed: ${objective.description}`);
});

test('Quest marked ready to complete when all objectives done', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  let questState = result.questState;
  
  // Complete all objectives
  questMgr.updateProgress(questState, 'talk_to_npc', 'elder_thorne', 1);
  questMgr.updateProgress(questState, 'explore_location', 'whispering_woods', 1);
  const finalUpdate = questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 3);
  
  if (finalUpdate.questState.status !== 'ready_to_complete') {
    throw new Error('Quest should be ready to complete');
  }
  if (!finalUpdate.allCompleted) throw new Error('allCompleted should be true');
  
  console.log(`   Quest ready to complete`);
});

test('No progress for wrong target', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  // Try to progress with wrong monster
  const updateResult = questMgr.updateProgress(questState, 'kill_monster', 'goblin_scout', 1);
  
  if (updateResult.updated) throw new Error('Should not update progress for wrong target');
  
  console.log(`   Correctly ignored wrong target`);
});

test('Progress updates generate events', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  const updateResult = questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 3);
  
  if (!updateResult.events || updateResult.events.length === 0) {
    throw new Error('Should generate events');
  }
  
  const objectiveCompleteEvent = updateResult.events.find(e => e.type === 'objective_completed');
  if (!objectiveCompleteEvent) throw new Error('Should have objective_completed event');
  
  console.log(`   Events generated: ${updateResult.events.length}`);
});

// ==================== QUEST COMPLETION TESTS ====================

test('Complete a quest and receive rewards', () => {
  const questMgr = new QuestManager();
  const characterData = {
    name: 'TestHero',
    type: 'warrior',
    level: 1,
    xp: 0,
    xp_to_next: 100,
    hp: 100,
    max_hp: 100,
    gold: 0,
    location: 'town_square',
    inventory: [],
    equipped: {}
  };
  
  const character = new Character(characterData);
  const result = questMgr.acceptQuest('awakening');
  let questState = result.questState;
  
  // Complete all objectives
  questMgr.updateProgress(questState, 'talk_to_npc', 'elder_thorne', 1);
  questMgr.updateProgress(questState, 'explore_location', 'whispering_woods', 1);
  questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 3);
  
  const completeResult = questMgr.completeQuest(character, questState);
  
  if (!completeResult.success) throw new Error('Failed to complete quest');
  if (!completeResult.rewards) throw new Error('No rewards returned');
  if (completeResult.rewards.gold === 0) throw new Error('Should receive gold reward');
  if (character.gold === 0) throw new Error('Character gold not updated');
  
  console.log(`   Gold reward: ${completeResult.rewards.gold}`);
  console.log(`   XP reward: ${completeResult.rewards.xp}`);
  console.log(`   Items: ${completeResult.rewards.items.length}`);
});

test('Cannot complete quest that is not ready', () => {
  const questMgr = new QuestManager();
  const characterData = {
    name: 'TestHero',
    type: 'warrior',
    level: 1,
    xp: 0,
    xp_to_next: 100,
    hp: 100,
    max_hp: 100,
    gold: 0,
    location: 'town_square',
    inventory: [],
    equipped: {}
  };
  
  const character = new Character(characterData);
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  // Don't complete objectives
  const completeResult = questMgr.completeQuest(character, questState);
  
  if (completeResult.success) throw new Error('Should not complete quest without finishing objectives');
  
  console.log(`   Correctly prevented incomplete quest completion`);
});

// ==================== QUEST MANAGEMENT TESTS ====================

test('Fail a quest', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  const failResult = questMgr.failQuest(questState, 'Time limit expired');
  
  if (!failResult.success) throw new Error('Failed to fail quest');
  if (questState.status !== 'failed') throw new Error('Status should be failed');
  if (!questState.failReason) throw new Error('Missing fail reason');
  
  console.log(`   Quest failed: ${questState.failReason}`);
});

test('Abandon a quest', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  const abandonResult = questMgr.abandonQuest(questState);
  
  if (!abandonResult.success) throw new Error('Failed to abandon quest');
  if (!abandonResult.quest) throw new Error('Should return quest info');
  
  console.log(`   Quest abandoned: ${abandonResult.quest.name}`);
});

test('Get quest progress summary', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  // Make some progress
  questMgr.updateProgress(questState, 'kill_monster', 'forest_wolf', 2);
  
  const progress = questMgr.getQuestProgress(questState);
  
  if (!progress) throw new Error('No progress returned');
  if (!progress.name) throw new Error('Missing quest name');
  if (!progress.progress) throw new Error('Missing progress string');
  if (!progress.objectives) throw new Error('Missing objectives');
  if (progress.progressPercent === 0) throw new Error('Should show some progress');
  
  console.log(`   Quest: ${progress.name}`);
  console.log(`   Progress: ${progress.progress} (${progress.progressPercent}%)`);
});

test('Check if quest has time limit', () => {
  const questMgr = new QuestManager();
  const result = questMgr.acceptQuest('awakening');
  const questState = result.questState;
  
  const expired = questMgr.isQuestExpired(questState);
  
  if (expired) throw new Error('Newly accepted quest should not be expired');
  
  console.log(`   Quest expiry check working`);
});

// ==================== QUEST CHAIN TESTS ====================

test('Get quest chain information', () => {
  const questMgr = new QuestManager();
  const chain = questMgr.getQuestChain('wolves_den');
  
  if (!chain) throw new Error('Failed to get quest chain');
  if (chain.prerequisites.length === 0) throw new Error('wolves_den should have prerequisites');
  
  console.log(`   Quest: ${chain.name}`);
  console.log(`   Prerequisites: ${chain.prerequisites.length}`);
  console.log(`   Unlocks: ${chain.unlocks.length}`);
});

test('Get main story quests', () => {
  const questMgr = new QuestManager();
  const story = questMgr.getMainStoryQuests();
  
  if (story.length === 0) throw new Error('No main story quests');
  
  const chapters = [...new Set(story.map(q => q.chapter))];
  console.log(`   Story quests: ${story.length}`);
  console.log(`   Chapters: ${chapters.length}`);
});

// ==================== QUEST EVENT TRIGGER TESTS ====================

test('Trigger quest events across multiple active quests', () => {
  const questMgr = new QuestManager();
  
  const quest1 = questMgr.acceptQuest('awakening');
  const quest2 = questMgr.acceptQuest('lost_heirloom');
  
  const activeQuests = [quest1.questState, quest2.questState];
  
  // Both quests might have kill objectives
  const result = questMgr.triggerQuestEvent(activeQuests, 'kill_monster', 'forest_wolf', 1);
  
  if (!result.updated) {
    console.log(`   No quests updated (might not have matching objectives)`);
  } else {
    console.log(`   Updated ${result.updates.length} quest(s)`);
  }
});

test('Get daily quests', () => {
  const questMgr = new QuestManager();
  const dailies = questMgr.getDailyQuests(10);
  
  if (dailies.length === 0) {
    console.log(`   No daily quests configured`);
  } else {
    console.log(`   Daily quests: ${dailies.length}`);
  }
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
