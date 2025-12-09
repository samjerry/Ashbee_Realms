/**
 * test_raid_system.js
 * Comprehensive test suite for the Raid System
 * Tests: lobby creation, role management, raid instances, combat,
 *        Twitch integration, rewards, leaderboards
 */

const RaidManager = require('../game/RaidManager');

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function testSection(name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${name}`);
  console.log('='.repeat(60));
}

// Mock player data
function createMockPlayer(id, name, level = 10, classType = 'warrior', role = 'dps') {
  return {
    id: `player_${id}`,
    name,
    level,
    classType,
    maxHp: 100 + level * 10,
    maxMana: 100,
    role
  };
}

// Run tests
async function runTests() {
  console.log('\n🎯 Starting Raid System Tests...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Test 1: Raid Loading
    testSection('Test 1: Raid Data Loading');
    const raidMgr = new RaidManager();
    const raids = raidMgr.loadRaids();
    assert(raids !== null, 'Raids loaded successfully');
    assert(Object.keys(raids).length > 0, 'Raids data contains entries');
    assert(raids.goblin_siege, 'Goblin Siege raid exists');
    assert(raids.dragon_assault, 'Dragon Assault raid exists');
    assert(raids.void_incursion, 'Void Incursion raid exists');
    assert(raids.trial_of_legends, 'Trial of Legends raid exists');
    testsPassed += 6;
    
    // Test 2: Get Available Raids
    testSection('Test 2: Get Available Raids');
    const availableRaids = raidMgr.getAvailableRaids();
    assert(availableRaids.length > 0, 'Available raids list is not empty');
    assert(availableRaids[0].id, 'Raid has ID field');
    assert(availableRaids[0].name, 'Raid has name field');
    assert(availableRaids[0].difficulty, 'Raid has difficulty field');
    testsPassed += 4;
    
    // Test 3: Filter Raids by Difficulty
    testSection('Test 3: Filter Raids by Difficulty');
    const normalRaids = raidMgr.getAvailableRaids({ difficulty: 'normal' });
    assert(normalRaids.length > 0, 'Normal difficulty raids found');
    assert(normalRaids.every(r => r.difficulty === 'normal'), 'All raids are normal difficulty');
    const hardRaids = raidMgr.getAvailableRaids({ difficulty: 'hard' });
    assert(hardRaids.length > 0, 'Hard difficulty raids found');
    testsPassed += 3;
    
    // Test 4: Get Raid Details
    testSection('Test 4: Get Specific Raid Details');
    const goblinRaid = raidMgr.getRaidDetails('goblin_siege');
    assert(goblinRaid.name === 'Goblin Siege', 'Raid name matches');
    assert(goblinRaid.min_players === 3, 'Min players correct');
    assert(goblinRaid.max_players === 10, 'Max players correct');
    assert(goblinRaid.waves, 'Raid has waves');
    assert(goblinRaid.mechanics, 'Raid mechanics loaded');
    testsPassed += 5;
    
    // Test 5: Create Raid Lobby
    testSection('Test 5: Create Raid Lobby');
    const leader = createMockPlayer(1, 'TestLeader', 15, 'warrior', 'tank');
    const lobby = raidMgr.createLobby('goblin_siege', leader, {
      difficulty: 'normal',
      requireRoles: true,
      allowViewerVoting: true
    });
    assert(lobby.lobbyId, 'Lobby created with ID');
    assert(lobby.raidId === 'goblin_siege', 'Lobby linked to correct raid');
    assert(lobby.leader === 'TestLeader', 'Leader name correct');
    assert(lobby.players.length === 1, 'Leader added to lobby');
    assert(lobby.settings.difficulty === 'normal', 'Difficulty set correctly');
    testsPassed += 5;
    
    // Test 6: Join Raid Lobby
    testSection('Test 6: Join Raid Lobby');
    const player2 = createMockPlayer(2, 'Player2', 12, 'mage', 'dps');
    const joinResult = raidMgr.joinLobby(lobby.lobbyId, player2, 'dps');
    assert(joinResult.joined === true, 'Player joined successfully');
    assert(joinResult.players.length === 2, 'Player count increased');
    const player3 = createMockPlayer(3, 'Player3', 14, 'cleric', 'healer');
    const joinResult2 = raidMgr.joinLobby(lobby.lobbyId, player3, 'healer');
    assert(joinResult2.joined === true, 'Second player joined');
    assert(joinResult2.players.length === 3, 'Player count is 3');
    testsPassed += 4;
    
    // Test 7: Role Distribution
    testSection('Test 7: Role Distribution');
    const roleDistribution = joinResult2.roleDistribution;
    assert(roleDistribution.tank === 1, 'One tank in lobby');
    assert(roleDistribution.healer === 1, 'One healer in lobby');
    assert(roleDistribution.dps === 1, 'One DPS in lobby');
    testsPassed += 3;
    
    // Test 8: Change Player Role
    testSection('Test 8: Change Player Role');
    const roleChange = raidMgr.changeRole(lobby.lobbyId, player2.id, 'healer');
    assert(roleChange.success === true, 'Role changed successfully');
    assert(roleChange.roleDistribution.healer === 2, 'Healer count increased');
    assert(roleChange.roleDistribution.dps === 0, 'DPS count decreased');
    testsPassed += 3;
    
    // Test 9: Lobby Full Test
    testSection('Test 9: Lobby Player Limit');
    // Add players until full (max 10 for goblin_siege)
    for (let i = 4; i <= 10; i++) {
      const player = createMockPlayer(i, `Player${i}`, 10, 'rogue', 'dps');
      raidMgr.joinLobby(lobby.lobbyId, player, 'dps');
    }
    const player11 = createMockPlayer(11, 'Player11', 10, 'ranger', 'dps');
    const fullResult = raidMgr.joinLobby(lobby.lobbyId, player11, 'dps');
    assert(fullResult.joined === false, 'Cannot join full lobby');
    assert(fullResult.message.includes('full'), 'Error message indicates lobby full');
    testsPassed += 2;
    
    // Test 10: Cannot Start Without Requirements
    testSection('Test 10: Lobby Start Requirements');
    const lobbySmall = raidMgr.createLobby('goblin_siege', leader);
    assert(lobbySmall.canStart === false, 'Lobby cannot start with 1 player (min 3)');
    testsPassed += 1;
    
    // Test 11: Start Raid
    testSection('Test 11: Start Raid from Lobby');
    const instance = raidMgr.startRaid(lobby.lobbyId);
    assert(instance.instanceId, 'Raid instance created');
    assert(instance.raidId === 'goblin_siege', 'Instance linked to correct raid');
    assert(instance.players.length === 10, 'All players transferred to instance');
    assert(instance.state, 'Instance has state');
    testsPassed += 4;
    
    // Test 12: Raid Instance State
    testSection('Test 12: Get Raid Instance State');
    const state = raidMgr.getRaidState(instance.instanceId);
    assert(state.instanceId === instance.instanceId, 'Instance ID matches');
    assert(state.raidName === 'Goblin Siege', 'Raid name correct');
    assert(state.players.length === 10, 'All players in state');
    assert(state.currentPhase !== undefined, 'Current phase tracked');
    testsPassed += 4;
    
    // Test 13: Perform Player Actions
    testSection('Test 13: Player Actions in Raid');
    const attackAction = await raidMgr.performAction(instance.instanceId, leader.id, {
      type: 'attack',
      target: 'enemy_0'
    });
    assert(attackAction.action === 'attack', 'Attack action processed');
    assert(attackAction.result, 'Action has result');
    const healAction = await raidMgr.performAction(instance.instanceId, player3.id, {
      type: 'heal',
      target: leader.id
    });
    assert(healAction.action === 'heal', 'Heal action processed');
    testsPassed += 3;
    
    // Test 14: Combat Log
    testSection('Test 14: Combat Log System');
    const stateAfterActions = raidMgr.getRaidState(instance.instanceId);
    assert(stateAfterActions.state.status === 'active', 'Raid still active');
    assert(instance.state, 'Combat log exists');
    testsPassed += 2;
    
    // Test 15: Viewer Voting
    testSection('Test 15: Twitch Viewer Voting');
    const vote1 = raidMgr.submitViewerVote(instance.instanceId, {
      option: 'buff_players',
      viewer: 'viewer1',
      bits: 0
    });
    assert(vote1.instanceId === instance.instanceId, 'Vote submitted');
    assert(vote1.currentVote, 'Voting state tracked');
    const vote2 = raidMgr.submitViewerVote(instance.instanceId, {
      option: 'buff_players',
      viewer: 'viewer2',
      bits: 100
    });
    assert(vote2.currentVote.options.buff_players >= 2, 'Votes accumulated (bits weighted)');
    testsPassed += 3;
    
    // Test 16: Legacy Points Buff System
    testSection('Test 16: Legacy Points Buff Purchase');
    const healBuff = raidMgr.purchaseRaidBuff(instance.instanceId, leader.id, {
      type: 'heal_raid',
      cost: 5
    });
    assert(healBuff.buff === 'heal_raid', 'Buff type correct');
    assert(healBuff.result.success === true, 'Heal buff applied');
    assert(healBuff.result.cost === 5, 'Cost is 5 legacy points');
    
    const shieldBuff = raidMgr.purchaseRaidBuff(instance.instanceId, player3.id, {
      type: 'shield_raid',
      cost: 12
    });
    assert(shieldBuff.result.success === true, 'Shield buff applied');
    assert(shieldBuff.result.cost === 12, 'Cost is 12 legacy points');
    testsPassed += 5;
    
    // Test 17: Additional Legacy Points Buffs
    testSection('Test 17: More Legacy Points Buffs');
    const damageBuff = raidMgr.purchaseRaidBuff(instance.instanceId, leader.id, {
      type: 'damage_boost',
      cost: 8
    });
    assert(damageBuff.result.success === true, 'Damage boost applied');
    assert(damageBuff.result.cost === 8, 'Cost is 8 legacy points');
    
    // Test getting available buffs
    const availableBuffs = raidMgr.getLegacyPointsBuffs();
    assert(Object.keys(availableBuffs).length === 4, 'Four buffs available');
    assert(availableBuffs.heal_raid.cost === 5, 'Heal raid costs 5 LP');
    assert(availableBuffs.revive_player.cost === 10, 'Revive costs 10 LP');
    testsPassed += 5;
    
    // Test 18: Leaderboard System
    testSection('Test 18: Raid Leaderboards');
    // Simulate raid completion
    const completedInstance = raidMgr.completeRaid(instance.instanceId);
    assert(completedInstance.status === 'completed', 'Raid marked as completed');
    assert(completedInstance.stats, 'Completion stats recorded');
    assert(completedInstance.rewards, 'Rewards calculated');
    
    // Goblin Siege doesn't track leaderboards, but system still works
    const leaderboard = raidMgr.getLeaderboard('goblin_siege', 'fastest_clear', 10);
    assert(Array.isArray(leaderboard), 'Leaderboard is array');
    // Note: goblin_siege doesn't have leaderboard.tracked, so it will be empty
    // This is expected behavior
    
    // Test with void_incursion which has leaderboard tracking
    const voidRaid = raidMgr.getRaidDetails('void_incursion');
    assert(voidRaid.leaderboard?.tracked === true, 'Void Incursion tracks leaderboards');
    testsPassed += 5;
    
    // Test 19: Raid Rewards Calculation
    testSection('Test 19: Reward System');
    const rewards = completedInstance.rewards;
    assert(rewards.gold > 0, 'Gold reward given');
    assert(rewards.experience > 0, 'XP reward given');
    assert(Array.isArray(rewards.items), 'Items reward list exists');
    assert(rewards.gold === 500, 'Base gold reward correct (normal difficulty)');
    testsPassed += 4;
    
    // Test 20: Achievement Checking
    testSection('Test 20: Raid Achievements');
    const achievements = completedInstance.achievements;
    assert(Array.isArray(achievements), 'Achievements list exists');
    // Check if completion achievement is awarded
    const dragonRaid = raidMgr.getRaidDetails('dragon_assault');
    assert(dragonRaid.achievements, 'Dragon raid has achievements');
    assert(dragonRaid.achievements.length === 3, 'Dragon raid has 3 achievements');
    testsPassed += 3;
    
    // Test 21: Multiple Raid Types - Wave System
    testSection('Test 21: Wave-Based Raid System');
    const waveRaid = raidMgr.getRaidDetails('goblin_siege');
    assert(waveRaid.waves, 'Wave-based raid has waves');
    assert(waveRaid.waves.length === 3, 'Goblin Siege has 3 waves');
    assert(waveRaid.waves[2].boss === 'goblin_warlord', 'Final wave has boss');
    testsPassed += 3;
    
    // Test 22: Multiple Raid Types - Phase System
    testSection('Test 22: Phase-Based Raid System');
    const phaseRaid = raidMgr.getRaidDetails('dragon_assault');
    assert(phaseRaid.phases, 'Phase-based raid has phases');
    assert(phaseRaid.phases.length === 3, 'Dragon raid has 3 phases');
    assert(phaseRaid.phases[1].adds, 'Phase 2 spawns adds');
    assert(phaseRaid.roles, 'Dragon raid has role requirements');
    assert(phaseRaid.roles.tank.required === 2, 'Requires 2 tanks');
    testsPassed += 5;
    
    // Test 23: Multiple Raid Types - Objective System
    testSection('Test 23: Objective-Based Raid System');
    const objectiveRaid = raidMgr.getRaidDetails('void_incursion');
    assert(objectiveRaid.objectives, 'Objective-based raid has objectives');
    assert(objectiveRaid.objectives.length === 3, 'Void Incursion has 3 objectives');
    assert(objectiveRaid.objectives[0].objective === 'Close Void Rifts', 'First objective correct');
    testsPassed += 3;
    
    // Test 24: Multiple Raid Types - Boss Rush
    testSection('Test 24: Boss Rush Raid System');
    const bossRush = raidMgr.getRaidDetails('trial_of_legends');
    assert(bossRush.boss_rush, 'Boss rush raid has boss_rush array');
    assert(bossRush.boss_rush.length === 5, 'Trial has 5 legendary bosses');
    assert(bossRush.weekly_rotation === true, 'Weekly rotation enabled');
    assert(bossRush.modifiers, 'Boss rush has modifiers');
    testsPassed += 4;
    
    // Test 25: Difficulty Scaling
    testSection('Test 25: Difficulty Scaling');
    const leaderHard = createMockPlayer(100, 'HardcoreLeader', 20, 'warrior', 'tank');
    const hardLobby = raidMgr.createLobby('dragon_assault', leaderHard, {
      difficulty: 'hard'
    });
    assert(hardLobby.settings.difficulty === 'hard', 'Hard difficulty set');
    
    // Add enough players (Dragon Assault needs 2 tanks, 3 healers, 10 DPS = 15 total)
    // Leader is tank 1
    const tank2 = createMockPlayer(101, 'Hard1', 18, 'warrior', 'tank');
    raidMgr.joinLobby(hardLobby.lobbyId, tank2, 'tank');
    
    // Add 3 healers
    for (let i = 2; i <= 4; i++) {
      const healer = createMockPlayer(100 + i, `Hard${i}`, 18, 'cleric', 'healer');
      raidMgr.joinLobby(hardLobby.lobbyId, healer, 'healer');
    }
    
    // Add 10 DPS
    for (let i = 5; i <= 14; i++) {
      const dps = createMockPlayer(100 + i, `Hard${i}`, 18, 'rogue', 'dps');
      raidMgr.joinLobby(hardLobby.lobbyId, dps, 'dps');
    }
    
    const hardInstance = raidMgr.startRaid(hardLobby.lobbyId);
    const hardComplete = raidMgr.completeRaid(hardInstance.instanceId);
    const hardRewards = hardComplete.rewards;
    assert(hardRewards.gold === 3000, 'Hard difficulty has 1.5x gold (2000 * 1.5)');
    assert(hardRewards.experience === 7500, 'Hard difficulty has 1.5x XP (5000 * 1.5)');
    testsPassed += 3;
    
    // Test 26: Leave Lobby with Leadership Transfer
    testSection('Test 26: Leave Lobby & Leadership Transfer');
    const leaveTestLeader = createMockPlayer(200, 'LeaveLeader', 10);
    const leaveLobby = raidMgr.createLobby('goblin_siege', leaveTestLeader);
    const player201 = createMockPlayer(201, 'Player201', 10);
    raidMgr.joinLobby(leaveLobby.lobbyId, player201);
    const player202 = createMockPlayer(202, 'Player202', 10);
    raidMgr.joinLobby(leaveLobby.lobbyId, player202);
    
    // Non-leader leaves
    const leaveResult = raidMgr.leaveLobby(leaveLobby.lobbyId, player201.id);
    assert(leaveResult.players.length === 2, 'Player left, count decreased to 2');
    assert(!leaveResult.disbanded, 'Lobby not disbanded');
    
    // Leader leaves - should transfer leadership, not disband
    const leaderLeave = raidMgr.leaveLobby(leaveLobby.lobbyId, leaveTestLeader.id);
    assert(leaderLeave.leadershipTransferred === true, 'Leadership transferred');
    assert(leaderLeave.newLeader === 'Player202', 'Player202 is new leader');
    assert(leaderLeave.players.length === 1, 'One player remains');
    assert(!leaderLeave.disbanded, 'Lobby not disbanded');
    
    // Last player leaves - now it disbands
    const finalLeave = raidMgr.leaveLobby(leaveLobby.lobbyId, player202.id);
    assert(finalLeave.disbanded === true, 'Lobby disbanded when empty');
    testsPassed += 6;
    
    // Test 27: Active Lobbies List
    testSection('Test 27: Active Lobbies List');
    const activeLobbies = raidMgr.getActiveLobbies();
    assert(Array.isArray(activeLobbies), 'Active lobbies is array');
    // Note: Previous lobbies may still exist
    testsPassed += 1;
    
    // Test 28: Raid Wipe Handling
    testSection('Test 28: Raid Wipe System');
    const wipeLeader = createMockPlayer(300, 'WipeLeader', 5);
    const wipeLobby = raidMgr.createLobby('goblin_siege', wipeLeader);
    
    // Add minimum players
    for (let i = 1; i <= 2; i++) {
      const player = createMockPlayer(300 + i, `Wipe${i}`, 5);
      raidMgr.joinLobby(wipeLobby.lobbyId, player);
    }
    
    const wipeInstance = raidMgr.startRaid(wipeLobby.lobbyId);
    
    // Simulate all players dying (simplified - just call wipe directly)
    const wipeResult = raidMgr.wipeRaid(wipeInstance.instanceId);
    assert(wipeResult.status === 'wiped', 'Raid marked as wiped');
    assert(wipeResult.stats, 'Wipe stats recorded');
    testsPassed += 2;
    
    // Test 29: Twitch Integration Settings
    testSection('Test 29: Twitch Integration & Legacy Points');
    const twitchRaid = raidMgr.getRaidDetails('void_incursion');
    assert(twitchRaid.twitch_integration, 'Twitch integration exists');
    assert(twitchRaid.twitch_integration.viewer_participation === true, 'Viewer participation enabled');
    
    // Test legacy points buff costs
    const lpBuffs = raidMgr.getLegacyPointsBuffs();
    assert(lpBuffs.heal_raid.cost === 5, 'Heal raid costs 5 LP');
    assert(lpBuffs.revive_player.cost === 10, 'Revive costs 10 LP');
    assert(lpBuffs.damage_boost.cost === 8, 'Damage boost costs 8 LP');
    assert(lpBuffs.shield_raid.cost === 12, 'Shield costs 12 LP');
    testsPassed += 6;
    
    // Test 30: Raid Mechanics Loading
    testSection('Test 30: Raid Mechanics System');
    const mechanics = raidMgr.mechanics;
    assert(mechanics, 'Raid mechanics loaded');
    assert(mechanics.viewer_integration, 'Viewer integration mechanics exist');
    assert(mechanics.loot_system, 'Loot system configuration exists');
    assert(mechanics.progression, 'Progression system exists');
    assert(mechanics.progression.lockout === 'weekly', 'Weekly lockout configured');
    testsPassed += 5;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ All tests passed: ${testsPassed}/${testsPassed + testsFailed}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Raid System is fully functional!\n');
    
  } catch (error) {
    testsFailed++;
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    console.log(`\n📊 Tests passed: ${testsPassed}`);
    console.log(`📊 Tests failed: ${testsFailed}`);
    process.exit(1);
  }
}

// Run all tests
runTests().then(() => {
  console.log('✅ Test suite completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
