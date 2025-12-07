/**
 * CharacterInitializer.js
 * Handles character creation and initialization from classes
 */

const { loadData } = require('../data/data_loader');

class CharacterInitializer {
  /**
   * Get all available character classes
   * @returns {Array<Object>} Array of class info
   */
  static getAvailableClasses() {
    const classesData = loadData('classes');
    
    if (!classesData || !classesData.classes) {
      return [];
    }
    
    return Object.values(classesData.classes).map(cls => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      startingStats: cls.starting_stats,
      specialAbility: cls.special_ability?.name
    }));
  }

  /**
   * Get detailed information about a specific class
   * @param {string} classType - Class ID (warrior, mage, etc.)
   * @returns {Object|null} Class data or null if not found
   */
  static getClassInfo(classType) {
    const classesData = loadData('classes');
    
    if (!classesData || !classesData.classes || !classesData.classes[classType]) {
      return null;
    }
    
    return classesData.classes[classType];
  }

  /**
   * Validate if a class type exists
   * @param {string} classType - Class ID to validate
   * @returns {boolean}
   */
  static isValidClass(classType) {
    const classesData = loadData('classes');
    return classesData && classesData.classes && Boolean(classesData.classes[classType]);
  }

  /**
   * Get starting equipment IDs for a class
   * @param {string} classType - Class ID
   * @returns {Object} Equipment object with item IDs
   */
  static getStartingEquipment(classType) {
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (!classInfo || !classInfo.starting_equipment) {
      return {
        main_hand: null,
        armor: null
      };
    }
    
    return {
      main_hand: classInfo.starting_equipment.main_hand || null,
      armor: classInfo.starting_equipment.armor || null
    };
  }

  /**
   * Get starting items for inventory
   * @param {string} classType - Class ID
   * @returns {Array<string>} Array of item IDs
   */
  static getStartingInventory(classType) {
    // Default starting items for all classes
    const baseItems = ["Potion", "Bread"];
    
    // Could add class-specific starting items here
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (classInfo && classInfo.starting_inventory) {
      return [...baseItems, ...classInfo.starting_inventory];
    }
    
    return baseItems;
  }

  /**
   * Calculate starting stats for a class
   * @param {string} classType - Class ID
   * @returns {Object} Starting stats
   */
  static getStartingStats(classType) {
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (!classInfo || !classInfo.starting_stats) {
      return {
        max_hp: 100,
        strength: 1,
        defense: 1,
        magic: 1,
        agility: 1
      };
    }
    
    return { ...classInfo.starting_stats };
  }

  /**
   * Get stat growth rates for a class
   * @param {string} classType - Class ID
   * @returns {Object} Stat bonuses per level
   */
  static getStatGrowth(classType) {
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (!classInfo || !classInfo.stat_bonuses) {
      return {
        hp_per_level: 10,
        strength_per_level: 1,
        defense_per_level: 1,
        magic_per_level: 1,
        agility_per_level: 1
      };
    }
    
    return { ...classInfo.stat_bonuses };
  }

  /**
   * Get special ability info for a class
   * @param {string} classType - Class ID
   * @returns {Object|null} Special ability data
   */
  static getSpecialAbility(classType) {
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (!classInfo || !classInfo.special_ability) {
      return null;
    }
    
    return { ...classInfo.special_ability };
  }

  /**
   * Create character data object from scratch
   * @param {string} playerName - Character name
   * @param {string} classType - Class ID
   * @param {string} location - Starting location
   * @returns {Object} Complete character data object
   */
  static createCharacterData(playerName, classType, location = "Town Square") {
    if (!CharacterInitializer.isValidClass(classType)) {
      throw new Error(`Invalid class type: ${classType}`);
    }
    
    const startingStats = CharacterInitializer.getStartingStats(classType);
    const startingEquipment = CharacterInitializer.getStartingEquipment(classType);
    const startingInventory = CharacterInitializer.getStartingInventory(classType);
    
    // Build equipped object with all slots
    const equipped = {
      headgear: null,
      armor: startingEquipment.armor || null,
      legs: null,
      footwear: null,
      hands: null,
      cape: null,
      off_hand: null,
      amulet: null,
      ring1: null,
      ring2: null,
      belt: null,
      main_hand: startingEquipment.main_hand || null,
      flavor1: null,
      flavor2: null,
      flavor3: null
    };
    
    return {
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
      is_player: true,
      base_stats: {
        strength: startingStats.strength,
        defense: startingStats.defense,
        magic: startingStats.magic,
        agility: startingStats.agility
      }
    };
  }

  /**
   * Generate a character preview (stats at different levels)
   * @param {string} classType - Class ID
   * @param {number} maxLevel - Maximum level to preview (default 10)
   * @returns {Object} Preview data with stats at each level
   */
  static previewClassProgression(classType, maxLevel = 10) {
    if (!CharacterInitializer.isValidClass(classType)) {
      return null;
    }
    
    const classInfo = CharacterInitializer.getClassInfo(classType);
    const startingStats = CharacterInitializer.getStartingStats(classType);
    const growth = CharacterInitializer.getStatGrowth(classType);
    
    const progression = [];
    
    for (let level = 1; level <= maxLevel; level++) {
      const levelDiff = level - 1;
      
      progression.push({
        level,
        hp: Math.floor(startingStats.max_hp + (growth.hp_per_level || 10) * levelDiff),
        strength: Math.floor(startingStats.strength + (growth.strength_per_level || 0) * levelDiff),
        defense: Math.floor(startingStats.defense + (growth.defense_per_level || 0) * levelDiff),
        magic: Math.floor(startingStats.magic + (growth.magic_per_level || 0) * levelDiff),
        agility: Math.floor(startingStats.agility + (growth.agility_per_level || 0) * levelDiff)
      });
    }
    
    return {
      classId: classType,
      className: classInfo.name,
      description: classInfo.description,
      specialAbility: classInfo.special_ability,
      progression
    };
  }

  /**
   * Compare multiple classes side by side
   * @param {Array<string>} classTypes - Array of class IDs to compare
   * @returns {Object} Comparison data
   */
  static compareClasses(classTypes) {
    const comparisons = [];
    
    for (const classType of classTypes) {
      const classInfo = CharacterInitializer.getClassInfo(classType);
      const startingStats = CharacterInitializer.getStartingStats(classType);
      const growth = CharacterInitializer.getStatGrowth(classType);
      
      if (classInfo) {
        comparisons.push({
          id: classType,
          name: classInfo.name,
          description: classInfo.description,
          startingStats,
          statGrowth: growth,
          specialAbility: classInfo.special_ability?.name,
          strengths: CharacterInitializer._analyzeClassStrengths(startingStats, growth)
        });
      }
    }
    
    return comparisons;
  }

  /**
   * Analyze a class's strengths
   * @private
   * @param {Object} startingStats - Starting stats
   * @param {Object} growth - Stat growth
   * @returns {Array<string>} Array of strength descriptions
   */
  static _analyzeClassStrengths(startingStats, growth) {
    const strengths = [];
    
    if (startingStats.max_hp > 100) strengths.push("High HP");
    if (startingStats.strength >= 5) strengths.push("High Strength");
    if (startingStats.defense >= 4) strengths.push("High Defense");
    if (startingStats.magic >= 5) strengths.push("High Magic");
    if (startingStats.agility >= 5) strengths.push("High Agility");
    
    if (growth.hp_per_level >= 10) strengths.push("Great HP Growth");
    if (growth.strength_per_level >= 1.5) strengths.push("Great STR Growth");
    if (growth.defense_per_level >= 1.0) strengths.push("Great DEF Growth");
    if (growth.magic_per_level >= 1.5) strengths.push("Great MAG Growth");
    if (growth.agility_per_level >= 1.5) strengths.push("Great AGI Growth");
    
    return strengths;
  }
}

module.exports = CharacterInitializer;
