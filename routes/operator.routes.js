const express = require('express');
const router = express.Router();
const db = require('../db');
const OperatorManager = require('../game/OperatorManager');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const socketHandler = require('../websocket/socketHandler');
const data = require('../data/data');

const operatorMgr = new OperatorManager();

// Rate limiting for operator commands
const operatorRateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 commands per minute

/**
 * Check rate limit for operator commands
 */
function checkOperatorRateLimit(userId) {
  const now = Date.now();
  const userLimit = operatorRateLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    operatorRateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Middleware to check operator permissions
 */
async function checkOperatorAccess(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const channel = req.body?.channel || req.query?.channel;
  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required' });
  }

  try {
    const userRole = await db.getUserRole(user.id, channel.toLowerCase());
    const permissionLevel = operatorMgr.getPermissionLevel(
      user.displayName,
      channel.toLowerCase(),
      userRole
    );

    if (permissionLevel === operatorMgr.PERMISSION_LEVELS.NONE) {
      return res.status(403).json({ error: 'Access denied: Operator permissions required' });
    }

    req.operatorLevel = permissionLevel;
    req.operatorRole = userRole;
    req.channelName = channel.toLowerCase();
    
    next();
  } catch (error) {
    console.error('Operator access check error:', error);
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
}

/**
 * GET /status
 * Check if user has operator access and get their permission level
 */
router.get('/status', async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.json({ hasAccess: false, level: 'NONE' });
  }

  const { channel } = req.query;
  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required' });
  }

  try {
    const userRole = await db.getUserRole(user.id, channel.toLowerCase());
    const permissionLevel = operatorMgr.getPermissionLevel(
      user.displayName,
      channel.toLowerCase(),
      userRole
    );

    const hasAccess = permissionLevel > operatorMgr.PERMISSION_LEVELS.NONE;
    const availableCommands = operatorMgr.getAvailableCommands(permissionLevel);
    
    let levelName = 'NONE';
    if (permissionLevel === operatorMgr.PERMISSION_LEVELS.CREATOR) levelName = 'CREATOR';
    else if (permissionLevel === operatorMgr.PERMISSION_LEVELS.STREAMER) levelName = 'STREAMER';
    else if (permissionLevel === operatorMgr.PERMISSION_LEVELS.MODERATOR) levelName = 'MODERATOR';

    res.json({
      hasAccess,
      level: levelName,
      role: userRole,
      availableCommands,
      username: user.displayName
    });
  } catch (error) {
    console.error('Operator status check error:', error);
    res.status(500).json({ error: 'Failed to check operator status' });
  }
});

/**
 * GET /commands
 * Get available operator commands with metadata
 */
router.get('/commands', checkOperatorAccess, (req, res) => {
  try {
    const metadata = operatorMgr.getCommandMetadata();
    const availableCommands = operatorMgr.getAvailableCommands(req.operatorLevel);
    
    const filtered = {};
    for (const cmd of availableCommands) {
      if (metadata[cmd]) {
        filtered[cmd] = metadata[cmd];
      }
    }

    res.json({ commands: filtered, level: req.operatorLevel });
  } catch (error) {
    console.error('Error fetching commands:', error);
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

/**
 * POST /execute
 * Execute an operator command
 * Body: { channel, command, params }
 */
router.post('/execute',
  checkOperatorAccess,
  validation.validateOperatorCommand,
  security.auditLog('operator_execute'),
  async (req, res) => {
    try {
      const { command, params } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      if (!checkOperatorRateLimit(req.session.user.id)) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: 'Too many operator commands. Please wait before trying again.'
        });
      }

      const result = await operatorMgr.executeCommand(
        command,
        params,
        req.channelName,
        req.session.user.displayName,
        req.operatorLevel
      );

      await db.logOperatorAction(
        req.session.user.id,
        req.channelName,
        command,
        params,
        result.success
      );

      // Emit WebSocket update if command successfully updated a character
      if (result.success && result.updatedCharacter) {
        const characterName = result.updatedCharacter.name;
        if (characterName) {
          console.log(`[Operator] Emitting WebSocket update for ${characterName} in ${req.channelName}`);
          socketHandler.emitPlayerUpdate(characterName, req.channelName, result.updatedCharacter);
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Error executing operator command:', error);
      
      await db.logOperatorAction(
        req.session.user.id,
        req.channelName,
        req.body.command,
        req.body.params,
        false,
        error.message
      );

      res.status(500).json({ 
        error: error.message || 'Failed to execute command',
        success: false
      });
    }
  }
);

/**
 * GET /players
 * Get list of players in a channel for operator commands
 */
router.get('/players', checkOperatorAccess, async (req, res) => {
  try {
    const table = db.getPlayerTable(req.channelName);
    const result = await db.query(
      `SELECT 
        player_id, 
        name, 
        level, 
        gold, 
        location, 
        hp, 
        max_hp,
        roles,
        name_color as "nameColor",
        selected_role_badge as "selectedRoleBadge"
       FROM ${table}
       ORDER BY level DESC, name ASC 
       LIMIT 100`
    );

    res.json({ players: result.rows });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * GET /audit-log
 * Get operator audit log for a channel
 */
router.get('/audit-log', checkOperatorAccess, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await db.getOperatorAuditLog(req.channelName, limit);
    
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /data/items
 * Get all available items (consumables and gear) for item selection
 */
router.get('/data/items', checkOperatorAccess, (req, res) => {
  try {
    const data = require('../data/data');
    const consumables = data.getItems();
    const gear = data.getGear();
    
    // Organize items by category and rarity
    const organized = {
      consumables: consumables,
      weapons: gear.main_hand || {},
      armor: gear.armor || {},
      headgear: gear.headgear || {},
      accessories: {}
    };
    
    // Merge accessories
    if (gear.ring) organized.accessories.rings = gear.ring;
    if (gear.amulet) organized.accessories.amulets = gear.amulet;
    if (gear.belt) organized.accessories.belts = gear.belt;
    if (gear.trinket) organized.accessories.trinkets = gear.trinket;
    if (gear.relic) organized.accessories.relics = gear.relic;
    
    res.json({ items: organized });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

/**
 * GET /data/player-inventory
 * Get a specific player's inventory with item details
 */
router.get('/data/player-inventory', checkOperatorAccess, async (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const character = await db.getCharacter(playerId, req.channelName);
    if (!character) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Get inventory with detailed item information
    const data = require('../data/data');
    // Ensure inventory is always an array
    let inventory = character.inventory || [];
    if (!Array.isArray(inventory)) {
      console.warn(`Player ${playerId} has non-array inventory, converting to array`);
      inventory = [];
    }
    
    // Count items and get details
    const itemCounts = {};
    inventory.forEach(itemId => {
      itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
    });
    
    const inventoryDetails = Object.entries(itemCounts).map(([itemId, quantity]) => {
      try {
        // Try to find item in consumables first
        let itemData = data.getItemById(itemId);
        
        // If not found, try gear
        if (!itemData) {
          itemData = data.getGearById(itemId);
        }
        
        return {
          id: itemId,
          quantity,
          name: itemData?.name || itemId,
          rarity: itemData?.rarity || 'common',
          description: itemData?.description || '',
          stats: itemData?.stats || null
        };
      } catch (itemError) {
        console.error(`Error loading item ${itemId}:`, itemError);
        return {
          id: itemId,
          quantity,
          name: itemId,
          rarity: 'common',
          description: 'Unknown item',
          stats: null
        };
      }
    });
    
    res.json({ 
      inventory: inventoryDetails,
      playerName: character.name
    });
  } catch (error) {
    console.error('Error fetching player inventory:', error);
    res.status(500).json({ error: 'Failed to fetch player inventory' });
  }
});

/**
 * GET /data/player-quests
 * Get a specific player's active and completed quests
 */
router.get('/data/player-quests', checkOperatorAccess, async (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const character = await db.getCharacter(playerId, req.channelName);
    if (!character) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const data = require('../data/data');
    const allQuests = data.getQuests();
    
    const activeQuests = (character.active_quests || []).map(questId => {
      let questData = null;
      // Find quest in all categories
      for (const category in allQuests) {
        const found = allQuests[category].find(q => q.id === questId);
        if (found) {
          questData = found;
          break;
        }
      }
      
      return {
        id: questId,
        name: questData?.name || questId,
        type: questData?.chapter ? 'Main Story' : 'Side Quest',
        status: 'active'
      };
    });
    
    const completedQuests = (character.completed_quests || []).map(questId => {
      let questData = null;
      for (const category in allQuests) {
        const found = allQuests[category].find(q => q.id === questId);
        if (found) {
          questData = found;
          break;
        }
      }
      
      return {
        id: questId,
        name: questData?.name || questId,
        type: questData?.chapter ? 'Main Story' : 'Side Quest',
        status: 'completed'
      };
    });
    
    res.json({ 
      quests: [...activeQuests, ...completedQuests],
      playerName: character.name
    });
  } catch (error) {
    console.error('Error fetching player quests:', error);
    res.status(500).json({ error: 'Failed to fetch player quests' });
  }
});

/**
 * GET /data/achievements
 * Get all available achievements
 */
router.get('/data/achievements', checkOperatorAccess, (req, res) => {
  try {
    const data = require('../data/data');
    const achievements = data.getAchievements();
    
    // Flatten achievements from all categories
    const allAchievements = [];
    for (const category in achievements) {
      achievements[category].forEach(ach => {
        allAchievements.push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          rarity: ach.rarity,
          category,
          rewards: ach.rewards
        });
      });
    }
    
    res.json({ achievements: allAchievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /data/locations
 * Get all valid teleport locations from biomes
 */
router.get('/data/locations', checkOperatorAccess, (req, res) => {
  try {
    const data = require('../data/data');
    const biomes = data.getBiomes();
    
    // Organize locations by biome
    const locations = [];
    for (const biomeId in biomes) {
      const biome = biomes[biomeId];
      
      // Add main biome location
      locations.push({
        id: biomeId,
        name: biome.name,
        biome: biome.name,
        type: 'biome'
      });
      
      // Add sub-locations
      if (biome.sub_locations) {
        biome.sub_locations.forEach(subLoc => {
          locations.push({
            id: subLoc.id,
            name: subLoc.name,
            biome: biome.name,
            type: 'location',
            description: subLoc.description
          });
        });
      }
    }
    
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

/**
 * GET /data/encounters
 * Get all available random encounters
 */
router.get('/data/encounters', checkOperatorAccess, (req, res) => {
  try {
    const data = require('../data/data');
    const encounters = data.getRandomEncounters();
    
    // Convert encounters object to array
    const encounterList = [];
    for (const encounterId in encounters) {
      const encounter = encounters[encounterId];
      encounterList.push({
        id: encounterId,
        name: encounter.name,
        type: encounter.type,
        rarity: encounter.rarity,
        description: encounter.description
      });
    }
    
    res.json({ encounters: encounterList });
  } catch (error) {
    console.error('Error fetching encounters:', error);
    res.status(500).json({ error: 'Failed to fetch encounters' });
  }
});

/**
 * GET /data/player-stats
 * Get a specific player's current stats (gold, XP, level, etc.)
 */
router.get('/data/player-stats', checkOperatorAccess, async (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const character = await db.getCharacter(playerId, req.channelName);
    if (!character) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ 
      stats: {
        name: character.name,
        level: character.level,
        xp: character.xp,
        xpToNext: character.xpToNext || character.xp_to_next,
        gold: character.gold,
        hp: character.hp,
        maxHp: character.maxHp || character.max_hp,
        location: character.location
      }
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

module.exports = router;
