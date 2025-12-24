const express = require('express');
const router = express.Router();
const db = require('../db');
const MapKnowledgeManager = require('../game/MapKnowledgeManager');
const { loadData } = require('../data/data_loader');

// Load biome grids data
const biomeGrids = loadData('biome_grids') || {};

/**
 * Helper function to calculate Manhattan distance
 */
function calculateDistance(from, to) {
  return Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1]);
}

/**
 * Helper function to generate cryptic hint text
 */
function generateHintText(tileData, distance) {
  if (!tileData) return 'Nothing of note...';

  const hints = [];
  
  if (tileData.danger_level >= 4) {
    hints.push('A sense of dread fills the air...');
  } else if (tileData.danger_level >= 3) {
    hints.push('You feel uneasy about this area...');
  } else if (tileData.danger_level >= 2) {
    hints.push('Something stirs in the distance...');
  }
  
  if (tileData.encounter_chance > 0.3) {
    hints.push('You hear movement nearby.');
  }
  
  if (tileData.loot_chance > 0.3) {
    hints.push('You spot something glinting...');
  }
  
  if (tileData.type === 'sublocation') {
    hints.push('A notable landmark lies ahead.');
  }
  
  if (distance > 3) {
    hints.push('It seems quite far away...');
  }
  
  return hints.length > 0 ? hints.slice(0, 2).join(' ') : 'The path continues onward...';
}

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

/**
 * POST /api/map/scout-tile
 * Scout an adjacent tile (distance = 1 from current position)
 */
router.post('/scout-tile', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biomeId, coordinate } = req.body;
  if (!channel || !biomeId || !coordinate) {
    return res.status(400).json({ error: 'Channel, biomeId, and coordinate required' });
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
    
    // Initialize biome knowledge if needed
    mapKnowledgeMgr.initializeBiomeMapKnowledge(character.mapKnowledge, biomeId);
    
    const biomeKnowledge = character.mapKnowledge.biome_map_knowledge[biomeId];
    const currentPosition = biomeKnowledge.current_position;
    
    // Check if tile is adjacent (distance = 1)
    const distance = calculateDistance(currentPosition, coordinate);
    if (distance !== 1) {
      return res.status(400).json({ error: 'Can only scout adjacent tiles' });
    }
    
    // Get tile data
    const biomeGrid = biomeGrids[biomeId];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome grid not found' });
    }
    
    const coordStr = `${coordinate[0]},${coordinate[1]}`;
    const tileData = biomeGrid.tile_locations[coordStr];
    
    // Generate scouted data
    const scoutedData = {
      danger_hint: tileData?.danger_level >= 4 ? 'high' : tileData?.danger_level >= 2 ? 'moderate' : 'low',
      terrain_hint: tileData?.type === 'sublocation' ? 'building' : tileData?.type === 'generic' ? 'area' : 'empty'
    };
    
    // Add to scouted tiles
    mapKnowledgeMgr.scoutTile(character.mapKnowledge, biomeId, coordinate, scoutedData);
    
    // Update character
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    res.json({
      success: true,
      scoutedData,
      hintText: generateHintText(tileData, distance),
      mapKnowledge: character.mapKnowledge
    });
  } catch (error) {
    console.error('Error scouting tile:', error);
    res.status(500).json({ error: 'Failed to scout tile' });
  }
});

/**
 * POST /api/map/explore-tile
 * Fully explore a tile (any distance)
 */
router.post('/explore-tile', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biomeId, coordinate } = req.body;
  if (!channel || !biomeId || !coordinate) {
    return res.status(400).json({ error: 'Channel, biomeId, and coordinate required' });
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
    
    // Initialize biome knowledge if needed
    mapKnowledgeMgr.initializeBiomeMapKnowledge(character.mapKnowledge, biomeId);
    
    const biomeKnowledge = character.mapKnowledge.biome_map_knowledge[biomeId];
    const currentPosition = biomeKnowledge.current_position;
    
    // Get tile data
    const biomeGrid = biomeGrids[biomeId];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome grid not found' });
    }
    
    const coordStr = `${coordinate[0]},${coordinate[1]}`;
    const tileData = biomeGrid.tile_locations[coordStr];
    
    // Check requirements
    if (tileData?.requires) {
      // TODO: Implement requirement checking (e.g., inventory items)
      return res.status(400).json({ error: `Requires: ${tileData.requires}` });
    }
    
    // Calculate distance for encounter chance
    const distance = calculateDistance(currentPosition, coordinate);
    
    // Roll for encounter
    let encounter = null;
    const baseEncounterChance = tileData?.encounter_chance || 0;
    const distanceModifier = Math.min(distance * 0.1, 0.3); // Max 30% bonus
    const encounterChance = Math.min(baseEncounterChance + distanceModifier, 0.8);
    
    if (Math.random() < encounterChance) {
      // Encounter triggered
      encounter = {
        triggered: true,
        message: 'You encountered enemies!',
        // TODO: Generate actual encounter based on biome and tile
      };
    }
    
    // Add to discovered tiles
    mapKnowledgeMgr.discoverTile(character.mapKnowledge, biomeId, coordinate);
    
    // Move player to tile
    mapKnowledgeMgr.updateBiomePosition(character.mapKnowledge, biomeId, coordinate);
    
    // Update character
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    res.json({
      success: true,
      tileData,
      encounter,
      mapKnowledge: character.mapKnowledge,
      message: encounter ? 'Tile explored - encounter!' : 'Tile explored successfully'
    });
  } catch (error) {
    console.error('Error exploring tile:', error);
    res.status(500).json({ error: 'Failed to explore tile' });
  }
});

/**
 * POST /api/map/move
 * Move to an already discovered tile
 */
router.post('/move', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biomeId, coordinate } = req.body;
  if (!channel || !biomeId || !coordinate) {
    return res.status(400).json({ error: 'Channel, biomeId, and coordinate required' });
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
    
    // Initialize biome knowledge if needed
    mapKnowledgeMgr.initializeBiomeMapKnowledge(character.mapKnowledge, biomeId);
    
    // Check if tile is discovered
    const isDiscovered = mapKnowledgeMgr.isTileDiscovered(character.mapKnowledge, biomeId, coordinate);
    if (!isDiscovered) {
      return res.status(400).json({ error: 'Cannot move to undiscovered tile' });
    }
    
    // Move player to tile (no encounter)
    mapKnowledgeMgr.updateBiomePosition(character.mapKnowledge, biomeId, coordinate);
    
    // Update character
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    res.json({
      success: true,
      mapKnowledge: character.mapKnowledge,
      message: 'Moved successfully'
    });
  } catch (error) {
    console.error('Error moving:', error);
    res.status(500).json({ error: 'Failed to move' });
  }
});

/**
 * GET /api/map/fog-hint/:biomeId/:x/:y
 * Get cryptic hint text for a fog tile
 */
router.get('/fog-hint/:biomeId/:x/:y', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { biomeId, x, y } = req.params;
  const { channel } = req.query;
  
  if (!channel) {
    return res.status(400).json({ error: 'Channel required' });
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
    
    // Initialize biome knowledge if needed
    mapKnowledgeMgr.initializeBiomeMapKnowledge(character.mapKnowledge, biomeId);
    
    const biomeKnowledge = character.mapKnowledge.biome_map_knowledge[biomeId];
    const currentPosition = biomeKnowledge.current_position;
    
    // Get tile data
    const biomeGrid = biomeGrids[biomeId];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome grid not found' });
    }
    
    const coordinate = [parseInt(x), parseInt(y)];
    const coordStr = `${x},${y}`;
    const tileData = biomeGrid.tile_locations[coordStr];
    
    // Calculate distance
    const distance = calculateDistance(currentPosition, coordinate);
    
    // Generate hint
    const hintText = generateHintText(tileData, distance);

    res.json({
      success: true,
      hintText,
      distance,
      coordinate
    });
  } catch (error) {
    console.error('Error getting fog hint:', error);
    res.status(500).json({ error: 'Failed to get fog hint' });
  }
});

module.exports = router;
