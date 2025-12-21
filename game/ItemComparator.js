const { loadData } = require('../data/data_loader');

/**
 * Item Comparator - Compare items to help players make decisions
 */
class ItemComparator {
  constructor() {
    this.gearData = this.loadAllGearData();
    this.consumablesData = loadData('consumables_extended');
  }

  /**
   * Load all gear data
   * @returns {Object} Combined gear data
   */
  loadAllGearData() {
    const gearFiles = [
      'gear_weapons',
      'gear_armor',
      'gear_headgear',
      'gear_accessories'
    ];

    const combined = {};

    for (const file of gearFiles) {
      const data = loadData(file);
      if (data) {
        Object.assign(combined, data);
      }
    }

    return combined;
  }

  /**
   * Compare two equipment items
   * @param {Object} item1 - First item
   * @param {Object} item2 - Second item
   * @returns {Object} Comparison result { better, differences, recommendation }
   */
  compareEquipment(item1, item2) {
    if (!item1 || !item2) {
      return {
        valid: false,
        message: 'Both items required for comparison'
      };
    }

    // Check if same slot
    if (item1.slot !== item2.slot) {
      return {
        valid: false,
        message: 'Items must be in the same slot to compare'
      };
    }

    const differences = {};
    const stats = [
      // New 5-stat system
      'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom',
      // Derived/legacy stats
      'attack', 'defense', 'magic', 'agility',
      'hp', 'crit_chance', 'crit_damage'
    ];

    // Compare stats
    for (const stat of stats) {
      const val1 = item1[stat] || 0;
      const val2 = item2[stat] || 0;

      if (val1 !== val2) {
        differences[stat] = {
          item1: val1,
          item2: val2,
          diff: val2 - val1,
          better: val2 > val1 ? 'item2' : 'item1'
        };
      }
    }

    // Calculate total stat difference
    const totalDiff = Object.values(differences).reduce((sum, diff) => sum + Math.abs(diff.diff), 0);

    // Determine which is better overall
    const item2BetterCount = Object.values(differences).filter(d => d.better === 'item2').length;
    const item1BetterCount = Object.values(differences).filter(d => d.better === 'item1').length;

    let recommendation;
    if (item2BetterCount > item1BetterCount) {
      recommendation = {
        choice: 'item2',
        reason: `${item2.name} is better overall (${item2BetterCount} improved stats)`
      };
    } else if (item1BetterCount > item2BetterCount) {
      recommendation = {
        choice: 'item1',
        reason: `${item1.name} is better overall (${item1BetterCount} improved stats)`
      };
    } else {
      recommendation = {
        choice: 'equal',
        reason: 'Items are roughly equal, choose based on playstyle'
      };
    }

    return {
      valid: true,
      item1: {
        name: item1.name,
        rarity: item1.rarity,
        slot: item1.slot
      },
      item2: {
        name: item2.name,
        rarity: item2.rarity,
        slot: item2.slot
      },
      differences,
      totalDiff,
      recommendation
    };
  }

  /**
   * Compare equipped item vs inventory item
   * @param {Object} character - Character object
   * @param {string} inventoryItemId - Item ID from inventory
   * @returns {Object} Comparison result with upgrade recommendation
   */
  compareWithEquipped(character, inventoryItemId) {
    // Find inventory item
    const invItem = character.inventory.find(item => item.id === inventoryItemId);

    if (!invItem) {
      return {
        valid: false,
        message: 'Item not found in inventory'
      };
    }

    // Get full item data
    const newItemData = this.getItemData(inventoryItemId);

    if (!newItemData || !newItemData.slot) {
      return {
        valid: false,
        message: 'Item is not equipment or has no slot'
      };
    }

    // Get currently equipped item in that slot
    const equippedItemId = character.equipment[newItemData.slot];

    if (!equippedItemId) {
      return {
        valid: true,
        isUpgrade: true,
        message: `No item equipped in ${newItemData.slot} slot`,
        recommendation: `Equip ${newItemData.name} for stat gains`,
        newItem: newItemData
      };
    }

    // Get equipped item data
    const equippedItemData = this.getItemData(equippedItemId);

    // Compare the two items
    const comparison = this.compareEquipment(equippedItemData, newItemData);

    return {
      ...comparison,
      isUpgrade: comparison.recommendation.choice === 'item2',
      currentlyEquipped: equippedItemData.name,
      considering: newItemData.name
    };
  }

  /**
   * Get item data by ID
   * @param {string} itemId - Item ID
   * @returns {Object|null} Item data
   */
  getItemData(itemId) {
    // Search gear
    for (const gearCategory of Object.values(this.gearData)) {
      if (Array.isArray(gearCategory)) {
        const found = gearCategory.find(item => item.id === itemId);
        if (found) return found;
      } else if (typeof gearCategory === 'object') {
        // Check nested rarities
        for (const rarityItems of Object.values(gearCategory)) {
          if (Array.isArray(rarityItems)) {
            const found = rarityItems.find(item => item.id === itemId);
            if (found) return found;
          }
        }
      }
    }

    return null;
  }

  /**
   * Find best item in inventory for a slot
   * @param {Object} character - Character object
   * @param {string} slot - Equipment slot
   * @returns {Object} Best item recommendation
   */
  findBestForSlot(character, slot) {
    // Get all equipment items in inventory for this slot
    const slotItems = character.inventory
      .map(invItem => {
        const itemData = this.getItemData(invItem.id);
        if (itemData && itemData.slot === slot) {
          return itemData;
        }
        return null;
      })
      .filter(item => item !== null);

    if (slotItems.length === 0) {
      return {
        found: false,
        message: `No items found for ${slot} slot in inventory`
      };
    }

    // Calculate total stats for each item
    const rankedItems = slotItems.map(item => {
      const totalStats = (item.attack || 0) + (item.defense || 0) + (item.magic || 0) + (item.agility || 0);
      return {
        ...item,
        totalStats
      };
    });

    // Sort by total stats (descending)
    rankedItems.sort((a, b) => b.totalStats - a.totalStats);

    const bestItem = rankedItems[0];

    return {
      found: true,
      bestItem,
      alternatives: rankedItems.slice(1, 3), // Top 2 alternatives
      recommendation: `${bestItem.name} (${bestItem.rarity}) is the best item for ${slot} slot`
    };
  }

  /**
   * Get upgrade suggestions for character
   * @param {Object} character - Character object
   * @returns {Array} Array of upgrade suggestions
   */
  getUpgradeSuggestions(character) {
    const suggestions = [];
    const slots = ['weapon', 'armor', 'headgear', 'shield_offhand', 'legs', 'footwear', 'hands', 'cape', 
                   'ring_1', 'ring_2', 'amulet', 'belt', 'trinket_1', 'trinket_2', 'relic'];

    for (const slot of slots) {
      const equippedId = character.equipment[slot];

      // Find better items in inventory
      const inventoryItems = character.inventory
        .map(invItem => {
          const itemData = this.getItemData(invItem.id);
          if (itemData && itemData.slot === slot) {
            return itemData;
          }
          return null;
        })
        .filter(item => item !== null);

      for (const invItem of inventoryItems) {
        if (!equippedId) {
          // Empty slot
          suggestions.push({
            slot,
            action: 'equip',
            item: invItem.name,
            reason: `Empty slot - equip ${invItem.name} for stat gains`
          });
        } else {
          // Compare with equipped
          const equippedData = this.getItemData(equippedId);
          const comparison = this.compareEquipment(equippedData, invItem);

          if (comparison.valid && comparison.recommendation.choice === 'item2') {
            suggestions.push({
              slot,
              action: 'upgrade',
              currentItem: equippedData.name,
              newItem: invItem.name,
              improvements: Object.keys(comparison.differences).length,
              reason: comparison.recommendation.reason
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Compare consumables
   * @param {string} itemId1 - First consumable ID
   * @param {string} itemId2 - Second consumable ID
   * @returns {Object} Comparison result
   */
  compareConsumables(itemId1, itemId2) {
    const consumable1 = this.getConsumableData(itemId1);
    const consumable2 = this.getConsumableData(itemId2);

    if (!consumable1 || !consumable2) {
      return {
        valid: false,
        message: 'One or both consumables not found'
      };
    }

    // Compare by type, effect, price, cooldown
    const comparison = {
      valid: true,
      item1: {
        name: consumable1.name,
        type: consumable1.type,
        effect: consumable1.effect,
        price: consumable1.price || 0,
        cooldown: consumable1.cooldown || 0,
        rarity: consumable1.rarity
      },
      item2: {
        name: consumable2.name,
        type: consumable2.type,
        effect: consumable2.effect,
        price: consumable2.price || 0,
        cooldown: consumable2.cooldown || 0,
        rarity: consumable2.rarity
      }
    };

    // Determine better value (effect per gold)
    if (consumable1.type === consumable2.type) {
      const efficiency1 = this.calculateConsumableEfficiency(consumable1);
      const efficiency2 = this.calculateConsumableEfficiency(consumable2);

      comparison.recommendation = efficiency2 > efficiency1 ?
        `${consumable2.name} is more efficient` :
        `${consumable1.name} is more efficient`;
    } else {
      comparison.recommendation = 'Different types - choose based on need';
    }

    return comparison;
  }

  /**
   * Calculate consumable efficiency
   * @param {Object} consumable - Consumable data
   * @returns {number} Efficiency score
   */
  calculateConsumableEfficiency(consumable) {
    // Extract numeric effect value
    const effectMatch = consumable.effect.match(/(\d+)/);
    const effectValue = effectMatch ? parseInt(effectMatch[1]) : 0;

    const price = consumable.price || 1;

    return effectValue / price;
  }

  /**
   * Get consumable data by ID
   * @param {string} itemId - Consumable ID
   * @returns {Object|null} Consumable data
   */
  getConsumableData(itemId) {
    if (!this.consumablesData) return null;

    for (const category of Object.values(this.consumablesData)) {
      if (category[itemId]) {
        return category[itemId];
      }
    }

    return null;
  }
}

module.exports = ItemComparator;
