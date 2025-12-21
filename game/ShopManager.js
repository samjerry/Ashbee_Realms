const { loadData } = require('../data/data_loader');

/**
 * Shop Manager - Handles vendor/shop system for buying/selling items
 */
class ShopManager {
  constructor() {
    this.npcsData = loadData('npcs');
    this.merchants = this.npcsData?.npcs?.merchants || [];
    this.consumablesData = loadData('consumables_extended');
    this.gearData = this.loadAllGearData();
    this.itemsData = loadData('items')?.items || {};
  }

  /**
   * Load all gear data from multiple files
   * @returns {Object} Combined gear data
   */
  loadAllGearData() {
    const combined = {};
    
    // Load weapons from new rarity-based structure
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    const weapons = {};
    
    for (const rarity of rarities) {
      const weaponFile = loadData(`gear/weapons/weapons_${rarity}`);
      if (weaponFile && weaponFile.weapons) {
        weapons[rarity] = weaponFile.weapons;
      }
    }
    
    combined.weapons = weapons;
    
    // Load other gear files
    const gearFiles = [
      'gear_armor', 
      'gear_headgear',
      'gear_accessories'
    ];
    
    for (const file of gearFiles) {
      const data = loadData(file);
      if (data) {
        Object.assign(combined, data);
      }
    }

    return combined;
  }

  /**
   * Get merchant by ID
   * @param {string} merchantId - Merchant NPC ID
   * @returns {Object|null} Merchant data
   */
  getMerchant(merchantId) {
    return this.merchants.find(m => m.id === merchantId) || null;
  }

  /**
   * Get merchant inventory
   * @param {string} merchantId - Merchant NPC ID
   * @returns {Object} Merchant inventory { always, random }
   */
  getMerchantInventory(merchantId) {
    const merchant = this.getMerchant(merchantId);
    
    if (!merchant || !merchant.stock) {
      return {
        always: [],
        random: []
      };
    }

    // Always available items
    const always = (merchant.stock.always_available || []).map(stockItem => {
      const itemData = this.getItemData(stockItem.item);
      return {
        id: stockItem.item,
        name: itemData?.name || stockItem.item,
        price: stockItem.price,
        stock: stockItem.stock,
        rarity: itemData?.rarity || 'common',
        type: itemData?.type || 'item',
        description: itemData?.description || itemData?.effect || ''
      };
    });

    // Random pool items (roll for availability)
    const random = (merchant.stock.random_pool || [])
      .filter(stockItem => Math.random() < stockItem.chance)
      .map(stockItem => {
        const itemData = this.getItemData(stockItem.item);
        return {
          id: stockItem.item,
          name: itemData?.name || stockItem.item,
          price: stockItem.price,
          stock: 1, // Random items typically limited stock
          rarity: itemData?.rarity || 'uncommon',
          type: itemData?.type || 'item',
          description: itemData?.description || itemData?.effect || ''
        };
      });

    return {
      always,
      random
    };
  }

  /**
   * Get item data by ID (searches all data sources)
   * @param {string} itemId - Item ID
   * @returns {Object|null} Item data
   */
  getItemData(itemId) {
    // Search consumables
    if (this.consumablesData) {
      for (const category of Object.values(this.consumablesData)) {
        if (category[itemId]) {
          return { ...category[itemId], category: 'consumable' };
        }
      }
    }

    // Search gear
    for (const gearCategory of Object.values(this.gearData)) {
      if (Array.isArray(gearCategory)) {
        const found = gearCategory.find(item => item.id === itemId);
        if (found) return { ...found, category: 'equipment' };
      } else if (typeof gearCategory === 'object') {
        // Check nested rarities (common, uncommon, etc.)
        for (const rarityItems of Object.values(gearCategory)) {
          if (Array.isArray(rarityItems)) {
            const found = rarityItems.find(item => item.id === itemId);
            if (found) return { ...found, category: 'equipment' };
          }
        }
      }
    }

    // Search basic items
    for (const category of Object.values(this.itemsData)) {
      if (Array.isArray(category)) {
        const found = category.find(item => item.id === itemId);
        if (found) return { ...found, category: 'item' };
      }
    }

    return null;
  }

  /**
   * Buy item from merchant
   * @param {Object} character - Character object
   * @param {string} merchantId - Merchant NPC ID
   * @param {string} itemId - Item ID to buy
   * @param {number} quantity - Quantity to buy (default: 1)
   * @returns {Object} Purchase result { success, message, itemData, totalCost }
   */
  buyItem(character, merchantId, itemId, quantity = 1) {
    const merchant = this.getMerchant(merchantId);
    
    if (!merchant) {
      return {
        success: false,
        message: 'Merchant not found'
      };
    }

    // Find item in merchant's inventory
    const inventory = this.getMerchantInventory(merchantId);
    const allItems = [...inventory.always, ...inventory.random];
    const stockItem = allItems.find(item => item.id === itemId);

    if (!stockItem) {
      return {
        success: false,
        message: `${merchant.name} doesn't sell that item`
      };
    }

    // Check if enough stock
    if (stockItem.stock < quantity) {
      return {
        success: false,
        message: `Not enough stock (only ${stockItem.stock} available)`
      };
    }

    // Calculate total cost
    const totalCost = stockItem.price * quantity;

    // Check if character has enough gold
    if (character.gold < totalCost) {
      return {
        success: false,
        message: `Not enough gold (need ${totalCost} gold, have ${character.gold} gold)`
      };
    }

    // Process purchase
    character.gold -= totalCost;

    // Add item to inventory
    this.addItemToInventory(character, itemId, quantity);

    return {
      success: true,
      message: `Purchased ${quantity}x ${stockItem.name} for ${totalCost} gold`,
      itemData: stockItem,
      totalCost,
      remainingGold: character.gold
    };
  }

  /**
   * Sell item to merchant
   * @param {Object} character - Character object
   * @param {string} merchantId - Merchant NPC ID
   * @param {string} itemId - Item ID to sell
   * @param {number} quantity - Quantity to sell (default: 1)
   * @returns {Object} Sale result { success, message, goldEarned }
   */
  sellItem(character, merchantId, itemId, quantity = 1) {
    const merchant = this.getMerchant(merchantId);
    
    if (!merchant) {
      return {
        success: false,
        message: 'Merchant not found'
      };
    }

    // Check if character has the item
    const invItem = character.inventory.find(item => item.id === itemId);
    
    if (!invItem || invItem.quantity < quantity) {
      return {
        success: false,
        message: `You don't have ${quantity}x ${itemId}`
      };
    }

    // Get item data to determine sell price
    const itemData = this.getItemData(itemId);
    
    if (!itemData) {
      return {
        success: false,
        message: 'Unknown item'
      };
    }

    // Calculate sell price (typically 40% of buy price)
    const basePrice = itemData.price || this.estimateItemValue(itemData);
    const sellPrice = Math.floor(basePrice * 0.4);
    const totalEarned = sellPrice * quantity;

    // Process sale
    character.gold += totalEarned;

    // Remove item from inventory
    this.removeItemFromInventory(character, itemId, quantity);

    return {
      success: true,
      message: `Sold ${quantity}x ${itemData.name} for ${totalEarned} gold`,
      itemData,
      goldEarned: totalEarned,
      remainingGold: character.gold
    };
  }

  /**
   * Estimate item value based on rarity and type
   * @param {Object} itemData - Item data
   * @returns {number} Estimated value in gold
   */
  estimateItemValue(itemData) {
    const rarityValues = {
      common: 10,
      uncommon: 50,
      rare: 200,
      epic: 800,
      legendary: 3000,
      mythic: 10000
    };

    const baseValue = rarityValues[itemData.rarity] || 10;

    // Adjust for equipment vs consumables
    if (itemData.category === 'equipment') {
      return baseValue * 2; // Equipment more valuable
    }

    return baseValue;
  }

  /**
   * Add item to character inventory
   * @param {Object} character - Character object
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to add
   */
  addItemToInventory(character, itemId, quantity) {
    // Ensure inventory is an InventoryManager instance
    const InventoryManager = require('./InventoryManager');
    if (!character.inventory || !(character.inventory instanceof InventoryManager)) {
      character.inventory = new InventoryManager([], 30);
    }

    // Use InventoryManager's addItem method instead of manual array manipulation
    return character.inventory.addItem(itemId, quantity);
  }

  /**
   * Remove item from character inventory
   * @param {Object} character - Character object
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to remove
   */
  removeItemFromInventory(character, itemId, quantity) {
    const itemIndex = character.inventory.findIndex(item => item.id === itemId);

    if (itemIndex !== -1) {
      character.inventory[itemIndex].quantity -= quantity;

      // Remove item if quantity reaches 0
      if (character.inventory[itemIndex].quantity <= 0) {
        character.inventory.splice(itemIndex, 1);
      }
    }
  }

  /**
   * Get all merchants in a location
   * @param {string} location - Location/biome ID
   * @returns {Array} Array of merchants
   */
  getMerchantsInLocation(location) {
    return this.merchants.filter(merchant => {
      return merchant.spawn_locations && merchant.spawn_locations.includes(location);
    });
  }

  /**
   * Check if merchant spawns (random encounter)
   * @param {string} merchantId - Merchant NPC ID
   * @returns {boolean} True if merchant spawns
   */
  checkMerchantSpawn(merchantId) {
    const merchant = this.getMerchant(merchantId);
    
    if (!merchant || !merchant.spawn_chance) {
      return false;
    }

    return Math.random() < merchant.spawn_chance;
  }

  /**
   * Get merchant greeting
   * @param {string} merchantId - Merchant NPC ID
   * @returns {string} Greeting message
   */
  getMerchantGreeting(merchantId) {
    const merchant = this.getMerchant(merchantId);
    return merchant?.greeting || 'Welcome, traveler!';
  }

  /**
   * Get random merchant dialogue
   * @param {string} merchantId - Merchant NPC ID
   * @returns {string} Random dialogue line
   */
  getMerchantDialogue(merchantId) {
    const merchant = this.getMerchant(merchantId);
    
    if (!merchant || !merchant.dialogue || merchant.dialogue.length === 0) {
      return 'Come back anytime!';
    }

    return merchant.dialogue[Math.floor(Math.random() * merchant.dialogue.length)];
  }

  /**
   * Get all available merchants
   * @returns {Array} Array of all merchants with basic info
   */
  getAllMerchants() {
    return this.merchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      merchant_type: merchant.merchant_type,
      spawn_locations: merchant.spawn_locations
    }));
  }
}

module.exports = ShopManager;
