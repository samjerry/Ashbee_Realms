const { loadData } = require('../data/data_loader');

/**
 * Consumable Manager - Handles consumable item usage (potions, food, scrolls)
 */
class ConsumableManager {
  constructor() {
    this.consumablesData = loadData('consumables_extended');
    this.potions = this.consumablesData?.potions || {};
    this.food = this.consumablesData?.food || {};
    this.scrolls = this.consumablesData?.scrolls || {};
    this.reagents = this.consumablesData?.reagents || {};
    
    // Combine all consumables for easy lookup
    this.allConsumables = {
      ...this.potions,
      ...this.food,
      ...this.scrolls,
      ...this.reagents
    };
  }

  /**
   * Get consumable data by ID
   * @param {string} itemId - Consumable item ID
   * @returns {Object|null} Consumable data
   */
  getConsumable(itemId) {
    return this.allConsumables[itemId] || null;
  }

  /**
   * Check if item is a consumable
   * @param {string} itemId - Item ID
   * @returns {boolean} True if consumable
   */
  isConsumable(itemId) {
    return !!this.allConsumables[itemId];
  }

  /**
   * Use a consumable item
   * @param {Object} character - Character object
   * @param {string} itemId - Consumable item ID
   * @param {Object} context - Usage context (combat, exploration, etc.)
   * @returns {Object} Usage result { success, effect, message, statusEffect }
   */
  useConsumable(character, itemId, context = {}) {
    const consumable = this.getConsumable(itemId);
    
    if (!consumable) {
      return {
        success: false,
        message: `Unknown consumable: ${itemId}`
      };
    }

    // Check if character has the item
    const hasItem = character.inventory.some(invItem => invItem.id === itemId && invItem.quantity > 0);
    
    if (!hasItem) {
      return {
        success: false,
        message: `You don't have ${consumable.name}`
      };
    }

    // Check cooldown
    if (this.isOnCooldown(character, itemId)) {
      const remaining = this.getCooldownRemaining(character, itemId);
      return {
        success: false,
        message: `${consumable.name} is on cooldown (${Math.ceil(remaining)}s remaining)`
      };
    }

    // Apply effect based on consumable type
    const result = this.applyEffect(character, consumable, context);
    
    if (result.success) {
      // Set cooldown
      this.setCooldown(character, itemId, consumable.cooldown || 0);
      
      // Consume the item (reduce quantity by 1)
      this.consumeItem(character, itemId);
    }

    return result;
  }

  /**
   * Apply consumable effect to character
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @param {Object} context - Usage context
   * @returns {Object} Effect result
   */
  applyEffect(character, consumable, context) {
    const result = {
      success: true,
      effect: consumable.effect,
      message: '',
      statusEffect: null
    };

    switch (consumable.type) {
      case 'health':
        result.healAmount = this.applyHealthEffect(character, consumable);
        result.message = `Restored ${result.healAmount} HP!`;
        break;

      case 'mana':
        result.manaAmount = this.applyManaEffect(character, consumable);
        result.message = `Restored ${result.manaAmount} mana!`;
        break;

      case 'buff':
        result.statusEffect = this.applyBuffEffect(character, consumable);
        result.message = `${consumable.name} activated! ${consumable.effect}`;
        break;

      case 'food':
        result.healAmount = this.applyFoodEffect(character, consumable);
        result.statusEffect = consumable.status_effect ? {
          id: consumable.status_effect,
          duration: consumable.duration || 600,
          type: 'buff'
        } : null;
        result.message = `Ate ${consumable.name}. ${consumable.effect}`;
        break;

      case 'utility':
        result.utilityEffect = this.applyUtilityEffect(character, consumable, context);
        result.message = `Used ${consumable.name}. ${consumable.effect}`;
        break;

      case 'survival':
        result.statusEffect = this.applySurvivalEffect(character, consumable);
        result.message = `${consumable.name} activated! ${consumable.effect}`;
        break;

      case 'scroll':
        result.scrollEffect = this.applyScrollEffect(character, consumable, context);
        result.message = `${consumable.name} cast! ${consumable.effect}`;
        break;

      default:
        result.success = false;
        result.message = `Unknown consumable type: ${consumable.type}`;
    }

    return result;
  }

  /**
   * Apply health restoration
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @returns {number} Amount healed
   */
  applyHealthEffect(character, consumable) {
    // Parse heal amount from effect string (e.g., "Restore 50 HP")
    const match = consumable.effect.match(/(\d+)\s*HP/);
    const healAmount = match ? parseInt(match[1]) : 0;
    
    const maxHp = character.maxHp || character.hp;
    const currentHp = character.hp;
    const actualHeal = Math.min(healAmount, maxHp - currentHp);
    
    character.hp = Math.min(currentHp + healAmount, maxHp);
    
    return actualHeal;
  }

  /**
   * Apply mana restoration
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @returns {number} Amount restored
   */
  applyManaEffect(character, consumable) {
    // Parse mana amount from effect string
    const match = consumable.effect.match(/(\d+)\s*mana/i);
    const manaAmount = match ? parseInt(match[1]) : 0;
    
    const maxMana = character.maxMana || 100;
    const currentMana = character.mana || 0;
    const actualRestore = Math.min(manaAmount, maxMana - currentMana);
    
    character.mana = Math.min(currentMana + manaAmount, maxMana);
    
    return actualRestore;
  }

  /**
   * Apply buff effect
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @returns {Object} Status effect
   */
  applyBuffEffect(character, consumable) {
    return {
      id: consumable.status_effect,
      name: consumable.name,
      duration: consumable.duration || 600,
      type: 'buff',
      effect: consumable.effect
    };
  }

  /**
   * Apply food effect (heal over time + buffs)
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @returns {number} Immediate heal amount
   */
  applyFoodEffect(character, consumable) {
    // Food typically heals a smaller amount immediately
    const match = consumable.effect.match(/(\d+)\s*HP/);
    const healAmount = match ? parseInt(match[1]) : 0;
    
    if (healAmount > 0) {
      const maxHp = character.maxHp || character.hp;
      const currentHp = character.hp;
      const actualHeal = Math.min(healAmount, maxHp - currentHp);
      
      character.hp = Math.min(currentHp + healAmount, maxHp);
      
      return actualHeal;
    }
    
    return 0;
  }

  /**
   * Apply utility effect (teleportation, invisibility, etc.)
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @param {Object} context - Usage context
   * @returns {Object} Utility effect data
   */
  applyUtilityEffect(character, consumable, context) {
    if (consumable.status_effect === 'invisibility') {
      return {
        id: 'invisibility',
        duration: consumable.duration || 60,
        type: 'utility'
      };
    }
    
    if (consumable.effect.includes('teleport')) {
      return {
        type: 'teleport',
        destination: context.destination || 'brindlewatch'
      };
    }
    
    return { type: 'generic', effect: consumable.effect };
  }

  /**
   * Apply survival effect (revive, immortality, etc.)
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @returns {Object} Status effect
   */
  applySurvivalEffect(character, consumable) {
    return {
      id: consumable.status_effect,
      name: consumable.name,
      duration: consumable.duration || 3600,
      type: 'survival',
      effect: consumable.effect
    };
  }

  /**
   * Apply scroll effect (spells, summons, etc.)
   * @param {Object} character - Character object
   * @param {Object} consumable - Consumable data
   * @param {Object} context - Usage context
   * @returns {Object} Scroll effect data
   */
  applyScrollEffect(character, consumable, context) {
    // Scrolls can cast spells, summon creatures, etc.
    return {
      type: 'scroll',
      spellEffect: consumable.effect,
      context: context
    };
  }

  /**
   * Check if consumable is on cooldown
   * @param {Object} character - Character object
   * @param {string} itemId - Consumable item ID
   * @returns {boolean} True if on cooldown
   */
  isOnCooldown(character, itemId) {
    if (!character.consumableCooldowns) {
      character.consumableCooldowns = {};
    }
    
    const cooldownEnd = character.consumableCooldowns[itemId];
    
    if (!cooldownEnd) return false;
    
    return Date.now() < cooldownEnd;
  }

  /**
   * Get remaining cooldown time
   * @param {Object} character - Character object
   * @param {string} itemId - Consumable item ID
   * @returns {number} Seconds remaining
   */
  getCooldownRemaining(character, itemId) {
    if (!character.consumableCooldowns) return 0;
    
    const cooldownEnd = character.consumableCooldowns[itemId];
    
    if (!cooldownEnd) return 0;
    
    const remaining = (cooldownEnd - Date.now()) / 1000;
    return Math.max(0, remaining);
  }

  /**
   * Set cooldown for consumable
   * @param {Object} character - Character object
   * @param {string} itemId - Consumable item ID
   * @param {number} cooldownSeconds - Cooldown duration in seconds
   */
  setCooldown(character, itemId, cooldownSeconds) {
    if (!character.consumableCooldowns) {
      character.consumableCooldowns = {};
    }
    
    character.consumableCooldowns[itemId] = Date.now() + (cooldownSeconds * 1000);
  }

  /**
   * Consume item (reduce quantity)
   * @param {Object} character - Character object
   * @param {string} itemId - Item ID to consume
   */
  consumeItem(character, itemId) {
    const itemIndex = character.inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      character.inventory[itemIndex].quantity -= 1;
      
      // Remove item if quantity reaches 0
      if (character.inventory[itemIndex].quantity <= 0) {
        character.inventory.splice(itemIndex, 1);
      }
    }
  }

  /**
   * Get all potions by rarity
   * @param {string} rarity - Rarity level (common, uncommon, rare, epic, legendary)
   * @returns {Array} Array of potions
   */
  getPotionsByRarity(rarity) {
    return Object.entries(this.potions)
      .filter(([_, potion]) => potion.rarity === rarity)
      .map(([id, potion]) => ({ id, ...potion }));
  }

  /**
   * Get all food by rarity
   * @param {string} rarity - Rarity level
   * @returns {Array} Array of food items
   */
  getFoodByRarity(rarity) {
    return Object.entries(this.food)
      .filter(([_, food]) => food.rarity === rarity)
      .map(([id, food]) => ({ id, ...food }));
  }

  /**
   * Get consumables by type
   * @param {string} type - Consumable type (health, buff, food, scroll, etc.)
   * @returns {Array} Array of consumables
   */
  getConsumablesByType(type) {
    return Object.entries(this.allConsumables)
      .filter(([_, consumable]) => consumable.type === type)
      .map(([id, consumable]) => ({ id, ...consumable }));
  }

  /**
   * Get buyable consumables (for shops)
   * @param {string} shopType - Shop type (general, potion, etc.)
   * @returns {Array} Array of consumables with prices
   */
  getBuyableConsumables(shopType = 'general') {
    const filtered = Object.entries(this.allConsumables)
      .filter(([_, consumable]) => consumable.price && consumable.price > 0);
    
    if (shopType === 'potion') {
      return filtered
        .filter(([_, consumable]) => consumable.type === 'health' || consumable.type === 'buff')
        .map(([id, consumable]) => ({ id, ...consumable }));
    }
    
    if (shopType === 'food') {
      return filtered
        .filter(([_, consumable]) => consumable.type === 'food')
        .map(([id, consumable]) => ({ id, ...consumable }));
    }
    
    // General shop - return all with prices
    return filtered.map(([id, consumable]) => ({ id, ...consumable }));
  }
}

module.exports = ConsumableManager;
