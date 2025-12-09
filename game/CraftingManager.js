/**
 * CraftingManager.js
 * Handles crafting of items, potions, and equipment from materials
 */

const { loadData } = require('../data/data_loader');

class CraftingManager {
  constructor() {
    this.recipes = null;
    this.materials = null;
  }

  /**
   * Load crafting recipes from JSON files
   */
  loadRecipes() {
    if (this.recipes) {
      return this.getAllRecipes();
    }

    this.recipes = {
      potions: {},
      consumables: {},
      equipment: {},
      materials: {}
    };

    // Load consumables with recipes
    try {
      const consumablesData = loadData('consumables_extended');
      if (consumablesData && consumablesData.potions) {
        for (const [id, potion] of Object.entries(consumablesData.potions)) {
          if (potion.craftable && potion.recipe) {
            this.recipes.potions[id] = {
              id,
              name: potion.name,
              type: potion.type,
              rarity: potion.rarity,
              result: { id, ...potion },
              ingredients: potion.recipe.ingredients || [],
              skill_required: potion.recipe.skill_required || 1,
              gold_cost: Math.floor(potion.price * 0.3) || 10
            };
          }
        }
      }

      if (consumablesData && consumablesData.food) {
        for (const [id, food] of Object.entries(consumablesData.food)) {
          if (food.craftable && food.recipe) {
            this.recipes.consumables[id] = {
              id,
              name: food.name,
              type: 'food',
              rarity: food.rarity,
              result: { id, ...food },
              ingredients: food.recipe.ingredients || [],
              skill_required: food.recipe.skill_required || 1,
              gold_cost: Math.floor(food.price * 0.3) || 5
            };
          }
        }
      }
    } catch (error) {
      console.error('Error loading consumable recipes:', error);
    }

    // Load materials data for gathering
    try {
      const itemsData = loadData('items_extended');
      if (itemsData && itemsData.materials) {
        this.materials = itemsData.materials;
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }

    // Add some basic crafting recipes for equipment
    this.addEquipmentRecipes();

    // Add material conversion recipes
    this.addMaterialRecipes();

    // Return all recipes as a flat array
    const allRecipes = [];
    for (const category in this.recipes) {
      for (const recipeId in this.recipes[category]) {
        allRecipes.push(this.recipes[category][recipeId]);
      }
    }
    return allRecipes;
  }

  /**
   * Add equipment crafting recipes
   */
  addEquipmentRecipes() {
    // Basic weapon recipes
    this.recipes.equipment['iron_sword'] = {
      id: 'iron_sword',
      name: 'Iron Sword',
      type: 'weapon',
      rarity: 'common',
      result: {
        id: 'iron_sword',
        name: 'Iron Sword',
        attack: 15,
        slot: 'main_hand'
      },
      ingredients: ['iron_ore', 'iron_ore', 'iron_ore', 'wood'],
      skill_required: 5,
      gold_cost: 50
    };

    this.recipes.equipment['steel_sword'] = {
      id: 'steel_sword',
      name: 'Steel Sword',
      type: 'weapon',
      rarity: 'uncommon',
      result: {
        id: 'steel_sword',
        name: 'Steel Sword',
        attack: 30,
        slot: 'main_hand'
      },
      ingredients: ['iron_ore', 'iron_ore', 'iron_ore', 'iron_ore', 'coal', 'wood'],
      skill_required: 15,
      gold_cost: 150
    };

    // Basic armor recipes
    this.recipes.equipment['leather_armor'] = {
      id: 'leather_armor',
      name: 'Leather Armor',
      type: 'armor',
      rarity: 'common',
      result: {
        id: 'leather_armor',
        name: 'Leather Armor',
        defense: 10,
        slot: 'chest'
      },
      ingredients: ['leather', 'leather', 'leather', 'thread'],
      skill_required: 3,
      gold_cost: 30
    };

    this.recipes.equipment['chainmail'] = {
      id: 'chainmail',
      name: 'Chainmail Armor',
      type: 'armor',
      rarity: 'uncommon',
      result: {
        id: 'chainmail',
        name: 'Chainmail Armor',
        defense: 25,
        slot: 'chest'
      },
      ingredients: ['iron_ore', 'iron_ore', 'iron_ore', 'cloth'],
      skill_required: 10,
      gold_cost: 100
    };
  }

  /**
   * Add material conversion/refining recipes
   */
  addMaterialRecipes() {
    // Refining recipes
    this.recipes.materials['refined_iron'] = {
      id: 'refined_iron',
      name: 'Refined Iron',
      type: 'material',
      rarity: 'uncommon',
      result: {
        id: 'refined_iron',
        name: 'Refined Iron',
        value: 20
      },
      ingredients: ['iron_ore', 'iron_ore', 'iron_ore', 'coal'],
      skill_required: 5,
      gold_cost: 10
    };

    this.recipes.materials['enchanting_dust'] = {
      id: 'enchanting_dust',
      name: 'Enchanting Dust',
      type: 'material',
      rarity: 'common',
      result: {
        id: 'enchanting_dust',
        name: 'Enchanting Dust',
        value: 15
      },
      ingredients: ['crystal', 'herb', 'herb'],
      skill_required: 1,
      gold_cost: 5
    };

    this.recipes.materials['mystic_essence'] = {
      id: 'mystic_essence',
      name: 'Mystic Essence',
      type: 'material',
      rarity: 'uncommon',
      result: {
        id: 'mystic_essence',
        name: 'Mystic Essence',
        value: 50
      },
      ingredients: ['enchanting_dust', 'enchanting_dust', 'arcane_powder'],
      skill_required: 10,
      gold_cost: 25
    };
  }

  /**
   * Get all craftable recipes
   */
  async getAllRecipes() {
    this.loadRecipes();
    const allRecipes = [];

    for (const category in this.recipes) {
      for (const recipeId in this.recipes[category]) {
        allRecipes.push(this.recipes[category][recipeId]);
      }
    }

    return allRecipes;
  }

  /**
   * Get recipes by category
   */
  async getRecipesByCategory(category) {
    this.loadRecipes();
    return Object.values(this.recipes[category] || {});
  }

  /**
   * Get recipe by ID
   */
  async getRecipe(recipeId) {
    this.loadRecipes();

    for (const category in this.recipes) {
      if (this.recipes[category][recipeId]) {
        return this.recipes[category][recipeId];
      }
    }

    return null;
  }

  /**
   * Check if character can craft recipe
   */
  async canCraft(character, recipe) {
    const issues = [];

    // Check skill level
    const craftingSkill = character.skills?.crafting || 1;
    if (craftingSkill < recipe.skill_required) {
      issues.push(`Requires crafting skill level ${recipe.skill_required} (current: ${craftingSkill})`);
    }

    // Check gold
    if (character.gold < recipe.gold_cost) {
      issues.push(`Insufficient gold (need ${recipe.gold_cost}, have ${character.gold})`);
    }

    // Check ingredients
    const inventory = character.inventory || [];
    for (const ingredientId of recipe.ingredients) {
      const count = inventory.filter(i => i.id === ingredientId || i === ingredientId).length;
      const required = recipe.ingredients.filter(i => i === ingredientId).length;

      if (count < required) {
        issues.push(`Need ${required}x ${ingredientId} (have ${count})`);
      }
    }

    return {
      canCraft: issues.length === 0,
      issues
    };
  }

  /**
   * Craft an item
   */
  async craftItem(character, recipeId) {
    this.loadRecipes();

    const recipe = await this.getRecipe(recipeId);
    if (!recipe) {
      return {
        success: false,
        message: 'Recipe not found'
      };
    }

    const canCraft = await this.canCraft(character, recipe);
    if (!canCraft.canCraft) {
      return {
        success: false,
        message: canCraft.issues.join(', ')
      };
    }

    // Deduct gold
    character.gold -= recipe.gold_cost;

    // Remove ingredients from inventory
    const inventory = character.inventory || [];
    for (const ingredientId of recipe.ingredients) {
      const index = inventory.findIndex(i => i.id === ingredientId || i === ingredientId);
      if (index !== -1) {
        inventory.splice(index, 1);
      }
    }

    // Add crafted item to inventory
    const craftedItem = { ...recipe.result };
    inventory.push(craftedItem);

    // Gain crafting experience
    const xpGained = this.getCraftingXP(recipe.rarity);
    if (!character.craftingXP) character.craftingXP = 0;
    character.craftingXP += xpGained;

    // Check for crafting level up
    const oldLevel = character.skills?.crafting || 1;
    const newLevel = this.calculateCraftingLevel(character.craftingXP);
    const leveledUp = newLevel > oldLevel;

    if (!character.skills) character.skills = {};
    character.skills.crafting = newLevel;

    return {
      success: true,
      message: `Successfully crafted ${recipe.name}!`,
      craftedItem: craftedItem,
      xpGained: xpGained,
      leveledUp: leveledUp,
      newLevel: newLevel
    };
  }

  /**
   * Get crafting XP for recipe rarity
   */
  getCraftingXP(rarity) {
    const xpTable = {
      common: 10,
      uncommon: 25,
      rare: 50,
      epic: 100,
      legendary: 250
    };

    return xpTable[rarity] || 10;
  }

  /**
   * Calculate crafting level from XP
   */
  calculateCraftingLevel(xp) {
    // 100 XP per level
    return Math.floor(xp / 100) + 1;
  }

  /**
   * Get craftable recipes for character (based on skill level)
   */
  async getCraftableRecipes(character) {
    this.loadRecipes();
    const craftingSkill = character.skills?.crafting || 1;
    const allRecipes = await this.getAllRecipes();

    return allRecipes.filter(recipe => recipe.skill_required <= craftingSkill);
  }

  /**
   * Discover a recipe (unlock for character)
   */
  async discoverRecipe(character, recipeId) {
    if (!character.knownRecipes) {
      character.knownRecipes = [];
    }

    if (character.knownRecipes.includes(recipeId)) {
      return {
        success: false,
        message: 'Recipe already known'
      };
    }

    const recipe = await this.getRecipe(recipeId);
    if (!recipe) {
      return {
        success: false,
        message: 'Recipe not found'
      };
    }

    character.knownRecipes.push(recipeId);

    return {
      success: true,
      message: `Discovered recipe: ${recipe.name}!`,
      recipe: recipe
    };
  }

  /**
   * Get known recipes for character
   */
  async getKnownRecipes(character) {
    this.loadRecipes();

    if (!character.knownRecipes || character.knownRecipes.length === 0) {
      return [];
    }

    const known = [];
    for (const recipeId of character.knownRecipes) {
      const recipe = await this.getRecipe(recipeId);
      if (recipe) {
        known.push(recipe);
      }
    }

    return known;
  }

  /**
   * Salvage an item for materials
   */
  async salvageItem(character, itemId) {
    // Find item in inventory
    const inventory = character.inventory || [];
    const itemIndex = inventory.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Item not found in inventory'
      };
    }

    const item = inventory[itemIndex];

    // Determine materials based on item rarity
    const materials = this.getSalvageMaterials(item);

    if (materials.length === 0) {
      return {
        success: false,
        message: 'This item cannot be salvaged'
      };
    }

    // Remove item
    inventory.splice(itemIndex, 1);

    // Add materials
    materials.forEach(material => {
      inventory.push(material);
    });

    return {
      success: true,
      message: `Salvaged ${item.name} for materials`,
      item: item,
      materials: materials
    };
  }

  /**
   * Get materials from salvaging an item
   */
  getSalvageMaterials(item) {
    const materials = [];
    const rarity = item.rarity || 'common';

    // Base materials based on item type
    if (item.slot === 'main_hand' || item.slot === 'off_hand') {
      // Weapons
      materials.push({ id: 'iron_ore', name: 'Iron Ore' });
      if (rarity !== 'common') {
        materials.push({ id: 'wood', name: 'Wood' });
      }
      if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
        materials.push({ id: 'enchanting_dust', name: 'Enchanting Dust' });
      }
    } else if (item.slot === 'chest' || item.slot === 'legs' || item.slot === 'feet') {
      // Armor
      materials.push({ id: 'cloth', name: 'Cloth' });
      materials.push({ id: 'leather', name: 'Leather' });
      if (rarity !== 'common') {
        materials.push({ id: 'iron_ore', name: 'Iron Ore' });
      }
    } else if (item.slot === 'head' || item.slot === 'hands') {
      // Light armor
      materials.push({ id: 'cloth', name: 'Cloth' });
      if (rarity !== 'common') {
        materials.push({ id: 'leather', name: 'Leather' });
      }
    }

    // Add bonus materials for higher rarities
    if (rarity === 'epic') {
      materials.push({ id: 'mystic_essence', name: 'Mystic Essence' });
    } else if (rarity === 'legendary') {
      materials.push({ id: 'mystic_essence', name: 'Mystic Essence' });
      materials.push({ id: 'arcane_crystal', name: 'Arcane Crystal' });
    }

    return materials;
  }

  /**
   * Get crafting summary for character
   */
  async getCraftingSummary(character) {
    this.loadRecipes();

    const craftingSkill = character.skills?.crafting || 1;
    const craftingXP = character.craftingXP || 0;
    const xpToNextLevel = (craftingSkill * 100) - craftingXP;

    const allRecipes = await this.getAllRecipes();
    const craftableRecipes = allRecipes.filter(r => r.skill_required <= craftingSkill);
    const knownRecipes = await this.getKnownRecipes(character);

    return {
      crafting_level: craftingSkill,
      crafting_xp: craftingXP,
      xp_to_next_level: xpToNextLevel,
      total_recipes: allRecipes.length,
      craftable_recipes: craftableRecipes.length,
      known_recipes: knownRecipes.length
    };
  }
}

module.exports = CraftingManager;
