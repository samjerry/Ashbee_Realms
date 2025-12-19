const express = require('express');
const router = express.Router();
const db = require('../db');
const PassiveManager = require('../game/PassiveManager');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const sanitization = require('../middleware/sanitization');
const rateLimiter = require('../utils/rateLimiter');

/**
 * GET /tree
 * Get complete passive tree with current levels and currency
 */
router.get('/tree', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();

    const tree = passiveMgr.getPassiveTreeSummary(
      permanentStats.passiveLevels || {},
      permanentStats.souls || 0,
      permanentStats.legacyPoints || 0
    );

    const allPassives = passiveMgr.getAllPassives(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      tree,
      passives: allPassives
    });
  } catch (error) {
    console.error('Error fetching passive tree:', error);
    res.status(500).json({ error: 'Failed to fetch passive tree' });
  }
});

/**
 * GET /category/:category
 * Get passives by category
 */
router.get('/category/:category', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { category } = req.params;

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();

    const passives = passiveMgr.getPassivesByCategory(
      category,
      permanentStats.passiveLevels || {}
    );

    res.json({
      success: true,
      category,
      passives
    });
  } catch (error) {
    console.error('Error fetching passives by category:', error);
    res.status(500).json({ error: 'Failed to fetch passives' });
  }
});

/**
 * POST /upgrade
 * Upgrade a passive by one level
 */
router.post('/upgrade', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { passiveId } = req.body;
  if (!passiveId) {
    return res.status(400).json({ error: 'passiveId required' });
  }

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0,
      totalDeaths: 0,
      totalKills: 0,
      totalGoldEarned: 0,
      totalXPEarned: 0,
      highestLevelReached: 1,
      totalCrits: 0
    };

    const passiveMgr = new PassiveManager();

    const upgradeResult = passiveMgr.upgradePassive(passiveId, permanentStats);

    if (!upgradeResult.success) {
      return res.status(400).json({
        success: false,
        error: upgradeResult.message
      });
    }

    // Save to database
    await db.savePermanentStats(user.id, permanentStats);

    const passive = passiveMgr.getPassive(passiveId, permanentStats.passiveLevels || {});

    res.json({
      success: true,
      message: upgradeResult.message,
      passive,
      cost: upgradeResult.cost,
      newLevel: upgradeResult.newLevel,
      currency: {
        souls: permanentStats.souls,
        legacy_points: permanentStats.legacyPoints
      }
    });
  } catch (error) {
    console.error('Error upgrading passive:', error);
    res.status(500).json({ error: 'Failed to upgrade passive' });
  }
});

/**
 * POST /respec
 * Reset all passives and refund 50% of souls
 */
router.post('/respec', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();

    const respecResult = passiveMgr.respecPassives(permanentStats);

    if (!respecResult.success) {
      return res.status(400).json({
        success: false,
        error: respecResult.message
      });
    }

    // Save to database
    await db.savePermanentStats(user.id, permanentStats);

    res.json({
      success: true,
      message: 'All passives reset!',
      refund: respecResult.refund,
      currency: {
        souls: permanentStats.souls,
        legacy_points: permanentStats.legacyPoints
      }
    });
  } catch (error) {
    console.error('Error respecing passives:', error);
    res.status(500).json({ error: 'Failed to respec passives' });
  }
});

/**
 * GET /currency
 * Get current souls and legacy points
 */
router.get('/currency', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();

    const soulsSpent = passiveMgr.calculateTotalSoulsSpent(permanentStats.passiveLevels || {});
    const lpSpent = passiveMgr.calculateTotalLegacyPointsSpent(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      currency: {
        souls: permanentStats.souls || 0,
        legacy_points: permanentStats.legacyPoints || 0,
        souls_spent: soulsSpent,
        legacy_points_spent: lpSpent
      }
    });
  } catch (error) {
    console.error('Error fetching currency:', error);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

/**
 * GET /bonuses
 * Get current passive bonuses applied
 */
router.get('/bonuses', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();

    const bonuses = passiveMgr.calculatePassiveBonuses(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      bonuses
    });
  } catch (error) {
    console.error('Error calculating bonuses:', error);
    res.status(500).json({ error: 'Failed to calculate bonuses' });
  }
});

module.exports = router;
