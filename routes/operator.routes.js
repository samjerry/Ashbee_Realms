const express = require('express');
const router = express.Router();
const db = require('../db');
const OperatorManager = require('../game/OperatorManager');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const socketHandler = require('../websocket/socketHandler');

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

module.exports = router;
