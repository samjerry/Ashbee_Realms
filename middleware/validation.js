/**
 * validation.js
 * Input validation schemas and middleware using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(value) {
  if (!value) return value;
  // Escape HTML entities and trim whitespace
  return validator.escape(validator.trim(value));
}

/**
 * Character creation validation
 */
const validateCharacterCreate = [
  body('channel').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('classType').isString().trim().isIn(['warrior', 'mage', 'ranger', 'cleric', 'rogue', 'paladin', 'barbarian', 'monk', 'druid', 'bard']),
  body('nameColor').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/),
  handleValidationErrors
];

/**
 * Player progress save validation
 */
const validateProgressSave = [
  body('channel').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('progress').optional().isObject(),
  body('progress.name').optional().isString().trim().isLength({ min: 1, max: 50 }).customSanitizer(sanitizeString),
  body('progress.level').optional().isInt({ min: 1, max: 100 }),
  body('progress.xp').optional().isInt({ min: 0, max: 1000000000 }),
  body('progress.gold').optional().isInt({ min: 0, max: 100000000 }),
  body('progress.hp').optional().isInt({ min: 0, max: 1000000 }),
  body('progress.max_hp').optional().isInt({ min: 1, max: 1000000 }),
  body('progress.location').optional().isString().trim().isLength({ min: 1, max: 100 }).customSanitizer(sanitizeString),
  handleValidationErrors
];

/**
 * Equipment action validation
 */
const validateEquipment = [
  body('channel').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('itemId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('slot').optional().isString().trim().isIn(['headgear', 'armor', 'legs', 'footwear', 'hands', 'cape', 'off_hand', 'amulet', 'ring1', 'ring2', 'belt', 'main_hand', 'relic1', 'relic2', 'relic3']),
  handleValidationErrors
];

/**
 * Combat action validation
 */
const validateCombatAction = [
  body('monsterId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('channelName').optional().isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('skillId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('itemId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  handleValidationErrors
];

/**
 * Channel/query parameter validation
 */
const validateChannelQuery = [
  query('channel').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  handleValidationErrors
];

/**
 * Name color update validation
 */
const validateNameColor = [
  body('nameColor').isString().matches(/^#[0-9A-Fa-f]{6}$/),
  handleValidationErrors
];

/**
 * Operator command validation
 */
const validateOperatorCommand = [
  body('channel').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('command').isString().trim().isLength({ min: 1, max: 50 }).isAlphanumeric(),
  body('params').optional().isObject(),
  body('params.playerId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('params.amount').optional().isInt({ min: -1000000, max: 1000000 }),
  body('params.itemId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('params.quantity').optional().isInt({ min: 1, max: 1000 }),
  body('params.level').optional().isInt({ min: 1, max: 100 }),
  body('params.location').optional().isString().trim().isLength({ min: 1, max: 100 }).customSanitizer(sanitizeString),
  handleValidationErrors
];

/**
 * XP/Gold amount validation
 */
const validateAmount = [
  body('channel').isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('amount').isInt({ min: 1, max: 10000000 }),
  handleValidationErrors
];

/**
 * Generic ID parameter validation
 */
const validateIdParam = [
  param('id').isString().trim().isLength({ min: 1, max: 100 }),
  handleValidationErrors
];

/**
 * Quest/Achievement ID validation
 */
const validateQuestAchievement = [
  body('channel').optional().isString().trim().isLength({ min: 1, max: 50 }).escape(),
  body('questId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('achievementId').optional().isString().trim().isLength({ min: 1, max: 100 }),
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('perPage').optional().isInt({ min: 1, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0, max: 10000 }),
  handleValidationErrors
];

/**
 * Search/filter validation
 */
const validateSearch = [
  query('query').optional().isString().trim().isLength({ min: 0, max: 200 }).customSanitizer(sanitizeString),
  query('sort').optional().isString().trim().isIn(['asc', 'desc', 'created', 'updated', 'level', 'gold', 'name']),
  handleValidationErrors
];

/**
 * Validate stats object
 */
function validateStatsObject(stats) {
  if (!stats || typeof stats !== 'object') {
    return { valid: false, error: 'Stats must be an object' };
  }

  const validStats = ['attack', 'defense', 'magic', 'agility', 'strength', 'hp', 'maxHp', 'mana', 'maxMana'];
  
  for (const [key, value] of Object.entries(stats)) {
    if (!validStats.includes(key)) {
      return { valid: false, error: `Invalid stat: ${key}` };
    }
    
    if (typeof value !== 'number' || value < 0 || value > 100000) {
      return { valid: false, error: `Invalid value for ${key}: must be 0-100000` };
    }
  }

  return { valid: true };
}

/**
 * Validate inventory array
 */
function validateInventory(inventory) {
  if (!Array.isArray(inventory)) {
    return { valid: false, error: 'Inventory must be an array' };
  }

  if (inventory.length > 1000) {
    return { valid: false, error: 'Inventory size exceeds maximum (1000)' };
  }

  return { valid: true };
}

/**
 * Custom validation middleware factory
 */
function createValidator(validationFn, errorMessage = 'Validation failed') {
  return (req, res, next) => {
    const result = validationFn(req.body);
    if (!result.valid) {
      return res.status(400).json({ 
        error: errorMessage,
        details: result.error 
      });
    }
    next();
  };
}

module.exports = {
  // Middleware
  handleValidationErrors,
  
  // Validation chains
  validateCharacterCreate,
  validateProgressSave,
  validateEquipment,
  validateCombatAction,
  validateChannelQuery,
  validateNameColor,
  validateOperatorCommand,
  validateAmount,
  validateIdParam,
  validateQuestAchievement,
  validatePagination,
  validateSearch,
  
  // Custom validators
  validateStatsObject,
  validateInventory,
  createValidator,
  
  // Utilities
  sanitizeString
};
