const express = require('express');
const router = express.Router();
const db = require('../db');
const MapKnowledgeManager = require('../game/MapKnowledgeManager');

/**
 * GET /api/map/knowledge
 * Get player's map knowledge data
 */
router.get('/knowledge', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapKnowledgeMgr = new MapKnowledgeManager();
    
    // Get map knowledge or initialize if not present
    const mapKnowledge = character.mapKnowledge || mapKnowledgeMgr.initializeMapKnowledge();
    
    // Get discovery statistics
    const stats = mapKnowledgeMgr.getDiscoveryStats(mapKnowledge);

    res.json({
      success: true,
      mapKnowledge,
      stats
    });
  } catch (error) {
    console.error('Error fetching map knowledge:', error);
    res.status(500).json({ error: 'Failed to fetch map knowledge' });
  }
});

/**
 * GET /api/map/grid
 * Get world grid data
 */
router.get('/grid', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    // Load world grid data
    const { loadData } = require('../data/data_loader');
    const worldGrid = loadData('world_grid');
    
    res.json({
      success: true,
      grid: worldGrid
    });
  } catch (error) {
    console.error('Error fetching world grid:', error);
    res.status(500).json({ error: 'Failed to fetch world grid' });
  }
});

/**
 * POST /api/map/discover
 * Manually discover a region (for testing or quest rewards)
 */
router.post('/discover', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biomeId, coordinates } = req.body;
  if (!channel || !biomeId) {
    return res.status(400).json({ error: 'Channel and biomeId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapKnowledgeMgr = new MapKnowledgeManager();
    
    // Initialize map knowledge if not present
    if (!character.mapKnowledge) {
      character.mapKnowledge = mapKnowledgeMgr.initializeMapKnowledge();
    }
    
    // Discover the region
    const discovery = mapKnowledgeMgr.discoverRegion(
      character.mapKnowledge,
      biomeId,
      coordinates
    );
    
    // Update character
    character.mapKnowledge = discovery.mapKnowledge;
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    // Check for achievements
    const achievements = mapKnowledgeMgr.checkDiscoveryAchievements(character.mapKnowledge);
    const stats = mapKnowledgeMgr.getDiscoveryStats(character.mapKnowledge);

    res.json({
      success: true,
      discovered: discovery.isNew,
      mapKnowledge: character.mapKnowledge,
      achievements,
      stats
    });
  } catch (error) {
    console.error('Error discovering region:', error);
    res.status(500).json({ error: 'Failed to discover region' });
  }
});

module.exports = router;
