/**
 * MapKnowledgeManager.js
 * Manages the fog of war and map discovery system
 * Tracks which regions and sub-locations have been discovered by players
 */

const { loadData } = require('../data/data_loader');

class MapKnowledgeManager {
  constructor() {
    this.biomes = loadData('biomes')?.biomes || {};
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
      current_biome: 'town_square', // Current biome player is in
      biome_map_knowledge: {
        'town_square': {
          discovered_tiles: [[4, 4]], // Starting position in town square
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
  initializeBiomeMapKnowledge(mapKnowledge, biomeId, startingPosition = null) {
    if (!mapKnowledge.biome_map_knowledge) {
      mapKnowledge.biome_map_knowledge = {};
    }

    if (!mapKnowledge.biome_map_knowledge[biomeId]) {
      mapKnowledge.biome_map_knowledge[biomeId] = {
        discovered_tiles: startingPosition ? [startingPosition] : [],
        scouted_tiles: {},
        fog_hints: {},
        current_position: startingPosition || null
      };
    }

    return mapKnowledge;
  }

  /**
   * Check if a tile is discovered in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - [x, y] coordinate
   * @returns {boolean} True if discovered
   */
  isTileDiscovered(mapKnowledge, biomeId, coordinate) {
    const biomeKnowledge = mapKnowledge?.biome_map_knowledge?.[biomeId];
    if (!biomeKnowledge) return false;

    return biomeKnowledge.discovered_tiles.some(
      tile => tile[0] === coordinate[0] && tile[1] === coordinate[1]
    );
  }

  /**
   * Check if a tile is scouted in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - [x, y] coordinate
   * @returns {boolean} True if scouted
   */
  isTileScouted(mapKnowledge, biomeId, coordinate) {
    const biomeKnowledge = mapKnowledge?.biome_map_knowledge?.[biomeId];
    if (!biomeKnowledge) return false;

    const coordStr = `${coordinate[0]},${coordinate[1]}`;
    return !!biomeKnowledge.scouted_tiles[coordStr];
  }

  /**
   * Add a discovered tile to biome knowledge
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - [x, y] coordinate
   * @returns {Object} Updated map knowledge
   */
  discoverTile(mapKnowledge, biomeId, coordinate) {
    // Initialize biome knowledge if needed
    this.initializeBiomeMapKnowledge(mapKnowledge, biomeId);

    const biomeKnowledge = mapKnowledge.biome_map_knowledge[biomeId];

    // Check if already discovered
    if (!this.isTileDiscovered(mapKnowledge, biomeId, coordinate)) {
      biomeKnowledge.discovered_tiles.push(coordinate);
    }

    // Remove from scouted tiles if present
    const coordStr = `${coordinate[0]},${coordinate[1]}`;
    if (biomeKnowledge.scouted_tiles[coordStr]) {
      delete biomeKnowledge.scouted_tiles[coordStr];
    }

    return mapKnowledge;
  }

  /**
   * Add a scouted tile to biome knowledge
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - [x, y] coordinate
   * @param {Object} scoutData - Scouted data (danger_hint, terrain_hint)
   * @returns {Object} Updated map knowledge
   */
  scoutTile(mapKnowledge, biomeId, coordinate, scoutData) {
    // Initialize biome knowledge if needed
    this.initializeBiomeMapKnowledge(mapKnowledge, biomeId);

    const biomeKnowledge = mapKnowledge.biome_map_knowledge[biomeId];
    const coordStr = `${coordinate[0]},${coordinate[1]}`;

    // Only scout if not already discovered
    if (!this.isTileDiscovered(mapKnowledge, biomeId, coordinate)) {
      biomeKnowledge.scouted_tiles[coordStr] = {
        ...scoutData,
        scouted_at: new Date().toISOString()
      };
    }

    return mapKnowledge;
  }

  /**
   * Update player's position in a biome
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - [x, y] coordinate
   * @returns {Object} Updated map knowledge
   */
  updateBiomePosition(mapKnowledge, biomeId, coordinate) {
    // Initialize biome knowledge if needed
    this.initializeBiomeMapKnowledge(mapKnowledge, biomeId);

    mapKnowledge.biome_map_knowledge[biomeId].current_position = coordinate;
    mapKnowledge.current_biome = biomeId;

    return mapKnowledge;
  }

  /**
   * Get fog state for a tile
   * @param {Object} mapKnowledge - Player's map knowledge
   * @param {string} biomeId - Biome identifier
   * @param {Array} coordinate - [x, y] coordinate
   * @returns {string} 'deep' | 'thin' | 'revealed'
   */
  getTileFogState(mapKnowledge, biomeId, coordinate) {
    if (this.isTileDiscovered(mapKnowledge, biomeId, coordinate)) {
      return 'revealed';
    }
    if (this.isTileScouted(mapKnowledge, biomeId, coordinate)) {
      return 'thin';
    }
    return 'deep';
  }
}

module.exports = MapKnowledgeManager;
