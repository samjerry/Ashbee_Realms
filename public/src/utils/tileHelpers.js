/**
 * tileHelpers.js
 * Helper functions for biome grid tile management
 */

/**
 * Get danger hint level based on danger level
 * @param {number} dangerLevel - Danger level (0-5)
 * @returns {string} 'low' | 'moderate' | 'high'
 */
export const getDangerHint = (dangerLevel) => {
  if (dangerLevel <= 1) return 'low';
  if (dangerLevel <= 3) return 'moderate';
  return 'high';
};

/**
 * Generate cryptic hint text based on tile properties
 * @param {Object} tileData - Tile data object
 * @returns {string} Flavor text hint
 */
export const generateTileHint = (tileData) => {
  if (!tileData) return 'Nothing of note...';

  const { type, danger_level, encounter_chance, loot_chance, name } = tileData;

  // Generate hints based on properties
  const hints = [];

  // Danger hints
  if (danger_level >= 4) {
    hints.push('A sense of dread fills the air...');
  } else if (danger_level >= 3) {
    hints.push('You feel uneasy about this area...');
  } else if (danger_level >= 2) {
    hints.push('Something stirs in the distance...');
  } else {
    hints.push('The area seems peaceful...');
  }

  // Encounter hints
  if (encounter_chance && encounter_chance > 0.4) {
    hints.push('You hear movement nearby.');
  } else if (encounter_chance && encounter_chance > 0.25) {
    hints.push('Faint sounds echo through the area.');
  }

  // Loot hints
  if (loot_chance && loot_chance > 0.4) {
    hints.push('You spot something glinting...');
  } else if (loot_chance && loot_chance > 0.25) {
    hints.push('There might be something valuable here.');
  }

  // Type hints
  if (type === 'sublocation') {
    hints.push('A notable landmark lies ahead.');
  }

  // Return a random hint or combine them
  if (hints.length === 0) return 'The path continues onward...';
  if (hints.length === 1) return hints[0];
  
  // Combine first two hints if available
  return `${hints[0]} ${hints[1]}`;
};

/**
 * Calculate Manhattan distance between two coordinates
 * @param {Array} from - [x, y] starting coordinate
 * @param {Array} to - [x, y] destination coordinate
 * @returns {number} Manhattan distance
 */
export const calculateTileDistance = (from, to) => {
  if (!from || !to || from.length < 2 || to.length < 2) return 0;
  return Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1]);
};

/**
 * Get danger shimmer class based on distance
 * @param {number} distance - Distance from player
 * @returns {string} CSS class name
 */
export const getDangerShimmer = (distance) => {
  if (distance <= 1) return 'shimmer-intense';
  if (distance <= 3) return 'shimmer-moderate';
  return 'shimmer-faint';
};

/**
 * Get danger color class based on danger level
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
 * Get danger background color class based on danger level
 * @param {number} dangerLevel - Danger level (0-5)
 * @returns {string} Tailwind background color class
 */
export const getDangerBgColor = (dangerLevel) => {
  const colors = {
    0: 'bg-green-500/20',
    1: 'bg-green-500/20',
    2: 'bg-blue-500/20',
    3: 'bg-yellow-500/20',
    4: 'bg-orange-500/20',
    5: 'bg-red-500/20',
  };
  return colors[dangerLevel] || 'bg-gray-500/20';
};

/**
 * Get danger border color class
 * @param {number} dangerLevel - Danger level (0-5)
 * @returns {string} Tailwind border color class
 */
export const getDangerBorderColor = (dangerLevel) => {
  const colors = {
    0: 'border-green-500',
    1: 'border-green-500',
    2: 'border-blue-500',
    3: 'border-yellow-500',
    4: 'border-orange-500',
    5: 'border-red-500',
  };
  return colors[dangerLevel] || 'border-gray-500';
};

/**
 * Get tile abbreviation (2 letters, uppercase)
 * @param {string} name - Tile name
 * @returns {string} Two-letter abbreviation
 */
export const getTileAbbreviation = (name) => {
  if (!name) return '??';
  
  // Split by spaces and take first letter of first two words
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  // If only one word, take first two letters
  return name.substring(0, 2).toUpperCase();
};

/**
 * Get danger badge text based on danger level
 * @param {number} dangerLevel - Danger level (0-5)
 * @returns {string} Badge text ('!', '!!', or '!!!')
 */
export const getDangerBadge = (dangerLevel) => {
  if (dangerLevel >= 4) return '!!!';
  if (dangerLevel >= 3) return '!!';
  if (dangerLevel >= 2) return '!';
  return '';
};

/**
 * Check if coordinates are adjacent (distance of 1)
 * @param {Array} from - [x, y] starting coordinate
 * @param {Array} to - [x, y] destination coordinate
 * @returns {boolean} True if adjacent
 */
export const isAdjacent = (from, to) => {
  return calculateTileDistance(from, to) === 1;
};

/**
 * Get terrain hint based on tile type
 * @param {string} type - Tile type ('sublocation', 'generic', 'empty')
 * @returns {string} Terrain hint
 */
export const getTerrainHint = (type) => {
  const hints = {
    'sublocation': 'building',
    'generic': 'area',
    'empty': 'empty'
  };
  return hints[type] || 'unknown';
};

/**
 * Check if a tile is visible (should show on map)
 * @param {string} fogState - Fog state ('deep', 'thin', 'revealed')
 * @returns {boolean} True if visible
 */
export const isTileVisible = (fogState) => {
  return fogState !== 'deep';
};

/**
 * Get fog overlay text
 * @param {string} fogState - Fog state ('deep', 'thin', 'revealed')
 * @returns {string} Overlay text
 */
export const getFogOverlay = (fogState) => {
  if (fogState === 'deep') return '░░░';
  if (fogState === 'thin') return '▓▓▓';
  return '';
};

export default {
  getDangerHint,
  generateTileHint,
  calculateTileDistance,
  getDangerShimmer,
  getDangerColor,
  getDangerBgColor,
  getDangerBorderColor,
  getTileAbbreviation,
  getDangerBadge,
  isAdjacent,
  getTerrainHint,
  isTileVisible,
  getFogOverlay
};
