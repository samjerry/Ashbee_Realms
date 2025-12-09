/**
 * EnchantingManager.js
 * Handles gear enchantments with success rates, materials, and upgrade paths
 */

const { loadData } = require('../data/data_loader');
const path = require('path');
const fs = require('fs');

class EnchantingManager {
  constructor() {
    this.enchantments = null;
    this.config = null;
    this.materials = null;
  }

  /**
   * Load enchantment data from JSON
   */
  loadEnchantments() {
    if (this.enchantments) return this.enchantments;

    const data = loadData('enchantments');
    if (!data) {
      throw new Error('Failed to load enchantments data');
    }

    // Flatten nested enchantment structure into a single object indexed by ID
    this.enchantments = {};
    
    if (data.enchantments) {
      // Process each category (weapon_enchantments, armor_enchantments, etc.)
      for (const [category, rarityGroups] of Object.entries(data.enchantments)) {
        if (typeof rarityGroups === 'object' && !Array.isArray(rarityGroups)) {
          // Process each rarity (common, uncommon, rare, etc.)
          for (const [rarity, enchantmentList] of Object.entries(rarityGroups)) {
            if (Array.isArray(enchantmentList)) {
              // Add each enchantment to the flat structure
              enchantmentList.forEach(enchant => {
                if (enchant.id) {
                  this.enchantments[enchant.id] = enchant;
                }
              });
            }
          }
        }
      }
    }

    this.config = data.enchanting_system;
    this.materials = {};

    // Index materials for quick lookup
    if (this.config && this.config.materials) {
      this.config.materials.forEach(mat => {
        this.materials[mat.id] = mat;
      });
    }

    return this.enchantments;
  }

  /**
   * Get all enchantments for a specific slot
   */
  async getEnchantmentsForSlot(slot) {
    this.loadEnchantments();
    const enchants = [];

    for (const category in this.enchantments) {
      for (const rarity in this.enchantments[category]) {
        const rarityEnchants = this.enchantments[category][rarity];
        rarityEnchants.forEach(ench => {
          if (ench.slot === slot || ench.slot === 'any') {
            enchants.push(ench);
          }
        });
      }
    }

    return enchants;
  }

  /**
   * Get enchantment by ID
   */
  async getEnchantment(enchantId) {
    this.loadEnchantments();

    for (const category in this.enchantments) {
      for (const rarity in this.enchantments[category]) {
        const found = this.enchantments[category][rarity].find(e => e.id === enchantId);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Get maximum enchantments allowed on item based on rarity
   */
  getMaxEnchantments(itemRarity) {
    if (!this.config) return 1;
    return this.config.max_enchantments_per_item[itemRarity] || 1;
  }

  /**
   * Get success rate for enchantment rarity
   */
  getSuccessRate(enchantmentRarity) {
    if (!this.config) return 0.85;
    return this.config.success_rates[enchantmentRarity] || 0.50;
  }

  /**
   * Check if character can enchant item
   */
  async canEnchant(character, item, enchantment) {
    this.loadEnchantments();

    const issues = [];

    // Check if item can be enchanted
    if (!item.slot || item.slot === 'consumable') {
      issues.push('This item cannot be enchanted');
    }

    // Check enchantment limit
    const currentEnchants = item.enchantments || [];
    const maxEnchants = this.getMaxEnchantments(item.rarity);
    if (currentEnchants.length >= maxEnchants) {
      issues.push(`Item already has maximum enchantments (${maxEnchants})`);
    }

    // Check for duplicate enchantment
    if (currentEnchants.some(e => e.id === enchantment.id)) {
      issues.push('Item already has this enchantment');
    }

    // Check for conflicting enchantments
    if (currentEnchants.some(e => e.id.startsWith(enchantment.id.split('_')[0]))) {
      issues.push('Item has conflicting enchantment (only one tier of each type allowed)');
    }

    // Check prerequisites
    if (enchantment.requires) {
      const hasPrereq = currentEnchants.some(e => e.id === enchantment.requires);
      if (!hasPrereq) {
        issues.push(`Requires ${enchantment.requires} enchantment first`);
      }
    }

    // Check gold cost
    if (character.gold < enchantment.cost) {
      issues.push(`Insufficient gold (need ${enchantment.cost}, have ${character.gold})`);
    }

    // Check materials
    const materialsNeeded = this.getMaterialsRequired(enchantment.rarity);
    for (const [materialId, amount] of Object.entries(materialsNeeded)) {
      const hasAmount = character.inventory.filter(i => i.id === materialId).length;
      if (hasAmount < amount) {
        issues.push(`Need ${amount}x ${this.materials[materialId]?.name || materialId} (have ${hasAmount})`);
      }
    }

    return {
      canEnchant: issues.length === 0,
      issues
    };
  }

  /**
   * Get materials required for enchantment rarity
   */
  getMaterialsRequired(rarity) {
    const materials = {
      common: { enchanting_dust: 1 },
      uncommon: { enchanting_dust: 2, mystic_essence: 1 },
      rare: { mystic_essence: 2, arcane_crystal: 1 },
      epic: { arcane_crystal: 2, ethereal_shard: 1 },
      legendary: { ethereal_shard: 2, celestial_fragment: 1 }
    };

    return materials[rarity] || materials.common;
  }

  /**
   * Attempt to enchant an item
   */
  async enchantItem(character, itemId, enchantmentId) {
    this.loadEnchantments();

    // Find item in inventory or equipped
    let item = character.inventory.find(i => i.id === itemId);
    let itemLocation = 'inventory';

    if (!item) {
      // Check equipped items
      for (const slot in character.equipment.slots) {
        if (character.equipment.slots[slot]?.id === itemId) {
          item = character.equipment.slots[slot];
          itemLocation = slot;
          break;
        }
      }
    }

    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        consequence: null
      };
    }

    // Get enchantment
    const enchantment = await this.getEnchantment(enchantmentId);
    if (!enchantment) {
      return {
        success: false,
        message: 'Enchantment not found',
        consequence: null
      };
    }

    // Check if can enchant
    const canEnchant = await this.canEnchant(character, item, enchantment);
    if (!canEnchant.canEnchant) {
      return {
        success: false,
        message: canEnchant.issues.join(', '),
        consequence: null
      };
    }

    // Deduct gold
    character.gold -= enchantment.cost;

    // Remove materials
    const materialsNeeded = this.getMaterialsRequired(enchantment.rarity);
    for (const [materialId, amount] of Object.entries(materialsNeeded)) {
      for (let i = 0; i < amount; i++) {
        const index = character.inventory.findIndex(i => i.id === materialId);
        if (index !== -1) {
          character.inventory.splice(index, 1);
        }
      }
    }

    // Roll for success
    const successRate = this.getSuccessRate(enchantment.rarity);
    const roll = Math.random();
    const succeeded = roll < successRate;

    if (succeeded) {
      // Add enchantment to item
      if (!item.enchantments) {
        item.enchantments = [];
      }
      item.enchantments.push({
        id: enchantment.id,
        name: enchantment.name,
        description: enchantment.description,
        stats: enchantment.stats || {},
        effects: enchantment.effects || {}
      });

      // Recalculate stats if equipped
      if (itemLocation !== 'inventory') {
        character.equipment.calculateStats();
      }

      return {
        success: true,
        message: `Successfully enchanted ${item.name} with ${enchantment.name}!`,
        consequence: null,
        item: item
      };
    } else {
      // Failed - determine consequence
      const consequenceRoll = Math.random();
      let consequence;

      if (consequenceRoll < this.config.failure_consequences.nothing) {
        consequence = 'nothing';
        return {
          success: false,
          message: `Enchantment failed, but the item is intact.`,
          consequence: consequence,
          item: item
        };
      } else if (consequenceRoll < this.config.failure_consequences.nothing + this.config.failure_consequences.lose_enchant) {
        consequence = 'lose_enchant';

        if (item.enchantments && item.enchantments.length > 0) {
          const removedEnchant = item.enchantments.pop();
          return {
            success: false,
            message: `Enchantment failed and removed ${removedEnchant.name}!`,
            consequence: consequence,
            item: item,
            removedEnchantment: removedEnchant
          };
        } else {
          return {
            success: false,
            message: `Enchantment failed, but the item had no enchantments to lose.`,
            consequence: 'nothing',
            item: item
          };
        }
      } else {
        consequence = 'destroy_item';

        // Remove item from inventory or equipment
        if (itemLocation === 'inventory') {
          const index = character.inventory.findIndex(i => i.id === itemId);
          if (index !== -1) {
            character.inventory.splice(index, 1);
          }
        } else {
          character.equipment.unequip(itemLocation);
        }

        return {
          success: false,
          message: `Enchantment failed catastrophically and destroyed ${item.name}!`,
          consequence: consequence,
          item: null
        };
      }
    }
  }

  /**
   * Remove an enchantment from an item
   */
  async removeEnchantment(character, itemId, enchantmentIndex) {
    // Find item
    let item = character.inventory.find(i => i.id === itemId);
    let itemLocation = 'inventory';

    if (!item) {
      for (const slot in character.equipment.slots) {
        if (character.equipment.slots[slot]?.id === itemId) {
          item = character.equipment.slots[slot];
          itemLocation = slot;
          break;
        }
      }
    }

    if (!item) {
      return {
        success: false,
        message: 'Item not found'
      };
    }

    if (!item.enchantments || item.enchantments.length === 0) {
      return {
        success: false,
        message: 'Item has no enchantments'
      };
    }

    if (enchantmentIndex < 0 || enchantmentIndex >= item.enchantments.length) {
      return {
        success: false,
        message: 'Invalid enchantment index'
      };
    }

    const removed = item.enchantments.splice(enchantmentIndex, 1)[0];

    // Recalculate stats if equipped
    if (itemLocation !== 'inventory') {
      character.equipment.calculateStats();
    }

    return {
      success: true,
      message: `Removed ${removed.name} from ${item.name}`,
      removedEnchantment: removed,
      item: item
    };
  }

  /**
   * Get total stats from all enchantments on an item
   */
  getEnchantmentStats(item) {
    if (!item.enchantments || item.enchantments.length === 0) {
      return {};
    }

    const totalStats = {};

    item.enchantments.forEach(enchant => {
      if (enchant.stats) {
        for (const [stat, value] of Object.entries(enchant.stats)) {
          totalStats[stat] = (totalStats[stat] || 0) + value;
        }
      }
    });

    return totalStats;
  }

  /**
   * Get all active effects from enchantments on an item
   */
  getEnchantmentEffects(item) {
    if (!item.enchantments || item.enchantments.length === 0) {
      return {};
    }

    const allEffects = {};

    item.enchantments.forEach(enchant => {
      if (enchant.effects) {
        for (const [effect, value] of Object.entries(enchant.effects)) {
          if (!allEffects[effect]) {
            allEffects[effect] = [];
          }
          allEffects[effect].push(value);
        }
      }
    });

    return allEffects;
  }

  /**
   * Get enchantment upgrade path
   */
  async getUpgradePath(enchantmentId) {
    this.loadEnchantments();

    const path = [];
    let current = await this.getEnchantment(enchantmentId);

    if (!current) return path;

    path.push(current);

    // Look for upgrades (enchantments that require this one)
    for (const category in this.enchantments) {
      for (const rarity in this.enchantments[category]) {
        const found = this.enchantments[category][rarity].find(
          e => e.requires === enchantmentId
        );
        if (found) {
          const nextPath = await this.getUpgradePath(found.id);
          path.push(...nextPath);
          break;
        }
      }
    }

    return path;
  }

  /**
   * Disenchant item to recover materials
   */
  async disenchantItem(character, itemId) {
    // Find item
    let item = character.inventory.find(i => i.id === itemId);
    let itemLocation = 'inventory';

    if (!item) {
      for (const slot in character.equipment.slots) {
        if (character.equipment.slots[slot]?.id === itemId) {
          item = character.equipment.slots[slot];
          itemLocation = slot;
          break;
        }
      }
    }

    if (!item) {
      return {
        success: false,
        message: 'Item not found'
      };
    }

    if (!item.enchantments || item.enchantments.length === 0) {
      return {
        success: false,
        message: 'Item has no enchantments to disenchant'
      };
    }

    // Calculate materials recovered (50% of original cost)
    const materialsRecovered = [];

    item.enchantments.forEach(enchant => {
      const enchantData = this.enchantments[enchant.id];
      if (enchantData) {
        const materials = this.getMaterialsRequired(enchantData.rarity);
        for (const [materialId, amount] of Object.entries(materials)) {
          const recovered = Math.ceil(amount * 0.5);
          for (let i = 0; i < recovered; i++) {
            character.inventory.push({ id: materialId, name: this.materials[materialId]?.name || materialId });
            materialsRecovered.push(materialId);
          }
        }
      }
    });

    // Remove all enchantments
    item.enchantments = [];

    // Recalculate stats if equipped
    if (itemLocation !== 'inventory') {
      character.equipment.calculateStats();
    }

    return {
      success: true,
      message: `Disenchanted ${item.name} and recovered materials`,
      materialsRecovered: materialsRecovered,
      item: item
    };
  }
}

module.exports = EnchantingManager;
