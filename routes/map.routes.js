const express = require('express');
const router = express.Router();
const db = require('../db');
const MapKnowledgeManager = require('../game/MapKnowledgeManager');
const { loadData } = require('../data/data_loader');

/**
 * Helper function to calculate Manhattan distance
 */
function calculateDistance(from, to) {
  return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
}

/**
 * Helper function to get danger hint from danger level
 */
function getDangerHint(dangerLevel) {
  if (dangerLevel <= 1) return 'low';
  if (dangerLevel <= 3) return 'moderate';
  return 'high';
}

/**
 * Helper function to generate tile hint
 */
function generateTileHint(tileData, biomeId) {
  if (!tileData) return 'Empty wilderness ahead...';
  
  let category = 'unknown';
  if (biomeId.includes('wood') || biomeId.includes('forest')) {
    category = 'forest';
  } else if (biomeId.includes('tunnel') || biomeId.includes('cave') || biomeId.includes('dungeon')) {
    category = 'dungeon';
  } else if (biomeId.includes('swamp') || biomeId.includes('marsh')) {
    category = 'swamp';
  } else if (biomeId.includes('town') || biomeId.includes('square')) {
    category = 'town';
  }
  
  const hints = {
    'forest': [
      'Ancient trees whisper secrets in the wind...',
      'The scent of moss and wildflowers fills the air...',
      'Birdsong mingles with rustling leaves...'
    ],
    'dungeon': [
      'You hear the echo of footsteps in stone corridors...',
      'The smell of damp stone and old iron drifts from this direction...',
      'Torchlight flickers in the distance...'
    ],
    'swamp': [
      'Murky mists obscure the wetlands ahead...',
      'The croak of unseen creatures echoes...',
      'Stagnant water and decay taint the air...'
    ],
    'town': [
      'You hear the bustle of activity...',
      'The sound of hammering metal echoes...',
      'Voices carry on the wind...'
    ],
    'unknown': [
      'Something mysterious lies ahead...',
      'The unknown awaits your discovery...'
    ]
  };
  
  const hintList = hints[category] || hints['unknown'];
  return hintList[Math.floor(Math.random() * hintList.length)];
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

/**
 * POST /api/map/scout-tile
 * Scout an adjacent tile to reveal partial information
 */
router.post('/scout-tile', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biome_id, coordinate } = req.body;
  if (!channel || !biome_id || !coordinate) {
    return res.status(400).json({ error: 'Channel, biome_id, and coordinate required' });
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
    const biomeGrids = loadData('biome_grids');
    const biomeGrid = biomeGrids[biome_id];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome not found' });
    }

    // Ensure biome map knowledge exists
    if (!mapKnowledgeMgr.getBiomeMapKnowledge(character.mapKnowledge, biome_id)) {
      character.mapKnowledge = mapKnowledgeMgr.initializeBiomeMapKnowledge(
        character.mapKnowledge,
        biome_id,
        biomeGrid.starting_position
      );
    }

    // Get current position
    const currentPosition = mapKnowledgeMgr.getCurrentPosition(character.mapKnowledge, biome_id);
    if (!currentPosition) {
      return res.status(400).json({ error: 'No current position in biome' });
    }

    // Verify tile is adjacent (Manhattan distance = 1)
    const distance = calculateDistance(currentPosition, coordinate);
    if (distance !== 1) {
      return res.status(400).json({ error: 'Can only scout adjacent tiles' });
    }

    // Check if already discovered
    if (mapKnowledgeMgr.isTileDiscovered(character.mapKnowledge, biome_id, coordinate)) {
      return res.status(400).json({ error: 'Tile already discovered' });
    }

    // Load tile data
    const coordKey = `${coordinate[0]},${coordinate[1]}`;
    const tileData = biomeGrid.tile_locations[coordKey];

    // Generate scout data
    const scoutData = {
      danger_hint: tileData ? getDangerHint(tileData.danger_level) : 'low',
      terrain_hint: tileData ? tileData.type : 'empty'
    };

    // Add to scouted tiles
    character.mapKnowledge = mapKnowledgeMgr.scoutTile(
      character.mapKnowledge,
      biome_id,
      coordinate,
      scoutData
    );

    // Save character
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    // Generate hint text
    const hint = generateTileHint(tileData, biome_id);

    res.json({
      success: true,
      scouted_data: scoutData,
      hint
    });
  } catch (error) {
    console.error('Error scouting tile:', error);
    res.status(500).json({ error: 'Failed to scout tile' });
  }
});

/**
 * POST /api/map/explore-tile
 * Fully explore a tile, triggering possible encounters
 */
router.post('/explore-tile', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biome_id, coordinate } = req.body;
  if (!channel || !biome_id || !coordinate) {
    return res.status(400).json({ error: 'Channel, biome_id, and coordinate required' });
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

    // Load biome grid
    const biomeGrids = loadData('biome_grids');
    const biomeGrid = biomeGrids[biome_id];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome not found' });
    }

    // Ensure biome map knowledge exists
    if (!mapKnowledgeMgr.getBiomeMapKnowledge(character.mapKnowledge, biome_id)) {
      character.mapKnowledge = mapKnowledgeMgr.initializeBiomeMapKnowledge(
        character.mapKnowledge,
        biome_id,
        biomeGrid.starting_position
      );
    }

    // Get current position
    const currentPosition = mapKnowledgeMgr.getCurrentPosition(character.mapKnowledge, biome_id);
    if (!currentPosition) {
      return res.status(400).json({ error: 'No current position in biome' });
    }

    // Check if already discovered
    if (mapKnowledgeMgr.isTileDiscovered(character.mapKnowledge, biome_id, coordinate)) {
      return res.status(400).json({ error: 'Tile already explored. Use move endpoint instead.' });
    }

    // Calculate distance from current position
    const distance = calculateDistance(currentPosition, coordinate);

    // Load tile data
    const coordKey = `${coordinate[0]},${coordinate[1]}`;
    const tileData = biomeGrid.tile_locations[coordKey] || {
      type: 'empty',
      name: 'Wilderness',
      description: 'An unremarkable area',
      abbreviation: '..',
      danger_level: 1
    };

    // Check for required items (future enhancement)
    if (tileData.required_item) {
      // Future: Integrate with InventoryManager to check for required items
      // For MVP, tiles with required_item show a lock icon but can still be explored
      // Example: character.inventory.hasItem(tileData.required_item)
    }

    // Discover the tile
    const discovery = mapKnowledgeMgr.discoverTile(character.mapKnowledge, biome_id, coordinate);
    character.mapKnowledge = discovery.mapKnowledge;

    // Update position
    character.mapKnowledge = mapKnowledgeMgr.updatePosition(character.mapKnowledge, biome_id, coordinate);

    // Calculate encounter chance
    let encounterChance = tileData.encounter_chance || 0;
    encounterChance += distance * 0.1; // Add 10% per tile traveled

    // Roll for encounter
    let encounter = null;
    if (tileData.guaranteed_encounter || Math.random() < encounterChance) {
      // Future enhancement: Integrate with ExplorationManager.generateMonsterEncounter()
      // For MVP, we indicate that an encounter would occur but don't start combat
      // This allows testing of the exploration mechanics without requiring full combat integration
      encounter = {
        type: 'combat',
        message: `An enemy appears at ${tileData.name}!`,
        // Add basic encounter data for future integration
        encounter_triggered: true,
        danger_level: tileData.danger_level,
        is_boss: tileData.boss_encounter || false
      };
    }

    // Save character
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    res.json({
      success: true,
      tile_data: {
        type: tileData.type,
        name: tileData.name,
        description: tileData.description,
        danger_level: tileData.danger_level
      },
      encounter,
      message: `Explored ${tileData.name}`,
      new_position: coordinate
    });
  } catch (error) {
    console.error('Error exploring tile:', error);
    res.status(500).json({ error: 'Failed to explore tile' });
  }
});

/**
 * POST /api/map/move
 * Move to an already discovered tile without triggering exploration
 */
router.post('/move', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, biome_id, coordinate } = req.body;
  if (!channel || !biome_id || !coordinate) {
    return res.status(400).json({ error: 'Channel, biome_id, and coordinate required' });
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

    // Verify tile is discovered
    if (!mapKnowledgeMgr.isTileDiscovered(character.mapKnowledge, biome_id, coordinate)) {
      return res.status(400).json({ error: 'Cannot move to undiscovered tile. Explore it first.' });
    }

    // Update position
    character.mapKnowledge = mapKnowledgeMgr.updatePosition(character.mapKnowledge, biome_id, coordinate);

    // Save character
    await db.updateCharacter(user.id, channel.toLowerCase(), { 
      map_knowledge: character.mapKnowledge 
    });

    res.json({
      success: true,
      new_position: coordinate,
      message: 'Moved to new position'
    });
  } catch (error) {
    console.error('Error moving:', error);
    res.status(500).json({ error: 'Failed to move' });
  }
});

/**
 * GET /api/map/fog-hint/:biome_id/:x/:y
 * Get a cryptic hint for a fog tile on hover
 */
router.get('/fog-hint/:biome_id/:x/:y', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { biome_id, x, y } = req.params;
  const { channel } = req.query;
  
  if (!channel) {
    return res.status(400).json({ error: 'Channel required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const coordinate = [parseInt(x), parseInt(y)];

    // Load biome grid
    const biomeGrids = loadData('biome_grids');
    const biomeGrid = biomeGrids[biome_id];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome not found' });
    }

    const mapKnowledgeMgr = new MapKnowledgeManager();
    
    // Get current position
    const currentPosition = mapKnowledgeMgr.getCurrentPosition(character.mapKnowledge, biome_id);
    if (!currentPosition) {
      return res.status(400).json({ error: 'No current position in biome' });
    }

    // Calculate distance
    const distance = calculateDistance(currentPosition, coordinate);

    // Load tile data
    const coordKey = `${coordinate[0]},${coordinate[1]}`;
    const tileData = biomeGrid.tile_locations[coordKey];

    // Generate hint
    const hint = generateTileHint(tileData, biome_id);
    const dangerHint = tileData ? getDangerHint(tileData.danger_level) : 'low';

    res.json({
      success: true,
      hint,
      distance,
      danger_hint: dangerHint
    });
  } catch (error) {
    console.error('Error getting fog hint:', error);
    res.status(500).json({ error: 'Failed to get fog hint' });
  }
});

/**
 * GET /api/map/biome-grid/:biome_id
 * Get biome grid configuration and player's knowledge of it
 */
router.get('/biome-grid/:biome_id', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { biome_id } = req.params;
  const { channel } = req.query;
  
  if (!channel) {
    return res.status(400).json({ error: 'Channel required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Load biome grid
    const biomeGrids = loadData('biome_grids');
    const biomeGrid = biomeGrids[biome_id];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome not found' });
    }

    const mapKnowledgeMgr = new MapKnowledgeManager();
    
    // Initialize map knowledge if not present
    if (!character.mapKnowledge) {
      character.mapKnowledge = mapKnowledgeMgr.initializeMapKnowledge();
    }

    // Initialize biome knowledge if needed
    if (!mapKnowledgeMgr.getBiomeMapKnowledge(character.mapKnowledge, biome_id)) {
      character.mapKnowledge = mapKnowledgeMgr.initializeBiomeMapKnowledge(
        character.mapKnowledge,
        biome_id,
        biomeGrid.starting_position
      );
      
      // Save the initialized knowledge
      await db.updateCharacter(user.id, channel.toLowerCase(), { 
        map_knowledge: character.mapKnowledge 
      });
    }

    const biomeKnowledge = mapKnowledgeMgr.getBiomeMapKnowledge(character.mapKnowledge, biome_id);

    res.json({
      success: true,
      grid_config: biomeGrid,
      player_knowledge: biomeKnowledge
    });
  } catch (error) {
    console.error('Error getting biome grid:', error);
    res.status(500).json({ error: 'Failed to get biome grid' });
  }
});

module.exports = router;
