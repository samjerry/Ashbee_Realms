const express = require('express');
const router = express.Router();
const db = require('../db');
const ProgressionManager = require('../game/ProgressionManager');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const rateLimiter = require('../utils/rateLimiter');
const security = require('../middleware/security');
const sanitization = require('../middleware/sanitization');

/**
 * GET /xp
 * Get character XP information
 */
router.get('/xp', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const progressionMgr = new ProgressionManager();
    const nextLevelXP = progressionMgr.calculateXPToNextLevel(character.level);
    const totalXP = progressionMgr.calculateTotalXPToLevel(character.level);

    res.json({
      success: true,
      level: character.level,
      currentXP: character.xp,
      xpToNext: character.xpToNext,
      xpProgress: ((character.xp / character.xpToNext) * 100).toFixed(1) + '%',
      totalXPEarned: totalXP + character.xp
    });
  } catch (error) {
    console.error('Error fetching XP info:', error);
    res.status(500).json({ error: 'Failed to fetch XP information' });
  }
});

/**
 * POST /add-xp
 * Add XP to character (admin/testing endpoint) - WITH VALIDATION
 */
router.post('/add-xp',
  validation.validateAmount,
  rateLimiter.middleware('strict'),
  security.auditLog('add_xp'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { channel, amount } = req.body;
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    if (!amount || amount < 1) return res.status(400).json({ error: 'Valid XP amount required' });

    // Validate XP amount is reasonable (prevent abuse)
    const sanitizedAmount = sanitization.sanitizeNumber(amount, { min: 1, max: 10000000, integer: true });
    if (!sanitizedAmount) {
      return res.status(400).json({ error: 'Invalid XP amount' });
    }

    try {
      const character = await db.getCharacter(user.id, channel.toLowerCase());
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      const progressionMgr = new ProgressionManager();
      const result = progressionMgr.addXP(character, sanitizedAmount);

      // Save updated character
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit general player update
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), {
        level: character.level,
        xp: character.xp,
        xpToNext: character.xpToNext,
        hp: character.hp,
        maxHp: character.maxHp,
        skillPoints: character.skillPoints
      });
      
      // If player leveled up, emit level-up specific event with stat details
      if (result.levelsGained > 0) {
        const levelUpEventData = {
          newLevel: character.level,
          levelsGained: result.levelsGained,
          xp: character.xp,
          xpToNext: character.xpToNext,
          skillPoints: result.totalSkillPoints,
          newMaxHp: character.maxHp,
          statsGained: result.levelUpRewards[result.levelUpRewards.length - 1]?.statsGained || {}
        };
        socketHandler.emitLevelUp(character.name, channel.toLowerCase(), levelUpEventData);
      }

      res.json({
        success: true,
        ...result,
        character: {
          level: character.level,
          xp: character.xp,
          xpToNext: character.xpToNext,
          hp: character.hp,
          maxHp: character.maxHp,
          skillPoints: character.skillPoints
        }
      });
    } catch (error) {
      console.error('Error adding XP:', error);
      res.status(500).json({ error: 'Failed to add XP' });
    }
  });

/**
 * POST /death
 * Handle character death
 */
router.post('/death', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get game state to determine if hardcore mode is enabled
    const gameState = await db.getGameState(channel.toLowerCase());
    
    // If no game state exists, default to softcore (safer default)
    const isHardcore = gameState ? gameState.game_mode === 'hardcore' : false;
    
    if (!gameState) {
      console.warn(`⚠️ No game state found for channel ${channel}, defaulting to softcore mode`);
    }

    // Get permanent stats from database
    const permanentStats = await db.getPermanentStats(user.id) || {};

    const progressionMgr = new ProgressionManager();
    const deathResult = progressionMgr.handleDeath(character, isHardcore, permanentStats);

    if (deathResult.characterDeleted) {
      // Save permanent stats and delete character
      await db.savePermanentStats(user.id, deathResult.permanentStatsToRetain);
      await db.deleteCharacter(user.id, channel.toLowerCase());
    } else {
      // Save character with penalties
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit WebSocket update for death penalties
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    }

    res.json({
      success: true,
      ...deathResult
    });
  } catch (error) {
    console.error('Error handling death:', error);
    res.status(500).json({ error: 'Failed to handle death' });
  }
});

/**
 * POST /respawn
 * Respawn character after death
 */
router.post('/respawn', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const progressionMgr = new ProgressionManager();
    const respawnResult = progressionMgr.respawn(character);

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for respawn
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      ...respawnResult
    });
  } catch (error) {
    console.error('Error respawning:', error);
    res.status(500).json({ error: 'Failed to respawn' });
  }
});

module.exports = router;
