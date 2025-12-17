/**
 * sanitization.js
 * Input sanitization utilities to prevent XSS and injection attacks
 */

const validator = require('validator');

/**
 * Sanitize user input string to prevent XSS
 * @param {string} input - Raw input string
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeInput(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  const {
    maxLength = 1000,
    allowHtml = false,
    trim = true
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = validator.trim(sanitized);
  }

  // Escape HTML entities unless explicitly allowed
  if (!allowHtml) {
    sanitized = validator.escape(sanitized);
  }

  // Enforce max length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize character name
 * Prevents XSS and enforces naming rules
 */
function sanitizeCharacterName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Remove any HTML/script tags
  let sanitized = validator.escape(validator.trim(name));

  // Remove special characters except alphanumeric, spaces, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '');

  // Limit length
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }

  return sanitized;
}

/**
 * Sanitize location/place name
 */
function sanitizeLocationName(location) {
  if (!location || typeof location !== 'string') {
    return '';
  }

  let sanitized = validator.escape(validator.trim(location));
  
  // Allow alphanumeric, spaces, and common punctuation for place names
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_',]/g, '');

  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}

/**
 * Sanitize and validate hex color code
 */
function sanitizeColorCode(color) {
  if (!color || typeof color !== 'string') {
    return null;
  }

  const sanitized = validator.trim(color);
  
  // Validate hex color format
  if (!/^#[0-9A-Fa-f]{6}$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize object recursively
 * Removes dangerous keys and sanitizes string values
 */
function sanitizeObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const {
    maxDepth = 10,
    currentDepth = 0,
    dangerousKeys = ['__proto__', 'constructor', 'prototype']
  } = options;

  // Prevent prototype pollution
  if (currentDepth >= maxDepth) {
    console.warn('[SECURITY] Max depth reached in object sanitization');
    return {};
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip dangerous keys
    if (dangerousKeys.includes(key)) {
      console.warn(`[SECURITY] Blocked dangerous key: ${key}`);
      continue;
    }

    // Sanitize the key itself
    const sanitizedKey = validator.escape(key);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeInput(value, { maxLength: 10000 });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value, {
        ...options,
        currentDepth: currentDepth + 1
      });
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize chat message or user content
 */
function sanitizeChatMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }

  let sanitized = validator.trim(message);
  
  // Remove any HTML/script content
  sanitized = validator.escape(sanitized);

  // Limit message length
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }

  return sanitized;
}

/**
 * Sanitize SQL-like patterns (defense in depth, even though we use parameterized queries)
 */
function sanitizeSqlPattern(input) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  // Remove common SQL injection patterns
  const dangerous = [
    /(\-\-|;|\/\*|\*\/)/gi,  // SQL comments
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,  // SQL keywords
    /(script|javascript|onerror|onload)/gi  // XSS patterns
  ];

  let sanitized = input;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '');
  }

  return validator.escape(validator.trim(sanitized));
}

/**
 * Validate and sanitize numeric input
 */
function sanitizeNumber(input, options = {}) {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    integer = false
  } = options;

  const num = Number(input);

  if (isNaN(num)) {
    return null;
  }

  if (integer && !Number.isInteger(num)) {
    return Math.floor(num);
  }

  if (num < min) return min;
  if (num > max) return max;

  return num;
}

/**
 * Sanitize array of items
 */
function sanitizeArray(arr, itemSanitizer, options = {}) {
  if (!Array.isArray(arr)) {
    return [];
  }

  const { maxLength = 1000 } = options;

  // Limit array size
  const limited = arr.slice(0, maxLength);

  // Sanitize each item
  return limited.map(item => itemSanitizer(item)).filter(item => item !== null && item !== undefined);
}

/**
 * Sanitize inventory data
 */
function sanitizeInventory(inventory) {
  if (!Array.isArray(inventory)) {
    return [];
  }

  return sanitizeArray(inventory, (item) => {
    if (typeof item === 'string') {
      return sanitizeInput(item, { maxLength: 100 });
    } else if (typeof item === 'object' && item !== null) {
      return sanitizeObject(item, { maxDepth: 3 });
    }
    return item;
  }, { maxLength: 1000 });
}

/**
 * Sanitize equipment data
 */
function sanitizeEquipment(equipment) {
  if (!equipment || typeof equipment !== 'object') {
    return {};
  }

  const validSlots = [
    'headgear', 'armor', 'legs', 'footwear', 'hands', 'cape',
    'off_hand', 'amulet', 'ring1', 'ring2', 'belt', 'main_hand',
    'relic1', 'relic2', 'relic3'
  ];

  const sanitized = {};

  for (const slot of validSlots) {
    if (equipment[slot]) {
      if (typeof equipment[slot] === 'string') {
        sanitized[slot] = sanitizeInput(equipment[slot], { maxLength: 100 });
      } else if (typeof equipment[slot] === 'object') {
        sanitized[slot] = sanitizeObject(equipment[slot], { maxDepth: 3 });
      } else {
        sanitized[slot] = equipment[slot];
      }
    } else {
      sanitized[slot] = null;
    }
  }

  return sanitized;
}

/**
 * Sanitize player stats
 */
function sanitizePlayerStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return {};
  }

  const validStats = [
    'attack', 'defense', 'magic', 'agility', 'strength',
    'hp', 'maxHp', 'max_hp', 'mana', 'maxMana', 'max_mana',
    'critChance', 'dodgeChance', 'blockChance'
  ];

  const sanitized = {};

  for (const stat of validStats) {
    if (stats[stat] !== undefined) {
      sanitized[stat] = sanitizeNumber(stats[stat], { min: 0, max: 1000000, integer: true });
    }
  }

  return sanitized;
}

module.exports = {
  sanitizeInput,
  sanitizeCharacterName,
  sanitizeLocationName,
  sanitizeColorCode,
  sanitizeObject,
  sanitizeChatMessage,
  sanitizeSqlPattern,
  sanitizeNumber,
  sanitizeArray,
  sanitizeInventory,
  sanitizeEquipment,
  sanitizePlayerStats
};
