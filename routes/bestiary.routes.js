const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /
 * Get player's bestiary data
 */
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const playerId = user.id;
    let { channel } = req.query;
    
    if (!channel) {
      const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
      channel = CHANNELS[0] || 'default';
    }
    const channelName = channel.toLowerCase();

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const BestiaryManager = require('../utils/bestiaryManager');
    const bestiaryData = playerData.bestiary || {};
    const entries = BestiaryManager.getBestiaryEntries(bestiaryData);
    const stats = BestiaryManager.getBestiaryStats(bestiaryData);

    res.json({
      unlocked: playerData.bestiary_unlocked || false,
      entries: entries,
      stats: stats
    });

  } catch (error) {
    console.error('Bestiary get error:', error);
    res.status(500).json({ error: 'Failed to get bestiary', details: error.message });
  }
});

/**
 * POST /encounter
 * Record a monster encounter
 */
router.post('/encounter', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { monsterId } = req.body;
    if (!monsterId) {
      return res.status(400).json({ error: 'Monster ID required' });
    }

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const BestiaryManager = require('../utils/bestiaryManager');
    const currentBestiary = playerData.bestiary || {};
    const updatedBestiary = BestiaryManager.recordEncounter(currentBestiary, monsterId);
    
    // Check if bestiary should be unlocked
    const shouldUnlock = BestiaryManager.shouldUnlockBestiary(updatedBestiary);

    // Update player data
    await db.updatePlayerField(playerId, channelName, 'bestiary', updatedBestiary);
    if (shouldUnlock && !playerData.bestiary_unlocked) {
      await db.updatePlayerField(playerId, channelName, 'bestiary_unlocked', true);
    }

    res.json({
      success: true,
      unlocked: shouldUnlock,
      entry: updatedBestiary[monsterId]
    });

  } catch (error) {
    console.error('Bestiary encounter error:', error);
    res.status(500).json({ error: 'Failed to record encounter', details: error.message });
  }
});

/**
 * POST /defeat
 * Record a monster defeat
 */
router.post('/defeat', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { monsterId } = req.body;
    if (!monsterId) {
      return res.status(400).json({ error: 'Monster ID required' });
    }

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const BestiaryManager = require('../utils/bestiaryManager');
    const currentBestiary = playerData.bestiary || {};
    const updatedBestiary = BestiaryManager.recordDefeat(currentBestiary, monsterId);

    // Update player data
    await db.updatePlayerField(playerId, channelName, 'bestiary', updatedBestiary);

    res.json({
      success: true,
      entry: updatedBestiary[monsterId]
    });

  } catch (error) {
    console.error('Bestiary defeat error:', error);
    res.status(500).json({ error: 'Failed to record defeat', details: error.message });
  }
});

/**
 * GET /unlock-status
 * Check if bestiary is unlocked for player
 */
router.get('/unlock-status', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      unlocked: playerData.bestiary_unlocked || false,
      entryCount: Object.keys(playerData.bestiary || {}).length
    });

  } catch (error) {
    console.error('Bestiary unlock status error:', error);
    res.status(500).json({ error: 'Failed to get unlock status', details: error.message });
  }
});

module.exports = router;
