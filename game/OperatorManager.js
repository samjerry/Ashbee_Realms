/**
 * OperatorManager.js
 * Manages operator commands and permissions for streamers and moderators
 */

// Import required classes
const InventoryManager = require('./InventoryManager');
const EquipmentManager = require('./EquipmentManager');

// Game constants (should match main game configuration)
const GAME_CONSTANTS = {
  MAX_LEVEL: 100,
  MIN_LEVEL: 1,
  BASE_XP_TO_NEXT: 100,
  XP_MULTIPLIER: 1.5,
  COMMON_ITEMS: ['Health Potion', 'Mana Potion', 'Elixir', 'Phoenix Feather', 'Bread', 'Cheese'],
  DEFAULT_INVENTORY_SIZE: 30,
  DEFAULT_STARTING_ITEM: 'Health Potion'
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
   * Helper: Get player ID from name or ID
   * @param {string} playerNameOrId - Player name or ID
   * @param {string} channelName - Channel name
   * @param {object} db - Database instance
   * @returns {Promise<string>} Player ID
   */
  async getPlayerIdFromName(playerNameOrId, channelName, db) {
    // If it already looks like an ID (starts with 'twitch-'), return it
    if (playerNameOrId.startsWith('twitch-')) {
      return playerNameOrId;
    }

    // Otherwise, look up by name
    const table = db.getPlayerTable(channelName);
    const result = await db.query(
      `SELECT player_id FROM ${table} WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [playerNameOrId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Player '${playerNameOrId}' not found`);
    }

    return result.rows[0].player_id;
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
  async giveItem(playerNameOrId, channelName, itemId, quantity = 1, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Use Character class method to add items to inventory
    for (let i = 0; i < quantity; i++) {
      character.addToInventory(itemId);
    }
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Gave ${quantity}x ${itemId} to ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Give gold to player
   */
  async giveGold(playerNameOrId, channelName, amount, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Use Character class method to ensure proper stat updates
    character.addGold(amount);
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Gave ${amount} gold to ${character.name} (now has ${character.gold})`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Give experience to player
   */
  async giveExp(playerNameOrId, channelName, amount, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Use Character class method for proper XP/level logic
    const result = character.gainXP(amount);
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Gave ${amount} XP to ${character.name} (Level ${character.level})`,
      updatedCharacter: character.toFrontend(), // Return full updated data
      leveledUp: result.leveledUp
    };
  }

  /**
   * Execute: Heal player to full HP
   */
  async healPlayer(playerNameOrId, channelName, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Use Character class method to heal
    character.heal(character.maxHp);
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Healed ${character.name} to full HP (${character.maxHp})`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Remove item from player
   */
  async removeItem(playerNameOrId, channelName, itemId, quantity = 1, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Use Character class method to remove items
    let removed = 0;
    for (let i = 0; i < quantity; i++) {
      const result = character.removeFromInventory(itemId);
      if (result.success) removed++;
    }
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Removed ${removed}x ${itemId} from ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Remove gold from player
   */
  async removeGold(playerNameOrId, channelName, amount, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Calculate new gold value (cannot go below 0)
    const newGold = Math.max(0, character.gold - amount);
    character.gold = newGold;
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Removed ${amount} gold from ${character.name} (now has ${newGold})`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Remove levels from player
   */
  async removeLevel(playerNameOrId, channelName, levels, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    const newLevel = Math.max(GAME_CONSTANTS.MIN_LEVEL, character.level - levels);
    character.level = newLevel;
    character.xp = 0;
    character.xpToNext = Math.floor(GAME_CONSTANTS.BASE_XP_TO_NEXT * Math.pow(GAME_CONSTANTS.XP_MULTIPLIER, newLevel - 1));
    
    // Recalculate max HP based on new level
    const finalStats = character.getFinalStats();
    character.maxHp = finalStats.maxHp;
    character.hp = Math.min(character.hp, character.maxHp);
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Removed ${levels} levels from ${character.name} (now level ${newLevel})`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Set player level
   */
  async setPlayerLevel(playerNameOrId, channelName, level, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    const newLevel = Math.max(GAME_CONSTANTS.MIN_LEVEL, Math.min(GAME_CONSTANTS.MAX_LEVEL, level));
    character.level = newLevel;
    character.xp = 0;
    character.xpToNext = Math.floor(GAME_CONSTANTS.BASE_XP_TO_NEXT * Math.pow(GAME_CONSTANTS.XP_MULTIPLIER, newLevel - 1));
    
    // Recalculate max HP based on new level
    const finalStats = character.getFinalStats();
    character.maxHp = finalStats.maxHp;
    character.hp = character.maxHp; // Fully heal on level set
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Set ${character.name} to level ${newLevel}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Teleport player to location
   */
  async teleportPlayer(playerNameOrId, channelName, location, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    character.location = location;
    character.inCombat = false;
    character.combat = null;
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Teleported ${character.name} to ${location}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Clear player inventory
   */
  async clearInventory(playerNameOrId, channelName, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Clear inventory using Character class
    character.inventory = new InventoryManager([], GAME_CONSTANTS.DEFAULT_INVENTORY_SIZE);
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Cleared inventory for ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
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
  async spawnEncounter(playerNameOrId, channelName, encounterId, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Mark player as having a pending encounter
    character.pending = {
      type: 'forced_encounter',
      encounterId: encounterId,
      timestamp: Date.now()
    };
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Spawned encounter ${encounterId} for ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Reset quest for player
   */
  async resetQuest(playerNameOrId, channelName, questId, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    let activeQuests = character.activeQuests || [];
    let completedQuests = character.completedQuests || [];

    // Remove from completed quests
    completedQuests = completedQuests.filter(q => q !== questId && q.id !== questId);
    
    // Remove from active quests
    activeQuests = activeQuests.filter(q => q.id !== questId);

    character.activeQuests = activeQuests;
    character.completedQuests = completedQuests;
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Reset quest ${questId} for ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
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
  async setPlayerStats(playerNameOrId, channelName, stats, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    let updated = false;
    
    if (stats.hp !== undefined) {
      character.hp = Math.max(1, stats.hp);
      updated = true;
    }
    if (stats.max_hp !== undefined) {
      character.maxHp = Math.max(10, stats.max_hp);
      updated = true;
    }
    if (stats.gold !== undefined) {
      character.gold = Math.max(0, stats.gold);
      updated = true;
    }

    if (!updated) {
      throw new Error('No valid stats provided');
    }
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Updated stats for ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Give all items (debug command)
   */
  async giveAllItems(playerNameOrId, channelName, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Add common items to inventory using Character class
    GAME_CONSTANTS.COMMON_ITEMS.forEach(item => {
      character.addToInventory(item);
    });
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Gave ${GAME_CONSTANTS.COMMON_ITEMS.length} items to ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Unlock achievement
   */
  async unlockAchievement(playerNameOrId, channelName, achievementId, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    if (!character.unlockedAchievements.includes(achievementId)) {
      character.unlockedAchievements.push(achievementId);
      
      // Save using Character class
      await db.saveCharacter(targetPlayerId, channelName, character);
      
      return {
        success: true,
        message: `Unlocked achievement ${achievementId} for ${character.name}`,
        updatedCharacter: character.toFrontend() // Return full updated data
      };
    } else {
      return {
        success: true,
        message: `${character.name} already has achievement ${achievementId}`,
        updatedCharacter: character.toFrontend() // Return full updated data
      };
    }
  }

  /**
   * Execute: Delete character (CREATOR only)
   */
  async deleteCharacter(playerNameOrId, channelName, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
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
  async wipeProgress(playerNameOrId, channelName, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Reset character to level 1 with fresh stats
    character.level = 1;
    character.xp = 0;
    character.xpToNext = 100;
    character.gold = 0;
    character.hp = 100;
    character.maxHp = 100;
    character.activeQuests = [];
    character.completedQuests = [];
    character.unlockedAchievements = [];
    character.stats = {
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
    };
    
    // Reset inventory and equipment using Character classes
    character.inventory = new InventoryManager([GAME_CONSTANTS.DEFAULT_STARTING_ITEM], GAME_CONSTANTS.DEFAULT_INVENTORY_SIZE);
    character.equipment = new EquipmentManager({
      headgear: null, chest: null, legs: null, footwear: null,
      hands: null, cape: null, off_hand: null, amulet: null,
      ring1: null, ring2: null, belt: null, main_hand: null,
      relic1: null, relic2: null, relic3: null
    });
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Wiped all progress for ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Grant operator permissions (CREATOR only)
   */
  async grantOperator(playerNameOrId, channelName, level, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    const validLevels = ['moderator', 'streamer'];
    const normalizedLevel = level.toLowerCase();
    
    if (!validLevels.includes(normalizedLevel)) {
      throw new Error('Invalid operator level. Must be MODERATOR or STREAMER');
    }

    // Update roles array to include the new role
    let roles = character.roles || ['viewer'];
    if (!roles.includes(normalizedLevel)) {
      roles.push(normalizedLevel);
      roles = roles.filter(r => r !== 'viewer'); // Remove viewer if they have operator role
      character.roles = roles;
      
      // Save using Character class
      await db.saveCharacter(targetPlayerId, channelName, character);
    }

    return {
      success: true,
      message: `Granted ${normalizedLevel} permissions to ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
    };
  }

  /**
   * Execute: Revoke operator permissions (CREATOR only)
   */
  async revokeOperator(playerNameOrId, channelName, db) {
    const targetPlayerId = await this.getPlayerIdFromName(playerNameOrId, channelName, db);
    const character = await db.getCharacter(targetPlayerId, channelName);
    if (!character) throw new Error('Player not found');

    // Remove moderator and streamer roles
    let roles = character.roles || ['viewer'];
    roles = roles.filter(r => r !== 'moderator' && r !== 'streamer');
    if (roles.length === 0) roles = ['viewer'];
    character.roles = roles;
    
    // Save using Character class
    await db.saveCharacter(targetPlayerId, channelName, character);

    return {
      success: true,
      message: `Revoked operator permissions from ${character.name}`,
      updatedCharacter: character.toFrontend() // Return full updated data
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
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'itemId', type: 'string', required: true, placeholder: 'Item name' },
          { name: 'quantity', type: 'number', default: 1 }
        ],
        level: 'MODERATOR',
        category: 'PLAYER'
      },
      giveGold: {
        name: 'Give Gold',
        description: 'Give gold to a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'amount', type: 'number', required: true }
        ],
        level: 'MODERATOR',
        category: 'ECONOMY'
      },
      giveExp: {
        name: 'Give Experience',
        description: 'Give experience points to a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'amount', type: 'number', required: true }
        ],
        level: 'MODERATOR',
        category: 'PLAYER'
      },
      healPlayer: {
        name: 'Heal Player',
        description: 'Restore player to full HP',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' }
        ],
        level: 'MODERATOR',
        category: 'PLAYER'
      },
      changeWeather: {
        name: 'Change Weather',
        description: 'Change the current weather',
        params: [
          { name: 'weather', type: 'select', options: ['Clear', 'Rain', 'Storm', 'Snow', 'Fog'], required: true }
        ],
        level: 'MODERATOR',
        category: 'WORLD'
      },
      changeTime: {
        name: 'Change Time',
        description: 'Change the time of day',
        params: [
          { name: 'time', type: 'select', options: ['Dawn', 'Day', 'Dusk', 'Night'], required: true }
        ],
        level: 'MODERATOR',
        category: 'WORLD'
      },
      spawnEncounter: {
        name: 'Spawn Encounter',
        description: 'Force a specific encounter for a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'encounterId', type: 'string', required: true }
        ],
        level: 'MODERATOR',
        category: 'WORLD'
      },
      teleportPlayer: {
        name: 'Teleport Player',
        description: 'Teleport player to a location',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'location', type: 'string', required: true }
        ],
        level: 'MODERATOR',
        category: 'PLAYER'
      },

      // Streamer commands
      removeItem: {
        name: 'Remove Item',
        description: 'Remove an item from a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'itemId', type: 'string', required: true },
          { name: 'quantity', type: 'number', default: 1 }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      removeGold: {
        name: 'Remove Gold',
        description: 'Remove gold from a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'amount', type: 'number', required: true }
        ],
        level: 'STREAMER',
        category: 'ECONOMY'
      },
      removeLevel: {
        name: 'Remove Level',
        description: 'Remove levels from a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'levels', type: 'number', required: true }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      changeSeason: {
        name: 'Change Season',
        description: 'Change the current season',
        params: [
          { name: 'season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter'], required: true }
        ],
        level: 'STREAMER',
        category: 'WORLD'
      },
      setPlayerLevel: {
        name: 'Set Player Level',
        description: 'Set player to a specific level',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'level', type: 'number', required: true }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      clearInventory: {
        name: 'Clear Inventory',
        description: 'Remove all items from player inventory',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      resetQuest: {
        name: 'Reset Quest',
        description: 'Reset a quest for a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'questId', type: 'string', required: true }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      forceEvent: {
        name: 'Force Event',
        description: 'Trigger a specific game event',
        params: [
          { name: 'eventId', type: 'string', required: true }
        ],
        level: 'STREAMER',
        category: 'WORLD'
      },
      setPlayerStats: {
        name: 'Set Player Stats',
        description: 'Set specific stats for a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'stats', type: 'object', required: true, placeholder: '{hp: 100, max_hp: 150, gold: 500}' }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      giveAllItems: {
        name: 'Give All Items',
        description: 'Give player common items (debug)',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },
      unlockAchievement: {
        name: 'Unlock Achievement',
        description: 'Unlock an achievement for a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'achievementId', type: 'string', required: true }
        ],
        level: 'STREAMER',
        category: 'PLAYER'
      },

      // Creator commands (dangerous/system)
      deleteCharacter: {
        name: 'Delete Character',
        description: '⚠️ DANGER: Permanently delete a player character',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'confirm', type: 'string', required: true, placeholder: 'Type DELETE to confirm' }
        ],
        level: 'CREATOR',
        category: 'SYSTEM',
        dangerous: true
      },
      wipeProgress: {
        name: 'Wipe Progress',
        description: '⚠️ DANGER: Reset all progress for a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'confirm', type: 'string', required: true, placeholder: 'Type WIPE to confirm' }
        ],
        level: 'CREATOR',
        category: 'SYSTEM',
        dangerous: true
      },
      grantOperator: {
        name: 'Grant Operator',
        description: 'Grant operator permissions to a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' },
          { name: 'level', type: 'select', options: ['MODERATOR', 'STREAMER'], required: true }
        ],
        level: 'CREATOR',
        category: 'SYSTEM'
      },
      revokeOperator: {
        name: 'Revoke Operator',
        description: 'Remove operator permissions from a player',
        params: [
          { name: 'playerId', type: 'string', required: true, placeholder: 'Player name' }
        ],
        level: 'CREATOR',
        category: 'SYSTEM'
      },
      systemBroadcast: {
        name: 'System Broadcast',
        description: 'Send a system-wide message to all players',
        params: [
          { name: 'message', type: 'text', required: true }
        ],
        level: 'CREATOR',
        category: 'SYSTEM'
      },
      maintenanceMode: {
        name: 'Maintenance Mode',
        description: 'Toggle maintenance mode for the game',
        params: [
          { name: 'enabled', type: 'select', options: ['true', 'false'], required: true }
        ],
        level: 'CREATOR',
        category: 'SYSTEM'
      }
    };
  }

  /**
   * Execute operator command
   * Central dispatcher method that routes commands to appropriate handlers
   * @param {string} command - Command name
   * @param {object} params - Command parameters
   * @param {string} channelName - Channel name
   * @param {string} operatorName - Name of operator executing command
   * @param {number} permissionLevel - Operator's permission level
   * @returns {Promise<object>} Result object with success/error properties
   */
  async executeCommand(command, params, channelName, operatorName, permissionLevel) {
    try {
      // Validate permission level
      if (!this.canExecuteCommand(command, permissionLevel)) {
        return {
          success: false,
          error: 'Insufficient permissions for this command'
        };
      }

      // Get database instance
      const db = require('../db');

      // Route command to appropriate handler
      let result;
      switch (command) {
        // MODERATOR level commands
        case 'giveItem':
          result = await this.giveItem(
            params.playerId,
            channelName,
            params.itemId,
            params.quantity || 1,
            db
          );
          break;

        case 'giveGold':
          result = await this.giveGold(
            params.playerId,
            channelName,
            params.amount,
            db
          );
          break;

        case 'giveExp':
          result = await this.giveExp(
            params.playerId,
            channelName,
            params.amount,
            db
          );
          break;

        case 'healPlayer':
          result = await this.healPlayer(
            params.playerId,
            channelName,
            db
          );
          break;

        case 'changeWeather':
          result = await this.changeWeather(
            channelName,
            params.weather,
            db
          );
          break;

        case 'changeTime':
          result = await this.changeTime(
            channelName,
            params.time,
            db
          );
          break;

        case 'spawnEncounter':
          result = await this.spawnEncounter(
            params.playerId,
            channelName,
            params.encounterId,
            db
          );
          break;

        case 'teleportPlayer':
          result = await this.teleportPlayer(
            params.playerId,
            channelName,
            params.location,
            db
          );
          break;

        // STREAMER level commands
        case 'removeItem':
          result = await this.removeItem(
            params.playerId,
            channelName,
            params.itemId,
            params.quantity || 1,
            db
          );
          break;

        case 'removeGold':
          result = await this.removeGold(
            params.playerId,
            channelName,
            params.amount,
            db
          );
          break;

        case 'removeLevel':
          result = await this.removeLevel(
            params.playerId,
            channelName,
            params.levels,
            db
          );
          break;

        case 'changeSeason':
          result = await this.changeSeason(
            channelName,
            params.season,
            db
          );
          break;

        case 'setPlayerLevel':
          result = await this.setPlayerLevel(
            params.playerId,
            channelName,
            params.level,
            db
          );
          break;

        case 'clearInventory':
          result = await this.clearInventory(
            params.playerId,
            channelName,
            db
          );
          break;

        case 'resetQuest':
          result = await this.resetQuest(
            params.playerId,
            channelName,
            params.questId,
            db
          );
          break;

        case 'forceEvent':
          result = await this.forceEvent(
            channelName,
            params.eventId,
            db
          );
          break;

        case 'setPlayerStats':
          result = await this.setPlayerStats(
            params.playerId,
            channelName,
            params.stats,
            db
          );
          break;

        case 'giveAllItems':
          result = await this.giveAllItems(
            params.playerId,
            channelName,
            db
          );
          break;

        case 'unlockAchievement':
          result = await this.unlockAchievement(
            params.playerId,
            channelName,
            params.achievementId,
            db
          );
          break;

        // CREATOR level commands
        case 'deleteCharacter':
          if (params.confirm !== 'DELETE') {
            return {
              success: false,
              error: 'Confirmation required: type DELETE to confirm'
            };
          }
          result = await this.deleteCharacter(
            params.playerId,
            channelName,
            db
          );
          break;

        case 'wipeProgress':
          if (params.confirm !== 'WIPE') {
            return {
              success: false,
              error: 'Confirmation required: type WIPE to confirm'
            };
          }
          result = await this.wipeProgress(
            params.playerId,
            channelName,
            db
          );
          break;

        case 'grantOperator':
          result = await this.grantOperator(
            params.playerId,
            channelName,
            params.level,
            db
          );
          break;

        case 'revokeOperator':
          result = await this.revokeOperator(
            params.playerId,
            channelName,
            db
          );
          break;

        case 'systemBroadcast':
          result = await this.systemBroadcast(
            channelName,
            params.message,
            db
          );
          break;

        case 'maintenanceMode':
          result = await this.maintenanceMode(
            channelName,
            params.enabled === 'true' || params.enabled === true,
            db
          );
          break;

        default:
          return {
            success: false,
            error: `Unknown command: ${command}`
          };
      }

      return result;

    } catch (error) {
      console.error(`[OperatorManager] Error executing command ${command}:`, error);
      return {
        success: false,
        error: error.message || 'An error occurred while executing the command'
      };
    }
  }
}

module.exports = OperatorManager;


