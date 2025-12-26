const express = require('express');
const router = express.Router();
const db = require('../db');
const MapKnowledgeManager = require('../game/MapKnowledgeManager');
const { loadData } = require('../data/data_loader');

// Load biome grids configuration and biomes data
const biomeGridsConfig = loadData('biome_grids');
const biomesData = loadData('biomes');

// Instantiate MapKnowledgeManager
const mapKnowledgeMgr = new MapKnowledgeManager();

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// GET /api/map/locations - Get list of all available biomes
router.get('/locations', requireAuth, async (req, res) => {
  try {
    const { channel } = req.query;
    if (!channel) return res.status(400).json({ error: 'Channel required' });

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get map knowledge
    const mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();

    // Get all biomes with discovery status
    const biomes = biomesData?.biomes || {};
    const biomeList = Object.values(biomes).map(biome => {
      const discovered = mapKnowledgeMgr.isRegionDiscovered(mapKnowledge, biome.id);
      return {
        id: biome.id,
        name: biome.name,
        description: biome.description,
        danger_level: biome.danger_level,
        recommended_level: biome.recommended_level,
        discovered: discovered,
        safe_zone: biome.safe_zone || false
      };
    });

    res.json({ biomes: biomeList });
  } catch (error) {
    console.error('Error getting locations:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// GET /api/map/knowledge - Get character's map knowledge
router.get('/knowledge', requireAuth, async (req, res) => {
  try {
    const { channel } = req.query;
    if (!channel) return res.status(400).json({ error: 'Channel required' });

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    res.json({ mapKnowledge });
  } catch (error) {
    console.error('Error getting map knowledge:', error);
    res.status(500).json({ error: 'Failed to get map knowledge' });
  }
});

// GET /api/map/grid - Get the current map grid (legacy)
router.get('/grid', requireAuth, async (req, res) => {
  try {
    const { channel } = req.query;
    if (!channel) return res.status(400).json({ error: 'Channel required' });

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    const currentBiome = mapKnowledge.current_biome || 'town_square';
    const biomeGrid = biomeGridsConfig[currentBiome];
    
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Current biome not found' });
    }

    const grid = mapKnowledgeMgr.getGridWithFogOfWar(mapKnowledge, currentBiome, biomeGrid);
    
    res.json({ grid, currentBiome });
  } catch (error) {
    console.error('Error getting map grid:', error);
    res.status(500).json({ error: 'Failed to get map grid' });
  }
});

// POST /api/map/discover - Discover a new tile
router.post('/discover', requireAuth, async (req, res) => {
  try {
    const { x, y, biome_id, channel } = req.body;
    
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    
    if (biome_id && !mapKnowledge.biome_map_knowledge?.[biome_id]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, biome_id);
    }

    if (biome_id) {
      mapKnowledgeMgr.discoverTile(mapKnowledge, biome_id, [x, y]);
    } else {
      mapKnowledgeMgr.discoverCoordinate(mapKnowledge, [x, y]);
    }
    
    character.map_knowledge = mapKnowledge;
    await db.saveCharacter(character);

    res.json({ success: true, mapKnowledge });
  } catch (error) {
    console.error('Error discovering tile:', error);
    res.status(500).json({ error: 'Failed to discover tile' });
  }
});

// POST /api/map/scout-tile - Scout a specific tile (legacy endpoint)
router.post('/scout-tile', requireAuth, async (req, res) => {
  try {
    const { x, y, channel, biome_id } = req.body;
    
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    const currentBiome = biome_id || mapKnowledge.current_biome || 'town_square';
    
    if (!mapKnowledge.biome_map_knowledge?.[currentBiome]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, currentBiome);
    }

    const scoutData = {
      name: 'Scouted Area',
      dangerHint: 'Unknown',
      briefDesc: 'A scouted location'
    };

    mapKnowledgeMgr.scoutTile(mapKnowledge, currentBiome, [x, y], scoutData);
    character.map_knowledge = mapKnowledge;
    await db.saveCharacter(character);

    res.json({ success: true, tileInfo: scoutData });
  } catch (error) {
    console.error('Error scouting tile:', error);
    res.status(500).json({ error: 'Failed to scout tile' });
  }
});

// POST /api/map/explore-tile - Explore a specific tile (legacy endpoint)
router.post('/explore-tile', requireAuth, async (req, res) => {
  try {
    const { x, y, channel, biome_id } = req.body;
    
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    const currentBiome = biome_id || mapKnowledge.current_biome || 'town_square';
    
    if (!mapKnowledge.biome_map_knowledge?.[currentBiome]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, currentBiome);
    }

    mapKnowledgeMgr.exploreTile(mapKnowledge, currentBiome, [x, y]);
    character.map_knowledge = mapKnowledge;
    await db.saveCharacter(character);

    res.json({ success: true, position: [x, y] });
  } catch (error) {
    console.error('Error exploring tile:', error);
    res.status(500).json({ error: 'Failed to explore tile' });
  }
});

// POST /api/map/move - Move character to a new position
router.post('/move', requireAuth, async (req, res) => {
  try {
    const { x, y, channel, biome_id } = req.body;
    
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Update character position
    character.position = { x, y };
    
    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    const currentBiome = biome_id || mapKnowledge.current_biome || 'town_square';
    
    if (!mapKnowledge.biome_map_knowledge?.[currentBiome]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, currentBiome);
    }

    // Discover the tile at the new position
    mapKnowledgeMgr.discoverTile(mapKnowledge, currentBiome, [x, y]);
    
    character.map_knowledge = mapKnowledge;
    await db.saveCharacter(character);

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
    const { channel } = req.query;
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    
    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    
    const position = [parseInt(x), parseInt(y)];
    const tileState = mapKnowledgeMgr.getTileState(mapKnowledge, biome_id, position);
    
    let hint = null;
    if (tileState === 'scouted') {
      const biomeKnowledge = mapKnowledgeMgr.getBiomeMapKnowledge(mapKnowledge, biome_id);
      if (biomeKnowledge && biomeKnowledge.scouted_tiles) {
        const tileKey = `${x},${y}`;
        hint = biomeKnowledge.scouted_tiles[tileKey];
      }
    }
    
    res.json({ hint, state: tileState });
  } catch (error) {
    console.error('Error getting fog hint:', error);
    res.status(500).json({ error: 'Failed to get fog hint' });
  }
});

// GET /api/map/grid/:biome_id - Get the grid for a specific biome with fog of war
router.get('/grid/:biome_id', requireAuth, async (req, res) => {
  try {
    const { biome_id } = req.params;
    const { channel } = req.query;
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    
    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get biome grid from configuration
    const biomeGrid = biomeGridsConfig[biome_id];
    if (!biomeGrid) {
      return res.status(404).json({ error: 'Biome not found' });
    }

    // Get biome data
    const biome = biomesData?.biomes?.[biome_id];
    if (!biome) {
      return res.status(404).json({ error: 'Biome data not found' });
    }

    // Initialize map knowledge if needed
    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    
    // Initialize biome entry if this is the first time visiting
    if (!mapKnowledge.biome_map_knowledge || !mapKnowledge.biome_map_knowledge[biome_id]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, biome_id);
      character.map_knowledge = mapKnowledge;
      await db.saveCharacter(character);
    }

    // Get current position
    const currentPosition = mapKnowledgeMgr.getCurrentPosition(mapKnowledge, biome_id) || biomeGrid.starting_position;

    // Get adjacent tiles
    const adjacentTiles = mapKnowledgeMgr.getAdjacentTiles(biome_id, currentPosition);

    // Apply fog of war
    const gridWithFog = mapKnowledgeMgr.getGridWithFogOfWar(mapKnowledge, biome_id, biomeGrid);
    
    // Ensure biome knowledge has all required fields
    const biomeKnowledge = mapKnowledge.biome_map_knowledge?.[biome_id] || {};
    const playerKnowledge = {
      current_position: biomeKnowledge.current_position || currentPosition,
      discovered_tiles: biomeKnowledge.discovered_tiles || [],
      scouted_tiles: biomeKnowledge.scouted_tiles || {},
      fog_hints: biomeKnowledge.fog_hints || {}
    };

    res.json({ 
      biome: {
        id: biome.id,
        name: biome.name,
        description: biome.description,
        danger_level: biome.danger_level,
        recommended_level: biome.recommended_level
      },
      gridConfig: biomeGrid,
      grid: gridWithFog,
      currentPosition: currentPosition,
      adjacentTiles: adjacentTiles,
      mapKnowledge: playerKnowledge
    });
  } catch (error) {
    console.error('Error getting biome grid:', error);
    res.status(500).json({ error: 'Failed to get biome grid' });
  }
});

// POST /api/map/scout - Scout an adjacent tile (semi-reveal)
router.post('/scout', requireAuth, async (req, res) => {
  try {
    const { channel, biome_id, x, y } = req.body;
    
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    if (!biome_id) return res.status(400).json({ error: 'Biome ID required' });
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Initialize map knowledge if needed
    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    
    // Initialize biome if needed
    if (!mapKnowledge.biome_map_knowledge || !mapKnowledge.biome_map_knowledge[biome_id]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, biome_id);
    }

    const position = [x, y];
    
    // Check if tile is adjacent to current position
    const currentPosition = mapKnowledgeMgr.getCurrentPosition(mapKnowledge, biome_id);
    const adjacentTiles = mapKnowledgeMgr.getAdjacentTiles(biome_id, currentPosition);
    
    const isAdjacent = adjacentTiles.some(tile => tile[0] === x && tile[1] === y);
    if (!isAdjacent) {
      return res.status(400).json({ error: 'Tile is not adjacent to current position' });
    }

    // Check if already explored
    const tileState = mapKnowledgeMgr.getTileState(mapKnowledge, biome_id, position);
    if (tileState === 'explored') {
      return res.status(400).json({ error: 'Tile is already explored' });
    }

    // Get tile data
    const biomeGrid = biomeGridsConfig[biome_id];
    const tileKey = `${x},${y}`;
    const tileLoc = biomeGrid.tile_locations ? biomeGrid.tile_locations[tileKey] : null;
    
    // Find sublocation at this position
    let sublocationData = null;
    if (biomeGrid.sub_locations) {
      const subEntry = Object.entries(biomeGrid.sub_locations).find(([id, data]) => 
        data.position && data.position[0] === x && data.position[1] === y
      );
      if (subEntry) {
        const [subId, subData] = subEntry;
        const biome = biomesData?.biomes?.[biome_id];
        const subLocation = biome?.sub_locations?.find(s => s.id === subId);
        if (subLocation) {
          sublocationData = {
            id: subId,
            name: subLocation.name,
            dangerHint: MapKnowledgeManager.formatDangerHint(subLocation.monster_spawn_types),
            briefDesc: subLocation.description?.substring(0, 100) + '...'
          };
        }
      }
    }

    // Scout data to store
    const scoutData = sublocationData || {
      name: tileLoc?.name || 'Unknown Area',
      dangerHint: tileLoc?.danger_level ? `Danger Level: ${tileLoc.danger_level}` : 'Unknown danger',
      briefDesc: tileLoc?.description || 'A mysterious location'
    };

    // Mark tile as scouted
    mapKnowledgeMgr.scoutTile(mapKnowledge, biome_id, position, scoutData);
    
    // Apply time cost (5 minutes)
    if (character.game_time) {
      character.game_time = new Date(new Date(character.game_time).getTime() + 5 * 60 * 1000).toISOString();
    }

    character.map_knowledge = mapKnowledge;
    await db.saveCharacter(character);

    res.json({ success: true, tileInfo: scoutData });
  } catch (error) {
    console.error('Error scouting tile:', error);
    res.status(500).json({ error: 'Failed to scout tile' });
  }
});

// POST /api/map/explore - Explore and move to an adjacent tile
router.post('/explore', requireAuth, async (req, res) => {
  try {
    const { channel, biome_id, x, y } = req.body;
    
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    if (!biome_id) return res.status(400).json({ error: 'Biome ID required' });
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y coordinates' });
    }

    const character = await db.getCharacter(req.session.user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Initialize map knowledge if needed
    let mapKnowledge = character.map_knowledge || mapKnowledgeMgr.initializeMapKnowledge();
    
    // Initialize biome if needed
    if (!mapKnowledge.biome_map_knowledge || !mapKnowledge.biome_map_knowledge[biome_id]) {
      mapKnowledge = mapKnowledgeMgr.initializeBiomeEntry(mapKnowledge, biome_id);
    }

    const position = [x, y];
    
    // Check if tile is adjacent to current position
    const currentPosition = mapKnowledgeMgr.getCurrentPosition(mapKnowledge, biome_id);
    const adjacentTiles = mapKnowledgeMgr.getAdjacentTiles(biome_id, currentPosition);
    
    const isAdjacent = adjacentTiles.some(tile => tile[0] === x && tile[1] === y);
    if (!isAdjacent) {
      return res.status(400).json({ error: 'Tile is not adjacent to current position' });
    }

    // Get tile data
    const biomeGrid = biomeGridsConfig[biome_id];
    const tileKey = `${x},${y}`;
    const tileLoc = biomeGrid.tile_locations ? biomeGrid.tile_locations[tileKey] : null;
    
    // Find sublocation at this position
    let tileInfo = null;
    let encounter = null;
    
    if (biomeGrid.sub_locations) {
      const subEntry = Object.entries(biomeGrid.sub_locations).find(([id, data]) => 
        data.position && data.position[0] === x && data.position[1] === y
      );
      if (subEntry) {
        const [subId, subData] = subEntry;
        const biome = biomesData?.biomes?.[biome_id];
        const subLocation = biome?.sub_locations?.find(s => s.id === subId);
        if (subLocation) {
          tileInfo = {
            id: subId,
            name: subLocation.name,
            description: subLocation.description,
            monster_spawn_types: subLocation.monster_spawn_types,
            events: subLocation.events,
            guaranteed_encounter: subLocation.guaranteed_encounter,
            boss_location: subLocation.boss_location
          };
          
          // Determine if an encounter occurs
          if (subLocation.guaranteed_encounter) {
            encounter = { type: 'combat', guaranteed: true };
          } else if (Math.random() < MapKnowledgeManager.getDefaultEncounterChance()) {
            encounter = { type: 'combat', guaranteed: false };
          }
        }
      }
    }

    if (!tileInfo && tileLoc) {
      tileInfo = {
        name: tileLoc.name,
        description: tileLoc.description,
        danger_level: tileLoc.danger_level,
        type: tileLoc.type
      };
      
      // Random encounter based on encounter_chance
      if (tileLoc.encounter_chance && Math.random() < tileLoc.encounter_chance) {
        encounter = { type: 'combat', guaranteed: false };
      }
    }

    // Explore tile (marks as explored and moves player)
    mapKnowledgeMgr.exploreTile(mapKnowledge, biome_id, position);
    
    // Apply time cost (10 minutes)
    if (character.game_time) {
      character.game_time = new Date(new Date(character.game_time).getTime() + 10 * 60 * 1000).toISOString();
    }

    character.map_knowledge = mapKnowledge;
    await db.saveCharacter(character);

    res.json({ 
      success: true, 
      tileInfo: tileInfo || { name: 'Unknown Area', description: 'An unexplored location' },
      encounter: encounter,
      newPosition: position
    });
  } catch (error) {
    console.error('Error exploring tile:', error);
    res.status(500).json({ error: 'Failed to explore tile' });
  }
});

module.exports = router;
