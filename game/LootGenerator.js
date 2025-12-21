const { loadData } = require('../data/data_loader');

/**
 * Loot Generator - Generates rewards from monster loot tables
 */
class LootGenerator {
  constructor() {
    this.lootTables = loadData('monster_loot')?.loot_tables || {};
    this.itemsData = loadData('items')?.items || {};
    this.itemsExtended = loadData('items_extended')?.items || {};
  }

  /**
   * Generate loot from a monster
   * @param {Object} monster - Monster data with loot_table
   * @returns {Object} Generated loot { gold, items }
   */
  generateLoot(monster) {
    const lootTableId = monster.loot_table;
    
    if (!lootTableId || !this.lootTables[lootTableId]) {
      // Default minimal loot
      return {
        gold: this.randomRange(1, 5),
        items: []
      };
    }

    const lootTable = this.lootTables[lootTableId];
    
    // Generate gold
    const gold = this.randomRange(lootTable.gold[0], lootTable.gold[1]);
    
    // Generate items
    const items = [];
    
    if (lootTable.items) {
      for (const itemEntry of lootTable.items) {
        const roll = Math.random();
        
        if (roll < itemEntry.chance) {
          // Item drops
          const itemId = itemEntry.item;
          const quantity = itemEntry.quantity || 1;
          
          items.push({
            id: itemId,
            quantity: quantity,
            name: this.getItemName(itemId)
          });
        }
      }
    }

    // Bonus chance for rarity-based equipment drops
    if (monster.rarity) {
      const equipmentDrop = this.rollEquipmentDrop(monster);
      if (equipmentDrop) {
        items.push(equipmentDrop);
      }
    }

    return {
      gold,
      items
    };
  }

  /**
   * Roll for equipment drop based on monster rarity
   * @param {Object} monster - Monster data
   * @returns {Object|null} Equipment item or null
   */
  rollEquipmentDrop(monster) {
    const dropRates = {
      common: 0.05,      // 5% chance
      uncommon: 0.10,    // 10% chance
      rare: 0.20,        // 20% chance
      epic: 0.35,        // 35% chance
      legendary: 0.50,   // 50% chance
      mythic: 0.75       // 75% chance
    };

    const dropChance = dropRates[monster.rarity] || 0.05;
    
    if (Math.random() > dropChance) {
      return null; // No equipment drop
    }

    // Determine equipment rarity (lower rarities more common)
    const rarityRoll = Math.random();
    let itemRarity;
    
    if (rarityRoll < 0.50) itemRarity = 'common';
    else if (rarityRoll < 0.75) itemRarity = 'uncommon';
    else if (rarityRoll < 0.90) itemRarity = 'rare';
    else if (rarityRoll < 0.97) itemRarity = 'epic';
    else itemRarity = 'legendary';

    // Cap rarity at monster rarity
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    const monsterRarityIndex = rarityOrder.indexOf(monster.rarity);
    const itemRarityIndex = rarityOrder.indexOf(itemRarity);
    
    if (itemRarityIndex > monsterRarityIndex) {
      itemRarity = monster.rarity;
    }

    // Select random equipment type
    const equipmentTypes = [
      'gear_weapons',
      'gear_armor',
      'gear_headgear',
      'gear_shields_offhand',
      'gear_legs',
      'gear_footwear',
      'gear_hands',
      'gear_capes',
      'gear_accessories'
    ];

    const selectedType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
    const item = this.getRandomEquipment(selectedType, itemRarity);

    if (item) {
      return {
        id: item.id,
        quantity: 1,
        name: item.name,
        rarity: item.rarity,
        type: 'equipment'
      };
    }

    return null;
  }

  /**
   * Get random equipment from a gear file
   * @param {string} gearFile - Gear file name
   * @param {string} rarity - Desired rarity
   * @returns {Object|null} Equipment item
   */
  getRandomEquipment(gearFile, rarity) {
    // Handle new weapons structure
    if (gearFile === 'gear_weapons') {
      const weaponData = loadData(`gear/weapons/weapons_${rarity}`);
      if (weaponData && weaponData.weapons && weaponData.weapons.length > 0) {
        return weaponData.weapons[Math.floor(Math.random() * weaponData.weapons.length)];
      }
      return null;
    }
    
    // Handle other gear files
    const gearData = loadData(gearFile);
    
    if (!gearData) return null;

    // Navigate nested structure
    const category = Object.values(gearData)[0]; // weapons, armor, etc.
    
    if (category.accessories) {
      // Special handling for accessories (rings, amulets, belts, trinkets)
      const subCategories = Object.keys(category.accessories);
      const randomSub = subCategories[Math.floor(Math.random() * subCategories.length)];
      const items = category.accessories[randomSub][rarity];
      
      if (items && items.length > 0) {
        return items[Math.floor(Math.random() * items.length)];
      }
    } else {
      // Standard gear
      const items = category[rarity];
      
      if (items && items.length > 0) {
        return items[Math.floor(Math.random() * items.length)];
      }
    }

    return null;
  }

  /**
   * Get item name from ID
   * @param {string} itemId - Item ID
   * @returns {string} Item name
   */
  getItemName(itemId) {
    // Search in items
    if (this.itemsData) {
      for (const category of Object.values(this.itemsData)) {
        if (Array.isArray(category)) {
          const found = category.find(item => item.id === itemId);
          if (found) return found.name;
        }
      }
    }

    // Search in items_extended
    if (this.itemsExtended) {
      for (const category of Object.values(this.itemsExtended)) {
        for (const subcategory of Object.values(category)) {
          if (Array.isArray(subcategory)) {
            const found = subcategory.find(item => item.id === itemId);
            if (found) return found.name;
          }
        }
      }
    }

    return itemId; // Return ID if name not found
  }

  /**
   * Random number in range (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number
   */
  randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate loot for boss with guaranteed rewards
   * @param {Object} monster - Boss monster data
   * @returns {Object} Loot with guaranteed items
   */
  generateBossLoot(monster) {
    const baseLoot = this.generateLoot(monster);
    
    // Bosses always drop equipment
    const guaranteedItem = this.rollEquipmentDrop(monster);
    if (guaranteedItem) {
      baseLoot.items.push(guaranteedItem);
    }

    // Multiply gold for bosses
    baseLoot.gold = Math.floor(baseLoot.gold * 2.5);

    // Add bonus items
    const bonusRoll = Math.random();
    if (bonusRoll < 0.5) {
      const bonusItem = this.rollEquipmentDrop(monster);
      if (bonusItem) {
        baseLoot.items.push(bonusItem);
      }
    }

    return baseLoot;
  }

  /**
   * Generate quest reward loot
   * @param {Object} questRewards - Quest reward specification
   * @returns {Object} Generated quest loot
   */
  generateQuestLoot(questRewards) {
    const loot = {
      gold: questRewards.gold || 0,
      items: []
    };

    if (questRewards.items) {
      for (const itemEntry of questRewards.items) {
        loot.items.push({
          id: itemEntry.id || itemEntry.item,
          quantity: itemEntry.quantity || 1,
          name: this.getItemName(itemEntry.id || itemEntry.item)
        });
      }
    }

    return loot;
  }
}

module.exports = LootGenerator;
