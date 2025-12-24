/**
 * tileHelpers.js
 * Utility functions for biome grid exploration system
 */

/**
 * Calculate Manhattan distance between two coordinates
 * @param {Array} from - Starting coordinate [x, y]
 * @param {Array} to - Target coordinate [x, y]
 * @returns {number} Manhattan distance
 */
export const calculateDistance = (from, to) => {
  return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
};

/**
 * Get adjacent coordinate based on direction
 * @param {Array} coords - Current coordinate [x, y]
 * @param {string} direction - Direction (N, S, E, W)
 * @returns {Array} Adjacent coordinate [x, y]
 */
export const getAdjacentCoordinate = (coords, direction) => {
  const offsets = {
    N: [0, -1],
    S: [0, 1],
    E: [1, 0],
    W: [-1, 0]
  };
  const [dx, dy] = offsets[direction];
  return [coords[0] + dx, coords[1] + dy];
};

/**
 * Convert danger level to hint text
 * @param {number} dangerLevel - Danger level (1-5)
 * @returns {string} Danger hint ('low', 'moderate', 'high')
 */
export const getDangerHint = (dangerLevel) => {
  if (dangerLevel <= 1) return 'low';
  if (dangerLevel <= 3) return 'moderate';
  return 'high';
};

/**
 * Get danger color class for Tailwind
 * @param {number} dangerLevel - Danger level (1-5)
 * @returns {string} Tailwind color class
 */
export const getDangerColor = (dangerLevel) => {
  const colors = {
    1: 'text-green-400',
    2: 'text-blue-400',
    3: 'text-yellow-400',
    4: 'text-orange-400',
    5: 'text-red-400'
  };
  return colors[dangerLevel] || 'text-gray-400';
};

/**
 * Get danger shimmer intensity class based on distance
 * @param {number} distance - Distance from player
 * @returns {string} Shimmer CSS class
 */
export const getDangerShimmer = (distance) => {
  if (distance === 1) return 'shimmer-intense';
  if (distance === 2) return 'shimmer-moderate';
  return 'shimmer-faint';
};

/**
 * Get danger shimmer color class based on danger level
 * @param {number} dangerLevel - Danger level (1-5)
 * @returns {string} Danger color CSS class
 */
export const getDangerShimmerColor = (dangerLevel) => {
  if (dangerLevel >= 4) return 'danger-red';
  if (dangerLevel >= 2) return 'danger-yellow';
  return 'danger-green';
};

/**
 * Generate cryptic hint for a tile based on biome type
 * @param {Object} tileData - Tile data from biome_grids.json
 * @param {string} biomeType - Type of biome (forest, dungeon, cave, etc.)
 * @returns {string} Hint text
 */
export const generateTileHint = (tileData, biomeType) => {
  if (!tileData) return 'Empty wilderness ahead...';
  
  // Get biome category
  let category = 'unknown';
  if (biomeType.includes('wood') || biomeType.includes('forest')) {
    category = 'forest';
  } else if (biomeType.includes('tunnel') || biomeType.includes('cave') || biomeType.includes('dungeon')) {
    category = 'dungeon';
  } else if (biomeType.includes('swamp') || biomeType.includes('marsh')) {
    category = 'swamp';
  } else if (biomeType.includes('town') || biomeType.includes('square')) {
    category = 'town';
  } else if (biomeType.includes('mountain') || biomeType.includes('peak')) {
    category = 'mountain';
  }
  
  const hintsByBiomeType = {
    'forest': [
      'Ancient trees whisper secrets in the wind...',
      'The scent of moss and wildflowers fills the air...',
      'Birdsong mingles with rustling leaves...',
      'Shadows dance between the ancient trunks...',
      'The forest breathes with hidden life...'
    ],
    'dungeon': [
      'You hear the echo of footsteps in stone corridors...',
      'The smell of damp stone and old iron drifts from this direction...',
      'Torchlight flickers in the distance...',
      'Dark whispers echo from the depths...',
      'The air grows colder as darkness beckons...'
    ],
    'cave': [
      'Darkness beckons from underground passages...',
      'Cool air flows from hidden depths...',
      'You hear the drip of water on stone...',
      'Strange echoes resound through the caverns...',
      'The earth trembles with hidden secrets...'
    ],
    'swamp': [
      'Murky mists obscure the wetlands ahead...',
      'The croak of unseen creatures echoes...',
      'Stagnant water and decay taint the air...',
      'Twisted roots grasp at the muddy ground...',
      'Eerie lights flicker in the fog...'
    ],
    'town': [
      'You hear the bustle of activity...',
      'The sound of hammering metal echoes...',
      'Voices carry on the wind...',
      'The smell of fresh bread wafts through the air...',
      'Civilization beckons nearby...'
    ],
    'mountain': [
      'Wind howls across barren peaks...',
      'The air grows thin and cold...',
      'Distant avalanches rumble...',
      'Eagles cry from rocky crags...',
      'Ancient stones hold forgotten secrets...'
    ],
    'unknown': [
      'Something mysterious lies ahead...',
      'The unknown awaits your discovery...',
      'Strange energies emanate from this place...'
    ]
  };
  
  const hints = hintsByBiomeType[category] || hintsByBiomeType['unknown'];
  return hints[Math.floor(Math.random() * hints.length)];
};

/**
 * Convert coordinate array to string key
 * @param {Array} coord - Coordinate [x, y]
 * @returns {string} String key "x,y"
 */
export const coordToKey = (coord) => {
  return `${coord[0]},${coord[1]}`;
};

/**
 * Convert string key to coordinate array
 * @param {string} key - String key "x,y"
 * @returns {Array} Coordinate [x, y]
 */
export const keyToCoord = (key) => {
  const parts = key.split(',');
  return [parseInt(parts[0]), parseInt(parts[1])];
};

/**
 * Check if coordinates are within grid bounds
 * @param {Array} coord - Coordinate [x, y]
 * @param {Object} gridSize - Grid size {width, height}
 * @returns {boolean} True if in bounds
 */
export const isInBounds = (coord, gridSize) => {
  return coord[0] >= 0 && coord[0] < gridSize.width &&
         coord[1] >= 0 && coord[1] < gridSize.height;
};

/**
 * Get all adjacent coordinates (N, S, E, W)
 * @param {Array} coord - Current coordinate [x, y]
 * @param {Object} gridSize - Grid size {width, height}
 * @returns {Array} Array of adjacent coordinates
 */
export const getAdjacentCoordinates = (coord, gridSize) => {
  const directions = ['N', 'S', 'E', 'W'];
  return directions
    .map(dir => getAdjacentCoordinate(coord, dir))
    .filter(c => isInBounds(c, gridSize));
};

/**
 * Get fog state for a tile
 * @param {Array} coord - Coordinate [x, y]
 * @param {Object} biomeKnowledge - Biome knowledge object
 * @returns {string} 'deep', 'thin', or 'revealed'
 */
export const getFogState = (coord, biomeKnowledge) => {
  if (!biomeKnowledge) return 'deep';
  
  const key = coordToKey(coord);
  const isDiscovered = biomeKnowledge.discovered_tiles?.some(
    c => c[0] === coord[0] && c[1] === coord[1]
  );
  
  if (isDiscovered) return 'revealed';
  
  const isScouted = biomeKnowledge.scouted_tiles?.[key];
  if (isScouted) return 'thin';
  
  return 'deep';
};

/**
 * Get danger indicator for scouted tiles
 * @param {string} dangerHint - Danger hint ('low', 'moderate', 'high')
 * @returns {string} Indicator string
 */
export const getDangerIndicator = (dangerHint) => {
  const indicators = {
    'low': '!',
    'moderate': '!!',
    'high': '!!!'
  };
  return indicators[dangerHint] || '?';
};
