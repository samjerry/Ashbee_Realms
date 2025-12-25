/**
 * MapKnowledgeManager.js
 * Manages the fog of war and map discovery system
 * Tracks which regions and sub-locations have been discovered by players
 */

const { loadData } = require('../data/data_loader');

class MapKnowledgeManager {
  constructor() {
    this.biomes = loadData('biomes')?.biomes || {};
    this.biomeGrids = loadData('biome_grids') || {};
  }

  /**
   * Initialize map knowledge for a new character (static method)
   * @returns {Object} Initial map knowledge state
   */
  static initializeMapKnowledge() {
    const now = new Date().toISOString();
    return {
      discovered_regions: ['town_square'], // Town square is always known
      explored_sublocations: {
        'town_square': ['inn', 'shop', 'blacksmith', 'temple']
      },
      visited_coordinates: [[5, 5]], // Town square at center (legacy)
      discovered_coordinates: [[5, 5]], // Grid coordinates discovered
      discovery_timestamp: {
        'town_square': now,
        '5,5': now
      },
      exploration_percentage: 0, // Will be calculated when needed
      current_biome: 'town_square',
      biome_map_knowledge: {
        'town_square': {
          discovered_tiles: [[4, 4]], // Starting position
          scouted_tiles: {},
          fog_hints: {},
          current_position: [4, 4]
        }
      }
    };
  }

  /**
   * Initialize map knowledge for a new character (instance method for backwards compatibility)
   * @returns {Object} Initial map knowledge state
   */
  initializeMapKnowledge() {
    return MapKnowledgeManager.initializeMapKnowledge();
  }

  /**
   * Check if a region is discovered
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} regionId - Region identifier
   * @returns {boolean} Whether region is discovered
   */
  isRegionDiscovered(mapKnowledge, regionId) {
    if (!mapKnowledge || !mapKnowledge.discovered_regions) {
      return false;
    }
    return mapKnowledge.discovered_regions.includes(regionId);
  }

  /**
   * Check if a sublocation is explored
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} regionId - Region identifier
   * @param {string} sublocationId - Sublocation identifier
   * @returns {boolean} Whether sublocation is explored
   */
  isSublocationExplored(mapKnowledge, regionId, sublocationId) {
    if (!mapKnowledge || !mapKnowledge.explored_sublocations) {
      return false;
    }
    const regionSubs = mapKnowledge.explored_sublocations[regionId] || [];
    return regionSubs.includes(sublocationId);
  }

  /**
   * Discover a new region
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} regionId - Region to discover
   * @param {Array} coordinates - Grid coordinates [x, y]
   * @returns {Object} Updated map knowledge and discovery info
   */
  discoverRegion(mapKnowledge, regionId, coordinates = null) {
    // Initialize if needed
    if (!mapKnowledge) {
      mapKnowledge = this.initializeMapKnowledge();
    }
    
    // Ensure discovered_coordinates array exists
    if (!mapKnowledge.discovered_coordinates) {
      mapKnowledge.discovered_coordinates = [];
    }

    // Check if already discovered
    if (this.isRegionDiscovered(mapKnowledge, regionId)) {
      return {
        mapKnowledge,
        isNew: false,
        region: this.biomes[regionId]
      };
    }

    // Add to discovered regions
    mapKnowledge.discovered_regions.push(regionId);
    
    // Add timestamp
    mapKnowledge.discovery_timestamp[regionId] = new Date().toISOString();

    // Add coordinates if provided
    if (coordinates) {
      const coordStr = `${coordinates[0]},${coordinates[1]}`;
      
      // Add to visited_coordinates (legacy)
      if (!mapKnowledge.visited_coordinates.some(
        coord => coord[0] === coordinates[0] && coord[1] === coordinates[1]
      )) {
        mapKnowledge.visited_coordinates.push(coordinates);
      }
      
      // Add to discovered_coordinates
      if (!mapKnowledge.discovered_coordinates.some(
        coord => coord[0] === coordinates[0] && coord[1] === coordinates[1]
      )) {
        mapKnowledge.discovered_coordinates.push(coordinates);
        mapKnowledge.discovery_timestamp[coordStr] = new Date().toISOString();
      }
    }
    
    // Update exploration percentage
    const totalBiomes = Object.keys(this.biomes).length;
    if (totalBiomes > 0) {
      mapKnowledge.exploration_percentage = (mapKnowledge.discovered_regions.length / totalBiomes) * 100;
    } else {
      mapKnowledge.exploration_percentage = 0;
    }

    return {
      mapKnowledge,
      isNew: true,
      region: this.biomes[regionId]
    };
  }
  
  /**
   * Discover a specific coordinate on the grid
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {Array} coordinate - Grid coordinate [x, y]
   * @returns {Object} Updated map knowledge and discovery info
   */
  discoverCoordinate(mapKnowledge, coordinate) {
    // Initialize if needed
    if (!mapKnowledge) {
      mapKnowledge = this.initializeMapKnowledge();
    }
    
    // Ensure discovered_coordinates array exists
    if (!mapKnowledge.discovered_coordinates) {
      mapKnowledge.discovered_coordinates = [];
    }
    
    const coordStr = `${coordinate[0]},${coordinate[1]}`;
    
    // Check if already discovered
    const alreadyDiscovered = mapKnowledge.discovered_coordinates.some(
      coord => coord[0] === coordinate[0] && coord[1] === coordinate[1]
    );
    
    if (!alreadyDiscovered) {
      mapKnowledge.discovered_coordinates.push(coordinate);
      mapKnowledge.discovery_timestamp[coordStr] = new Date().toISOString();
      
      return {
        mapKnowledge,
        isNew: true
      };
    }
    
    return {
      mapKnowledge,
      isNew: false
    };
  }

  /**
   * Explore a sublocation within a region
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} regionId - Region identifier
   * @param {string} sublocationId - Sublocation identifier
   * @returns {Object} Updated map knowledge and discovery info
   */
  exploreSublocation(mapKnowledge, regionId, sublocationId) {
    // Initialize if needed
    if (!mapKnowledge) {
      mapKnowledge = this.initializeMapKnowledge();
    }

    // Ensure region is discovered
    if (!this.isRegionDiscovered(mapKnowledge, regionId)) {
      const discovery = this.discoverRegion(mapKnowledge, regionId);
      mapKnowledge = discovery.mapKnowledge;
    }

    // Initialize sublocation array for region if needed
    if (!mapKnowledge.explored_sublocations[regionId]) {
      mapKnowledge.explored_sublocations[regionId] = [];
    }

    // Check if already explored
    if (this.isSublocationExplored(mapKnowledge, regionId, sublocationId)) {
      return {
        mapKnowledge,
        isNew: false
      };
    }

    // Add sublocation
    mapKnowledge.explored_sublocations[regionId].push(sublocationId);

    return {
      mapKnowledge,
      isNew: true
    };
  }

  /**
   * Get filtered biome list based on discovery status
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} filter - 'all', 'discovered', 'undiscovered'
   * @returns {Array} Filtered biome list
   */
  getFilteredBiomes(mapKnowledge, filter = 'all') {
    const biomeList = Object.values(this.biomes).map(biome => {
      const discovered = this.isRegionDiscovered(mapKnowledge, biome.id);
      const exploredSubs = mapKnowledge?.explored_sublocations?.[biome.id] || [];
      
      return {
        ...biome,
        discovered,
        exploredSublocations: exploredSubs,
        explorationProgress: biome.sub_locations 
          ? exploredSubs.length / biome.sub_locations.length 
          : 0
      };
    });

    if (filter === 'discovered') {
      return biomeList.filter(b => b.discovered);
    } else if (filter === 'undiscovered') {
      return biomeList.filter(b => !b.discovered);
    }
    
    return biomeList;
  }

  /**
   * Get discovery statistics
   * @param {Object} mapKnowledge - Player's map knowledge
   * @returns {Object} Discovery statistics
   */
  getDiscoveryStats(mapKnowledge) {
    if (!mapKnowledge) {
      mapKnowledge = this.initializeMapKnowledge();
    }

    const totalRegions = Object.keys(this.biomes).length;
    const discoveredRegions = mapKnowledge.discovered_regions?.length || 0;
    
    let totalSublocations = 0;
    let exploredSublocations = 0;
    
    Object.values(this.biomes).forEach(biome => {
      if (biome.sub_locations) {
        totalSublocations += biome.sub_locations.length;
        const regionSubs = mapKnowledge.explored_sublocations?.[biome.id] || [];
        exploredSublocations += regionSubs.length;
      }
    });

    return {
      totalRegions,
      discoveredRegions,
      undiscoveredRegions: totalRegions - discoveredRegions,
      discoveryPercentage: (discoveredRegions / totalRegions * 100).toFixed(1),
      totalSublocations,
      exploredSublocations,
      sublocationPercentage: totalSublocations > 0 
        ? (exploredSublocations / totalSublocations * 100).toFixed(1)
        : 0,
      visitedCoordinates: mapKnowledge.visited_coordinates?.length || 0
    };
  }

  /**
   * Get adjacent/nearby undiscovered regions
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} currentRegionId - Current region
   * @returns {Array} List of adjacent undiscovered regions
   */
  getAdjacentUndiscovered(mapKnowledge, currentRegionId) {
    // This would use world_grid.json to find adjacent regions
    // For now, return empty array - will be implemented with grid system
    return [];
  }

  /**
   * Check if player should receive discovery achievement
   * @param {Object} mapKnowledge - Player's map knowledge
   * @returns {Array} Achievement milestones reached
   */
  checkDiscoveryAchievements(mapKnowledge) {
    const stats = this.getDiscoveryStats(mapKnowledge);
    const achievements = [];

    // Discovery milestones
    const milestones = [
      { count: 5, id: 'explorer_novice', name: 'Novice Explorer' },
      { count: 10, id: 'explorer_adept', name: 'Adept Explorer' },
      { count: 15, id: 'explorer_expert', name: 'Expert Explorer' },
      { count: 20, id: 'explorer_master', name: 'Master Explorer' },
    ];

    milestones.forEach(milestone => {
      if (stats.discoveredRegions >= milestone.count) {
        achievements.push(milestone);
      }
    });

    // 100% discovery achievement
    if (stats.discoveryPercentage >= 100) {
      achievements.push({
        id: 'cartographer',
        name: 'Cartographer',
        description: 'Discover all regions in Ashbee Realms'
      });
    }

    return achievements;
  }

  /**
   * Initialize biome map knowledge for a specific biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} startingPosition - Starting position [x, y]
   * @returns {Object} Updated map knowledge
   */
  initializeBiomeMapKnowledge(mapKnowledge, biomeId, startingPosition) {
    if (!mapKnowledge.biome_map_knowledge) {
      mapKnowledge.biome_map_knowledge = {};
    }

    if (!mapKnowledge.biome_map_knowledge[biomeId]) {
      mapKnowledge.biome_map_knowledge[biomeId] = {
        discovered_tiles: [startingPosition],
        scouted_tiles: {},
        fog_hints: {},
        current_position: startingPosition
      };
    }

    return mapKnowledge;
  }

  /**
   * Get biome map knowledge for a specific biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @returns {Object|null} Biome map knowledge
   */
  getBiomeMapKnowledge(mapKnowledge, biomeId) {
    if (!mapKnowledge || !mapKnowledge.biome_map_knowledge) {
      return null;
    }
    return mapKnowledge.biome_map_knowledge[biomeId] || null;
  }

  /**
   * Check if a tile is discovered in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - Coordinate [x, y]
   * @returns {boolean} True if discovered
   */
  isTileDiscovered(mapKnowledge, biomeId, coordinate) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge || !biomeKnowledge.discovered_tiles) return false;
    
    return biomeKnowledge.discovered_tiles.some(
      tile => tile[0] === coordinate[0] && tile[1] === coordinate[1]
    );
  }

  /**
   * Check if a tile is scouted in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - Coordinate [x, y]
   * @returns {boolean} True if scouted
   */
  isTileScouted(mapKnowledge, biomeId, coordinate) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge || !biomeKnowledge.scouted_tiles) return false;
    
    const key = `${coordinate[0]},${coordinate[1]}`;
    return !!biomeKnowledge.scouted_tiles[key];
  }

  /**
   * Scout a tile in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - Coordinate [x, y]
   * @param {Object} scoutData - Scout information
   * @returns {Object} Updated map knowledge
   */
  scoutTile(mapKnowledge, biomeId, coordinate, scoutData) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge) {
      throw new Error(`Biome ${biomeId} not initialized in map knowledge`);
    }

    const key = `${coordinate[0]},${coordinate[1]}`;
    biomeKnowledge.scouted_tiles[key] = {
      ...scoutData,
      scouted_at: new Date().toISOString()
    };

    return mapKnowledge;
  }

  /**
   * Discover a tile in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - Coordinate [x, y]
   * @returns {Object} Updated map knowledge and discovery info
   */
  discoverTile(mapKnowledge, biomeId, coordinate) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge) {
      throw new Error(`Biome ${biomeId} not initialized in map knowledge`);
    }

    // Check if already discovered
    const alreadyDiscovered = this.isTileDiscovered(mapKnowledge, biomeId, coordinate);
    
    if (!alreadyDiscovered) {
      biomeKnowledge.discovered_tiles.push(coordinate);
      
      // Remove from scouted tiles if present
      const key = `${coordinate[0]},${coordinate[1]}`;
      if (biomeKnowledge.scouted_tiles[key]) {
        delete biomeKnowledge.scouted_tiles[key];
      }
    }

    return {
      mapKnowledge,
      isNew: !alreadyDiscovered
    };
  }

  /**
   * Update player position in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - Coordinate [x, y]
   * @returns {Object} Updated map knowledge
   */
  updatePosition(mapKnowledge, biomeId, coordinate) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge) {
      throw new Error(`Biome ${biomeId} not initialized in map knowledge`);
    }

    biomeKnowledge.current_position = coordinate;
    mapKnowledge.current_biome = biomeId;

    return mapKnowledge;
  }

  /**
   * Get current position in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @returns {Array|null} Current position [x, y]
   */
  getCurrentPosition(mapKnowledge, biomeId) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge) return null;
    return biomeKnowledge.current_position || null;
  }

  /**
   * Get tile state (hidden, scouted, or explored)
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} position - Position [x, y]
   * @returns {string} 'hidden', 'scouted', or 'explored'
   */
  getTileState(mapKnowledge, biomeId, position) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge) return 'hidden';

    // Check if explored (discovered)
    if (this.isTileDiscovered(mapKnowledge, biomeId, position)) {
      return 'explored';
    }

    // Check if scouted
    if (this.isTileScouted(mapKnowledge, biomeId, position)) {
      return 'scouted';
    }

    return 'hidden';
  }

  /**
   * Get adjacent tiles (8 directions including diagonals)
   * @param {string} biomeId - Biome identifier
   * @param {Array} position - Center position [x, y]
   * @param {Array} gridSize - Grid size [width, height] or null to load from config
   * @returns {Array} Array of adjacent positions [[x, y], ...]
   */
  getAdjacentTiles(biomeId, position, gridSize = null) {
    const biomeGrid = this.biomeGrids[biomeId];
    
    if (!biomeGrid) {
      return [];
    }

    // Get grid size
    const size = gridSize || biomeGrid.grid_size;
    const width = Array.isArray(size) ? size[0] : size.width;
    const height = Array.isArray(size) ? size[1] : size.height;

    const [x, y] = position;
    const adjacent = [];

    // 8 directions: N, NE, E, SE, S, SW, W, NW
    const directions = [
      [-1, 0],  // N
      [-1, 1],  // NE
      [0, 1],   // E
      [1, 1],   // SE
      [1, 0],   // S
      [1, -1],  // SW
      [0, -1],  // W
      [-1, -1]  // NW
    ];

    for (const [dx, dy] of directions) {
      const newX = x + dx;
      const newY = y + dy;

      // Check bounds - x is row (height), y is column (width)
      if (newX >= 0 && newX < height && newY >= 0 && newY < width) {
        adjacent.push([newX, newY]);
      }
    }

    return adjacent;
  }

  /**
   * Explore a tile (mark as explored and move player)
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} position - Position [x, y]
   * @returns {Object} Updated map knowledge
   */
  exploreTile(mapKnowledge, biomeId, position) {
    const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
    if (!biomeKnowledge) {
      throw new Error(`Biome ${biomeId} not initialized in map knowledge`);
    }

    // Mark tile as discovered/explored
    const result = this.discoverTile(mapKnowledge, biomeId, position);
    
    // Update player position
    this.updatePosition(mapKnowledge, biomeId, position);

    return result.mapKnowledge;
  }

  /**
   * Get grid with fog of war applied
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Object} gridData - Grid data from biome_grids.json
   * @returns {Array} 2D array representing the grid with fog states
   */
  getGridWithFogOfWar(mapKnowledge, biomeId, gridData) {
    if (!gridData) return null;

    const size = gridData.grid_size;
    const width = Array.isArray(size) ? size[0] : size.width;
    const height = Array.isArray(size) ? size[1] : size.height;

    // Initialize grid
    const grid = [];
    for (let x = 0; x < height; x++) {
      grid[x] = [];
      for (let y = 0; y < width; y++) {
        const state = this.getTileState(mapKnowledge, biomeId, [x, y]);
        const tileKey = `${x},${y}`;
        
        let tileInfo = {
          position: [x, y],
          state: state
        };

        // Get tile data from gridData
        const tileLoc = gridData.tile_locations ? gridData.tile_locations[tileKey] : null;
        const subLocData = gridData.sub_locations ? 
          Object.entries(gridData.sub_locations).find(([id, data]) => 
            data.position && data.position[0] === x && data.position[1] === y
          ) : null;

        if (state === 'explored') {
          // Full information
          if (tileLoc) {
            tileInfo = { ...tileInfo, ...tileLoc };
          } else if (subLocData) {
            const [subId, subData] = subLocData;
            tileInfo.sublocation_id = subId;
            tileInfo.position = subData.position;
          }
        } else if (state === 'scouted') {
          // Partial information
          const biomeKnowledge = this.getBiomeMapKnowledge(mapKnowledge, biomeId);
          if (biomeKnowledge && biomeKnowledge.scouted_tiles) {
            const scoutedData = biomeKnowledge.scouted_tiles[tileKey];
            if (scoutedData) {
              tileInfo.scouted_info = scoutedData;
            }
          }
        } else {
          // Hidden - only show question marks
          tileInfo.hidden = true;
        }

        grid[x][y] = tileInfo;
      }
    }

    return grid;
  }

  /**
   * Initialize biome entry for a player
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @returns {Object} Updated map knowledge
   */
  initializeBiomeEntry(mapKnowledge, biomeId) {
    const biomeGrid = this.biomeGrids[biomeId];
    
    if (!biomeGrid) {
      throw new Error(`Biome grid not found for ${biomeId}`);
    }

    const startingPosition = biomeGrid.starting_position || [2, 2];
    
    // Initialize biome map knowledge
    if (!mapKnowledge.biome_map_knowledge) {
      mapKnowledge.biome_map_knowledge = {};
    }

    if (!mapKnowledge.biome_map_knowledge[biomeId]) {
      mapKnowledge.biome_map_knowledge[biomeId] = {
        current_position: startingPosition,
        discovered_tiles: [startingPosition],
        scouted_tiles: {},
        fog_hints: {},
        entry_timestamp: new Date().toISOString()
      };
    }

    mapKnowledge.current_biome = biomeId;

    return mapKnowledge;
  }

  /**
   * Format danger hint from monster spawn types
   * @param {Array} monsterSpawnTypes - Array of spawn type strings
   * @returns {string} Formatted danger hint
   */
  static formatDangerHint(monsterSpawnTypes) {
    if (!monsterSpawnTypes || monsterSpawnTypes.length === 0) {
      return 'Danger: Unknown';
    }
    return `Danger: ${monsterSpawnTypes.join(', ')}`;
  }

  /**
   * Get default encounter chance for exploration
   * @returns {number} Default encounter chance (0.3 = 30%)
   */
  static getDefaultEncounterChance() {
    return 0.3;
  }
}

module.exports = MapKnowledgeManager;
