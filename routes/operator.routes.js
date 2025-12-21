const express = require('express');
const router = express.Router();
const db = require('../db');
const OperatorManager = require('../game/OperatorManager');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const socketHandler = require('../websocket/socketHandler');
const gameData = require('../data/data');

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
 * Get all game items with categories for item browsers
 */
router.get('/data/items', checkOperatorAccess, async (req, res) => {
  try {
    const items = gameData.getItems();
    const gear = gameData.getGear();
    
    // Format items for UI consumption
    const formattedItems = [];
    
    // Add consumables
    for (const rarity in items) {
      if (Array.isArray(items[rarity])) {
        items[rarity].forEach(item => {
          formattedItems.push({
            id: item.id,
            name: item.name,
            description: item.description,
            rarity: rarity,
            type: 'consumable',
            icon: item.icon || '🧪',
            value: item.value || 0
          });
        });
      }
    }
    
    // Add gear items
    for (const slot in gear) {
      const slotItems = gear[slot];
      if (typeof slotItems === 'object') {
        for (const rarity in slotItems) {
          if (Array.isArray(slotItems[rarity])) {
            slotItems[rarity].forEach(item => {
              formattedItems.push({
                id: item.id,
                name: item.name,
                description: item.description,
                rarity: rarity,
                type: slot,
                icon: item.icon || '⚔️',
                value: item.value || 0
              });
            });
          }
        }
      }
    }
    
    res.json({ items: formattedItems });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

/**
 * GET /data/player-inventory
 * Get a specific player's inventory
 */
router.get('/data/player-inventory', checkOperatorAccess, async (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId parameter required' });
    }
    
    const table = db.getPlayerTable(req.channelName);
    const result = await db.query(
      `SELECT inventory, equipped FROM ${table} WHERE player_id = $1`,
      [playerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const player = result.rows[0];
    const inventory = typeof player.inventory === 'string' 
      ? JSON.parse(player.inventory) 
      : player.inventory;
    
    // Count items and format for UI
    const itemCounts = {};
    inventory.forEach(itemId => {
      itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
    });
    
    // Get item details
    const inventoryItems = [];
    for (const itemId in itemCounts) {
      const item = gameData.getItemById(itemId) || gameData.getGearById(itemId);
      if (item) {
        inventoryItems.push({
          id: itemId,
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          quantity: itemCounts[itemId],
          icon: item.icon || '📦'
        });
      } else {
        // Unknown item
        inventoryItems.push({
          id: itemId,
          name: itemId,
          description: 'Unknown item',
          rarity: 'common',
          quantity: itemCounts[itemId],
          icon: '❓'
        });
      }
    }
    
    res.json({ inventory: inventoryItems });
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
      return res.status(400).json({ error: 'playerId parameter required' });
    }
    
    const table = db.getPlayerTable(req.channelName);
    const result = await db.query(
      `SELECT active_quests, completed_quests FROM ${table} WHERE player_id = $1`,
      [playerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const player = result.rows[0];
    const activeQuests = typeof player.active_quests === 'string' 
      ? JSON.parse(player.active_quests) 
      : (player.active_quests || []);
    const completedQuests = typeof player.completed_quests === 'string' 
      ? JSON.parse(player.completed_quests) 
      : (player.completed_quests || []);
    
    // Helper function to find quest and determine type
    const findQuestDetails = (questId, status) => {
      const allQuests = gameData.getQuests();
      
      // Search in all quest categories
      for (const category in allQuests) {
        if (Array.isArray(allQuests[category])) {
          const quest = allQuests[category].find(q => q.id === questId);
          if (quest) {
            return {
              id: questId,
              name: quest.name,
              description: quest.description,
              status: status,
              type: category === 'main_story' ? 'main' : (category === 'daily_quests' ? 'daily' : 'side')
            };
          }
        }
      }
      
      // Quest not found in data
      return {
        id: questId,
        name: questId,
        description: 'Unknown quest',
        status: status,
        type: 'unknown'
      };
    };
    
    // Get quest details
    const quests = [];
    activeQuests.forEach(questId => quests.push(findQuestDetails(questId, 'active')));
    completedQuests.forEach(questId => quests.push(findQuestDetails(questId, 'completed')));
    
    res.json({ quests });
  } catch (error) {
    console.error('Error fetching player quests:', error);
    res.status(500).json({ error: 'Failed to fetch player quests' });
  }
});

/**
 * GET /data/locations
 * Get all valid locations from biomes
 */
router.get('/data/locations', checkOperatorAccess, async (req, res) => {
  try {
    const biomes = gameData.getBiomes();
    const locations = [];
    
    for (const biomeId in biomes) {
      const biome = biomes[biomeId];
      
      // Add main biome location
      locations.push({
        id: biomeId,
        name: biome.name,
        description: biome.description,
        dangerLevel: biome.danger_level,
        type: 'biome'
      });
      
      // Add sub-locations
      if (biome.sub_locations && Array.isArray(biome.sub_locations)) {
        biome.sub_locations.forEach(subLoc => {
          locations.push({
            id: subLoc.id,
            name: subLoc.name,
            description: subLoc.description,
            dangerLevel: biome.danger_level,
            type: 'location',
            biome: biome.name
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
 * GET /data/achievements
 * Get all achievements
 */
router.get('/data/achievements', checkOperatorAccess, async (req, res) => {
  try {
    const achievements = gameData.getAchievements();
    const formattedAchievements = [];
    
    for (const category in achievements) {
      if (Array.isArray(achievements[category])) {
        achievements[category].forEach(achievement => {
          formattedAchievements.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            category: category,
            rarity: achievement.rarity,
            icon: achievement.icon || '🏆',
            points: achievement.points || 0
          });
        });
      }
    }
    
    res.json({ achievements: formattedAchievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /data/encounters
 * Get all random encounters
 */
router.get('/data/encounters', checkOperatorAccess, async (req, res) => {
  try {
    const encounters = gameData.getRandomEncounters();
    const formattedEncounters = [];
    
    for (const encounterId in encounters) {
      const encounter = encounters[encounterId];
      formattedEncounters.push({
        id: encounterId,
        name: encounter.name,
        description: encounter.description,
        type: encounter.type,
        rarity: encounter.rarity,
        locations: encounter.locations || []
      });
    }
    
    res.json({ encounters: formattedEncounters });
  } catch (error) {
    console.error('Error fetching encounters:', error);
    res.status(500).json({ error: 'Failed to fetch encounters' });
  }
});

module.exports = router;
