/**
 * asciiMapGenerator.js
 * Utilities for generating ASCII art and grid-based text map visualizations
 */

import worldGrid from '../data/world_grid.json';

/**
 * Get danger level color class for Tailwind
 * @param {number} dangerLevel - Danger level (0-5)
 * @returns {string} Tailwind color class
 */
export const getDangerColor = (dangerLevel) => {
  const colors = {
    0: 'text-green-500',
    1: 'text-green-500',
    2: 'text-blue-500',
    3: 'text-yellow-500',
    4: 'text-orange-500',
    5: 'text-red-500',
  };
  return colors[dangerLevel] || 'text-gray-500';
};

/**
 * Get danger level background color class for Tailwind
 * @param {number} dangerLevel - Danger level (0-5)
 * @returns {string} Tailwind background color class
 */
export const getDangerBgColor = (dangerLevel) => {
  const colors = {
    0: 'bg-green-500/20 border-green-500',
    1: 'bg-green-500/20 border-green-500',
    2: 'bg-blue-500/20 border-blue-500',
    3: 'bg-yellow-500/20 border-yellow-500',
    4: 'bg-orange-500/20 border-orange-500',
    5: 'bg-red-500/20 border-red-500',
  };
  return colors[dangerLevel] || 'bg-gray-500/20 border-gray-500';
};

/**
 * Generate ASCII art representation for a biome
 * @param {Object} biome - Biome data
 * @param {boolean} discovered - Whether the biome is discovered
 * @returns {string} ASCII art string
 */
export const generateBiomeAscii = (biome, discovered = true) => {
  if (!discovered) {
    return `
╔════════════════╗
║   UNEXPLORED   ║
║      ???       ║
║   [UNKNOWN]    ║
╚════════════════╝
    `;
  }

  const gridData = worldGrid.biome_coordinates[biome.id];
  const icon = gridData?.icon || '🗺️';
  const name = biome.name.toUpperCase();
  
  // Pad name to fit in box
  const maxWidth = 16;
  const namePadded = name.length > maxWidth 
    ? name.substring(0, maxWidth) 
    : name.padEnd(maxWidth);
  
  return `
╔════════════════╗
║ ${icon}  ${namePadded.substring(0, 12)} ║
║ Danger Lv: ${biome.danger_level}   ║
╚════════════════╝
  `;
};

/**
 * Generate a text-based world grid map
 * @param {Object} mapKnowledge - Player's map knowledge
 * @param {Array} biomes - Array of biome objects
 * @param {string} currentBiomeId - Current location
 * @returns {Object} Grid data for rendering
 */
export const generateWorldGrid = (mapKnowledge, biomes, currentBiomeId) => {
  const { grid_size, biome_coordinates } = worldGrid;
  const grid = [];
  
  // Initialize empty grid
  for (let y = 0; y < grid_size.height; y++) {
    const row = [];
    for (let x = 0; x < grid_size.width; x++) {
      row.push({
        x,
        y,
        type: 'empty',
        content: '░░',
        discovered: false,
        biome: null,
        isCurrent: false
      });
    }
    grid.push(row);
  }
  
  // Fill in biomes
  Object.entries(biome_coordinates).forEach(([biomeId, coords]) => {
    const biome = biomes.find(b => b.id === biomeId);
    if (!biome) return;
    
    const discovered = mapKnowledge?.discovered_regions?.includes(biomeId) || false;
    const isCurrent = biomeId === currentBiomeId;
    
    if (coords.x >= 0 && coords.x < grid_size.width && 
        coords.y >= 0 && coords.y < grid_size.height) {
      grid[coords.y][coords.x] = {
        x: coords.x,
        y: coords.y,
        type: 'biome',
        content: discovered ? coords.abbreviation : '##',
        discovered,
        biome,
        biomeId,
        isCurrent,
        icon: coords.icon,
        dangerLevel: biome.danger_level
      };
    }
  });
  
  return {
    grid,
    width: grid_size.width,
    height: grid_size.height
  };
};

/**
 * Calculate travel distance between two biomes on the grid
 * @param {string} fromBiomeId - Starting biome
 * @param {string} toBiomeId - Destination biome
 * @returns {number} Manhattan distance
 */
export const calculateGridDistance = (fromBiomeId, toBiomeId) => {
  const fromCoords = worldGrid.biome_coordinates[fromBiomeId];
  const toCoords = worldGrid.biome_coordinates[toBiomeId];
  
  if (!fromCoords || !toCoords) return 0;
  
  // Manhattan distance
  return Math.abs(toCoords.x - fromCoords.x) + Math.abs(toCoords.y - fromCoords.y);
};

/**
 * Get adjacent biomes on the grid
 * @param {string} biomeId - Current biome
 * @returns {Array} Array of adjacent biome IDs
 */
export const getAdjacentBiomes = (biomeId) => {
  // Use predefined adjacency map
  return worldGrid.adjacency_map[biomeId] || [];
};

/**
 * Check if a biome is adjacent to current location
 * @param {string} currentBiomeId - Current location
 * @param {string} targetBiomeId - Target biome
 * @returns {boolean} Whether biomes are adjacent
 */
export const isAdjacent = (currentBiomeId, targetBiomeId) => {
  const adjacent = getAdjacentBiomes(currentBiomeId);
  return adjacent.includes(targetBiomeId);
};

/**
 * Get biome coordinates
 * @param {string} biomeId - Biome identifier
 * @returns {Object} {x, y, abbreviation, icon} or null
 */
export const getBiomeCoordinates = (biomeId) => {
  return worldGrid.biome_coordinates[biomeId] || null;
};

/**
 * Format discovery statistics for display
 * @param {Object} stats - Discovery stats from MapKnowledgeManager
 * @returns {string} Formatted string
 */
export const formatDiscoveryStats = (stats) => {
  if (!stats) return 'No exploration data';
  
  return `${stats.discoveredRegions}/${stats.totalRegions} regions discovered (${stats.discoveryPercentage}%)`;
};

/**
 * Generate ASCII compass/direction indicator
 * @returns {string} ASCII compass
 */
export const generateCompass = () => {
  return `
    N
    ↑
W ← + → E
    ↓
    S
  `;
};

/**
 * Generate legend for the map
 * @param {Array} biomes - Biome array with discovery status
 * @returns {Array} Legend entries
 */
export const generateMapLegend = (biomes) => {
  const legend = [
    { symbol: '[@]', description: 'Your Location', color: 'text-primary-500' },
    { symbol: '░░', description: 'Undiscovered Area', color: 'text-gray-600' },
    { symbol: '##', description: 'Unknown Region', color: 'text-gray-500' },
  ];
  
  // Add discovered biomes
  const discovered = biomes.filter(b => b.discovered);
  discovered.forEach(biome => {
    const coords = getBiomeCoordinates(biome.id);
    if (coords) {
      legend.push({
        symbol: coords.abbreviation,
        description: biome.name,
        color: getDangerColor(biome.danger_level),
        icon: coords.icon
      });
    }
  });
  
  return legend;
};

/**
 * Generate discovery progress bar
 * @param {Object} stats - Discovery statistics
 * @returns {Object} Progress bar data
 */
export const generateProgressBar = (stats) => {
  if (!stats) {
    return {
      percentage: 0,
      label: '0/0',
      color: 'bg-gray-500'
    };
  }
  
  const percentage = parseFloat(stats.discoveryPercentage) || 0;
  let color = 'bg-gray-500';
  
  if (percentage >= 100) color = 'bg-purple-500';
  else if (percentage >= 75) color = 'bg-green-500';
  else if (percentage >= 50) color = 'bg-blue-500';
  else if (percentage >= 25) color = 'bg-yellow-500';
  else color = 'bg-orange-500';
  
  return {
    percentage,
    label: `${stats.discoveredRegions}/${stats.totalRegions}`,
    color
  };
};

export default {
  getDangerColor,
  getDangerBgColor,
  generateBiomeAscii,
  generateWorldGrid,
  calculateGridDistance,
  getAdjacentBiomes,
  isAdjacent,
  getBiomeCoordinates,
  formatDiscoveryStats,
  generateCompass,
  generateMapLegend,
  generateProgressBar
};
