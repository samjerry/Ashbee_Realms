const express = require('express');
const router = express.Router();
const db = require('../db');
const { AchievementManager } = require('../game');
const socketHandler = require('../websocket/socketHandler');

const achievementMgr = new AchievementManager();

/**
 * GET /
 * Get all achievements with progress for a character
 */
router.get('/', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  try {
    let { channel, includeHidden } = req.query;
    
    if (!channel) {
      const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
      channel = CHANNELS[0] || 'default';
    }
    
    if (!channel) {
      return res.status(400).json({ error: 'No channel configured' });
    }

    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.json([]);
    }
    
    const achievements = achievementMgr.getAllAchievements(character, includeHidden === 'true');
    res.json(achievements || []);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /category/:category
 * Get achievements by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const achievements = achievementMgr.getAchievementsByCategory(category, character);

    res.json({ category, achievements });
  } catch (error) {
    console.error('Error fetching achievements by category:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /summary
 * Get achievement summary stats
 */
router.get('/summary', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const summary = achievementMgr.getSummary(character);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching achievement summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * POST /check
 * Check and unlock achievements for player
 */
router.post('/check', async (req, res) => {
  try {
    const { player, channel } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const unlockResults = achievementMgr.checkAchievements(character);

    if (unlockResults.length > 0) {
      await db.updateAchievementData(userId, channel, {
        unlockedAchievements: character.unlockedAchievements,
        achievementProgress: character.achievementProgress,
        achievementUnlockDates: character.achievementUnlockDates,
        achievementPoints: character.achievementPoints,
        unlockedTitles: character.unlockedTitles,
        activeTitle: character.activeTitle
      });
      await db.saveCharacter(userId, channel, character);
      
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      unlockResults.forEach(unlock => {
        socketHandler.emitAchievementUnlocked(character.name, channel, unlock);
      });
    }

    res.json({
      unlockedCount: unlockResults.length,
      unlocks: unlockResults
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

/**
 * POST /title/set
 * Set active title for character
 */
router.post('/title/set', async (req, res) => {
  try {
    const { player, channel, titleId } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);

    if (titleId && !character.unlockedTitles.includes(titleId)) {
      return res.status(403).json({ error: 'Title not unlocked' });
    }

    character.activeTitle = titleId;

    await db.updateAchievementData(userId, channel, {
      unlockedAchievements: character.unlockedAchievements,
      achievementProgress: character.achievementProgress,
      achievementUnlockDates: character.achievementUnlockDates,
      achievementPoints: character.achievementPoints,
      unlockedTitles: character.unlockedTitles,
      activeTitle: character.activeTitle
    });

    res.json({
      success: true,
      activeTitle: titleId
    });
  } catch (error) {
    console.error('Error setting title:', error);
    res.status(500).json({ error: 'Failed to set title' });
  }
});

/**
 * GET /recent
 * Get recently unlocked achievements
 */
router.get('/recent', async (req, res) => {
  try {
    const { player, channel, limit } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const recentLimit = limit ? parseInt(limit) : 5;
    const recent = achievementMgr.getRecentUnlocks(character, recentLimit);

    res.json({ recent });
  } catch (error) {
    console.error('Error fetching recent achievements:', error);
    res.status(500).json({ error: 'Failed to fetch recent achievements' });
  }
});

module.exports = router;
