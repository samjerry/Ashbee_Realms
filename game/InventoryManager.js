/**
 * InventoryManager.js
 * Manages character inventory with stacking and capacity limits
 */

const { loadData } = require('../data/data_loader');

class InventoryManager {
  /**
   * Create a new InventoryManager
   * @param {Array<string>} items - Array of item IDs
   * @param {number} maxCapacity - Maximum inventory slots (default 30)
   */
  constructor(items = [], maxCapacity = 30) {
    this.items = Array.isArray(items) ? [...items] : [];
    this.maxCapacity = maxCapacity;
    
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

    let item = null;

    // Try loading from various data sources
    const consumables = loadData('consumables_extended');
    const items = loadData('items');
    const weapons = loadData('gear_weapons');
    const armor = loadData('gear_armor');
    const headgear = loadData('gear_headgear');
    const accessories = loadData('gear_accessories');

    // Search in consumables
    if (consumables && consumables.consumables) {
      for (const rarity of Object.keys(consumables.consumables)) {
        const found = consumables.consumables[rarity].find(i => i.id === itemId);
        if (found) {
          item = found;
          break;
        }
      }
    }

    // Search in basic items
    if (!item && items && items.items) {
      for (const category of Object.keys(items.items)) {
        if (Array.isArray(items.items[category])) {
          const found = items.items[category].find(i => i.id === itemId);
          if (found) {
            item = found;
            break;
          }
        }
      }
    }

    // Search in weapons
    if (!item && weapons && weapons.weapons) {
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

    // Cache the result
    this._itemCache.set(itemId, item);
    return item;
  }

  /**
   * Add an item to inventory
   * @param {string} itemId - Item ID to add
   * @param {number} quantity - Quantity to add (default 1)
   * @returns {Object} Result object with success status and message
   */
  addItem(itemId, quantity = 1) {
    if (!itemId) {
      return { success: false, message: "Invalid item ID." };
    }

    const item = this._getItemData(itemId);
    
    // If item data not found, still allow adding (might be a quest item or special item)
    const isStackable = item?.stackable || false;

    for (let i = 0; i < quantity; i++) {
      // Check capacity
      if (this.items.length >= this.maxCapacity && !isStackable) {
        return { 
          success: false, 
          message: `Inventory is full! (${this.maxCapacity}/${this.maxCapacity})`,
          added: i
        };
      }

      // For stackable items, just add to the array (stacking handled by count)
      // For non-stackable, add individual entries
      this.items.push(itemId);
    }

    const itemName = item?.name || itemId;
    const message = quantity > 1 
      ? `Added ${quantity}x ${itemName} to inventory.`
      : `Added ${itemName} to inventory.`;

    return { 
      success: true, 
      message,
      added: quantity
    };
  }

  /**
   * Remove an item from inventory
   * @param {string} itemId - Item ID to remove
   * @param {number} quantity - Quantity to remove (default 1)
   * @returns {Object} Result object with success status and message
   */
  removeItem(itemId, quantity = 1) {
    if (!itemId) {
      return { success: false, message: "Invalid item ID." };
    }

    const count = this.getItemCount(itemId);
    
    if (count === 0) {
      return { 
        success: false, 
        message: `You don't have ${itemId} in your inventory.` 
      };
    }

    if (count < quantity) {
      return { 
        success: false, 
        message: `Not enough ${itemId}. You have ${count}, need ${quantity}.` 
      };
    }

    // Remove the specified quantity
    let removed = 0;
    for (let i = this.items.length - 1; i >= 0 && removed < quantity; i--) {
      if (this.items[i] === itemId) {
        this.items.splice(i, 1);
        removed++;
      }
    }

    const item = this._getItemData(itemId);
    const itemName = item?.name || itemId;
    const message = quantity > 1
      ? `Removed ${quantity}x ${itemName} from inventory.`
      : `Removed ${itemName} from inventory.`;

    return { 
      success: true, 
      message,
      removed: removed
    };
  }

  /**
   * Check if inventory contains an item
   * @param {string} itemId - Item ID to check
   * @returns {boolean}
   */
  hasItem(itemId) {
    return this.items.includes(itemId);
  }

  /**
   * Get count of a specific item
   * @param {string} itemId - Item ID
   * @returns {number} Count of item in inventory
   */
  getItemCount(itemId) {
    return this.items.filter(id => id === itemId).length;
  }

  /**
   * Get all items with their counts
   * @returns {Array<Object>} Array of items with count and data
   */
  getItemsWithCounts() {
    const itemMap = new Map();

    // Count items
    for (const itemId of this.items) {
      if (itemMap.has(itemId)) {
        itemMap.set(itemId, itemMap.get(itemId) + 1);
      } else {
        itemMap.set(itemId, 1);
      }
    }

    // Build result array
    const result = [];
    for (const [itemId, count] of itemMap.entries()) {
      const itemData = this._getItemData(itemId);
      result.push({
        id: itemId,
        name: itemData?.name || itemId,
        count: count,
        rarity: itemData?.rarity || 'common',
        type: itemData?.slot ? 'equipment' : (itemData?.usage ? 'consumable' : 'misc'),
        value: itemData?.value || 0,
        stackable: itemData?.stackable || false
      });
    }

    // Sort by rarity, then name
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    result.sort((a, b) => {
      const rarityDiff = (rarityOrder[a.rarity] || 5) - (rarityOrder[b.rarity] || 5);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });

    return result;
  }

  /**
   * Get current inventory size
   * @returns {number} Number of items (not slots)
   */
  getSize() {
    return this.items.length;
  }

  /**
   * Get available capacity
   * @returns {number} Number of free slots
   */
  getAvailableCapacity() {
    return Math.max(0, this.maxCapacity - this.items.length);
  }

  /**
   * Check if inventory is full
   * @returns {boolean}
   */
  isFull() {
    return this.items.length >= this.maxCapacity;
  }

  /**
   * Check if inventory is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * Clear entire inventory
   * @returns {Array<string>} Array of removed item IDs
   */
  clear() {
    const removed = [...this.items];
    this.items = [];
    return removed;
  }

  /**
   * Get total value of all items
   * @returns {number} Total gold value
   */
  getTotalValue() {
    let total = 0;

    for (const itemId of this.items) {
      const item = this._getItemData(itemId);
      if (item && item.value) {
        total += item.value;
      }
    }

    return total;
  }

  /**
   * Find items by type
   * @param {string} type - Type to filter by ('equipment', 'consumable', 'misc')
   * @returns {Array<Object>} Array of matching items
   */
  getItemsByType(type) {
    const items = this.getItemsWithCounts();
    return items.filter(item => item.type === type);
  }

  /**
   * Find items by rarity
   * @param {string} rarity - Rarity to filter by
   * @returns {Array<Object>} Array of matching items
   */
  getItemsByRarity(rarity) {
    const items = this.getItemsWithCounts();
    return items.filter(item => item.rarity === rarity);
  }

  /**
   * Get inventory summary for display
   * @returns {Object} Formatted inventory summary
   */
  getSummary() {
    return {
      size: this.getSize(),
      maxCapacity: this.maxCapacity,
      availableSlots: this.getAvailableCapacity(),
      isFull: this.isFull(),
      isEmpty: this.isEmpty(),
      totalValue: this.getTotalValue(),
      items: this.getItemsWithCounts(),
      itemsByType: {
        equipment: this.getItemsByType('equipment').length,
        consumable: this.getItemsByType('consumable').length,
        misc: this.getItemsByType('misc').length
      }
    };
  }

  /**
   * Sort inventory by rarity and name
   */
  sort() {
    const items = this.getItemsWithCounts();
    this.items = [];
    
    for (const item of items) {
      for (let i = 0; i < item.count; i++) {
        this.items.push(item.id);
      }
    }
  }

  /**
   * Export inventory data for database storage
   * @returns {Array<string>} Array of item IDs
   */
  toArray() {
    return [...this.items];
  }

  /**
   * Import inventory data from database
   * @param {Array<string>} items - Array of item IDs
   */
  fromArray(items) {
    this.items = Array.isArray(items) ? [...items] : [];
    this._itemCache.clear(); // Clear cache on import
  }

  /**
   * Increase max capacity
   * @param {number} amount - Amount to increase by
   */
  increaseCapacity(amount) {
    this.maxCapacity += amount;
  }

  /**
   * Set max capacity
   * @param {number} capacity - New max capacity
   */
  setMaxCapacity(capacity) {
    this.maxCapacity = Math.max(1, capacity);
  }
}

module.exports = InventoryManager;
