/**
 * RaidManager.js
 * Manages multiplayer raid instances with role system, coordinated combat,
 * and Twitch viewer integration (voting, channel points, bits)
 */

const { loadData } = require('../data/data_loader');

class RaidManager {
  constructor() {
    this.raids = null;
    this.mechanics = null;
    this.activeRaids = new Map(); // Map<raidInstanceId, RaidInstance>
    this.raidLobbies = new Map(); // Map<raidId, RaidLobby>
    this.leaderboards = new Map(); // Map<raidId, Array<LeaderboardEntry>>
  }

  /**
   * Load raids from raids.json
   */
  loadRaids() {
    if (this.raids) return this.raids;
    
    const data = loadData('raids');
    this.raids = data.raids;
    this.mechanics = data.raid_mechanics;
    
    // Initialize leaderboards for trackable raids
    Object.keys(this.raids).forEach(raidId => {
      const raid = this.raids[raidId];
      if (raid.leaderboard?.tracked) {
        this.leaderboards.set(raidId, []);
      }
    });
    
    return this.raids;
  }

  /**
   * Get all available raids
   * @param {Object} filters - Optional filters { difficulty, minPlayers, maxPlayers }
   * @returns {Object} Available raids with metadata
   */
  getAvailableRaids(filters = {}) {
    this.loadRaids();
    
    let raidList = Object.entries(this.raids).map(([id, raid]) => ({
      id,
      ...raid,
      currentLobbies: this.getLobbyCountForRaid(id),
      activeInstances: this.getActiveInstanceCountForRaid(id)
    }));
    
    // Apply filters
    if (filters.difficulty) {
      raidList = raidList.filter(r => r.difficulty === filters.difficulty);
    }
    if (filters.minPlayers !== undefined) {
      raidList = raidList.filter(r => r.min_players <= filters.minPlayers);
    }
    if (filters.maxPlayers !== undefined) {
      raidList = raidList.filter(r => r.max_players >= filters.maxPlayers);
    }
    
    return raidList;
  }

  /**
   * Get specific raid details
   * @param {string} raidId - Raid identifier
   * @returns {Object} Raid data
   */
  getRaidDetails(raidId) {
    this.loadRaids();
    const raid = this.raids[raidId];
    if (!raid) throw new Error(`Raid ${raidId} not found`);
    
    return {
      ...raid,
      mechanics: this.mechanics,
      currentLobbies: this.getLobbyCountForRaid(raidId),
      activeInstances: this.getActiveInstanceCountForRaid(raidId)
    };
  }

  /**
   * Get raids available at a specific location
   * @param {string} location - Biome/location identifier
   * @returns {Array} Raids with entrances at this location
   */
  getRaidsAtLocation(location) {
    this.loadRaids();
    
    const raidsAtLocation = Object.entries(this.raids)
      .filter(([id, raid]) => raid.entrance_location === location)
      .map(([id, raid]) => ({
        id,
        name: raid.name,
        description: raid.description,
        difficulty: raid.difficulty,
        min_players: raid.min_players,
        max_players: raid.max_players,
        duration_minutes: raid.duration_minutes,
        entrance_location: raid.entrance_location,
        currentLobbies: this.getLobbyCountForRaid(id),
        activeInstances: this.getActiveInstanceCountForRaid(id)
      }));
    
    return raidsAtLocation;
  }

  /**
   * Create a new raid lobby
   * @param {string} raidId - Raid to create lobby for
   * @param {Object} leader - Player creating the lobby
   * @param {string} leaderLocation - Current location of the leader
   * @param {Object} options - Lobby options { difficulty, requireRoles, allowViewerVoting }
   * @returns {Object} Lobby instance
   */
  createLobby(raidId, leader, leaderLocation, options = {}) {
    this.loadRaids();
    const raid = this.raids[raidId];
    if (!raid) throw new Error(`Raid ${raidId} not found`);
    
    // Validate leader is at raid entrance
    if (!raid.entrance_location) {
      throw new Error(`Raid ${raidId} does not have an entrance location defined`);
    }
    
    if (leaderLocation !== raid.entrance_location) {
      throw new Error(`You must be at ${raid.entrance_location} to start this raid. Current location: ${leaderLocation}`);
    }
    
    const lobbyId = `${raidId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lobby = new RaidLobby({
      id: lobbyId,
      raidId,
      raid,
      leader,
      difficulty: options.difficulty || raid.difficulty,
      requireRoles: options.requireRoles !== false,
      allowViewerVoting: options.allowViewerVoting !== false,
      maxPlayers: raid.max_players,
      minPlayers: raid.min_players
    });
    
    this.raidLobbies.set(lobbyId, lobby);
    
    return {
      lobbyId,
      raidId,
      raidName: raid.name,
      leader: leader.name,
      players: lobby.getPlayers(),
      settings: lobby.getSettings(),
      status: 'waiting',
      canStart: lobby.canStart()
    };
  }

  /**
   * Join an existing raid lobby
   * @param {string} lobbyId - Lobby to join
   * @param {Object} player - Player joining
   * @param {string} role - Desired role (tank, healer, dps)
   * @returns {Object} Updated lobby state
   */
  joinLobby(lobbyId, player, role = 'dps') {
    const lobby = this.raidLobbies.get(lobbyId);
    if (!lobby) throw new Error(`Lobby ${lobbyId} not found`);
    
    const result = lobby.addPlayer(player, role);
    
    return {
      lobbyId,
      raidId: lobby.raidId,
      joined: result.success,
      message: result.message,
      players: lobby.getPlayers(),
      roleDistribution: lobby.getRoleDistribution(),
      canStart: lobby.canStart()
    };
  }

  /**
   * Leave a raid lobby
   * @param {string} lobbyId - Lobby to leave
   * @param {string} playerId - Player leaving
   * @returns {Object} Updated lobby state or deletion status
   */
  leaveLobby(lobbyId, playerId) {
    const lobby = this.raidLobbies.get(lobbyId);
    if (!lobby) throw new Error(`Lobby ${lobbyId} not found`);
    
    const wasLeader = lobby.leader.id === playerId;
    lobby.removePlayer(playerId);
    
    // If lobby empty, disband
    if (lobby.players.size === 0) {
      this.raidLobbies.delete(lobbyId);
      return { disbanded: true, message: 'Lobby disbanded - no players remaining' };
    }
    
    // If leader left, transfer leadership to random player
    if (wasLeader) {
      const newLeader = lobby.transferLeadership();
      return {
        lobbyId,
        leadershipTransferred: true,
        newLeader: newLeader.name,
        message: `${newLeader.name} is now the raid leader`,
        players: lobby.getPlayers(),
        canStart: lobby.canStart()
      };
    }
    
    return {
      lobbyId,
      players: lobby.getPlayers(),
      canStart: lobby.canStart()
    };
  }

  /**
   * Change player role in lobby
   * @param {string} lobbyId - Lobby ID
   * @param {string} playerId - Player changing role
   * @param {string} newRole - New role (tank, healer, dps)
   * @returns {Object} Updated role distribution
   */
  changeRole(lobbyId, playerId, newRole) {
    const lobby = this.raidLobbies.get(lobbyId);
    if (!lobby) throw new Error(`Lobby ${lobbyId} not found`);
    
    const result = lobby.changePlayerRole(playerId, newRole);
    
    return {
      lobbyId,
      success: result.success,
      message: result.message,
      roleDistribution: lobby.getRoleDistribution(),
      canStart: lobby.canStart()
    };
  }

  /**
   * Start the raid from lobby
   * @param {string} lobbyId - Lobby to start
   * @returns {Object} Raid instance
   */
  startRaid(lobbyId) {
    const lobby = this.raidLobbies.get(lobbyId);
    if (!lobby) throw new Error(`Lobby ${lobbyId} not found`);
    
    if (!lobby.canStart()) {
      throw new Error(`Cannot start raid: ${lobby.getStartRequirements()}`);
    }
    
    // Create raid instance
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instance = new RaidInstance({
      id: instanceId,
      raidId: lobby.raidId,
      raid: lobby.raid,
      players: Array.from(lobby.players.values()),
      difficulty: lobby.difficulty,
      settings: lobby.getSettings(),
      startTime: Date.now()
    });
    
    this.activeRaids.set(instanceId, instance);
    this.raidLobbies.delete(lobbyId);
    
    return {
      instanceId,
      raidId: instance.raidId,
      raidName: instance.raid.name,
      players: instance.getPlayers(),
      state: instance.getState(),
      currentPhase: instance.getCurrentPhase(),
      startedAt: instance.startTime
    };
  }

  /**
   * Get raid instance state
   * @param {string} instanceId - Raid instance ID
   * @returns {Object} Current raid state
   */
  getRaidState(instanceId) {
    const instance = this.activeRaids.get(instanceId);
    if (!instance) throw new Error(`Raid instance ${instanceId} not found`);
    
    return {
      instanceId,
      raidId: instance.raidId,
      raidName: instance.raid.name,
      state: instance.getState(),
      currentPhase: instance.getCurrentPhase(),
      players: instance.getPlayers(),
      boss: instance.getCurrentBoss(),
      mechanics: instance.getActiveMechanics(),
      timeElapsed: instance.getTimeElapsed(),
      viewerVoting: instance.viewerVoting
    };
  }

  /**
   * Process player action in raid
   * @param {string} instanceId - Raid instance ID
   * @param {string} playerId - Player performing action
   * @param {Object} action - Action data { type, target, ability, etc. }
   * @returns {Object} Action result and updated state
   */
  async performAction(instanceId, playerId, action) {
    const instance = this.activeRaids.get(instanceId);
    if (!instance) throw new Error(`Raid instance ${instanceId} not found`);
    
    const result = await instance.processPlayerAction(playerId, action);
    
    // Check for raid completion or wipe
    if (instance.isComplete()) {
      return this.completeRaid(instanceId);
    }
    
    if (instance.isWiped()) {
      return this.wipeRaid(instanceId);
    }
    
    return {
      instanceId,
      action: action.type,
      result,
      state: instance.getState(),
      combatLog: instance.getCombatLog(10) // Last 10 entries
    };
  }

  /**
   * Complete raid successfully
   * @param {string} instanceId - Raid instance ID
   * @returns {Object} Completion rewards and stats
   */
  completeRaid(instanceId) {
    const instance = this.activeRaids.get(instanceId);
    if (!instance) throw new Error(`Raid instance ${instanceId} not found`);
    
    const stats = instance.getCompletionStats();
    const rewards = instance.calculateRewards();
    
    // Update leaderboard
    if (instance.raid.leaderboard?.tracked) {
      this.updateLeaderboard(instance.raidId, {
        players: instance.getPlayers().map(p => p.name),
        completionTime: stats.completionTime,
        deaths: stats.totalDeaths,
        difficulty: instance.difficulty,
        date: Date.now()
      });
    }
    
    // Cleanup
    this.activeRaids.delete(instanceId);
    
    return {
      instanceId,
      status: 'completed',
      stats,
      rewards,
      achievements: instance.checkAchievements()
    };
  }

  /**
   * Handle raid wipe (all players dead)
   * @param {string} instanceId - Raid instance ID
   * @returns {Object} Wipe information
   */
  wipeRaid(instanceId) {
    const instance = this.activeRaids.get(instanceId);
    if (!instance) throw new Error(`Raid instance ${instanceId} not found`);
    
    const stats = instance.getCompletionStats();
    
    // Cleanup
    this.activeRaids.delete(instanceId);
    
    return {
      instanceId,
      status: 'wiped',
      stats,
      message: 'Raid wiped - all players defeated'
    };
  }

  /**
   * Twitch viewer voting on raid events
   * @param {string} instanceId - Raid instance ID
   * @param {Object} vote - Vote data { option, viewer, bits }
   * @returns {Object} Current voting state
   */
  submitViewerVote(instanceId, vote) {
    const instance = this.activeRaids.get(instanceId);
    if (!instance) throw new Error(`Raid instance ${instanceId} not found`);
    
    if (!instance.settings.allowViewerVoting) {
      throw new Error('Viewer voting is disabled for this raid');
    }
    
    instance.addViewerVote(vote);
    
    return {
      instanceId,
      currentVote: instance.viewerVoting,
      timeRemaining: instance.getVotingTimeRemaining()
    };
  }

  /**
   * Process legacy points buff purchase
   * @param {string} instanceId - Raid instance ID
   * @param {string} playerId - Player purchasing buff
   * @param {Object} purchase - Purchase data { type, cost }
   * @returns {Object} Purchase result
   */
  purchaseRaidBuff(instanceId, playerId, purchase) {
    const instance = this.activeRaids.get(instanceId);
    if (!instance) throw new Error(`Raid instance ${instanceId} not found`);
    
    const result = instance.applyLegacyPointsBuff(playerId, purchase);
    
    return {
      instanceId,
      buff: purchase.type,
      player: playerId,
      result,
      state: instance.getState()
    };
  }



  /**
   * Get raid leaderboard
   * @param {string} raidId - Raid ID
   * @param {string} category - Leaderboard category (fastest_clear, fewest_deaths, highest_damage)
   * @param {number} limit - Number of entries to return
   * @returns {Array} Leaderboard entries
   */
  getLeaderboard(raidId, category = 'fastest_clear', limit = 10) {
    const leaderboard = this.leaderboards.get(raidId) || [];
    
    let sorted = [...leaderboard];
    
    switch (category) {
      case 'fastest_clear':
        sorted.sort((a, b) => a.completionTime - b.completionTime);
        break;
      case 'fewest_deaths':
        sorted.sort((a, b) => a.deaths - b.deaths);
        break;
      case 'highest_damage':
        sorted.sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0));
        break;
    }
    
    return sorted.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
  }

  /**
   * Update leaderboard with new entry
   * @private
   */
  updateLeaderboard(raidId, entry) {
    if (!this.leaderboards.has(raidId)) {
      this.leaderboards.set(raidId, []);
    }
    
    const leaderboard = this.leaderboards.get(raidId);
    leaderboard.push(entry);
    
    // Keep only top 100 entries
    if (leaderboard.length > 100) {
      leaderboard.sort((a, b) => a.completionTime - b.completionTime);
      this.leaderboards.set(raidId, leaderboard.slice(0, 100));
    }
  }

  /**
   * Get available legacy points buffs and their costs
   * @returns {Object} Available buffs with costs and descriptions
   */
  getLegacyPointsBuffs() {
    return {
      heal_raid: {
        cost: 5,
        name: 'Heal Raid',
        description: 'Restore 25% HP to all living players',
        effect: 'heal'
      },
      revive_player: {
        cost: 10,
        name: 'Revive Player',
        description: 'Bring back a fallen player at 50% HP',
        effect: 'revive'
      },
      damage_boost: {
        cost: 8,
        name: 'Damage Boost',
        description: 'Increase raid damage by 25% for 2 minutes',
        effect: 'buff'
      },
      shield_raid: {
        cost: 12,
        name: 'Raid Shield',
        description: 'Absorb 50% of incoming damage for 1 minute',
        effect: 'shield'
      }
    };
  }

  /**
   * Get count of lobbies for a raid
   * @private
   */
  getLobbyCountForRaid(raidId) {
    let count = 0;
    for (const lobby of this.raidLobbies.values()) {
      if (lobby.raidId === raidId) count++;
    }
    return count;
  }

  /**
   * Get count of active instances for a raid
   * @private
   */
  getActiveInstanceCountForRaid(raidId) {
    let count = 0;
    for (const instance of this.activeRaids.values()) {
      if (instance.raidId === raidId) count++;
    }
    return count;
  }

  /**
   * Get all active lobbies
   * @returns {Array} List of lobbies
   */
  getActiveLobbies() {
    return Array.from(this.raidLobbies.values()).map(lobby => ({
      lobbyId: lobby.id,
      raidId: lobby.raidId,
      raidName: lobby.raid.name,
      leader: lobby.leader.name,
      playerCount: lobby.players.size,
      maxPlayers: lobby.maxPlayers,
      roleDistribution: lobby.getRoleDistribution(),
      canStart: lobby.canStart()
    }));
  }
}

/**
 * RaidLobby class - Manages pre-raid player gathering and role selection
 */
class RaidLobby {
  constructor(config) {
    this.id = config.id;
    this.raidId = config.raidId;
    this.raid = config.raid;
    this.leader = config.leader;
    this.difficulty = config.difficulty;
    this.requireRoles = config.requireRoles;
    this.allowViewerVoting = config.allowViewerVoting;
    this.maxPlayers = config.maxPlayers;
    this.minPlayers = config.minPlayers;
    
    this.players = new Map(); // Map<playerId, PlayerInfo>
    this.roleRequirements = this.raid.roles || null;
    
    // Add leader to lobby with their preferred role (or dps as default)
    const leaderRole = config.leader.role || 'dps';
    this.addPlayer(config.leader, leaderRole);
  }

  addPlayer(player, role = 'dps') {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: 'Lobby is full' };
    }
    
    if (this.players.has(player.id)) {
      return { success: false, message: 'Already in lobby' };
    }
    
    // Validate role if requirements exist
    if (this.requireRoles && this.roleRequirements) {
      const roleCount = this.getRoleCount(role);
      const required = this.roleRequirements[role]?.required || Infinity;
      
      if (roleCount >= required) {
        return { success: false, message: `${role} role is full` };
      }
    }
    
    this.players.set(player.id, {
      id: player.id,
      name: player.name,
      level: player.level,
      class: player.classType,
      role,
      isLeader: player.id === this.leader.id
    });
    
    return { success: true, message: `${player.name} joined as ${role}` };
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  transferLeadership() {
    // Select random player to become new leader
    const players = Array.from(this.players.values());
    const newLeader = players[Math.floor(Math.random() * players.length)];
    this.leader = newLeader;
    newLeader.isLeader = true;
    return newLeader;
  }

  changePlayerRole(playerId, newRole) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, message: 'Player not in lobby' };
    }
    
    if (this.requireRoles && this.roleRequirements) {
      const roleCount = this.getRoleCount(newRole);
      const required = this.roleRequirements[newRole]?.required || Infinity;
      
      if (roleCount >= required) {
        return { success: false, message: `${newRole} role is full` };
      }
    }
    
    player.role = newRole;
    return { success: true, message: `Role changed to ${newRole}` };
  }

  getRoleCount(role) {
    let count = 0;
    for (const player of this.players.values()) {
      if (player.role === role) count++;
    }
    return count;
  }

  getRoleDistribution() {
    const distribution = { tank: 0, healer: 0, dps: 0 };
    for (const player of this.players.values()) {
      distribution[player.role] = (distribution[player.role] || 0) + 1;
    }
    return distribution;
  }

  canStart() {
    // Check minimum players
    if (this.players.size < this.minPlayers) {
      return false;
    }
    
    // Check role requirements if enforced
    if (this.requireRoles && this.roleRequirements) {
      for (const [role, req] of Object.entries(this.roleRequirements)) {
        const count = this.getRoleCount(role);
        if (count < req.required) {
          return false;
        }
      }
    }
    
    return true;
  }

  getStartRequirements() {
    const issues = [];
    
    if (this.players.size < this.minPlayers) {
      issues.push(`Need ${this.minPlayers - this.players.size} more players`);
    }
    
    if (this.requireRoles && this.roleRequirements) {
      for (const [role, req] of Object.entries(this.roleRequirements)) {
        const count = this.getRoleCount(role);
        if (count < req.required) {
          issues.push(`Need ${req.required - count} more ${role}(s)`);
        }
      }
    }
    
    return issues.join(', ');
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  getSettings() {
    return {
      difficulty: this.difficulty,
      requireRoles: this.requireRoles,
      allowViewerVoting: this.allowViewerVoting,
      maxPlayers: this.maxPlayers,
      minPlayers: this.minPlayers
    };
  }
}

/**
 * RaidInstance class - Active raid with coordinated multiplayer combat
 */
class RaidInstance {
  constructor(config) {
    this.id = config.id;
    this.raidId = config.raidId;
    this.raid = config.raid;
    this.players = new Map();
    this.difficulty = config.difficulty;
    this.settings = config.settings;
    this.startTime = config.startTime;
    
    // Initialize players
    config.players.forEach(p => {
      this.players.set(p.id, {
        ...p,
        hp: p.maxHp || 100,
        maxHp: p.maxHp || 100,
        mana: p.maxMana || 100,
        maxMana: p.maxMana || 100,
        alive: true,
        damage: 0,
        healing: 0,
        deaths: 0
      });
    });
    
    // Raid state
    this.status = 'active';
    this.currentPhase = 0;
    this.currentWave = 0;
    this.currentObjective = 0;
    this.boss = null;
    this.enemies = [];
    this.combatLog = [];
    this.mechanics = [];
    
    // Viewer integration
    this.viewerVoting = null;
    this.votingEndTime = null;
    
    // Initialize first phase/wave/objective
    this.initializePhase();
  }

  initializePhase() {
    // Handle different raid types (waves, phases, objectives)
    if (this.raid.waves) {
      this.initializeWave();
    } else if (this.raid.phases) {
      this.initializeBossPhase();
    } else if (this.raid.objectives) {
      this.initializeObjective();
    } else if (this.raid.boss_rush) {
      this.initializeBossRush();
    }
  }

  initializeWave() {
    const wave = this.raid.waves[this.currentWave];
    if (!wave) return;
    
    this.addCombatLog(`Wave ${wave.wave} begins: ${wave.description}`);
    
    // Spawn enemies for this wave
    this.enemies = [];
    for (let i = 0; i < wave.count; i++) {
      const enemyType = wave.enemies[Math.floor(Math.random() * wave.enemies.length)];
      this.enemies.push({
        id: `enemy_${i}`,
        type: enemyType,
        hp: 100, // Would load from monster data
        maxHp: 100,
        alive: true
      });
    }
    
    // Boss spawns on final wave
    if (wave.boss) {
      this.boss = {
        id: 'boss',
        type: wave.boss,
        hp: 1000,
        maxHp: 1000,
        phase: 1,
        alive: true
      };
    }
    
    this.mechanics = this.raid.mechanics || [];
  }

  initializeBossPhase() {
    const phase = this.raid.phases[this.currentPhase];
    if (!phase) return;
    
    this.addCombatLog(`Phase ${phase.phase}: ${phase.description}`);
    
    if (!this.boss) {
      this.boss = {
        id: 'boss',
        type: phase.boss,
        hp: 10000, // Would scale with player count and difficulty
        maxHp: 10000,
        phase: phase.phase,
        alive: true
      };
    }
    
    this.mechanics = phase.mechanics || [];
    
    // Spawn adds if specified
    if (phase.adds) {
      this.enemies = phase.adds.map((addType, i) => ({
        id: `add_${i}`,
        type: addType,
        hp: 500,
        maxHp: 500,
        alive: true
      }));
    }
  }

  initializeObjective() {
    const objective = this.raid.objectives[this.currentObjective];
    if (!objective) return;
    
    this.addCombatLog(`Objective: ${objective.objective} - ${objective.description}`);
    this.mechanics = objective.mechanics || [];
  }

  initializeBossRush() {
    const bossType = this.raid.boss_rush[this.currentPhase];
    if (!bossType) return;
    
    this.boss = {
      id: 'boss',
      type: bossType,
      hp: 15000,
      maxHp: 15000,
      phase: 1,
      alive: true
    };
    
    this.addCombatLog(`Boss ${this.currentPhase + 1}/${this.raid.boss_rush.length}: ${bossType}`);
  }

  async processPlayerAction(playerId, action) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      return { success: false, message: 'Player cannot act' };
    }
    
    let result = {};
    
    switch (action.type) {
      case 'attack':
        result = this.processAttack(player, action.target);
        break;
      case 'heal':
        result = this.processHeal(player, action.target);
        break;
      case 'ability':
        result = this.processAbility(player, action.ability, action.target);
        break;
      case 'taunt':
        result = this.processTaunt(player);
        break;
      default:
        result = { success: false, message: 'Unknown action type' };
    }
    
    // Check for phase transitions
    this.checkPhaseTransition();
    
    // Process enemy actions (simplified)
    this.processEnemyTurn();
    
    return result;
  }

  processAttack(player, targetId) {
    const target = this.boss?.id === targetId ? this.boss : 
                   this.enemies.find(e => e.id === targetId);
    
    if (!target || !target.alive) {
      return { success: false, message: 'Invalid target' };
    }
    
    const damage = Math.floor(Math.random() * 50) + 25; // Simplified
    target.hp = Math.max(0, target.hp - damage);
    player.damage += damage;
    
    this.addCombatLog(`${player.name} attacks ${target.type} for ${damage} damage`);
    
    if (target.hp === 0) {
      target.alive = false;
      this.addCombatLog(`${target.type} has been defeated!`);
    }
    
    return { success: true, damage, target: targetId };
  }

  processHeal(player, targetId) {
    const target = this.players.get(targetId);
    if (!target || !target.alive) {
      return { success: false, message: 'Invalid target' };
    }
    
    const healing = Math.floor(Math.random() * 40) + 30; // Simplified
    const actualHealing = Math.min(healing, target.maxHp - target.hp);
    target.hp += actualHealing;
    player.healing += actualHealing;
    
    this.addCombatLog(`${player.name} heals ${target.name} for ${actualHealing} HP`);
    
    return { success: true, healing: actualHealing, target: targetId };
  }

  processAbility(player, ability, targetId) {
    // Simplified ability system
    return { success: true, message: `${player.name} used ${ability}` };
  }

  processTaunt(player) {
    if (player.role !== 'tank') {
      return { success: false, message: 'Only tanks can taunt' };
    }
    
    this.addCombatLog(`${player.name} taunts all enemies!`);
    return { success: true, message: 'Taunt successful' };
  }

  processEnemyTurn() {
    // Boss attacks
    if (this.boss && this.boss.alive) {
      const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
      if (alivePlayers.length > 0) {
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const damage = Math.floor(Math.random() * 40) + 20;
        target.hp = Math.max(0, target.hp - damage);
        
        this.addCombatLog(`${this.boss.type} attacks ${target.name} for ${damage} damage`);
        
        if (target.hp === 0) {
          target.alive = false;
          target.deaths++;
          this.addCombatLog(`${target.name} has fallen!`);
        }
      }
    }
    
    // Enemy attacks
    this.enemies.filter(e => e.alive).forEach(enemy => {
      const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
      if (alivePlayers.length > 0) {
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const damage = Math.floor(Math.random() * 20) + 10;
        target.hp = Math.max(0, target.hp - damage);
        
        if (target.hp === 0) {
          target.alive = false;
          target.deaths++;
        }
      }
    });
  }

  checkPhaseTransition() {
    if (this.raid.waves) {
      // Check if wave complete
      const allEnemiesDead = this.enemies.every(e => !e.alive);
      const bossDead = !this.boss || !this.boss.alive;
      
      if (allEnemiesDead && bossDead) {
        this.currentWave++;
        if (this.currentWave < this.raid.waves.length) {
          this.initializeWave();
        } else {
          this.status = 'completed';
        }
      }
    } else if (this.raid.phases) {
      // Check boss HP for phase transitions
      if (this.boss && this.boss.alive) {
        const hpPercent = (this.boss.hp / this.boss.maxHp) * 100;
        const nextPhase = this.raid.phases[this.currentPhase + 1];
        
        if (nextPhase) {
          const [, max] = nextPhase.hp_threshold.split('-').map(s => parseInt(s));
          if (hpPercent <= max) {
            this.currentPhase++;
            this.initializeBossPhase();
          }
        }
      }
      
      if (this.boss && !this.boss.alive) {
        this.status = 'completed';
      }
    } else if (this.raid.boss_rush) {
      if (this.boss && !this.boss.alive) {
        this.currentPhase++;
        if (this.currentPhase < this.raid.boss_rush.length) {
          this.initializeBossRush();
        } else {
          this.status = 'completed';
        }
      }
    }
  }

  addViewerVote(vote) {
    if (!this.viewerVoting) {
      this.viewerVoting = {
        options: {},
        totalVotes: 0,
        endTime: Date.now() + 30000 // 30 seconds
      };
    }
    
    const weight = vote.bits ? Math.floor(vote.bits / 100) + 1 : 1;
    this.viewerVoting.options[vote.option] = 
      (this.viewerVoting.options[vote.option] || 0) + weight;
    this.viewerVoting.totalVotes += weight;
  }

  applyLegacyPointsBuff(playerId, purchase) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, message: 'Player not in raid' };
    }

    const buffs = {
      heal_raid: { cost: 5, effect: 'Raid healed for 25%' },
      revive_player: { cost: 10, effect: 'Revive fallen player' },
      damage_boost: { cost: 8, effect: 'Raid damage +25% for 2 minutes' },
      shield_raid: { cost: 12, effect: 'Raid shield absorbs 50% damage for 1 minute' }
    };

    const buff = buffs[purchase.type];
    if (!buff) {
      return { success: false, message: 'Unknown buff type' };
    }

    // Note: Legacy points check would happen in server.js before calling this
    // Here we just apply the effect

    switch (purchase.type) {
      case 'heal_raid':
        Array.from(this.players.values()).forEach(p => {
          if (p.alive) {
            const healing = Math.floor(p.maxHp * 0.25);
            p.hp = Math.min(p.maxHp, p.hp + healing);
          }
        });
        this.addCombatLog(`${player.name} used ${buff.cost} Legacy Points to heal the raid!`);
        return { success: true, effect: buff.effect, cost: buff.cost };
        
      case 'revive_player':
        const deadPlayers = Array.from(this.players.values()).filter(p => !p.alive);
        if (deadPlayers.length > 0) {
          const revived = deadPlayers[0];
          revived.alive = true;
          revived.hp = Math.floor(revived.maxHp * 0.5);
          this.addCombatLog(`${player.name} used ${buff.cost} Legacy Points to revive ${revived.name}!`);
          return { success: true, effect: `${revived.name} revived at 50% HP`, cost: buff.cost };
        }
        return { success: false, message: 'No dead players to revive' };
        
      case 'damage_boost':
        this.damageBoostActive = true;
        this.damageBoostExpiry = Date.now() + 120000; // 2 minutes
        this.addCombatLog(`${player.name} used ${buff.cost} Legacy Points for a damage boost!`);
        return { success: true, effect: buff.effect, cost: buff.cost };
        
      case 'shield_raid':
        this.shieldActive = true;
        this.shieldExpiry = Date.now() + 60000; // 1 minute
        this.addCombatLog(`${player.name} used ${buff.cost} Legacy Points for a raid shield!`);
        return { success: true, effect: buff.effect, cost: buff.cost };
        
      default:
        return { success: false, message: 'Unknown buff type' };
    }
  }



  isComplete() {
    return this.status === 'completed';
  }

  isWiped() {
    return Array.from(this.players.values()).every(p => !p.alive);
  }

  getCompletionStats() {
    return {
      completionTime: Date.now() - this.startTime,
      totalDeaths: Array.from(this.players.values()).reduce((sum, p) => sum + p.deaths, 0),
      totalDamage: Array.from(this.players.values()).reduce((sum, p) => sum + p.damage, 0),
      totalHealing: Array.from(this.players.values()).reduce((sum, p) => sum + p.healing, 0),
      playerStats: Array.from(this.players.values()).map(p => ({
        name: p.name,
        damage: p.damage,
        healing: p.healing,
        deaths: p.deaths
      }))
    };
  }

  calculateRewards() {
    const baseRewards = this.raid.rewards;
    const multiplier = this.getDifficultyMultiplier();
    
    return {
      gold: Math.floor(baseRewards.gold * multiplier),
      experience: Math.floor(baseRewards.experience * multiplier),
      items: baseRewards.items || [],
      uniqueLoot: baseRewards.unique_loot || [],
      raidTokens: baseRewards.raid_tokens || 0,
      titles: baseRewards.titles || []
    };
  }

  getDifficultyMultiplier() {
    const multipliers = {
      normal: 1.0,
      hard: 1.5,
      nightmare: 2.0,
      mythic: 3.0
    };
    return multipliers[this.difficulty] || 1.0;
  }

  checkAchievements() {
    const achievements = [];
    const stats = this.getCompletionStats();
    
    // Check raid-specific achievements
    if (this.raid.achievements) {
      this.raid.achievements.forEach(ach => {
        let earned = false;
        
        if (ach.requirement.includes('Defeat')) {
          earned = this.isComplete();
        }
        if (ach.requirement.includes('without any player deaths')) {
          earned = stats.totalDeaths === 0;
        }
        if (ach.requirement.includes('under')) {
          const timeLimit = parseInt(ach.requirement.match(/\d+/)[0]) * 60000;
          earned = stats.completionTime < timeLimit;
        }
        
        if (earned) {
          achievements.push(ach);
        }
      });
    }
    
    return achievements;
  }

  getState() {
    return {
      status: this.status,
      currentPhase: this.currentPhase,
      currentWave: this.currentWave,
      currentObjective: this.currentObjective,
      players: this.getPlayers(),
      boss: this.boss,
      enemies: this.enemies.filter(e => e.alive),
      mechanics: this.mechanics
    };
  }

  getCurrentPhase() {
    if (this.raid.waves) {
      return this.raid.waves[this.currentWave];
    } else if (this.raid.phases) {
      return this.raid.phases[this.currentPhase];
    } else if (this.raid.objectives) {
      return this.raid.objectives[this.currentObjective];
    }
    return null;
  }

  getCurrentBoss() {
    return this.boss;
  }

  getActiveMechanics() {
    return this.mechanics;
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  getTimeElapsed() {
    return Date.now() - this.startTime;
  }

  getVotingTimeRemaining() {
    if (!this.viewerVoting) return 0;
    return Math.max(0, this.viewerVoting.endTime - Date.now());
  }

  addCombatLog(message) {
    this.combatLog.push({
      timestamp: Date.now(),
      message
    });
    
    // Keep last 100 entries
    if (this.combatLog.length > 100) {
      this.combatLog.shift();
    }
  }

  getCombatLog(count = 10) {
    return this.combatLog.slice(-count);
  }
}

module.exports = RaidManager;
