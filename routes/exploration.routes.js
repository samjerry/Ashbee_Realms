const express = require('express');
const router = express.Router();
const db = require('../db');
const ExplorationManager = require('../game/ExplorationManager');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /biomes
 * Get all available biomes
 */
router.get('/biomes', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const biomes = explorationMgr.getAvailableBiomes(character.level);

    res.json({
      success: true,
      currentLocation: character.location,
      biomes
    });
  } catch (error) {
    console.error('Error fetching biomes:', error);
    res.status(500).json({ error: 'Failed to fetch biomes' });
  }
});

/**
 * GET /current
 * Get current location information
 */
router.get('/current', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const currentBiome = explorationMgr.getBiome(character.location);

    if (!currentBiome) {
      return res.status(404).json({ error: 'Current location not found' });
    }

    const travelSummary = character.travelState ? 
      explorationMgr.getTravelSummary(character.travelState) : null;

    res.json({
      success: true,
      location: {
        id: currentBiome.id,
        name: currentBiome.name,
        description: currentBiome.description,
        dangerLevel: currentBiome.danger_level,
        recommendedLevel: currentBiome.recommended_level,
        environmentalEffects: currentBiome.environmental_effects
      },
      travelState: travelSummary,
      canExplore: !character.inCombat && !character.travelState
    });
  } catch (error) {
    console.error('Error fetching current location:', error);
    res.status(500).json({ error: 'Failed to fetch current location' });
  }
});

/**
 * POST /travel/start
 * Start travel to a new biome
 */
router.post('/travel/start', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, destination } = req.body;
  if (!channel || !destination) {
    return res.status(400).json({ error: 'Channel and destination required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.startTravel(character, destination);

    if (result.success) {
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error starting travel:', error);
    res.status(500).json({ error: 'Failed to start travel' });
  }
});

/**
 * POST /travel/complete
 * Complete travel and arrive at destination
 */
router.post('/travel/complete', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) {
    return res.status(400).json({ error: 'Channel required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.completeTravel(character);

    if (result.success) {
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error completing travel:', error);
    res.status(500).json({ error: 'Failed to complete travel' });
  }
});

/**
 * POST /travel/cancel
 * Cancel ongoing travel
 */
router.post('/travel/cancel', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) {
    return res.status(400).json({ error: 'Channel required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.cancelTravel(character);

    if (result.success) {
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error canceling travel:', error);
    res.status(500).json({ error: 'Failed to cancel travel' });
  }
});

/**
 * POST /explore
 * Trigger random encounter in current biome
 */
router.post('/explore', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) {
    return res.status(400).json({ error: 'Channel required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.triggerRandomEncounter(character);

    if (result.success) {
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error exploring:', error);
    res.status(500).json({ error: 'Failed to explore' });
  }
});

module.exports = router;
