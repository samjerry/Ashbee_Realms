const express = require('express');
const router = express.Router();
const db = require('../db');
const FactionManager = require('../game/FactionManager');

const factionMgr = new FactionManager();

/**
 * GET /
 * Get all factions with basic info
 */
router.get('/', async (req, res) => {
  try {
    await factionMgr.loadFactions();
    const factions = Object.values(factionMgr.factions).map(faction => ({
      id: faction.id,
      name: faction.name,
      description: faction.description,
      alignment: faction.alignment,
      leader: faction.leader
    }));

    res.json({ factions });
  } catch (error) {
    console.error('Error fetching factions:', error);
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

/**
 * GET /:factionId
 * Get detailed faction information
 */
router.get('/:factionId', async (req, res) => {
  try {
    const { factionId } = req.params;
    const faction = await factionMgr.getFaction(factionId);

    if (!faction) {
      return res.status(404).json({ error: 'Faction not found' });
    }

    res.json({ faction });
  } catch (error) {
    console.error('Error fetching faction:', error);
    res.status(500).json({ error: 'Failed to fetch faction' });
  }
});

/**
 * GET /standings
 * Get all faction standings for a character
 * Query: player, channel
 */
router.get('/standings', async (req, res) => {
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
    const standings = await factionMgr.getAllStandings(character);

    res.json({ standings });
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

/**
 * GET /:factionId/standing
 * Get character's standing with specific faction
 * Query: player, channel
 */
router.get('/:factionId/standing', async (req, res) => {
  try {
    const { factionId } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const standing = await factionMgr.getFactionStanding(character, factionId);

    res.json({ standing });
  } catch (error) {
    console.error('Error fetching faction standing:', error);
    res.status(500).json({ error: 'Failed to fetch standing' });
  }
});

/**
 * POST /:factionId/reputation
 * Add reputation to a faction (admin/quest rewards)
 * Body: { player, channel, amount, reason }
 */
router.post('/:factionId/reputation', async (req, res) => {
  try {
    const { factionId } = req.params;
    const { player, channel, amount, reason } = req.body;

    if (!player || !channel || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await factionMgr.addReputation(character, factionId, amount, reason || 'manual');

    // Save updated reputation
    await db.updateReputation(userId, channel, character.reputation);

    res.json({ result });
  } catch (error) {
    console.error('Error adding reputation:', error);
    res.status(500).json({ error: 'Failed to add reputation' });
  }
});

/**
 * GET /abilities
 * Get all unlocked faction abilities for a character
 * Query: player, channel
 */
router.get('/abilities', async (req, res) => {
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
    const abilities = await factionMgr.getFactionAbilities(character);

    res.json({ abilities });
  } catch (error) {
    console.error('Error fetching faction abilities:', error);
    res.status(500).json({ error: 'Failed to fetch abilities' });
  }
});

/**
 * GET /mounts
 * Get all unlocked faction mounts for a character
 * Query: player, channel
 */
router.get('/mounts', async (req, res) => {
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
    const mounts = await factionMgr.getFactionMounts(character);

    res.json({ mounts });
  } catch (error) {
    console.error('Error fetching faction mounts:', error);
    res.status(500).json({ error: 'Failed to fetch mounts' });
  }
});

/**
 * GET /summary
 * Get faction summary/statistics for a character
 * Query: player, channel
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
    const summary = await factionMgr.getFactionSummary(character);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching faction summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
