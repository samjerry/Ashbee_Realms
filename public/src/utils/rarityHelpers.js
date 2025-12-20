/**
 * Rarity configuration with colors and gradients
 * Matches the visual design for player roles but uses distinct rarity colors
 */
export const RARITY_CONFIG = {
  common: {
    color: '#B0B0B0',
    name: 'Common',
    vibe: 'Reliable, unremarkable, gets the job done'
  },
  uncommon: {
    color: '#2ECC71',
    name: 'Uncommon',
    vibe: 'A pleasant surprise, slightly magical'
  },
  rare: {
    color: '#3498DB',
    name: 'Rare',
    vibe: 'Cool, refined, worth showing off'
  },
  epic: {
    color: '#9B59B6',
    name: 'Epic',
    vibe: 'Dramatic, powerful, narratively important'
  },
  legendary: {
    color: '#F1C40F',
    name: 'Legendary',
    vibe: 'Sung by bards, stolen by heroes'
  },
  mythic: {
    gradient: 'linear-gradient(135deg, #B11226 0%, #FF3B3B 100%)',
    name: 'Mythic',
    vibe: 'Blood core igniting into flame'
  }
};

/**
 * Get the color for a specific rarity
 * @param {string} rarity - The rarity level (common, uncommon, rare, epic, legendary, mythic)
 * @returns {string} Hex color code or gradient string
 */
export function getRarityColor(rarity) {
  if (!rarity) return RARITY_CONFIG.common.color;
  
  const rarityLower = rarity.toLowerCase();
  const config = RARITY_CONFIG[rarityLower];
  
  if (!config) return RARITY_CONFIG.common.color;
  
  // Return gradient for mythic, color for others
  return config.gradient || config.color;
}

/**
 * Get the CSS class name for rarity text styling
 * @param {string} rarity - The rarity level
 * @returns {string} CSS class name (e.g., 'rarity-common', 'rarity-mythic')
 */
export function getRarityTextClass(rarity) {
  if (!rarity) return 'rarity-common';
  return `rarity-${rarity.toLowerCase()}`;
}

/**
 * Get the gradient string for mythic rarity (for special effects)
 * @param {string} rarity - The rarity level
 * @returns {string|null} Gradient string if mythic, null otherwise
 */
export function getRarityGradient(rarity) {
  if (!rarity) return null;
  
  const rarityLower = rarity.toLowerCase();
  if (rarityLower === 'mythic') {
    return RARITY_CONFIG.mythic.gradient;
  }
  
  return null;
}

/**
 * Check if a rarity is mythic (needs special gradient rendering)
 * @param {string} rarity - The rarity level
 * @returns {boolean} True if mythic
 */
export function isMythicRarity(rarity) {
  return rarity && rarity.toLowerCase() === 'mythic';
}

/**
 * Get rarity name for display
 * @param {string} rarity - The rarity level
 * @returns {string} Display name
 */
export function getRarityName(rarity) {
  if (!rarity) return RARITY_CONFIG.common.name;
  
  const rarityLower = rarity.toLowerCase();
  const config = RARITY_CONFIG[rarityLower];
  
  return config?.name || RARITY_CONFIG.common.name;
}
