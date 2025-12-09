/**
 * Test Suite: Season & Leaderboard System
 * Tests season progression, challenges, and leaderboards
 */

const SeasonManager = require('../game/SeasonManager');
const LeaderboardManager = require('../game/LeaderboardManager');

// Mock character for testing
function createMockCharacter(name = 'TestPlayer', level = 10) {
  return {
    userId: 'test_user_123',
    id: 'test_user_123',
    name,
    username: name,
    level,
    gold: 5000,
    class: 'warrior',
    seasonProgress: {},
    seasonalChallengesCompleted: []
  };
}

// Test counters
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${description}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n   Expected: ${JSON.stringify(expected)}\n   Got: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message = 'Expected true') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFalse(condition, message = 'Expected false') {
  if (condition) {
    throw new Error(message);
  }
}

console.log('🧪 Starting Season & Leaderboard System Tests\n');

// ==================== SEASON MANAGER TESTS ====================

console.log('📅 Testing SeasonManager...\n');

const seasonMgr = new SeasonManager();

// Test 1: Season Loading
test('Should load seasons from seasons.json', () => {
  const seasons = seasonMgr.getAllSeasons();
  assertTrue(seasons.length >= 3, 'Should have at least 3 seasons');
  assertTrue(seasons.some(s => s.id === 'season_1'), 'Should have season_1');
  assertTrue(seasons.some(s => s.id === 'season_2'), 'Should have season_2');
  assertTrue(seasons.some(s => s.id === 'season_3'), 'Should have season_3');
});

// Test 2: Active Season
test('Should get active season (season_2)', () => {
  const activeSeason = seasonMgr.getActiveSeason();
  assertTrue(activeSeason !== null, 'Should have an active season');
  assertEqual(activeSeason.id, 'season_2', 'Active season should be season_2');
  assertTrue(activeSeason.daysRemaining >= 0, 'Should have days remaining');
});

// Test 3: Get Specific Season
test('Should get specific season by ID', () => {
  const season = seasonMgr.getSeason('season_1');
  assertTrue(season !== null, 'Season 1 should exist');
  assertEqual(season.name, 'Season of Shadows', 'Season name should match');
  assertFalse(season.active, 'Season 1 should not be active');
});

// Test 4: Initialize Season Progress
test('Should initialize season progress for new player', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  const activeSeason = seasonMgr.getActiveSeason();
  assertTrue(character.seasonProgress[activeSeason.id] !== undefined, 'Should have progress for active season');
  assertEqual(character.seasonProgress[activeSeason.id].seasonLevel, 1, 'Should start at level 1');
  assertEqual(character.seasonProgress[activeSeason.id].seasonXP, 0, 'Should start with 0 XP');
  assertEqual(character.seasonProgress[activeSeason.id].seasonCurrency, 0, 'Should start with 0 currency');
});

// Test 5: Get Season Progress
test('Should get season progress for player', () => {
  const character = createMockCharacter();
  const progress = seasonMgr.getSeasonProgress(character);
  
  assertTrue(progress.hasActiveSeason !== false, 'Should have active season');
  assertEqual(progress.seasonLevel, 1, 'Should be level 1');
  assertEqual(progress.seasonXP, 0, 'Should have 0 XP');
  assertTrue(progress.xpToNextLevel > 0, 'Should have XP requirement for next level');
});

// Test 6: Add Season XP
test('Should add season XP and track progress', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  const result = seasonMgr.addSeasonXP(character, 50, 'quest_complete');
  assertTrue(result.success, 'Should successfully add XP');
  assertEqual(result.xpGained, 50, 'Should gain 50 XP');
  assertEqual(result.source, 'quest_complete', 'Source should be tracked');
});

// Test 7: Season Level Up
test('Should level up when gaining enough XP', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  // Add enough XP for level 1 -> 2 (need 100 XP)
  const result = seasonMgr.addSeasonXP(character, 100, 'test');
  assertTrue(result.success, 'Should successfully add XP');
  assertTrue(result.levelUps.length > 0, 'Should have level ups');
  assertTrue(result.levelUps.includes(2), 'Should level up to 2');
  assertEqual(result.newLevel, 2, 'New level should be 2');
});

// Test 8: Multiple Level Ups
test('Should level up multiple times with enough XP', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  // Add enough XP for multiple levels (level 1 = 100, level 2 = 200, level 3 = 300)
  const result = seasonMgr.addSeasonXP(character, 600, 'test');
  assertTrue(result.success, 'Should successfully add XP');
  assertTrue(result.levelUps.length >= 2, 'Should have multiple level ups');
  assertTrue(result.newLevel > 2, 'Should be above level 2');
});

// Test 9: Max Level Cap
test('Should not exceed max season level', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  const activeSeason = seasonMgr.getActiveSeason();
  const progress = character.seasonProgress[activeSeason.id];
  
  // Set to max level
  progress.seasonLevel = 50;
  const result = seasonMgr.addSeasonXP(character, 1000, 'test');
  assertFalse(result.success, 'Should not add XP at max level');
  assertTrue(result.error.includes('Max season level'), 'Should have max level error');
});

// Test 10: Add Seasonal Currency
test('Should add seasonal currency', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  const result = seasonMgr.addSeasonCurrency(character, 100, 'challenge_complete');
  assertTrue(result.success, 'Should successfully add currency');
  assertEqual(result.currencyGained, 100, 'Should gain 100 currency');
  assertEqual(result.source, 'challenge_complete', 'Source should be tracked');
  assertEqual(result.newTotal, 100, 'Total should be 100');
});

// Test 11: Spend Seasonal Currency
test('Should spend seasonal currency', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  // Add currency first
  seasonMgr.addSeasonCurrency(character, 200, 'test');
  
  // Spend some
  const result = seasonMgr.spendSeasonCurrency(character, 50, 'cosmetic_purchase');
  assertTrue(result.success, 'Should successfully spend currency');
  assertEqual(result.currencySpent, 50, 'Should spend 50 currency');
  assertEqual(result.remaining, 150, 'Should have 150 remaining');
});

// Test 12: Insufficient Currency
test('Should fail to spend with insufficient currency', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  const result = seasonMgr.spendSeasonCurrency(character, 100, 'test');
  assertFalse(result.success, 'Should fail to spend');
  assertTrue(result.error.includes('Insufficient'), 'Should have insufficient currency error');
});

// Test 13: Get Seasonal Challenges
test('Should get seasonal challenges', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  const challenges = seasonMgr.getSeasonalChallenges(character);
  assertTrue(challenges.weekly !== undefined, 'Should have weekly challenges');
  assertTrue(challenges.seasonal !== undefined, 'Should have seasonal challenges');
  assertTrue(Array.isArray(challenges.weekly), 'Weekly should be array');
  assertTrue(Array.isArray(challenges.seasonal), 'Seasonal should be array');
});

// Test 14: Complete Challenge
test('Should complete a seasonal challenge', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  const result = seasonMgr.completeChallenge(character, 'Dungeon Master', 'weekly');
  assertTrue(result.success, 'Should successfully complete challenge');
  assertEqual(result.challengeName, 'Dungeon Master', 'Challenge name should match');
  assertTrue(result.currencyGained > 0, 'Should gain currency reward');
});

// Test 15: Cannot Complete Same Challenge Twice
test('Should not complete same challenge twice', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  
  seasonMgr.completeChallenge(character, 'Dungeon Master', 'weekly');
  const result2 = seasonMgr.completeChallenge(character, 'Dungeon Master', 'weekly');
  
  assertFalse(result2.success, 'Should fail second attempt');
  assertTrue(result2.error.includes('already completed'), 'Should have already completed error');
});

// Test 16: Get Seasonal Events
test('Should get seasonal events', () => {
  const events = seasonMgr.getSeasonalEvents();
  assertTrue(events.length >= 4, 'Should have at least 4 seasonal events');
  assertTrue(events.some(e => e.id === 'spring_festival'), 'Should have spring festival');
  assertTrue(events.some(e => e.id === 'halloween_horrors'), 'Should have halloween event');
});

// Test 17: Get Seasonal Event Details
test('Should get specific seasonal event details', () => {
  const event = seasonMgr.getSeasonalEvent('spring_festival');
  assertTrue(event !== null, 'Event should exist');
  assertEqual(event.name, 'Festival of Blooms', 'Event name should match');
  assertTrue(event.activities !== undefined, 'Should have activities');
});

// Test 18: Get Season Statistics
test('Should get season statistics for player', () => {
  const character = createMockCharacter();
  seasonMgr.initializeSeasonProgress(character);
  seasonMgr.addSeasonXP(character, 300, 'test');
  seasonMgr.addSeasonCurrency(character, 150, 'test');
  
  const stats = seasonMgr.getSeasonStatistics(character);
  assertTrue(stats.level > 1, 'Should have leveled up');
  assertEqual(stats.currency, 150, 'Should have 150 currency');
  assertTrue(stats.daysActive >= 0, 'Should track days active');
});

// ==================== LEADERBOARD MANAGER TESTS ====================

console.log('\n📊 Testing LeaderboardManager...\n');

const leaderboardMgr = new LeaderboardManager();

// Test 23: Get Available Leaderboards
test('Should get all available leaderboard types', () => {
  const leaderboards = leaderboardMgr.getAvailableLeaderboards();
  assertTrue(leaderboards.length >= 7, 'Should have at least 7 leaderboard types');
  const types = leaderboards.map(l => l.type);
  assertTrue(types.includes('level'), 'Should have level leaderboard');
  assertTrue(types.includes('wealth'), 'Should have wealth leaderboard');
  assertTrue(types.includes('dungeonSpeed'), 'Should have dungeon speed leaderboard');
});

// Test 24: Update Level Leaderboard
test('Should update level leaderboard', () => {
  const character = createMockCharacter('Player1', 25);
  leaderboardMgr.updateLevelLeaderboard(character);
  
  const rank = leaderboardMgr.getPlayerRank('level', 'test_user_123');
  assertTrue(rank.ranked !== false, 'Player should be ranked');
  assertEqual(rank.value, 25, 'Value should be level 25');
});

// Test 25: Update Wealth Leaderboard
test('Should update wealth leaderboard', () => {
  const character = createMockCharacter('Player2', 20);
  character.gold = 10000;
  leaderboardMgr.updateWealthLeaderboard(character);
  
  const rank = leaderboardMgr.getPlayerRank('wealth', 'test_user_123');
  assertTrue(rank.ranked !== false, 'Player should be ranked');
  assertEqual(rank.value, 10000, 'Value should be 10000 gold');
});

// Test 26: Update Dungeon Speed Leaderboard
test('Should update dungeon speed leaderboard', () => {
  leaderboardMgr.updateDungeonSpeedLeaderboard('player123', 'SpeedRunner', 'goblin_warrens', 300);
  
  const rank = leaderboardMgr.getPlayerRank('dungeonSpeed', 'player123');
  assertTrue(rank.ranked !== false, 'Player should be ranked');
  assertEqual(rank.value, 300, 'Value should be 300 seconds');
});

// Test 27: Lower Speed is Better
test('Should rank lower times higher in dungeon speed', () => {
  leaderboardMgr.updateDungeonSpeedLeaderboard('player1', 'Fast', 'dungeon1', 200);
  leaderboardMgr.updateDungeonSpeedLeaderboard('player2', 'Slow', 'dungeon1', 400);
  
  const topPlayers = leaderboardMgr.getTopPlayers('dungeonSpeed', 10);
  assertTrue(topPlayers.players[0].value < topPlayers.players[1].value, 'Faster time should be ranked higher');
});

// Test 28: Update Boss Kills Leaderboard
test('Should update boss kills leaderboard', () => {
  const character = createMockCharacter('BossHunter', 30);
  leaderboardMgr.updateBossKillsLeaderboard(character, 50);
  
  const rank = leaderboardMgr.getPlayerRank('bossKills', 'test_user_123');
  assertTrue(rank.ranked !== false, 'Player should be ranked');
  assertEqual(rank.value, 50, 'Value should be 50 boss kills');
});

// Test 29: Update Achievement Points Leaderboard
test('Should update achievement points leaderboard', () => {
  const character = createMockCharacter('Achiever', 25);
  leaderboardMgr.updateAchievementPointsLeaderboard(character, 500);
  
  const rank = leaderboardMgr.getPlayerRank('achievementPoints', 'test_user_123');
  assertTrue(rank.ranked !== false, 'Player should be ranked');
  assertEqual(rank.value, 500, 'Value should be 500 points');
});

// Test 30: Update Season Level Leaderboard
test('Should update season level leaderboard', () => {
  const character = createMockCharacter('SeasonPro', 20);
  leaderboardMgr.updateSeasonLevelLeaderboard(character, 35);
  
  const rank = leaderboardMgr.getPlayerRank('seasonLevel', 'test_user_123');
  assertTrue(rank.ranked !== false, 'Player should be ranked');
  assertEqual(rank.value, 35, 'Value should be season level 35');
});

// Test 31: Get Top Players
test('Should get top 10 players from leaderboard', () => {
  // Add some players
  for (let i = 1; i <= 15; i++) {
    const char = createMockCharacter(`Player${i}`, i * 5);
    char.userId = `user_${i}`;
    leaderboardMgr.updateLevelLeaderboard(char);
  }
  
  const top10 = leaderboardMgr.getTopPlayers('level', 10);
  assertEqual(top10.count, 10, 'Should return 10 players');
  assertTrue(top10.players[0].rank === 1, 'First player should have rank 1');
  assertTrue(top10.players[0].value >= top10.players[9].value, 'Should be sorted by value');
});

// Test 32: Get Leaderboard with Pagination
test('Should get leaderboard with pagination', () => {
  const leaderboard = leaderboardMgr.getLeaderboard('level', 5, 0);
  assertEqual(leaderboard.limit, 5, 'Limit should be 5');
  assertEqual(leaderboard.offset, 0, 'Offset should be 0');
  assertTrue(leaderboard.entries.length <= 5, 'Should have at most 5 entries');
});

// Test 33: Get Player All Ranks
test('Should get player rankings across all leaderboards', () => {
  const character = createMockCharacter('AllRounder', 30);
  character.gold = 15000;
  character.userId = 'allrounder_123';
  
  leaderboardMgr.updateLevelLeaderboard(character);
  leaderboardMgr.updateWealthLeaderboard(character);
  leaderboardMgr.updateBossKillsLeaderboard(character, 100);
  
  const allRanks = leaderboardMgr.getPlayerAllRanks('allrounder_123');
  assertTrue(allRanks.totalLeaderboards >= 3, 'Should be ranked in at least 3 leaderboards');
  assertTrue(allRanks.rankings.level !== undefined, 'Should have level ranking');
  assertTrue(allRanks.rankings.wealth !== undefined, 'Should have wealth ranking');
});

// Test 34: Get Nearby Players
test('Should get players ranked near target player', () => {
  // Add several players
  for (let i = 1; i <= 20; i++) {
    const char = createMockCharacter(`TestPlayer${i}`, i * 2);
    char.userId = `testuser_${i}`;
    leaderboardMgr.updateLevelLeaderboard(char);
  }
  
  const nearby = leaderboardMgr.getNearbyPlayers('level', 'testuser_10', 3);
  assertTrue(nearby.players.length > 0, 'Should have nearby players');
  assertTrue(nearby.players.some(p => p.isPlayer), 'Should mark target player');
});

// Test 35: Get Leaderboard Statistics
test('Should get leaderboard statistics', () => {
  const stats = leaderboardMgr.getLeaderboardStats('level');
  assertTrue(stats.total > 0, 'Should have players in leaderboard');
  assertTrue(stats.average > 0, 'Should calculate average');
  assertTrue(stats.max >= stats.min, 'Max should be >= min');
  assertTrue(stats.topPlayer !== undefined, 'Should have top player');
});

// Test 36: Update Existing Entry with Higher Value
test('Should update player entry with higher value', () => {
  const character = createMockCharacter('Improver', 20);
  character.userId = 'improver_123';
  
  leaderboardMgr.updateLevelLeaderboard(character);
  const rank1 = leaderboardMgr.getPlayerRank('level', 'improver_123');
  
  character.level = 30;
  leaderboardMgr.updateLevelLeaderboard(character);
  const rank2 = leaderboardMgr.getPlayerRank('level', 'improver_123');
  
  assertEqual(rank2.value, 30, 'Value should be updated to 30');
  assertTrue(rank2.value > rank1.value, 'New value should be higher');
});

// Test 37: Do Not Update with Lower Value
test('Should not update player entry with lower value', () => {
  const character = createMockCharacter('Downgrader', 40);
  character.userId = 'downgrader_123';
  
  leaderboardMgr.updateLevelLeaderboard(character);
  const rank1 = leaderboardMgr.getPlayerRank('level', 'downgrader_123');
  
  character.level = 30;
  leaderboardMgr.updateLevelLeaderboard(character);
  const rank2 = leaderboardMgr.getPlayerRank('level', 'downgrader_123');
  
  assertEqual(rank2.value, 40, 'Value should remain 40');
  assertEqual(rank1.value, rank2.value, 'Value should not decrease');
});

// Test 38: Reset Seasonal Leaderboards
test('Should reset seasonal leaderboards', () => {
  // Add some seasonal data
  const character = createMockCharacter('SeasonTest', 20);
  leaderboardMgr.updateSeasonLevelLeaderboard(character, 25);
  leaderboardMgr.updateSeasonCurrencyLeaderboard(character, 1000);
  
  const result = leaderboardMgr.resetSeasonalLeaderboards();
  assertTrue(result.success, 'Should successfully reset');
  assertTrue(result.archived.seasonLevel !== undefined, 'Should archive season level');
  assertTrue(result.archived.seasonCurrency !== undefined, 'Should archive season currency');
  
  // Check that leaderboards are now empty
  const seasonLevel = leaderboardMgr.getLeaderboard('seasonLevel', 10, 0);
  assertEqual(seasonLevel.total, 0, 'Season level leaderboard should be empty');
});

// ==================== TEST RESULTS ====================

console.log(`\n${'='.repeat(50)}`);
console.log('📊 TEST RESULTS');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);
console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 All tests passed! Season & Leaderboard system is working correctly.');
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`);
  process.exit(1);
}
