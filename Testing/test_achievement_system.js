/**
 * test_achievement_system.js
 * Comprehensive test suite for the Achievement System
 */

const { Character, AchievementManager } = require('../game');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ ${testName}`);
    testsPassed++;
    return true;
  } else {
    console.error(`❌ ${testName}`);
    testsFailed++;
    return false;
  }
}

// Create test character
function createTestCharacter() {
  return new Character({
    name: 'TestHero',
    type: 'warrior',
    level: 1,
    xp: 0,
    hp: 100,
    max_hp: 100,
    gold: 100,
    inventory: [],
    equipped: {},
    unlocked_achievements: [],
    achievement_progress: {},
    achievement_unlock_dates: {},
    achievement_points: 0,
    unlocked_titles: [],
    stats: {
      totalKills: 0,
      bossKills: 0,
      criticalHits: 0,
      highestDamage: 0,
      deaths: 0,
      locationsVisited: [],
      biomesVisited: [],
      totalGoldEarned: 0,
      totalGoldSpent: 0,
      mysteriesSolved: 0
    }
  });
}

// Run tests
console.log('\n🧪 Starting Achievement System Tests...\n');

console.log('📦 AchievementManager Tests:');

// Test 1: Load achievements
(() => {
  const mgr = new AchievementManager();
  assert(mgr.achievements && Object.keys(mgr.achievements).length > 0, 'AchievementManager: Load achievements from JSON');
})();

// Test 2: Get achievement by ID
(() => {
  const mgr = new AchievementManager();
  const achievement = mgr.getAchievement('first_blood');
  assert(achievement && achievement.id === 'first_blood', 'AchievementManager: Get achievement by ID');
})();

// Test 3: Get achievements by category
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const combatAchievements = mgr.getAchievementsByCategory('combat', character);
  assert(combatAchievements.length > 0, 'AchievementManager: Get achievements by category');
})();

// Test 4: Get all achievements for character
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const allAchievements = mgr.getAllAchievements(character, false);
  assert(allAchievements.length > 0, 'AchievementManager: Get all achievements for character');
})();

// Test 5: Hide hidden achievements
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const withoutHidden = mgr.getAllAchievements(character, false);
  const withHidden = mgr.getAllAchievements(character, true);
  assert(withHidden.length >= withoutHidden.length, 'AchievementManager: Hide hidden achievements correctly');
})();

// Test 6: Calculate progress - monster kills
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalKills = 50;
  const achievement = mgr.getAchievement('monster_slayer', character);
  assert(achievement.progress.current === 50 && achievement.progress.required === 100, 'AchievementManager: Calculate progress for monster kills');
})();

// Test 7: Calculate progress - level
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.level = 15;
  const achievement = mgr.getAchievement('level_10', character);
  assert(achievement.progress.complete === true, 'AchievementManager: Calculate progress for level reached');
})();

// Test 8: Calculate progress - gold accumulated
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalGoldEarned = 5000;
  const achievement = mgr.getAchievement('penny_pincher', character);
  assert(achievement.progress.complete === true, 'AchievementManager: Calculate progress for gold accumulated');
})();

// Test 9: Check completion percentage
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalKills = 50;
  const achievement = mgr.getAchievement('monster_slayer', character);
  assert(achievement.progress.percentage === 50, 'AchievementManager: Calculate completion percentage correctly');
})();

// Test 10: Unlock achievement
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const result = mgr.unlockAchievement(character, 'first_blood');
  assert(result.success === true, 'AchievementManager: Unlock achievement successfully');
})();

// Test 11: Prevent duplicate unlock
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood');
  const result = mgr.unlockAchievement(character, 'first_blood');
  assert(result.success === false && result.error === 'Achievement already unlocked', 'AchievementManager: Prevent duplicate achievement unlock');
})();

// Test 12: Grant XP reward
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const initialXP = character.xp;
  mgr.unlockAchievement(character, 'penny_pincher'); // Grants 100 XP
  assert(character.xp > initialXP, 'AchievementManager: Grant XP reward on unlock');
})();

// Test 13: Grant gold reward
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const initialGold = character.gold;
  mgr.unlockAchievement(character, 'first_blood'); // Grants 10 gold
  assert(character.gold > initialGold, 'AchievementManager: Grant gold reward on unlock');
})();

// Test 14: Grant title reward
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood'); // Grants novice_fighter title
  assert(character.unlockedTitles.includes('novice_fighter'), 'AchievementManager: Grant title reward on unlock');
})();

// Test 15: Grant item reward
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'survivor'); // Grants lucky_charm item
  const hasItem = character.inventory.items.some(item => item && item.id === 'lucky_charm');
  assert(hasItem, 'AchievementManager: Grant item reward on unlock');
})();

// Test 16: Grant passive unlock reward
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalKills = 1000;
  mgr.unlockAchievement(character, 'legendary_hunter'); // Grants efficient_killer passive
  assert(character.unlockedPassives && character.unlockedPassives.includes('efficient_killer'), 'AchievementManager: Grant passive unlock reward');
})();

// Test 17: Track achievement points
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood'); // 10 points
  assert(character.achievementPoints === 10, 'AchievementManager: Track achievement points correctly');
})();

// Test 18: Accumulate achievement points
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood'); // 10 points
  mgr.unlockAchievement(character, 'first_steps'); // 5 points
  assert(character.achievementPoints === 15, 'AchievementManager: Accumulate achievement points');
})();

// Test 19: Track unlock date
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood');
  assert(character.achievementUnlockDates['first_blood'] !== undefined, 'AchievementManager: Track unlock date/time');
})();

// Test 20: Create unlock notification
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  const result = mgr.unlockAchievement(character, 'first_blood');
  assert(result.notification && result.notification.type === 'achievement_unlocked', 'AchievementManager: Create unlock notification');
})();

// Test 21: Check achievements after combat victory
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalKills = 1;
  const newlyUnlocked = mgr.checkAchievements(character, 'combat_victory', {});
  assert(newlyUnlocked.some(a => a.id === 'first_blood'), 'AchievementManager: Check achievements after combat victory');
})();

// Test 22: Check achievements after level up
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.level = 10;
  const newlyUnlocked = mgr.checkAchievements(character, 'level_up', {});
  assert(newlyUnlocked.some(a => a.id === 'level_10'), 'AchievementManager: Check achievements after level up');
})();

// Test 23: Check multiple achievements at once
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalKills = 1;
  character.level = 10;
  const combatUnlocks = mgr.checkAchievements(character, 'combat_victory', {});
  const levelUnlocks = mgr.checkAchievements(character, 'level_up', {});
  assert(combatUnlocks.length > 0 && levelUnlocks.length > 0, 'AchievementManager: Check multiple achievements at once');
})();

// Test 24: Get achievement statistics
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood');
  mgr.unlockAchievement(character, 'first_steps');
  const stats = mgr.getStatistics(character);
  assert(stats.totalUnlocked === 2 && stats.points === 15, 'AchievementManager: Get achievement statistics');
})();

// Test 25: Count by rarity
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood'); // common
  mgr.unlockAchievement(character, 'first_steps'); // common
  const stats = mgr.getStatistics(character);
  assert(stats.byRarity.common === 2, 'AchievementManager: Count achievements by rarity');
})();

// Test 26: Count by category
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood'); // combat
  mgr.unlockAchievement(character, 'first_steps'); // exploration
  const stats = mgr.getStatistics(character);
  assert(stats.byCategory.combat.unlocked === 1 && stats.byCategory.exploration.unlocked === 1, 'AchievementManager: Count achievements by category');
})();

// Test 27: Calculate completion percentage
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood');
  const stats = mgr.getStatistics(character);
  assert(stats.completionPercentage > 0 && stats.completionPercentage <= 100, 'AchievementManager: Calculate completion percentage');
})();

// Test 28: Get recent unlocks
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood');
  mgr.unlockAchievement(character, 'first_steps');
  const recent = mgr.getRecentUnlocks(character, 5);
  assert(recent.length === 2, 'AchievementManager: Get recent unlocks');
})();

// Test 29: Recent unlocks sorted by date
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.unlockAchievement(character, 'first_blood');
  setTimeout(() => {
    mgr.unlockAchievement(character, 'first_steps');
    const recent = mgr.getRecentUnlocks(character, 5);
    assert(recent[0].id === 'first_steps', 'AchievementManager: Recent unlocks sorted by date (newest first)');
  }, 10);
})();

// Test 30: Manual progress update
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.updateProgress(character, 'perfect_combat', 1);
  assert(character.achievementProgress['perfect_combat'] === 1, 'AchievementManager: Manually update progress');
})();

// Test 31: Reset progress
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  mgr.updateProgress(character, 'kill_streak', 5);
  mgr.resetProgress(character, 'kill_streak');
  assert(character.achievementProgress['kill_streak'] === 0, 'AchievementManager: Reset progress');
})();

// Test 32: Track boss kills separately
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalKills = 100;
  character.stats.bossKills = 5;
  const bossAchievement = mgr.getAchievement('boss_vanquisher', character);
  assert(bossAchievement.progress.current === 5 && bossAchievement.progress.required === 10, 'AchievementManager: Track boss kills separately from regular kills');
})();

// Test 33: Track critical hits
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.criticalHits = 25;
  const critAchievement = mgr.getAchievement('critical_master', character);
  assert(critAchievement.progress.current === 25 && critAchievement.progress.percentage === 50, 'AchievementManager: Track critical hits');
})();

// Test 34: Track highest damage
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.highestDamage = 600;
  const overkillAchievement = mgr.getAchievement('overkill', character);
  assert(overkillAchievement.progress.complete === true, 'AchievementManager: Track highest damage dealt');
})();

// Test 35: Track locations visited
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.locationsVisited = ['Town Square', 'Whispering Woods', 'Dark Cavern'];
  const pathfinderAchievement = mgr.getAchievement('pathfinder', character);
  assert(pathfinderAchievement.progress.current === 3, 'AchievementManager: Track locations visited');
})();

// Test 36: Track biomes visited
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.biomesVisited = ['forest', 'swamp', 'mountain', 'desert'];
  const explorerAchievement = mgr.getAchievement('master_explorer', character);
  assert(explorerAchievement.progress.current === 4, 'AchievementManager: Track biomes visited');
})();

// Test 37: Track gold earned vs spent
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.stats.totalGoldEarned = 2000;
  character.stats.totalGoldSpent = 500;
  const earnedAchievement = mgr.getAchievement('penny_pincher', character);
  const spentAchievement = mgr.getAchievement('big_spender', character);
  assert(earnedAchievement.progress.complete === true && spentAchievement.progress.complete === false, 'AchievementManager: Track gold earned vs gold spent separately');
})();

// Test 38: Event relevance mapping
(() => {
  const mgr = new AchievementManager();
  assert(mgr.isRelevantForEvent('monster_kills', 'combat_victory') === true, 'AchievementManager: Map events to relevant criteria');
})();

// Test 39: Irrelevant event filtering
(() => {
  const mgr = new AchievementManager();
  assert(mgr.isRelevantForEvent('monster_kills', 'location_change') === false, 'AchievementManager: Filter irrelevant events');
})();

// Test 40: Don't check already unlocked achievements
(() => {
  const mgr = new AchievementManager();
  const character = createTestCharacter();
  character.unlockedAchievements = ['first_blood'];
  character.stats.totalKills = 100;
  const newlyUnlocked = mgr.checkAchievements(character, 'combat_victory', {});
  assert(!newlyUnlocked.some(a => a.id === 'first_blood'), 'AchievementManager: Don\'t check already unlocked achievements');
})();

// Summary
console.log('\n==================================================');
console.log('📊 Test Summary:');
console.log('==================================================');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('==================================================\n');

if (testsFailed === 0) {
  console.log('🎉 All tests passed! Achievement System is working correctly.\n');
  process.exit(0);
} else {
  console.log('⚠️ Some tests failed. Please review the errors above.\n');
  process.exit(1);
}
