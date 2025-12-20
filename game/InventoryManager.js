/**
 * InventoryManager.js
 * Manages character inventory with stacking and capacity limits
 */

const { loadData } = require('../data/data_loader');

class InventoryManager {
  /**
   * Create a new InventoryManager
   * @param {Array<string|Object>} items - Array of item IDs or item instances
   * @param {number} maxCapacity - Maximum inventory slots (default 30)
   */
  constructor(items = [], maxCapacity = 30) {
    this.maxCapacity = maxCapacity;
    
    // Cache for item data - must be initialized before normalizing items
    this._itemCache = new Map();
    
    // Normalize items to support both old (string) and new (object) formats
    this.items = Array.isArray(items) ? this._normalizeItems(items) : [];
  }

  /**
   * Normalize items array to support both string IDs and item instances
   * @param {Array<string|Object>} items - Raw items array
   * @returns {Array<Object>} Normalized item instances
   * @private
   */
  _normalizeItems(items) {
    return items.map(item => {
      if (typeof item === 'string') {
        // Old format - convert to item instance
        return this._createItemInstance(item);
      } else if (typeof item === 'object' && item !== null) {
        // New format - ensure quest_tags array exists
        return {
          ...item,
          quest_tags: item.quest_tags || []
        };
      }
      return this._createItemInstance('unknown_item');
    });
  }

  /**
   * Create an item instance from an item ID
   * @param {string} itemId - Item ID
   * @returns {Object} Item instance
   * @private
   */
  _createItemInstance(itemId) {
    const itemData = this._getItemData(itemId);
    
    // Log warning if item data not found
    if (!itemData) {
      console.warn(`[InventoryManager] Item data not found for: ${itemId}. Creating instance with default values.`);
    }
    
    return {
      id: itemId,
      name: itemData?.name || itemId,
      tags: itemData?.tags || [], // Global tags from item data
      quest_tags: [] // Player-specific quest tags
    };
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

    // Search in consumables from items.json
    if (!item && items && items.consumables) {
      for (const rarity of Object.keys(items.consumables)) {
        if (Array.isArray(items.consumables[rarity])) {
          const found = items.consumables[rarity].find(i => i.id === itemId);
          if (found) {
            item = found;
            break;
          }
        }
      }
    }

    // Search in consumables_extended
    if (!item && consumables && consumables.consumables) {
      for (const rarity of Object.keys(consumables.consumables)) {
        const found = consumables.consumables[rarity].find(i => i.id === itemId);
        if (found) {
          item = found;
          break;
        }
      }
    }

    // Search in basic items (quest items, crafting materials, etc.)
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

    const itemData = this._getItemData(itemId);
    
    // If item data not found, still allow adding (might be a quest item or special item)
    const isStackable = itemData?.stackable || false;

    for (let i = 0; i < quantity; i++) {
      // Check capacity
      if (this.items.length >= this.maxCapacity && !isStackable) {
        return { 
          success: false, 
          message: `Inventory is full! (${this.maxCapacity}/${this.maxCapacity})`,
          added: i
        };
      }

      // Create item instance with global tags from item data
      const itemInstance = this._createItemInstance(itemId);
      this.items.push(itemInstance);
    }

    const itemName = itemData?.name || itemId;
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
      const item = this.items[i];
      const currentItemId = typeof item === 'string' ? item : item.id;
      if (currentItemId === itemId) {
        this.items.splice(i, 1);
        removed++;
      }
    }

    const itemData = this._getItemData(itemId);
    const itemName = itemData?.name || itemId;
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
    return this.items.some(item => {
      const currentItemId = typeof item === 'string' ? item : item.id;
      return currentItemId === itemId;
    });
  }

  /**
   * Get count of a specific item
   * @param {string} itemId - Item ID
   * @returns {number} Count of item in inventory
   */
  getItemCount(itemId) {
    return this.items.filter(item => {
      const currentItemId = typeof item === 'string' ? item : item.id;
      return currentItemId === itemId;
    }).length;
  }

  /**
   * Get all items with their counts
   * @returns {Array<Object>} Array of items with count and data
   */
  getItemsWithCounts() {
    const itemMap = new Map();

    // Count items
    for (const item of this.items) {
      const itemId = typeof item === 'string' ? item : item.id;
      if (itemMap.has(itemId)) {
        const existing = itemMap.get(itemId);
        existing.count++;
        // Merge quest tags from all instances
        if (typeof item === 'object' && item.quest_tags) {
          item.quest_tags.forEach(tag => {
            if (!existing.quest_tags.some(t => t.quest_id === tag.quest_id)) {
              existing.quest_tags.push(tag);
            }
          });
        }
      } else {
        const itemData = this._getItemData(itemId);
        itemMap.set(itemId, {
          id: itemId,
          name: itemData?.name || itemId,
          count: 1,
          rarity: itemData?.rarity || 'common',
          type: itemData?.slot ? 'equipment' : (itemData?.usage ? 'consumable' : 'misc'),
          value: itemData?.value || 0,
          stackable: itemData?.stackable || false,
          tags: itemData?.tags || [], // Global tags
          quest_tags: typeof item === 'object' && item.quest_tags ? [...item.quest_tags] : []
        });
      }
    }

    // Build result array
    const result = Array.from(itemMap.values());

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

    for (const item of this.items) {
      const itemId = typeof item === 'string' ? item : item.id;
      const itemData = this._getItemData(itemId);
      if (itemData && itemData.value) {
        total += itemData.value;
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
    
    for (const itemInfo of items) {
      for (let i = 0; i < itemInfo.count; i++) {
        // Recreate instances preserving quest tags
        const instance = this._createItemInstance(itemInfo.id);
        if (itemInfo.quest_tags && itemInfo.quest_tags.length > 0) {
          instance.quest_tags = [...itemInfo.quest_tags];
        }
        this.items.push(instance);
      }
    }
  }

  /**
   * Add a quest tag to all instances of an item
   * @param {string} itemId - Item ID to tag
   * @param {string} questId - Quest ID
   * @param {string} playerId - Player ID
   * @returns {number} Number of items tagged
   */
  addQuestTag(itemId, questId, playerId) {
    let taggedCount = 0;
    const timestamp = Date.now();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const currentItemId = typeof item === 'string' ? item : item.id;
      
      if (currentItemId === itemId) {
        // Convert string to object if needed
        if (typeof item === 'string') {
          this.items[i] = this._createItemInstance(item);
        }
        
        const itemObj = this.items[i];
        
        // Check if quest tag already exists
        const hasTag = itemObj.quest_tags.some(tag => 
          tag.quest_id === questId && tag.player_id === playerId
        );
        
        if (!hasTag) {
          itemObj.quest_tags.push({
            quest_id: questId,
            player_id: playerId,
            tagged_at: timestamp
          });
          taggedCount++;
        }
      }
    }

    return taggedCount;
  }

  /**
   * Remove quest tags from all items for a specific quest
   * @param {string} questId - Quest ID
   * @returns {number} Number of items untagged
   */
  removeQuestTag(questId) {
    let untaggedCount = 0;

    for (const item of this.items) {
      if (typeof item === 'object' && item.quest_tags) {
        const initialLength = item.quest_tags.length;
        item.quest_tags = item.quest_tags.filter(tag => tag.quest_id !== questId);
        if (item.quest_tags.length < initialLength) {
          untaggedCount++;
        }
      }
    }

    return untaggedCount;
  }

  /**
   * Get all items tagged for a specific quest
   * @param {string} questId - Quest ID
   * @returns {Array<Object>} Items tagged for the quest
   */
  getItemsByQuestTag(questId) {
    const itemMap = new Map();

    for (const item of this.items) {
      if (typeof item === 'object' && item.quest_tags) {
        const hasQuestTag = item.quest_tags.some(tag => tag.quest_id === questId);
        if (hasQuestTag) {
          if (itemMap.has(item.id)) {
            itemMap.get(item.id).count++;
          } else {
            const itemData = this._getItemData(item.id);
            itemMap.set(item.id, {
              id: item.id,
              name: itemData?.name || item.id,
              count: 1,
              tags: item.tags || [],
              quest_tags: item.quest_tags.filter(tag => tag.quest_id === questId)
            });
          }
        }
      }
    }

    return Array.from(itemMap.values());
  }

  /**
   * Get all items with a specific global tag
   * @param {string} tag - Global tag to search for
   * @returns {Array<Object>} Items with the tag
   */
  getItemsByTag(tag) {
    const itemMap = new Map();

    for (const item of this.items) {
      const itemId = typeof item === 'string' ? item : item.id;
      const tags = typeof item === 'object' ? item.tags : [];
      
      if (tags.includes(tag)) {
        if (itemMap.has(itemId)) {
          itemMap.get(itemId).count++;
        } else {
          const itemData = this._getItemData(itemId);
          itemMap.set(itemId, {
            id: itemId,
            name: itemData?.name || itemId,
            count: 1,
            tags: tags
          });
        }
      }
    }

    return Array.from(itemMap.values());
  }

  /**
   * Clear all quest tags for a specific quest
   * @param {string} questId - Quest ID
   * @returns {number} Number of items affected
   */
  clearQuestTags(questId) {
    return this.removeQuestTag(questId);
  }

  /**
   * Get all quest items (items with any quest tags)
   * @returns {Array<Object>} Quest items
   */
  getQuestItems() {
    const itemMap = new Map();

    for (const item of this.items) {
      if (typeof item === 'object' && item.quest_tags && item.quest_tags.length > 0) {
        if (itemMap.has(item.id)) {
          itemMap.get(item.id).count++;
          // Merge unique quest tags
          item.quest_tags.forEach(tag => {
            const existing = itemMap.get(item.id).quest_tags;
            if (!existing.some(t => t.quest_id === tag.quest_id && t.player_id === tag.player_id)) {
              existing.push(tag);
            }
          });
        } else {
          const itemData = this._getItemData(item.id);
          itemMap.set(item.id, {
            id: item.id,
            name: itemData?.name || item.id,
            count: 1,
            tags: item.tags || [],
            quest_tags: [...item.quest_tags]
          });
        }
      }
    }

    return Array.from(itemMap.values());
  }

  /**
   * Check if an item is tagged for any quest
   * @param {string} itemId - Item ID
   * @returns {boolean} True if tagged for any quest
   */
  isQuestItem(itemId) {
    return this.items.some(item => {
      const currentItemId = typeof item === 'string' ? item : item.id;
      return currentItemId === itemId && 
             typeof item === 'object' && 
             item.quest_tags && 
             item.quest_tags.length > 0;
    });
  }

  /**
   * Get all quests that need a specific item
   * @param {string} itemId - Item ID
   * @returns {Array<string>} Quest IDs
   */
  getQuestsForItem(itemId) {
    const questIds = new Set();

    for (const item of this.items) {
      const currentItemId = typeof item === 'string' ? item : item.id;
      if (currentItemId === itemId && typeof item === 'object' && item.quest_tags) {
        item.quest_tags.forEach(tag => questIds.add(tag.quest_id));
      }
    }

    return Array.from(questIds);
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
   * @param {Array<string|Object>} items - Array of item IDs or item instances
   */
  fromArray(items) {
    this.items = Array.isArray(items) ? this._normalizeItems(items) : [];
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
