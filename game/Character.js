/**
 * Character.js
 * Core Character class that handles all character-related operations
 * Uses OOP principles for managing character stats, equipment, and inventory
 */

const EquipmentManager = require('./EquipmentManager');
const InventoryManager = require('./InventoryManager');
const SkillManager = require('./SkillManager');
const { loadData } = require('../data/data_loader');

class Character {
  /**
   * Creates a new Character instance
   * @param {Object} data - Character data from database
   * @param {string} data.name - Character name
   * @param {string} data.type - Class type (warrior, mage, etc.)
   * @param {number} data.level - Character level
   * @param {number} data.xp - Current experience points
   * @param {number} data.hp - Current health points
   * @param {number} data.max_hp - Maximum health points
   * @param {number} data.gold - Gold amount
   * @param {Array} data.inventory - Inventory items
   * @param {Object} data.equipped - Equipped items
   */
  constructor(data) {
    this.name = data.name;
    this.classType = data.type;
    this.level = data.level || 1;
    this.xp = data.xp || 0;
    this.xpToNext = data.xp_to_next || 10;
    this.hp = data.hp;
    this.maxHp = data.max_hp;
    this.gold = data.gold || 0;
    this.location = data.location || "Town Square";
    this.inCombat = data.in_combat || false;
    this.combat = data.combat || null;
    this.skillCd = data.skill_cd || 0;
    this.step = data.step || 0;
    this.pending = data.pending || null;
    this.skillPoints = data.skill_points || 0;
    this.travelState = data.travel_state || null;
    this.activeQuests = data.active_quests || [];
    this.completedQuests = data.completed_quests || [];
    this.consumableCooldowns = data.consumable_cooldowns || {};
    this.dialogueHistory = data.dialogue_history || {};
    
    // User roles and name color
    this.roles = data.roles || ['viewer'];
    this.nameColor = data.nameColor || data.name_color || null;
    this.selectedRoleBadge = data.selectedRoleBadge || data.selected_role_badge || null;
    this.theme = data.theme || 'crimson-knight';
    
    // Faction reputation tracking
    // Initialize with empty object, FactionManager will handle proper initialization
    this.reputation = data.reputation || {};
    
    // Crafting & Enchanting
    this.craftingXP = data.crafting_xp || 0;
    this.knownRecipes = data.known_recipes || [];
    
    // Legacy Points (premium currency for raid buffs and special features)
    this.legacyPoints = data.legacy_points || 0;
    
    // Achievement tracking
    this.unlockedAchievements = data.unlocked_achievements || [];
    this.achievementProgress = data.achievement_progress || {};
    this.achievementUnlockDates = data.achievement_unlock_dates || {};
    this.achievementPoints = data.achievement_points || 0;
    this.unlockedTitles = data.unlocked_titles || [];
    this.activeTitle = data.active_title || null;
    
    // Stats tracking for achievements
    if (!data.stats) {
      this.stats = {
        totalKills: 0,
        bossKills: 0,
        criticalHits: 0,
        highestDamage: 0,
        deaths: 0,
        locationsVisited: [],
        biomesVisited: [],
        totalGoldEarned: 0,
        totalGoldSpent: 0,
        mysteriesSolved: 0
      };
    } else {
      this.stats = data.stats;
    }
    
    // Dungeon tracking
    this.dungeonState = data.dungeon_state || null;
    this.completedDungeons = data.completed_dungeons || [];
    
    // Season tracking
    this.seasonProgress = data.season_progress || {};
    this.seasonalChallengesCompleted = data.seasonal_challenges_completed || [];
    
    // Bestiary tracking
    this.bestiary = data.bestiary || {};
    this.bestiaryUnlocked = data.bestiary_unlocked || false;
    
    // Map knowledge tracking (fog of war system)
    this.mapKnowledge = data.map_knowledge || null;
    
    // Playtime tracking
    this.playtime = data.playtime || 0;
    
    // Active effects (buffs/debuffs)
    this.activeEffects = data.active_effects || [];
    
    // Abilities
    this.equipped_abilities = data.equipped_abilities || [];
    this.ability_cooldowns = data.ability_cooldowns || {};

    // Initialize managers
    this.equipment = new EquipmentManager(data.equipped || {});
    this.inventory = new InventoryManager(data.inventory || ["Potion"], 30); // Default 30 slots
    this.skills = data.skills ? SkillManager.fromJSON(data.skills) : new SkillManager();

    // Load class data
    this.classData = null;
    this._loadClassData();
  }

  /**
   * Load class-specific data from classes.json
   * @private
   */
  _loadClassData() {
    const classes = loadData('classes');
    if (classes && classes.classes && classes.classes[this.classType]) {
      this.classData = classes.classes[this.classType];
    }
  }

  /**
   * Calculate base stats from class and level
   * @returns {Object} Base stats object
   */
  getBaseStats() {
    if (!this.classData) {
      return {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        maxHp: 100
      };
    }

    const startingStats = this.classData.starting_stats;
    const bonuses = this.classData.stat_bonuses;
    const levelDiff = this.level - 1; // Level 1 has no bonuses yet

    return {
      strength: Math.floor((startingStats.strength || 0) + (bonuses.strength_per_level || 0) * levelDiff),
      dexterity: Math.floor((startingStats.dexterity || 0) + (bonuses.dexterity_per_level || 0) * levelDiff),
      constitution: Math.floor((startingStats.constitution || 0) + (bonuses.constitution_per_level || 0) * levelDiff),
      intelligence: Math.floor((startingStats.intelligence || 0) + (bonuses.intelligence_per_level || 0) * levelDiff),
      wisdom: Math.floor((startingStats.wisdom || 0) + (bonuses.wisdom_per_level || 0) * levelDiff),
      maxHp: Math.floor((startingStats.max_hp || 100) + (bonuses.hp_per_level || 10) * levelDiff)
    };
  }

  /**
   * Get equipment stat bonuses
   * @returns {Object} Equipment stats object
   */
  getEquipmentStats() {
    return this.equipment.getTotalStats();
  }

  /**
   * Calculate final stats (base + equipment)
   * @returns {Object} Final calculated stats
   */
  getFinalStats() {
    const baseStats = this.getBaseStats();
    const equipmentStats = this.getEquipmentStats();

    return {
      // New 5-stat system
      strength: baseStats.strength + (equipmentStats.strength || 0),
      dexterity: baseStats.dexterity + (equipmentStats.dexterity || 0),
      constitution: baseStats.constitution + (equipmentStats.constitution || 0),
      intelligence: baseStats.intelligence + (equipmentStats.intelligence || 0),
      wisdom: baseStats.wisdom + (equipmentStats.wisdom || 0),
      
      // Derived stats for backward compatibility
      attack: (equipmentStats.attack || 0) + baseStats.strength, // Attack from equipment + strength
      defense: baseStats.constitution + (equipmentStats.defense || 0), // Defense derived from constitution
      magic: baseStats.intelligence + (equipmentStats.magic || 0), // Magic derived from intelligence
      agility: baseStats.dexterity + (equipmentStats.agility || 0), // Agility derived from dexterity
      
      maxHp: baseStats.maxHp + (equipmentStats.hp || 0),
      
      // Additional derived stats
      critChance: (baseStats.dexterity * 0.5) + (equipmentStats.crit_chance || 0),
      dodgeChance: (baseStats.dexterity * 0.3) + (equipmentStats.dodge_chance || 0),
      blockChance: (baseStats.constitution * 0.2) + (equipmentStats.block_chance || 0)
    };
  }

  /**
   * Get a complete stats breakdown for display
   * @returns {Object} Detailed stats information
   */
  getStatsBreakdown() {
    const baseStats = this.getBaseStats();
    const equipmentStats = this.getEquipmentStats();
    const finalStats = this.getFinalStats();

    return {
      character: {
        name: this.name,
        class: this.classData?.name || 'Unknown',
        level: this.level,
        xp: this.xp,
        xpToNext: this.xpToNext,
        hp: this.hp,
        maxHp: finalStats.maxHp,
        gold: this.gold
      },
      baseStats: {
        strength: baseStats.strength,
        dexterity: baseStats.dexterity,
        constitution: baseStats.constitution,
        intelligence: baseStats.intelligence,
        wisdom: baseStats.wisdom,
        maxHp: baseStats.maxHp
      },
      equipmentStats: {
        attack: equipmentStats.attack || 0,
        defense: equipmentStats.defense || 0,
        magic: equipmentStats.magic || 0,
        strength: equipmentStats.strength || 0,
        dexterity: equipmentStats.dexterity || 0,
        constitution: equipmentStats.constitution || 0,
        intelligence: equipmentStats.intelligence || 0,
        wisdom: equipmentStats.wisdom || 0,
        agility: equipmentStats.agility || 0,
        hp: equipmentStats.hp || 0
      },
      finalStats: {
        strength: finalStats.strength,
        dexterity: finalStats.dexterity,
        constitution: finalStats.constitution,
        intelligence: finalStats.intelligence,
        wisdom: finalStats.wisdom,
        attack: finalStats.attack,
        defense: finalStats.defense,
        magic: finalStats.magic,
        agility: finalStats.agility,
        maxHp: finalStats.maxHp,
        critChance: Math.min(finalStats.critChance, 100).toFixed(1) + '%',
        dodgeChance: Math.min(finalStats.dodgeChance, 75).toFixed(1) + '%',
        blockChance: Math.min(finalStats.blockChance, 50).toFixed(1) + '%'
      }
    };
  }

  /**
   * Equip an item from inventory
   * @param {string} itemId - Item ID to equip
   * @returns {Object} Result object with success status and message
   */
  equipItem(itemId) {
    // Check if item is in inventory
    if (!this.inventory.hasItem(itemId)) {
      return { success: false, message: `You don't have ${itemId} in your inventory.` };
    }

    // Try to equip the item
    const result = this.equipment.equip(itemId, this.level);
    
    if (result.success) {
      // If something was unequipped, add it back to inventory
      if (result.unequipped) {
        this.inventory.addItem(result.unequipped);
      }
      
      // Remove equipped item from inventory
      this.inventory.removeItem(itemId);
      
      // Recalculate HP if max HP changed
      const finalStats = this.getFinalStats();
      if (this.maxHp !== finalStats.maxHp) {
        const hpPercent = this.hp / this.maxHp;
        this.maxHp = finalStats.maxHp;
        this.hp = Math.floor(this.maxHp * hpPercent); // Maintain HP percentage
      }
    }
    
    return result;
  }

  /**
   * Unequip an item and return it to inventory
   * @param {string} slot - Equipment slot to unequip
   * @returns {Object} Result object with success status and message
   */
  unequipItem(slot) {
    const result = this.equipment.unequip(slot);
    
    if (result.success) {
      // Add item back to inventory
      const addResult = this.inventory.addItem(result.item.id);
      
      if (!addResult.success) {
        // If inventory is full, re-equip the item
        this.equipment.equip(result.item.id, this.level);
        return { success: false, message: "Inventory is full! Cannot unequip item." };
      }
      
      // Recalculate HP if max HP changed
      const finalStats = this.getFinalStats();
      if (this.maxHp !== finalStats.maxHp) {
        const hpPercent = this.hp / this.maxHp;
        this.maxHp = finalStats.maxHp;
        this.hp = Math.min(this.hp, finalStats.maxHp); // Cap at new max
      }
    }
    
    return result;
  }

  /**
   * Add an item to inventory
   * @param {string} itemId - Item ID to add
   * @param {number} quantity - Quantity to add (default 1)
   * @returns {Object} Result object
   */
  addToInventory(itemId, quantity = 1) {
    return this.inventory.addItem(itemId, quantity);
  }

  /**
   * Remove an item from inventory
   * @param {string} itemId - Item ID to remove
   * @param {number} quantity - Quantity to remove (default 1)
   * @returns {Object} Result object
   */
  removeFromInventory(itemId, quantity = 1) {
    return this.inventory.removeItem(itemId, quantity);
  }

  /**
   * Gain experience points (use ProgressionManager for leveling logic)
   * This is a simple version for backward compatibility
   * @param {number} amount - Amount of XP to gain
   * @returns {Object} Result with levelUp flag and new level
   */
  gainXP(amount) {
    this.xp += amount;
    let leveledUp = false;
    let levelsGained = 0;

    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      levelsGained++;
      leveledUp = true;
      this.xpToNext = Math.floor(this.xpToNext * 1.5); // 50% increase per level
      this.skillPoints++; // Award skill point on level up
    }

    if (leveledUp) {
      // Recalculate max HP and fully heal on level up
      const finalStats = this.getFinalStats();
      this.maxHp = finalStats.maxHp;
      this.hp = this.maxHp;
    }

    return {
      leveledUp,
      levelsGained,
      newLevel: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      skillPoints: this.skillPoints
    };
  }

  /**
   * Use a skill
   * @param {string} skillId - Skill identifier
   * @param {number} cooldownDuration - Cooldown in turns
   * @param {number} currentTurn - Current turn number
   * @returns {Object} Result
   */
  useSkill(skillId, cooldownDuration, currentTurn = 0) {
    return this.skills.useSkill(skillId, cooldownDuration, currentTurn);
  }

  /**
   * Check if a skill is available
   * @param {string} skillId - Skill identifier
   * @param {number} currentTurn - Current turn number
   * @returns {boolean}
   */
  isSkillAvailable(skillId, currentTurn = 0) {
    return this.skills.isAvailable(skillId, currentTurn);
  }

  /**
   * Tick all skill cooldowns (call at end of turn)
   */
  tickSkillCooldowns() {
    this.skills.tickCooldowns();
  }

  /**
   * Reset all skill cooldowns
   */
  resetSkillCooldowns() {
    this.skills.resetAllCooldowns();
  }

  /**
   * Learn a new skill
   * @param {string} skillId - Skill identifier
   * @param {Object} skillData - Skill data
   * @returns {Object} Result
   */
  learnSkill(skillId, skillData = {}) {
    return this.skills.learnSkill(skillId, skillData);
  }

  /**
   * Heal the character
   * @param {number} amount - Amount to heal
   * @returns {number} Actual amount healed
   */
  heal(amount) {
    const oldHp = this.hp;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    return this.hp - oldHp;
  }

  /**
   * Take damage
   * @param {number} amount - Amount of damage
   * @returns {Object} Damage result
   */
  takeDamage(amount) {
    const finalStats = this.getFinalStats();
    
    // Apply defense reduction (each point of defense reduces damage by ~1%)
    const damageReduction = finalStats.defense * 0.01;
    const reducedDamage = Math.max(1, Math.floor(amount * (1 - damageReduction)));
    
    this.hp = Math.max(0, this.hp - reducedDamage);
    
    return {
      damage: reducedDamage,
      blocked: amount - reducedDamage,
      isDead: this.hp <= 0
    };
  }

  /**
   * Check if character can afford something
   * @param {number} cost - Gold cost
   * @returns {boolean}
   */
  canAfford(cost) {
    return this.gold >= cost;
  }

  /**
   * Spend gold
   * @param {number} amount - Amount to spend
   * @returns {boolean} Success status
   */
  spendGold(amount) {
    if (!this.canAfford(amount)) {
      return false;
    }
    this.gold -= amount;
    return true;
  }

  /**
   * Add gold
   * @param {number} amount - Amount to add
   */
  addGold(amount) {
    this.gold += amount;
  }

  /**
   * Export character data for database storage
   * @returns {Object} Character data object
   */
  toDatabase() {
    return {
      name: this.name,
      type: this.classType,
      level: this.level,
      xp: this.xp,
      xp_to_next: this.xpToNext,
      hp: this.hp,
      max_hp: this.maxHp,
      gold: this.gold,
      location: this.location,
      inventory: this.inventory.toArray(),
      equipped: this.equipment.toObject(),
      skills: this.skills.toJSON(),
      skill_points: this.skillPoints,
      travel_state: this.travelState,
      active_quests: this.activeQuests,
      completed_quests: this.completedQuests,
      consumable_cooldowns: this.consumableCooldowns,
      dialogue_history: this.dialogueHistory,
      reputation: this.reputation,
      crafting_xp: this.craftingXP,
      known_recipes: this.knownRecipes,
      in_combat: this.inCombat,
      combat: this.combat,
      skill_cd: this.skillCd,
      step: this.step,
      pending: this.pending,
      is_player: true,
      roles: this.roles,
      nameColor: this.nameColor,
      selectedRoleBadge: this.selectedRoleBadge,
      theme: this.theme,
      bestiary: this.bestiary,
      bestiary_unlocked: this.bestiaryUnlocked,
      equipped_abilities: this.equipped_abilities,
      ability_cooldowns: this.ability_cooldowns,
      map_knowledge: this.mapKnowledge
    };
  }

  /**
   * Alias for toDatabase for backwards compatibility
   * @returns {Object} Character data object
   */
  toObject() {
    return this.toDatabase();
  }

  /**
   * Export character data for frontend (camelCase fields)
   * @returns {Object} Character data formatted for frontend
   */
  toFrontend() {
    const finalStats = this.getFinalStats();
    
    return {
      // Basic info
      name: this.name,
      username: this.name,
      classType: this.classType,
      class: this.classType,
      level: this.level,
      xp: this.xp,
      totalXp: this.xp,
      xpToNext: this.xpToNext,
      xpToNextLevel: this.xpToNext, // Alias for frontend compatibility
      
      // Health & Resources
      hp: this.hp,
      maxHp: this.maxHp,
      gold: this.gold,
      
      // Combat Stats (from getFinalStats())
      stats: {
        // New 5-stat system
        strength: finalStats.strength,
        dexterity: finalStats.dexterity,
        constitution: finalStats.constitution,
        intelligence: finalStats.intelligence,
        wisdom: finalStats.wisdom,
        // Derived stats for backward compatibility
        attack: finalStats.attack,
        defense: finalStats.defense,
        magic: finalStats.magic,
        agility: finalStats.agility,
        critChance: finalStats.critChance,
        dodgeChance: finalStats.dodgeChance,
        blockChance: finalStats.blockChance
      },
      
      // Equipment
      equipment: this.equipment.toObject(),
      
      // Inventory
      inventory: this.inventory.toArray(),
      
      // Location & State
      location: this.location,
      inCombat: this.inCombat,
      
      // Progression
      skillPoints: this.skillPoints,
      legacyPoints: this.legacyPoints,
      achievementPoints: this.achievementPoints,
      deaths: this.stats?.deaths || 0,
      playtime: this.playtime || 0,
      
      // Quests & Achievements
      activeQuests: this.activeQuests,
      completedQuests: this.completedQuests,
      unlockedAchievements: this.unlockedAchievements,
      activeTitle: this.activeTitle,
      
      // Reputation & Crafting
      reputation: this.reputation,
      craftingXP: this.craftingXP,
      
      // Appearance & Roles
      theme: this.theme,
      roles: this.roles,
      nameColor: this.nameColor,
      selectedRoleBadge: this.selectedRoleBadge,
      
      // Active Effects
      activeEffects: this.activeEffects || [],
      
      // Abilities
      equipped_abilities: this.equipped_abilities || [],
      ability_cooldowns: this.ability_cooldowns || {}
    };
  }

  /**
   * Create a new character from a class
   * @param {string} playerName - Player's display name
   * @param {string} classType - Class type (warrior, mage, rogue, cleric, ranger)
   * @param {string} location - Starting location
   * @returns {Character} New character instance
   */
  static createNew(playerName, classType, location = "Town Square") {
    const classes = loadData('classes');
    
    if (!classes || !classes.classes || !classes.classes[classType]) {
      throw new Error(`Invalid class type: ${classType}`);
    }

    const classData = classes.classes[classType];
    const startingStats = classData.starting_stats;
    
    // Prepare starting inventory with class-specific items (unequipped)
    const startingInventory = ["potion", "bread"]; // Base starting items
    
    // Prepare equipped items
    const equipped = {
      headgear: null, chest: null, legs: null, footwear: null,
      hands: null, cape: null, off_hand: null, amulet: null,
      ring1: null, ring2: null, belt: null, main_hand: null,
      relic1: null, relic2: null, relic3: null
    };

    // Equip starting equipment
    if (classData.starting_equipment) {
      if (classData.starting_equipment.main_hand) {
        equipped.main_hand = classData.starting_equipment.main_hand;
        startingInventory.push(classData.starting_equipment.main_hand); // Add to inventory
      }
      if (classData.starting_equipment.chest) {
        equipped.chest = classData.starting_equipment.chest;
        startingInventory.push(classData.starting_equipment.chest); // Add to inventory
      }
    }
    
    // Add class-specific starting items to inventory (these are unequipped backups/extras)
    const classStartingItems = {
      warrior: ["health_potion"],           // Warriors get extra healing
      mage: ["mana_potion"],                // Mages get mana management
      rogue: ["antidote"],                  // Rogues get poison cure for trap disarming
      cleric: ["health_potion"],            // Clerics get extra healing items  
      ranger: ["bread"],                    // Rangers get extra food for wilderness
      paladin: ["health_potion", "blessed_water"]  // Paladins get healing and holy items
    };
    
    if (classStartingItems[classType]) {
      startingInventory.push(...classStartingItems[classType]);
    }

    // Initialize map knowledge with town_square discovered
    const MapKnowledgeManager = require('./MapKnowledgeManager');
    const initialMapKnowledge = MapKnowledgeManager.initializeMapKnowledge();

    const characterData = {
      name: playerName,
      type: classType,
      level: 1,
      xp: 0,
      xp_to_next: 10,
      hp: startingStats.max_hp,
      max_hp: startingStats.max_hp,
      gold: 50, // Starting gold
      location: location,
      inventory: startingInventory,
      equipped: equipped,
      in_combat: false,
      combat: null,
      skill_cd: 0,
      step: 0,
      pending: null,
      map_knowledge: initialMapKnowledge
    };

    return new Character(characterData);
  }
}

module.exports = Character;
