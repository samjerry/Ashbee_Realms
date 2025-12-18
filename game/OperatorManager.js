/**
 * OperatorManager.js
 * Manages operator commands and permissions for streamers and moderators
 */

// Game constants (should match main game configuration)
const GAME_CONSTANTS = {
  MAX_LEVEL: 100,
  MIN_LEVEL: 1,
  BASE_XP_TO_NEXT: 100,
  XP_MULTIPLIER: 1.5,
  COMMON_ITEMS: ['Health Potion', 'Mana Potion', 'Elixir', 'Phoenix Feather', 'Bread', 'Cheese']
};

class OperatorManager {
  constructor() {
    // Permission levels
    this.PERMISSION_LEVELS = {
      CREATOR: 3,      // MarrowOfAlbion - full access
      STREAMER: 2,     // Channel broadcaster - most commands
      MODERATOR: 1,    // Channel moderators - basic commands
      NONE: 0          // Regular users (including VIP, Subscriber, Tester - these are cosmetic roles only)
    };

    // Define which commands are available at each permission level
    this.COMMANDS = {
      // Moderator level commands (basic)
      MODERATOR: [
        'giveItem',
        'giveGold',
        'giveExp',
        'healPlayer',
        'changeWeather',
        'changeTime',
        'spawnEncounter',
        'teleportPlayer'
      ],
      
      // Streamer level commands (advanced)
      STREAMER: [
        'removeItem',
        'removeGold',
        'removeLevel',
        'changeSeason',
        'setPlayerLevel',
        'clearInventory',
        'resetQuest',
        'forceEvent',
        'setPlayerStats',
        'giveAllItems',
        'unlockAchievement'
      ],
      
      // Creator level commands (dangerous/system)
      CREATOR: [
        'deleteCharacter',
        'wipeProgress',
        'grantOperator',
        'revokeOperator',
        'systemBroadcast',
        'maintenanceMode'
      ]
    };
  }

  /**
   * Check if a user has operator permissions
   * @param {string} username - Twitch username
   * @param {string} channelName - Channel name
   * @param {string} userRole - User's role from database ('viewer', 'vip', 'subscriber', 'tester', 'moderator', 'streamer', 'creator')
   * @returns {number} Permission level
   * 
   * NOTE: VIP, Subscriber, and Tester roles are COSMETIC ONLY and grant NO operator permissions.
   * They may provide in-game bonuses (e.g., bonus XP, gold, items) but cannot execute operator commands.
   */
  getPermissionLevel(username, channelName, userRole = 'viewer') {
    // Creator role from database (MarrowOfAlbion or anyone granted creator)
    if (userRole.toLowerCase() === 'creator') {
      return this.PERMISSION_LEVELS.CREATOR;
    }
    
    // Creator always has full access (fallback username check)
    if (username.toLowerCase() === 'marrowofalbion') {
      return this.PERMISSION_LEVELS.CREATOR;
    }

    // Convert database role to permission level
    switch (userRole.toLowerCase()) {
      case 'streamer':
        return this.PERMISSION_LEVELS.STREAMER;
      case 'moderator':
        return this.PERMISSION_LEVELS.MODERATOR;
      case 'vip':
      case 'subscriber':
      case 'tester':
      case 'viewer':
      default:
        return this.PERMISSION_LEVELS.NONE;
    }
  }

  /**
   * Check if user can execute a command
   * @param {string} commandName - Name of the command
   * @param {number} permissionLevel - User's permission level
   * @returns {boolean} Whether user can execute command
   */
  canExecuteCommand(commandName, permissionLevel) {
    if (permissionLevel >= this.PERMISSION_LEVELS.CREATOR) {
      return true; // Creator can do everything
    }

    if (permissionLevel >= this.PERMISSION_LEVELS.STREAMER) {
      // Streamer can do moderator + streamer commands
      return this.COMMANDS.MODERATOR.includes(commandName) || 
             this.COMMANDS.STREAMER.includes(commandName);
    }

    if (permissionLevel >= this.PERMISSION_LEVELS.MODERATOR) {
      // Moderator can only do moderator commands
      return this.COMMANDS.MODERATOR.includes(commandName);
    }

    return false;
  }

  /**
   * Get all available commands for a permission level
   * @param {number} permissionLevel - User's permission level
   * @returns {array} List of available commands
   */
  getAvailableCommands(permissionLevel) {
    const commands = [];

    console.log(`[OperatorManager] Getting available commands for permission level: ${permissionLevel}`);
    console.log(`[OperatorManager] MODERATOR level = ${this.PERMISSION_LEVELS.MODERATOR}`);
    console.log(`[OperatorManager] STREAMER level = ${this.PERMISSION_LEVELS.STREAMER}`);
    console.log(`[OperatorManager] CREATOR level = ${this.PERMISSION_LEVELS.CREATOR}`);

    if (permissionLevel >= this.PERMISSION_LEVELS.MODERATOR) {
      console.log(`[OperatorManager] Adding MODERATOR commands:`, this.COMMANDS.MODERATOR);
      commands.push(...this.COMMANDS.MODERATOR);
    }

    if (permissionLevel >= this.PERMISSION_LEVELS.STREAMER) {
      console.log(`[OperatorManager] Adding STREAMER commands:`, this.COMMANDS.STREAMER);
      commands.push(...this.COMMANDS.STREAMER);
    }

    if (permissionLevel >= this.PERMISSION_LEVELS.CREATOR) {
      console.log(`[OperatorManager] Adding CREATOR commands:`, this.COMMANDS.CREATOR);
      commands.push(...this.COMMANDS.CREATOR);
    }

    console.log(`[OperatorManager] Total commands available: ${commands.length}`, commands);
    return commands;
  }

  /**
   * Execute: Give item to player
   */
  async giveItem(targetPlayerId, channelName, itemId, quantity = 1, db) {
    const table = db.getPlayerTable(channelName);
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const inventory = JSON.parse(progress.inventory || '[]');
    
    // Add item to inventory
    for (let i = 0; i < quantity; i++) {
      inventory.push(itemId);
    }

    await db.query(
      `UPDATE ${table} SET inventory = $1 WHERE player_id = $2`,
      [JSON.stringify(inventory), targetPlayerId]
    );

    return {
      success: true,
      message: `Gave ${quantity}x ${itemId} to ${progress.name}`
    };
  }

  /**
   * Execute: Give gold to player
   */
  async giveGold(targetPlayerId, channelName, amount, db) {
    const table = db.getPlayerTable(channelName);
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newGold = (progress.gold || 0) + amount;

    await db.query(
      `UPDATE ${table} SET gold = $1 WHERE player_id = $2`,
      [newGold, targetPlayerId]
    );

    return {
      success: true,
      message: `Gave ${amount} gold to ${progress.name} (now has ${newGold})`
    };
  }

  /**
   * Execute: Give experience to player
   */
  async giveExp(targetPlayerId, channelName, amount, db) {
    const table = db.getPlayerTable(channelName);
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newXp = (progress.xp || 0) + amount;
    let newLevel = progress.level || 1;
    let xpToNext = progress.xp_to_next || GAME_CONSTANTS.BASE_XP_TO_NEXT;

    // Simple level up logic (would use ProgressionManager in real implementation)
    while (newXp >= xpToNext && newLevel < GAME_CONSTANTS.MAX_LEVEL) {
      newLevel++;
      xpToNext = Math.floor(xpToNext * GAME_CONSTANTS.XP_MULTIPLIER);
    }

    await db.query(
      'UPDATE ${table} SET xp = $1, level = $2, xp_to_next = $3 WHERE player_id = $4 AND channel_name = $5',
      [newXp, newLevel, xpToNext, targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Gave ${amount} XP to ${progress.name} (Level ${newLevel})`
    };
  }

  /**
   * Execute: Heal player to full HP
   */
  async healPlayer(targetPlayerId, channelName, db) {
    const table = db.getPlayerTable(channelName);
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    await db.query(
      `UPDATE ${table} SET hp = max_hp WHERE player_id = $1`,
      [targetPlayerId]
    );

    return {
      success: true,
      message: `Healed ${progress.name} to full HP (${progress.max_hp})`
    };
  }

  /**
   * Execute: Remove item from player
   */
  async removeItem(targetPlayerId, channelName, itemId, quantity = 1, db) {
    const table = db.getPlayerTable(channelName);
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    let inventory = JSON.parse(progress.inventory || '[]');
    let removed = 0;

    // Remove items
    for (let i = 0; i < quantity; i++) {
      const index = inventory.indexOf(itemId);
      if (index > -1) {
        inventory.splice(index, 1);
        removed++;
      }
    }

    await db.query(
      'UPDATE ${table} SET inventory = $1 WHERE player_id = $2 AND channel_name = $3',
      [JSON.stringify(inventory), targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Removed ${removed}x ${itemId} from ${progress.name}`
    };
  }

  /**
   * Execute: Remove gold from player
   */
  async removeGold(targetPlayerId, channelName, amount, db) {
    const table = db.getPlayerTable(channelName);
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newGold = Math.max(0, (progress.gold || 0) - amount);

    await db.query(
      'UPDATE ${table} SET gold = $1 WHERE player_id = $2 AND channel_name = $3',
      [newGold, targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Removed ${amount} gold from ${progress.name} (now has ${newGold})`
    };
  }

  /**
   * Execute: Remove levels from player
   */
  async removeLevel(targetPlayerId, channelName, levels, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newLevel = Math.max(GAME_CONSTANTS.MIN_LEVEL, (progress.level || 1) - levels);
    const xpToNext = Math.floor(GAME_CONSTANTS.BASE_XP_TO_NEXT * Math.pow(GAME_CONSTANTS.XP_MULTIPLIER, newLevel - 1));

    await db.query(
      'UPDATE ${table} SET level = $1, xp = 0, xp_to_next = $2 WHERE player_id = $3',
      [newLevel, xpToNext, targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Removed ${levels} levels from ${progress.name} (now level ${newLevel})`
    };
  }

  /**
   * Execute: Set player level
   */
  async setPlayerLevel(targetPlayerId, channelName, level, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newLevel = Math.max(GAME_CONSTANTS.MIN_LEVEL, Math.min(GAME_CONSTANTS.MAX_LEVEL, level));
    const xpToNext = Math.floor(GAME_CONSTANTS.BASE_XP_TO_NEXT * Math.pow(GAME_CONSTANTS.XP_MULTIPLIER, newLevel - 1));

    await db.query(
      'UPDATE ${table} SET level = $1, xp = 0, xp_to_next = $2 WHERE player_id = $3',
      [newLevel, xpToNext, targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Set ${progress.name} to level ${newLevel}`
    };
  }

  /**
   * Execute: Teleport player to location
   */
  async teleportPlayer(targetPlayerId, channelName, location, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    await db.query(
      'UPDATE ${table} SET location = $1, in_combat = false, combat = NULL WHERE player_id = $2 AND channel_name = $3',
      [location, targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Teleported ${progress.name} to ${location}`
    };
  }

  /**
   * Execute: Clear player inventory
   */
  async clearInventory(targetPlayerId, channelName, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    await db.query(
      'UPDATE ${table} SET inventory = $1 WHERE player_id = $2 AND channel_name = $3',
      [JSON.stringify([]), targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Cleared inventory for ${progress.name}`
    };
  }

  /**
   * Execute: Change weather (global for channel)
   * This is stored in a global game state (would need a game_state table)
   */
  async changeWeather(channelName, weather, db) {
    const validWeather = ['Clear', 'Rain', 'Storm', 'Snow', 'Fog'];
    if (!validWeather.includes(weather)) {
      throw new Error(`Invalid weather. Must be one of: ${validWeather.join(', ')}`);
    }

    // Store global game state
    await db.query(
      `INSERT INTO game_state (channel_name, weather, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET weather = $2, last_updated = NOW()`,
      [channelName.toLowerCase(), weather]
    );

    return {
      success: true,
      message: `Changed weather to ${weather} for ${channelName}`
    };
  }

  /**
   * Execute: Change time of day (global for channel)
   */
  async changeTime(channelName, time, db) {
    const validTimes = ['Dawn', 'Day', 'Dusk', 'Night'];
    if (!validTimes.includes(time)) {
      throw new Error(`Invalid time. Must be one of: ${validTimes.join(', ')}`);
    }

    await db.query(
      `INSERT INTO game_state (channel_name, time_of_day, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET time_of_day = $2, last_updated = NOW()`,
      [channelName.toLowerCase(), time]
    );

    return {
      success: true,
      message: `Changed time to ${time} for ${channelName}`
    };
  }

  /**
   * Execute: Change season (global for channel)
   */
  async changeSeason(channelName, season, db) {
    const validSeasons = ['Spring', 'Summer', 'Fall', 'Winter'];
    if (!validSeasons.includes(season)) {
      throw new Error(`Invalid season. Must be one of: ${validSeasons.join(', ')}`);
    }

    await db.query(
      `INSERT INTO game_state (channel_name, season, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET season = $2, last_updated = NOW()`,
      [channelName.toLowerCase(), season]
    );

    return {
      success: true,
      message: `Changed season to ${season} for ${channelName}`
    };
  }

  /**
   * Execute: Spawn encounter for player
   */
  async spawnEncounter(targetPlayerId, channelName, encounterId, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    // Mark player as having a pending encounter
    const pending = {
      type: 'forced_encounter',
      encounterId: encounterId,
      timestamp: Date.now()
    };

    await db.query(
      'UPDATE ${table} SET pending = $1 WHERE player_id = $2 AND channel_name = $3',
      [JSON.stringify(pending), targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Spawned encounter ${encounterId} for ${progress.name}`
    };
  }

  /**
   * Execute: Reset quest for player
   */
  async resetQuest(targetPlayerId, channelName, questId, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    let activeQuests = JSON.parse(progress.active_quests || '[]');
    let completedQuests = JSON.parse(progress.completed_quests || '[]');

    // Remove from completed quests
    completedQuests = completedQuests.filter(q => q !== questId && q.id !== questId);
    
    // Remove from active quests
    activeQuests = activeQuests.filter(q => q.id !== questId);

    await db.query(
      'UPDATE ${table} SET active_quests = $1, completed_quests = $2 WHERE player_id = $3',
      [JSON.stringify(activeQuests), JSON.stringify(completedQuests), targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Reset quest ${questId} for ${progress.name}`
    };
  }

  /**
   * Execute: Force event (global for channel)
   */
  async forceEvent(channelName, eventId, db) {
    await db.query(
      `INSERT INTO game_state (channel_name, active_event, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET active_event = $2, last_updated = NOW()`,
      [channelName.toLowerCase(), eventId]
    );

    return {
      success: true,
      message: `Triggered event ${eventId} for ${channelName}`
    };
  }

  /**
   * Execute: Set player stats
   */
  async setPlayerStats(targetPlayerId, channelName, stats, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (stats.hp !== undefined) {
      updates.push(`hp = $${paramIndex++}`);
      params.push(Math.max(1, stats.hp));
    }
    if (stats.max_hp !== undefined) {
      updates.push(`max_hp = $${paramIndex++}`);
      params.push(Math.max(10, stats.max_hp));
    }
    if (stats.gold !== undefined) {
      updates.push(`gold = $${paramIndex++}`);
      params.push(Math.max(0, stats.gold));
    }

    if (updates.length === 0) {
      throw new Error('No valid stats provided');
    }

    params.push(targetPlayerId, channelName);
    
    await db.query(
      `UPDATE ${table} SET ${updates.join(', ')} WHERE player_id = $${paramIndex++} AND channel_name = $${paramIndex++}`,
      params
    );

    return {
      success: true,
      message: `Updated stats for ${progress.name}`
    };
  }

  /**
   * Execute: Give all items (debug command)
   */
  async giveAllItems(targetPlayerId, channelName, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    // Use common items from constants
    const inventory = JSON.parse(progress.inventory || '[]');
    inventory.push(...GAME_CONSTANTS.COMMON_ITEMS);

    await db.query(
      'UPDATE ${table} SET inventory = $1 WHERE player_id = $2 AND channel_name = $3',
      [JSON.stringify(inventory), targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Gave ${GAME_CONSTANTS.COMMON_ITEMS.length} items to ${progress.name}`
    };
  }

  /**
   * Execute: Unlock achievement
   */
  async unlockAchievement(targetPlayerId, channelName, achievementId, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    let unlockedAchievements = JSON.parse(progress.unlocked_achievements || '[]');
    
    if (!unlockedAchievements.includes(achievementId)) {
      unlockedAchievements.push(achievementId);
      
      await db.query(
        'UPDATE ${table} SET unlocked_achievements = $1 WHERE player_id = $2 AND channel_name = $3',
        [JSON.stringify(unlockedAchievements), targetPlayerId, channelName]
      );
      
      return {
        success: true,
        message: `Unlocked achievement ${achievementId} for ${progress.name}`
      };
    } else {
      return {
        success: true,
        message: `${progress.name} already has achievement ${achievementId}`
      };
    }
  }

  /**
   * Execute: Delete character (CREATOR only)
   */
  async deleteCharacter(targetPlayerId, channelName, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const table = db.getPlayerTable(channelName);
    await db.query(
      `DELETE FROM ${table} WHERE player_id = $1`,
      [targetPlayerId]
    );

    return {
      success: true,
      message: `Permanently deleted character ${progress.name}`
    };
  }

  /**
   * Execute: Wipe progress (CREATOR only)
   */
  async wipeProgress(targetPlayerId, channelName, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const table = db.getPlayerTable(channelName);
    // Reset to level 1 with fresh stats
    await db.query(
      `UPDATE ${table} SET 
        level = 1, 
        xp = 0, 
        xp_to_next = 10, 
        gold = 0, 
        inventory = $1,
        equipped = $2,
        active_quests = '[]',
        completed_quests = '[]',
        unlocked_achievements = '[]',
        stats = '{}',
        hp = 100,
        max_hp = 100
      WHERE player_id = $3`,
      [JSON.stringify(['Potion']), JSON.stringify({
        headgear: null, armor: null, legs: null, footwear: null,
        hands: null, cape: null, off_hand: null, amulet: null,
        ring1: null, ring2: null, belt: null, main_hand: null,
        relic1: null, relic2: null, relic3: null
      }), targetPlayerId]
    );

    return {
      success: true,
      message: `Wiped all progress for ${progress.name}`
    };
  }

  /**
   * Execute: Grant operator permissions (CREATOR only)
   */
  async grantOperator(targetPlayerId, channelName, level, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const validLevels = ['moderator', 'streamer'];
    const normalizedLevel = level.toLowerCase();
    
    if (!validLevels.includes(normalizedLevel)) {
      throw new Error('Invalid operator level. Must be MODERATOR or STREAMER');
    }

    // Update roles array to include the new role
    let roles = progress.roles || ['viewer'];
    if (!roles.includes(normalizedLevel)) {
      roles.push(normalizedLevel);
      roles = roles.filter(r => r !== 'viewer'); // Remove viewer if they have operator role
      
      const table = db.getPlayerTable(channelName);
      await db.query(
        `UPDATE ${table} SET roles = $1 WHERE player_id = $2`,
        [JSON.stringify(roles), targetPlayerId]
      );
    }

    return {
      success: true,
      message: `Granted ${normalizedLevel} permissions to ${progress.name}`
    };
  }

  /**
   * Execute: Revoke operator permissions (CREATOR only)
   */
  async revokeOperator(targetPlayerId, channelName, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    // Remove moderator and streamer roles
    let roles = progress.roles || ['viewer'];
    roles = roles.filter(r => r !== 'moderator' && r !== 'streamer');
    if (roles.length === 0) roles = ['viewer'];

    const table = db.getPlayerTable(channelName);
    await db.query(
      `UPDATE ${table} SET roles = $1 WHERE player_id = $2`,
      [JSON.stringify(roles), targetPlayerId]
    );

    return {
      success: true,
      message: `Revoked operator permissions from ${progress.name}`
    };
  }

  /**
   * Execute: System broadcast (CREATOR only)
   */
  async systemBroadcast(channelName, message, db) {
    // Store broadcast in game state
    await db.query(
      `INSERT INTO game_state (channel_name, last_broadcast, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET last_broadcast = $2, last_updated = NOW()`,
      [channelName.toLowerCase(), message]
    );

    return {
      success: true,
      message: `Broadcast sent to ${channelName}: "${message}"`
    };
  }

  /**
   * Execute: Maintenance mode (CREATOR only)
   */
  async maintenanceMode(channelName, enabled, db) {
    await db.query(
      `INSERT INTO game_state (channel_name, maintenance_mode, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET maintenance_mode = $2, last_updated = NOW()`,
      [channelName.toLowerCase(), enabled]
    );

    return {
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} for ${channelName}`
    };
  }

  /**
   * Get command metadata for UI
   */
  getCommandMetadata() {
    return {
      // Moderator commands
      giveItem: {
        name: 'Give Item',
        description: 'Give an item to a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'itemId', type: 'string', required: true },
          { name: 'quantity', type: 'number', default: 1 }
        ],
        level: 'MODERATOR'
      },
      giveGold: {
        name: 'Give Gold',
        description: 'Give gold to a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true }
        ],
        level: 'MODERATOR'
      },
      giveExp: {
        name: 'Give Experience',
        description: 'Give experience points to a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true }
        ],
        level: 'MODERATOR'
      },
      healPlayer: {
        name: 'Heal Player',
        description: 'Restore player to full HP',
        params: [
          { name: 'playerId', type: 'string', required: true }
        ],
        level: 'MODERATOR'
      },
      changeWeather: {
        name: 'Change Weather',
        description: 'Change the current weather',
        params: [
          { name: 'weather', type: 'select', options: ['Clear', 'Rain', 'Storm', 'Snow', 'Fog'], required: true }
        ],
        level: 'MODERATOR'
      },
      changeTime: {
        name: 'Change Time',
        description: 'Change the time of day',
        params: [
          { name: 'time', type: 'select', options: ['Dawn', 'Day', 'Dusk', 'Night'], required: true }
        ],
        level: 'MODERATOR'
      },
      spawnEncounter: {
        name: 'Spawn Encounter',
        description: 'Force a specific encounter for a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'encounterId', type: 'string', required: true }
        ],
        level: 'MODERATOR'
      },
      teleportPlayer: {
        name: 'Teleport Player',
        description: 'Teleport player to a location',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'location', type: 'string', required: true }
        ],
        level: 'MODERATOR'
      },

      // Streamer commands
      removeItem: {
        name: 'Remove Item',
        description: 'Remove an item from a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'itemId', type: 'string', required: true },
          { name: 'quantity', type: 'number', default: 1 }
        ],
        level: 'STREAMER'
      },
      removeGold: {
        name: 'Remove Gold',
        description: 'Remove gold from a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true }
        ],
        level: 'STREAMER'
      },
      removeLevel: {
        name: 'Remove Level',
        description: 'Remove levels from a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'levels', type: 'number', required: true }
        ],
        level: 'STREAMER'
      },
      changeSeason: {
        name: 'Change Season',
        description: 'Change the current season',
        params: [
          { name: 'season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter'], required: true }
        ],
        level: 'STREAMER'
      },
      setPlayerLevel: {
        name: 'Set Player Level',
        description: 'Set player to a specific level',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'level', type: 'number', required: true }
        ],
        level: 'STREAMER'
      },
      clearInventory: {
        name: 'Clear Inventory',
        description: 'Remove all items from player inventory',
        params: [
          { name: 'playerId', type: 'string', required: true }
        ],
        level: 'STREAMER'
      },
      resetQuest: {
        name: 'Reset Quest',
        description: 'Reset a quest for a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'questId', type: 'string', required: true }
        ],
        level: 'STREAMER'
      },
      forceEvent: {
        name: 'Force Event',
        description: 'Trigger a specific game event',
        params: [
          { name: 'eventId', type: 'string', required: true }
        ],
        level: 'STREAMER'
      },
      setPlayerStats: {
        name: 'Set Player Stats',
        description: 'Set specific stats for a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'stats', type: 'object', required: true }
        ],
        level: 'STREAMER'
      },
      giveAllItems: {
        name: 'Give All Items',
        description: 'Give player common items (debug)',
        params: [
          { name: 'playerId', type: 'string', required: true }
        ],
        level: 'STREAMER'
      },
      unlockAchievement: {
        name: 'Unlock Achievement',
        description: 'Unlock an achievement for a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'achievementId', type: 'string', required: true }
        ],
        level: 'STREAMER'
      },

      // Creator commands (dangerous/system)
      deleteCharacter: {
        name: 'Delete Character',
        description: '⚠️ DANGER: Permanently delete a player character',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'confirm', type: 'string', required: true, placeholder: 'Type DELETE to confirm' }
        ],
        level: 'CREATOR',
        dangerous: true
      },
      wipeProgress: {
        name: 'Wipe Progress',
        description: '⚠️ DANGER: Reset all progress for a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'confirm', type: 'string', required: true, placeholder: 'Type WIPE to confirm' }
        ],
        level: 'CREATOR',
        dangerous: true
      },
      grantOperator: {
        name: 'Grant Operator',
        description: 'Grant operator permissions to a player',
        params: [
          { name: 'playerId', type: 'string', required: true },
          { name: 'level', type: 'select', options: ['MODERATOR', 'STREAMER'], required: true }
        ],
        level: 'CREATOR'
      },
      revokeOperator: {
        name: 'Revoke Operator',
        description: 'Remove operator permissions from a player',
        params: [
          { name: 'playerId', type: 'string', required: true }
        ],
        level: 'CREATOR'
      },
      systemBroadcast: {
        name: 'System Broadcast',
        description: 'Send a system-wide message to all players',
        params: [
          { name: 'message', type: 'text', required: true }
        ],
        level: 'CREATOR'
      },
      maintenanceMode: {
        name: 'Maintenance Mode',
        description: 'Toggle maintenance mode for the game',
        params: [
          { name: 'enabled', type: 'select', options: ['true', 'false'], required: true }
        ],
        level: 'CREATOR'
      }
    };
  }
}

module.exports = OperatorManager;


