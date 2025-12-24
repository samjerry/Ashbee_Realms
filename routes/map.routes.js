const express = require('express');
const router = express.Router();
const db = require('../db');
const MapKnowledgeManager = require('../utils/MapKnowledgeManager');
const { loadData } = require('../utils/dataLoader');

// Load biome grids configuration
const biomeGridsConfig = loadData('biome_grids.json');

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// GET /api/map/knowledge - Get character's map knowledge
router.get('/knowledge', requireAuth, async (req, res) => {
  try {
    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapKnowledge = MapKnowledgeManager.getMapKnowledge(character);
    res.json({ mapKnowledge });
  } catch (error) {
    console.error('Error getting map knowledge:', error);
    res.status(500).json({ error: 'Failed to get map knowledge' });
  }
});

// GET /api/map/grid - Get the current map grid
router.get('/grid', requireAuth, async (req, res) => {
  try {
    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapKnowledge = MapKnowledgeManager.getMapKnowledge(character);
    const grid = MapKnowledgeManager.getVisibleGrid(character, mapKnowledge);
    
    res.json({ grid });
  } catch (error) {
    console.error('Error getting map grid:', error);
    res.status(500).json({ error: 'Failed to get map grid' });
  }
});

// POST /api/map/discover - Discover a new tile
router.post('/discover', requireAuth, async (req, res) => {
  try {
    const { x, y, biome_id } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    MapKnowledgeManager.discoverTile(character, x, y, biome_id);
    await db.saveCharacter(character);

    const mapKnowledge = MapKnowledgeManager.getMapKnowledge(character);
    res.json({ success: true, mapKnowledge });
  } catch (error) {
    console.error('Error discovering tile:', error);
    res.status(500).json({ error: 'Failed to discover tile' });
  }
});

// POST /api/map/scout-tile - Scout a specific tile
router.post('/scout-tile', requireAuth, async (req, res) => {
  try {
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = MapKnowledgeManager.scoutTile(character, x, y);
    await db.saveCharacter(character);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error scouting tile:', error);
    res.status(500).json({ error: 'Failed to scout tile' });
  }
});

// POST /api/map/explore-tile - Explore a specific tile
router.post('/explore-tile', requireAuth, async (req, res) => {
  try {
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = MapKnowledgeManager.exploreTile(character, x, y);
    await db.saveCharacter(character);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error exploring tile:', error);
    res.status(500).json({ error: 'Failed to explore tile' });
  }
});

// POST /api/map/move - Move character to a new position
router.post('/move', requireAuth, async (req, res) => {
  try {
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Update character position
    character.position = { x, y };
    
    // Discover the tile at the new position
    MapKnowledgeManager.discoverTile(character, x, y);
    
    await db.saveCharacter(character);

    const mapKnowledge = MapKnowledgeManager.getMapKnowledge(character);
    res.json({ success: true, position: character.position, mapKnowledge });
  } catch (error) {
    console.error('Error moving character:', error);
    res.status(500).json({ error: 'Failed to move character' });
  }
});

// GET /api/map/fog-hint/:biome_id/:x/:y - Get fog of war hint for a tile
router.get('/fog-hint/:biome_id/:x/:y', requireAuth, async (req, res) => {
  try {
    const { biome_id, x, y } = req.params;
    
    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const hint = MapKnowledgeManager.getFogHint(
      character, 
      biome_id, 
      parseInt(x), 
      parseInt(y)
    );
    
    res.json({ hint });
  } catch (error) {
    console.error('Error getting fog hint:', error);
    res.status(500).json({ error: 'Failed to get fog hint' });
  }
});

// GET /api/map/biome-grid/:biome_id - Get the grid for a specific biome
router.get('/biome-grid/:biome_id', requireAuth, async (req, res) => {
  try {
    const { biome_id } = req.params;
    
    const character = await db.getCharacter(req.session.user);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get biome grid from configuration
    const biomeGrid = biomeGridsConfig[biome_id];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome not found' });
    }

    // Apply fog of war based on character's map knowledge
    const mapKnowledge = MapKnowledgeManager.getMapKnowledge(character);
    const visibleGrid = MapKnowledgeManager.applyFogOfWar(
      biomeGrid, 
      mapKnowledge, 
      biome_id
    );

    res.json({ biome_id, grid: visibleGrid });
  } catch (error) {
    console.error('Error getting biome grid:', error);
    res.status(500).json({ error: 'Failed to get biome grid' });
  }
});

module.exports = router;
