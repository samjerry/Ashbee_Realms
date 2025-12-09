/**
 * LeaderboardManager.js
 * 
 * Manages competitive leaderboards for various player achievements.
 * Tracks rankings for level, wealth, dungeon speed, boss kills, and more.
 */

class LeaderboardManager {
  constructor() {
    this.leaderboards = {
      level: [],
      wealth: [],
      dungeonSpeed: [],
      bossKills: [],
      achievementPoints: [],
      seasonLevel: [],
      seasonCurrency: []
    };
  }

  /**
   * Update player entry in leaderboard
   * @param {string} type - Leaderboard type
   * @param {Object} playerData - Player data
   */
  updateLeaderboard(type, playerData) {
    if (!this.leaderboards[type]) {
      console.error(`❌ Unknown leaderboard type: ${type}`);
      return;
    }

    const { playerId, playerName, value, timestamp, metadata } = playerData;

    // Find existing entry
    const existingIndex = this.leaderboards[type].findIndex(entry => entry.playerId === playerId);

    if (existingIndex !== -1) {
      // Update existing entry if new value is better
      const existing = this.leaderboards[type][existingIndex];
      
      // For speed-based leaderboards, lower is better
      if (type === 'dungeonSpeed') {
        if (value < existing.value) {
          this.leaderboards[type][existingIndex] = {
            ...existing,
            value,
            timestamp: timestamp || new Date().toISOString(),
            metadata: { ...existing.metadata, ...metadata }
          };
        }
      } else {
        // For most leaderboards, higher is better
        if (value > existing.value) {
          this.leaderboards[type][existingIndex] = {
            ...existing,
            value,
            timestamp: timestamp || new Date().toISOString(),
            metadata: { ...existing.metadata, ...metadata }
          };
        }
      }
    } else {
      // Add new entry
      this.leaderboards[type].push({
        playerId,
        playerName,
        value,
        timestamp: timestamp || new Date().toISOString(),
        metadata: metadata || {}
      });
    }

    // Sort leaderboard
    this.sortLeaderboard(type);

    // Keep only top 1000 entries
    if (this.leaderboards[type].length > 1000) {
      this.leaderboards[type] = this.leaderboards[type].slice(0, 1000);
    }
  }

  /**
   * Sort leaderboard by value
   * @param {string} type - Leaderboard type
   */
  sortLeaderboard(type) {
    if (type === 'dungeonSpeed') {
      // For speed, lower is better
      this.leaderboards[type].sort((a, b) => a.value - b.value);
    } else {
      // For most stats, higher is better
      this.leaderboards[type].sort((a, b) => b.value - a.value);
    }
  }

  /**
   * Get leaderboard rankings
   * @param {string} type - Leaderboard type
   * @param {number} limit - Number of entries to return
   * @param {number} offset - Offset for pagination
   * @returns {Array} Leaderboard entries with ranks
   */
  getLeaderboard(type, limit = 100, offset = 0) {
    if (!this.leaderboards[type]) {
      return { error: 'Unknown leaderboard type', validTypes: Object.keys(this.leaderboards) };
    }

    const entries = this.leaderboards[type]
      .slice(offset, offset + limit)
      .map((entry, index) => ({
        rank: offset + index + 1,
        ...entry
      }));

    return {
      type,
      total: this.leaderboards[type].length,
      limit,
      offset,
      entries
    };
  }

  /**
   * Get player's rank in leaderboard
   * @param {string} type - Leaderboard type
   * @param {string} playerId - Player ID
   * @returns {Object} Player's rank and position
   */
  getPlayerRank(type, playerId) {
    if (!this.leaderboards[type]) {
      return { error: 'Unknown leaderboard type' };
    }

    const index = this.leaderboards[type].findIndex(entry => entry.playerId === playerId);

    if (index === -1) {
      return {
        type,
        playerId,
        ranked: false,
        message: 'Player not on leaderboard'
      };
    }

    const entry = this.leaderboards[type][index];
    const total = this.leaderboards[type].length;

    return {
      type,
      playerId,
      playerName: entry.playerName,
      rank: index + 1,
      value: entry.value,
      total,
      percentile: Math.round(((total - index) / total) * 100),
      timestamp: entry.timestamp,
      metadata: entry.metadata
    };
  }

  /**
   * Get player's rank across all leaderboards
   * @param {string} playerId - Player ID
   * @returns {Object} All rankings
   */
  getPlayerAllRanks(playerId) {
    const rankings = {};

    for (const type of Object.keys(this.leaderboards)) {
      const rank = this.getPlayerRank(type, playerId);
      if (!rank.error && rank.ranked !== false) {
        rankings[type] = {
          rank: rank.rank,
          value: rank.value,
          total: rank.total,
          percentile: rank.percentile
        };
      }
    }

    return {
      playerId,
      rankings,
      totalLeaderboards: Object.keys(rankings).length
    };
  }

  /**
   * Get top N players from leaderboard
   * @param {string} type - Leaderboard type
   * @param {number} count - Number of top players
   * @returns {Array} Top players
   */
  getTopPlayers(type, count = 10) {
    if (!this.leaderboards[type]) {
      return { error: 'Unknown leaderboard type' };
    }

    const topPlayers = this.leaderboards[type]
      .slice(0, count)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

    return {
      type,
      count,
      players: topPlayers
    };
  }

  /**
   * Update player level on leaderboard
   * @param {Object} character - Character object
   */
  updateLevelLeaderboard(character) {
    this.updateLeaderboard('level', {
      playerId: character.userId || character.id,
      playerName: character.name || character.username,
      value: character.level,
      metadata: {
        class: character.class,
        prestige: character.prestige || 0
      }
    });
  }

  /**
   * Update player wealth on leaderboard
   * @param {Object} character - Character object
   */
  updateWealthLeaderboard(character) {
    this.updateLeaderboard('wealth', {
      playerId: character.userId || character.id,
      playerName: character.name || character.username,
      value: character.gold,
      metadata: {
        level: character.level,
        class: character.class
      }
    });
  }

  /**
   * Update dungeon speed record
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name
   * @param {string} dungeonId - Dungeon ID
   * @param {number} completionTime - Time in seconds
   */
  updateDungeonSpeedLeaderboard(playerId, playerName, dungeonId, completionTime) {
    // Create per-dungeon leaderboard if it doesn't exist
    const leaderboardKey = `dungeonSpeed_${dungeonId}`;
    if (!this.leaderboards[leaderboardKey]) {
      this.leaderboards[leaderboardKey] = [];
    }

    this.updateLeaderboard(leaderboardKey, {
      playerId,
      playerName,
      value: completionTime,
      metadata: { dungeonId }
    });

    // Also update global best speed
    this.updateLeaderboard('dungeonSpeed', {
      playerId,
      playerName,
      value: completionTime,
      metadata: { dungeonId }
    });
  }

  /**
   * Update boss kills leaderboard
   * @param {Object} character - Character object
   * @param {number} bossKills - Total boss kills
   */
  updateBossKillsLeaderboard(character, bossKills) {
    this.updateLeaderboard('bossKills', {
      playerId: character.userId || character.id,
      playerName: character.name || character.username,
      value: bossKills,
      metadata: {
        level: character.level,
        class: character.class
      }
    });
  }

  /**
   * Update achievement points leaderboard
   * @param {Object} character - Character object
   * @param {number} points - Total achievement points
   */
  updateAchievementPointsLeaderboard(character, points) {
    this.updateLeaderboard('achievementPoints', {
      playerId: character.userId || character.id,
      playerName: character.name || character.username,
      value: points,
      metadata: {
        level: character.level,
        achievementsUnlocked: character.achievements?.length || 0
      }
    });
  }

  /**
   * Update season level leaderboard
   * @param {Object} character - Character object
   * @param {number} seasonLevel - Season level
   */
  updateSeasonLevelLeaderboard(character, seasonLevel) {
    this.updateLeaderboard('seasonLevel', {
      playerId: character.userId || character.id,
      playerName: character.name || character.username,
      value: seasonLevel,
      metadata: {
        level: character.level,
        class: character.class
      }
    });
  }

  /**
   * Update season currency leaderboard
   * @param {Object} character - Character object
   * @param {number} seasonCurrency - Season currency amount
   */
  updateSeasonCurrencyLeaderboard(character, seasonCurrency) {
    this.updateLeaderboard('seasonCurrency', {
      playerId: character.userId || character.id,
      playerName: character.name || character.username,
      value: seasonCurrency,
      metadata: {
        seasonLevel: character.seasonProgress?.seasonLevel || 0
      }
    });
  }

  /**
   * Get nearby players (players ranked close to target player)
   * @param {string} type - Leaderboard type
   * @param {string} playerId - Player ID
   * @param {number} range - Number of players above/below
   * @returns {Object} Nearby players
   */
  getNearbyPlayers(type, playerId, range = 5) {
    if (!this.leaderboards[type]) {
      return { error: 'Unknown leaderboard type' };
    }

    const playerRank = this.getPlayerRank(type, playerId);
    if (playerRank.error || playerRank.ranked === false) {
      return { error: 'Player not ranked' };
    }

    const startIndex = Math.max(0, playerRank.rank - 1 - range);
    const endIndex = Math.min(this.leaderboards[type].length, playerRank.rank + range);

    const nearbyPlayers = this.leaderboards[type]
      .slice(startIndex, endIndex)
      .map((entry, index) => ({
        rank: startIndex + index + 1,
        isPlayer: entry.playerId === playerId,
        ...entry
      }));

    return {
      type,
      playerRank: playerRank.rank,
      range,
      players: nearbyPlayers
    };
  }

  /**
   * Get leaderboard summary statistics
   * @param {string} type - Leaderboard type
   * @returns {Object} Statistics
   */
  getLeaderboardStats(type) {
    if (!this.leaderboards[type]) {
      return { error: 'Unknown leaderboard type' };
    }

    const entries = this.leaderboards[type];
    if (entries.length === 0) {
      return { type, total: 0, message: 'No entries yet' };
    }

    const values = entries.map(e => e.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const median = values[Math.floor(values.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      type,
      total: entries.length,
      average: Math.round(average * 100) / 100,
      median,
      min,
      max,
      topPlayer: entries[0]?.playerName,
      topValue: entries[0]?.value
    };
  }

  /**
   * Reset seasonal leaderboards (for season end)
   * @returns {Object} Reset result
   */
  resetSeasonalLeaderboards() {
    const seasonalTypes = ['seasonLevel', 'seasonCurrency'];
    const archived = {};

    for (const type of seasonalTypes) {
      // Archive current standings
      archived[type] = [...this.leaderboards[type]];
      // Reset leaderboard
      this.leaderboards[type] = [];
    }

    return {
      success: true,
      message: 'Seasonal leaderboards reset',
      archived,
      archivedCount: Object.values(archived).reduce((sum, arr) => sum + arr.length, 0)
    };
  }

  /**
   * Reset all leaderboards (admin function)
   * @returns {Object} Reset result
   */
  resetAllLeaderboards() {
    const archived = { ...this.leaderboards };
    
    for (const type of Object.keys(this.leaderboards)) {
      this.leaderboards[type] = [];
    }

    return {
      success: true,
      message: 'All leaderboards reset',
      archived,
      typesReset: Object.keys(archived).length
    };
  }

  /**
   * Get available leaderboard types
   * @returns {Array} List of leaderboard types
   */
  getAvailableLeaderboards() {
    return Object.keys(this.leaderboards).map(type => ({
      type,
      description: this.getLeaderboardDescription(type),
      totalEntries: this.leaderboards[type].length,
      sortOrder: type === 'dungeonSpeed' ? 'ascending' : 'descending'
    }));
  }

  /**
   * Get description for leaderboard type
   * @param {string} type - Leaderboard type
   * @returns {string} Description
   */
  getLeaderboardDescription(type) {
    const descriptions = {
      level: 'Highest character level',
      wealth: 'Most gold accumulated',
      dungeonSpeed: 'Fastest dungeon completion (any dungeon)',
      bossKills: 'Most boss kills',
      achievementPoints: 'Most achievement points earned',
      seasonLevel: 'Highest seasonal level',
      seasonCurrency: 'Most seasonal currency earned'
    };

    return descriptions[type] || 'Custom leaderboard';
  }
}

module.exports = LeaderboardManager;
