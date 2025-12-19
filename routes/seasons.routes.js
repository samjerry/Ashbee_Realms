const express = require('express');
const router = express.Router();
const db = require('../db');
const { SeasonManager, LeaderboardManager } = require('../game');
const socketHandler = require('../websocket/socketHandler');

const seasonMgr = new SeasonManager();
const leaderboardMgr = new LeaderboardManager();

/**
 * GET /
 * Get all seasons
 */
router.get('/', (req, res) => {
  try {
    const seasons = seasonMgr.getAllSeasons();
    res.json({ seasons, count: seasons.length });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

/**
 * GET /active
 * Get currently active season
 */
router.get('/active', (req, res) => {
  try {
    const activeSeason = seasonMgr.getActiveSeason();
    res.json(activeSeason || { message: 'No active season' });
  } catch (error) {
    console.error('Error fetching active season:', error);
    res.status(500).json({ error: 'Failed to fetch active season' });
  }
});

/**
 * GET /:seasonId
 * Get season details
 */
router.get('/:seasonId', (req, res) => {
  try {
    const { seasonId } = req.params;
    const season = seasonMgr.getSeason(seasonId);
    
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

/**
 * GET /progress/:player/:channel
 * Get player's season progress
 */
router.get('/progress/:player/:channel', async (req, res) => {
  try {
    const { player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const progress = seasonMgr.getSeasonProgress(character);
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching season progress:', error);
    res.status(500).json({ error: 'Failed to fetch season progress' });
  }
});

/**
 * POST /xp/add
 * Add season XP to player
 * Body: { player, channel, xp, source }
 */
router.post('/xp/add', async (req, res) => {
  try {
    const { player, channel, xp, source } = req.body;
    
    if (!player || !channel || !xp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = seasonMgr.addSeasonXP(character, xp, source);
    
    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      
      const progress = character.seasonProgress[seasonMgr.getActiveSeason()?.id];
      if (progress) {
        leaderboardMgr.updateSeasonLevelLeaderboard(character, progress.seasonLevel);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error adding season XP:', error);
    res.status(500).json({ error: 'Failed to add season XP' });
  }
});

/**
 * POST /currency/add
 * Add seasonal currency
 * Body: { player, channel, amount, source }
 */
router.post('/currency/add', async (req, res) => {
  try {
    const { player, channel, amount, source } = req.body;
    
    if (!player || !channel || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = seasonMgr.addSeasonCurrency(character, amount, source);
    
    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      
      const progress = character.seasonProgress[seasonMgr.getActiveSeason()?.id];
      if (progress) {
        leaderboardMgr.updateSeasonCurrencyLeaderboard(character, progress.seasonCurrency);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error adding seasonal currency:', error);
    res.status(500).json({ error: 'Failed to add seasonal currency' });
  }
});

/**
 * GET /challenges/:player/:channel
 * Get seasonal challenges for player
 */
router.get('/challenges/:player/:channel', async (req, res) => {
  try {
    const { player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const challenges = seasonMgr.getSeasonalChallenges(character);
    
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * POST /challenges/complete
 * Complete a seasonal challenge
 * Body: { player, channel, challengeName, type }
 */
router.post('/challenges/complete', async (req, res) => {
  try {
    const { player, channel, challengeName, type } = req.body;
    
    if (!player || !channel || !challengeName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = seasonMgr.completeChallenge(character, challengeName, type);
    
    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error completing challenge:', error);
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
});

/**
 * GET /events
 * Get all seasonal events
 */
router.get('/events', (req, res) => {
  try {
    const events = seasonMgr.getSeasonalEvents();
    res.json({ events, count: events.length });
  } catch (error) {
    console.error('Error fetching seasonal events:', error);
    res.status(500).json({ error: 'Failed to fetch seasonal events' });
  }
});

/**
 * GET /events/:eventId
 * Get seasonal event details
 */
router.get('/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const event = seasonMgr.getSeasonalEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * GET /stats/:player/:channel
 * Get season statistics for player
 */
router.get('/stats/:player/:channel', async (req, res) => {
  try {
    const { player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const stats = seasonMgr.getSeasonStatistics(character);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching season stats:', error);
    res.status(500).json({ error: 'Failed to fetch season stats' });
  }
});

module.exports = router;
