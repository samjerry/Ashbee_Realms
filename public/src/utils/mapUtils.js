/**
 * mapUtils.js
 * Utilities for map visualization and grid operations
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
 * Get biome coordinates
 * @param {string} biomeId - Biome identifier
 * @returns {Object} {x, y, abbreviation, icon} or null
 */
export const getBiomeCoordinates = (biomeId) => {
  return worldGrid.biome_coordinates[biomeId] || null;
};

export default {
  getDangerColor,
  getDangerBgColor,
  getBiomeCoordinates
};
