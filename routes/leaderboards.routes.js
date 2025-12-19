const express = require('express');
const router = express.Router();
const db = require('../db');
const { LeaderboardManager } = require('../game');

const leaderboardMgr = new LeaderboardManager();

/**
 * GET /
 * Get all available leaderboard types
 */
router.get('/', (req, res) => {
  try {
    const leaderboards = leaderboardMgr.getAvailableLeaderboards();
    res.json({ leaderboards, count: leaderboards.length });
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

/**
 * GET /:type
 * Get leaderboard rankings
 * Query params: ?limit=100&offset=0
 */
router.get('/:type', (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const leaderboard = leaderboardMgr.getLeaderboard(type, limit, offset);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /:type/player/:player/:channel
 * Get player's rank in leaderboard
 */
router.get('/:type/player/:player/:channel', async (req, res) => {
  try {
    const { type, player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const rank = leaderboardMgr.getPlayerRank(type, `${userId}_${channel}`);
    res.json(rank);
  } catch (error) {
    console.error('Error fetching player rank:', error);
    res.status(500).json({ error: 'Failed to fetch player rank' });
  }
});

/**
 * GET /:type/top/:count
 * Get top N players
 */
router.get('/:type/top/:count', (req, res) => {
  try {
    const { type, count } = req.params;
    const topPlayers = leaderboardMgr.getTopPlayers(type, parseInt(count) || 10);
    res.json(topPlayers);
  } catch (error) {
    console.error('Error fetching top players:', error);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

/**
 * GET /:type/nearby/:player/:channel
 * Get nearby players on leaderboard
 * Query params: ?range=5
 */
router.get('/:type/nearby/:player/:channel', async (req, res) => {
  try {
    const { type, player, channel } = req.params;
    const range = parseInt(req.query.range) || 5;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const nearby = leaderboardMgr.getNearbyPlayers(type, `${userId}_${channel}`, range);
    res.json(nearby);
  } catch (error) {
    console.error('Error fetching nearby players:', error);
    res.status(500).json({ error: 'Failed to fetch nearby players' });
  }
});

/**
 * GET /:type/stats
 * Get leaderboard statistics
 */
router.get('/:type/stats', (req, res) => {
  try {
    const { type } = req.params;
    const stats = leaderboardMgr.getLeaderboardStats(type);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard stats' });
  }
});

module.exports = router;
