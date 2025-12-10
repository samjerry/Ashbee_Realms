/**
 * OperatorManager.js
 * Manages operator commands and permissions for streamers and moderators
 */

class OperatorManager {
  constructor() {
    // Permission levels
    this.PERMISSION_LEVELS = {
      CREATOR: 3,      // MarrowOfAlbion - full access
      STREAMER: 2,     // Channel broadcaster - most commands
      MODERATOR: 1,    // Channel moderators - basic commands
      NONE: 0          // Regular users
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
   * @param {string} userRole - User's role from database ('viewer', 'vip', 'moderator', 'streamer')
   * @returns {number} Permission level
   */
  getPermissionLevel(username, channelName, userRole = 'viewer') {
    // Creator always has full access
    if (username.toLowerCase() === 'marrowofalibion') {
      return this.PERMISSION_LEVELS.CREATOR;
    }

    // Convert database role to permission level
    switch (userRole.toLowerCase()) {
      case 'streamer':
        return this.PERMISSION_LEVELS.STREAMER;
      case 'moderator':
        return this.PERMISSION_LEVELS.MODERATOR;
      case 'vip':
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

    if (permissionLevel >= this.PERMISSION_LEVELS.MODERATOR) {
      commands.push(...this.COMMANDS.MODERATOR);
    }

    if (permissionLevel >= this.PERMISSION_LEVELS.STREAMER) {
      commands.push(...this.COMMANDS.STREAMER);
    }

    if (permissionLevel >= this.PERMISSION_LEVELS.CREATOR) {
      commands.push(...this.COMMANDS.CREATOR);
    }

    return commands;
  }

  /**
   * Execute: Give item to player
   */
  async giveItem(targetPlayerId, channelName, itemId, quantity = 1, db) {
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const inventory = JSON.parse(progress.inventory || '[]');
    
    // Add item to inventory
    for (let i = 0; i < quantity; i++) {
      inventory.push(itemId);
    }

    await db.query(
      'UPDATE player_progress SET inventory = $1 WHERE player_id = $2 AND channel_name = $3',
      [JSON.stringify(inventory), targetPlayerId, channelName]
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
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newGold = (progress.gold || 0) + amount;

    await db.query(
      'UPDATE player_progress SET gold = $1 WHERE player_id = $2 AND channel_name = $3',
      [newGold, targetPlayerId, channelName]
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
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newXp = (progress.xp || 0) + amount;
    let newLevel = progress.level || 1;
    let xpToNext = progress.xp_to_next || 100;

    // Simple level up logic (would use ProgressionManager in real implementation)
    while (newXp >= xpToNext && newLevel < 100) {
      newLevel++;
      xpToNext = Math.floor(xpToNext * 1.5);
    }

    await db.query(
      'UPDATE player_progress SET xp = $1, level = $2, xp_to_next = $3 WHERE player_id = $4 AND channel_name = $5',
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
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    await db.query(
      'UPDATE player_progress SET hp = max_hp WHERE player_id = $1 AND channel_name = $2',
      [targetPlayerId, channelName]
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
      'UPDATE player_progress SET inventory = $1 WHERE player_id = $2 AND channel_name = $3',
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
    const progress = await db.loadPlayerProgress(targetPlayerId, channelName);
    if (!progress) throw new Error('Player not found');

    const newGold = Math.max(0, (progress.gold || 0) - amount);

    await db.query(
      'UPDATE player_progress SET gold = $1 WHERE player_id = $2 AND channel_name = $3',
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

    const newLevel = Math.max(1, (progress.level || 1) - levels);
    const xpToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1));

    await db.query(
      'UPDATE player_progress SET level = $1, xp = 0, xp_to_next = $2 WHERE player_id = $3 AND channel_name = $4',
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

    const newLevel = Math.max(1, Math.min(100, level));
    const xpToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1));

    await db.query(
      'UPDATE player_progress SET level = $1, xp = 0, xp_to_next = $2 WHERE player_id = $3 AND channel_name = $4',
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
      'UPDATE player_progress SET location = $1, in_combat = false, combat = NULL WHERE player_id = $2 AND channel_name = $3',
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
      'UPDATE player_progress SET inventory = $1 WHERE player_id = $2 AND channel_name = $3',
      [JSON.stringify([]), targetPlayerId, channelName]
    );

    return {
      success: true,
      message: `Cleared inventory for ${progress.name}`
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
      }
    };
  }
}

module.exports = OperatorManager;
