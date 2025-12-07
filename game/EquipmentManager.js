/**
 * EquipmentManager.js
 * Manages character equipment, slots, and stat calculations
 */

const { loadData } = require('../data/data_loader');

class EquipmentManager {
  /**
   * Valid equipment slots
   */
  static SLOTS = {
    MAIN_HAND: 'main_hand',
    OFF_HAND: 'off_hand',
    HEADGEAR: 'headgear',
    ARMOR: 'armor',
    LEGS: 'legs',
    FOOTWEAR: 'footwear',
    HANDS: 'hands',
    CAPE: 'cape',
    AMULET: 'amulet',
    RING1: 'ring1',
    RING2: 'ring2',
    BELT: 'belt',
    FLAVOR1: 'flavor1',
    FLAVOR2: 'flavor2',
    FLAVOR3: 'flavor3'
  };

  /**
   * Create a new EquipmentManager
   * @param {Object} equipped - Object containing equipped items by slot
   */
  constructor(equipped = {}) {
    this.equipped = {
      main_hand: null,
      off_hand: null,
      headgear: null,
      armor: null,
      legs: null,
      footwear: null,
      hands: null,
      cape: null,
      amulet: null,
      ring1: null,
      ring2: null,
      belt: null,
      flavor1: null,
      flavor2: null,
      flavor3: null,
      ...equipped
    };

    // Cache for item data
    this._itemCache = new Map();
  }

  /**
   * Get item data by ID
   * @param {string} itemId - Item ID
   * @returns {Object|null} Item data or null if not found
   * @private
   */
  _getItemData(itemId) {
    if (!itemId) return null;

    // Check cache first
    if (this._itemCache.has(itemId)) {
      return this._itemCache.get(itemId);
    }

    // Load from data files
    const weapons = loadData('gear_weapons');
    const armor = loadData('gear_armor');
    const headgear = loadData('gear_headgear');
    const accessories = loadData('gear_accessories');

    let item = null;

    // Search in weapons
    if (weapons && weapons.weapons) {
      for (const rarity of Object.keys(weapons.weapons)) {
        const found = weapons.weapons[rarity].find(i => i.id === itemId);
        if (found) {
          item = found;
          break;
        }
      }
    }

    // Search in armor
    if (!item && armor && armor.armor) {
      for (const rarity of Object.keys(armor.armor)) {
        const found = armor.armor[rarity].find(i => i.id === itemId);
        if (found) {
          item = found;
          break;
        }
      }
    }

    // Search in headgear
    if (!item && headgear && headgear.headgear) {
      for (const rarity of Object.keys(headgear.headgear)) {
        const found = headgear.headgear[rarity].find(i => i.id === itemId);
        if (found) {
          item = found;
          break;
        }
      }
    }

    // Search in accessories (has nested structure: rings, amulets, etc.)
    if (!item && accessories && accessories.accessories) {
      for (const category of Object.keys(accessories.accessories)) {
        if (accessories.accessories[category] && typeof accessories.accessories[category] === 'object') {
          for (const rarity of Object.keys(accessories.accessories[category])) {
            if (Array.isArray(accessories.accessories[category][rarity])) {
              const found = accessories.accessories[category][rarity].find(i => i.id === itemId);
              if (found) {
                item = found;
                break;
              }
            }
          }
          if (item) break;
        }
      }
    }

    // Cache the result (even if null)
    this._itemCache.set(itemId, item);
    return item;
  }

  /**
   * Equip an item
   * @param {string} itemId - Item ID to equip
   * @param {number} playerLevel - Player's current level
   * @returns {Object} Result object with success status, message, and any unequipped item
   */
  equip(itemId, playerLevel) {
    const item = this._getItemData(itemId);

    if (!item) {
      return { 
        success: false, 
        message: `Item ${itemId} not found.` 
      };
    }

    // Check level requirement
    if (item.required_level && playerLevel < item.required_level) {
      return {
        success: false,
        message: `You need to be level ${item.required_level} to equip ${item.name}.`
      };
    }

    // Check if item has a valid slot
    if (!item.slot) {
      return {
        success: false,
        message: `${item.name} cannot be equipped.`
      };
    }

    const slot = item.slot;

    // Validate slot
    if (!Object.values(EquipmentManager.SLOTS).includes(slot)) {
      return {
        success: false,
        message: `Invalid equipment slot: ${slot}`
      };
    }

    // Handle ring slots specially (can go in ring1 or ring2)
    let targetSlot = slot;
    let unequippedItem = null;

    if (slot === 'ring') {
      // Try ring1 first, then ring2
      if (!this.equipped.ring1) {
        targetSlot = 'ring1';
      } else if (!this.equipped.ring2) {
        targetSlot = 'ring2';
      } else {
        // Both slots occupied, replace ring1
        targetSlot = 'ring1';
        unequippedItem = this.equipped.ring1;
      }
    } else {
      // Standard slot handling
      if (this.equipped[targetSlot]) {
        unequippedItem = this.equipped[targetSlot];
      }
    }

    // Equip the item
    this.equipped[targetSlot] = itemId;

    return {
      success: true,
      message: `Equipped ${item.name} in ${targetSlot}.`,
      slot: targetSlot,
      unequipped: unequippedItem
    };
  }

  /**
   * Unequip an item from a slot
   * @param {string} slot - Slot to unequip
   * @returns {Object} Result object with success status and unequipped item
   */
  unequip(slot) {
    if (!Object.values(EquipmentManager.SLOTS).includes(slot)) {
      return {
        success: false,
        message: `Invalid equipment slot: ${slot}`
      };
    }

    const itemId = this.equipped[slot];

    if (!itemId) {
      return {
        success: false,
        message: `No item equipped in ${slot}.`
      };
    }

    const item = this._getItemData(itemId);
    this.equipped[slot] = null;

    return {
      success: true,
      message: `Unequipped ${item?.name || itemId} from ${slot}.`,
      item: item || { id: itemId },
      slot
    };
  }

  /**
   * Get the item equipped in a specific slot
   * @param {string} slot - Slot name
   * @returns {Object|null} Item data or null
   */
  getEquipped(slot) {
    const itemId = this.equipped[slot];
    return this._getItemData(itemId);
  }

  /**
   * Get all equipped items with their data
   * @returns {Object} Object with slots as keys and item data as values
   */
  getAllEquipped() {
    const result = {};
    
    for (const [slot, itemId] of Object.entries(this.equipped)) {
      if (itemId) {
        result[slot] = this._getItemData(itemId);
      }
    }
    
    return result;
  }

  /**
   * Calculate total stats from all equipped items
   * @returns {Object} Stats object with all bonuses
   */
  getTotalStats() {
    const stats = {
      attack: 0,
      defense: 0,
      magic: 0,
      strength: 0,
      agility: 0,
      hp: 0,
      crit_chance: 0,
      dodge_chance: 0,
      block_chance: 0
    };

    for (const itemId of Object.values(this.equipped)) {
      if (!itemId) continue;

      const item = this._getItemData(itemId);
      if (!item || !item.stats) continue;

      // Add all stat bonuses
      for (const [stat, value] of Object.entries(item.stats)) {
        if (typeof value === 'number') {
          if (stats[stat] !== undefined) {
            stats[stat] += value;
          } else {
            stats[stat] = value;
          }
        }
      }

      // Handle passive abilities that affect stats
      if (item.passive) {
        if (item.passive.crit_chance) stats.crit_chance += item.passive.crit_chance;
        if (item.passive.dodge_chance) stats.dodge_chance += item.passive.dodge_chance;
        if (item.passive.block_chance) stats.block_chance += item.passive.block_chance;
      }
    }

    return stats;
  }

  /**
   * Get equipment value summary (total gold value)
   * @returns {number} Total value of equipped items
   */
  getTotalValue() {
    let total = 0;

    for (const itemId of Object.values(this.equipped)) {
      if (!itemId) continue;

      const item = this._getItemData(itemId);
      if (item && item.value) {
        total += item.value;
      }
    }

    return total;
  }

  /**
   * Check if a slot is empty
   * @param {string} slot - Slot name
   * @returns {boolean}
   */
  isSlotEmpty(slot) {
    return !this.equipped[slot];
  }

  /**
   * Get list of empty slots
   * @returns {Array<string>} Array of empty slot names
   */
  getEmptySlots() {
    return Object.entries(this.equipped)
      .filter(([_, itemId]) => !itemId)
      .map(([slot]) => slot);
  }

  /**
   * Get list of occupied slots
   * @returns {Array<string>} Array of occupied slot names
   */
  getOccupiedSlots() {
    return Object.entries(this.equipped)
      .filter(([_, itemId]) => itemId)
      .map(([slot]) => slot);
  }

  /**
   * Clear all equipment
   * @returns {Array<string>} Array of unequipped item IDs
   */
  clearAll() {
    const unequipped = [];

    for (const [slot, itemId] of Object.entries(this.equipped)) {
      if (itemId) {
        unequipped.push(itemId);
        this.equipped[slot] = null;
      }
    }

    return unequipped;
  }

  /**
   * Get equipment summary for display
   * @returns {Object} Formatted equipment summary
   */
  getSummary() {
    const equipped = {};
    
    for (const [slot, itemId] of Object.entries(this.equipped)) {
      if (itemId) {
        const item = this._getItemData(itemId);
        equipped[slot] = {
          id: itemId,
          name: item?.name || itemId,
          rarity: item?.rarity || 'common',
          stats: item?.stats || {}
        };
      } else {
        equipped[slot] = null;
      }
    }

    return {
      equipped,
      totalStats: this.getTotalStats(),
      totalValue: this.getTotalValue(),
      emptySlots: this.getEmptySlots().length,
      occupiedSlots: this.getOccupiedSlots().length
    };
  }

  /**
   * Export equipment data for database storage
   * @returns {Object} Equipment object with item IDs
   */
  toObject() {
    return { ...this.equipped };
  }

  /**
   * Import equipment data from database
   * @param {Object} equipped - Equipment object
   */
  fromObject(equipped) {
    this.equipped = {
      main_hand: null,
      off_hand: null,
      headgear: null,
      armor: null,
      legs: null,
      footwear: null,
      hands: null,
      cape: null,
      amulet: null,
      ring1: null,
      ring2: null,
      belt: null,
      flavor1: null,
      flavor2: null,
      flavor3: null,
      ...equipped
    };
    this._itemCache.clear(); // Clear cache on import
  }
}

module.exports = EquipmentManager;
