/**
 * ProgressionManager.js
 * Handles XP gain, leveling, stat increases, skill points, and permanent progression
 */

const { loadData } = require('../data/data_loader');
const PassiveManager = require('./PassiveManager');

class ProgressionManager {
  constructor() {
    this.constants = loadData('constants')?.constants || {};
    this.classes = loadData('classes')?.classes || {};
    this.passives = loadData('passives')?.passives || {};
    this.passiveManager = new PassiveManager();
  }

  /**
   * Calculate XP required for next level
   * Formula: BASE_XP * (level ^ XP_SCALING)
   * @param {number} level - Current level
   * @returns {number} XP required for next level
   */
  calculateXPToNextLevel(level) {
    const baseXP = this.constants.BASE_XP_TO_LEVEL || 100;
    const scaling = this.constants.XP_SCALING || 1.5;
    return Math.floor(baseXP * Math.pow(level, scaling));
  }

  /**
   * Calculate total XP needed to reach a specific level
   * @param {number} targetLevel - Level to calculate total XP for
   * @returns {number} Total XP needed
   */
  calculateTotalXPToLevel(targetLevel) {
    let totalXP = 0;
    for (let level = 1; level < targetLevel; level++) {
      totalXP += this.calculateXPToNextLevel(level);
    }
    return totalXP;
  }

  /**
   * Add XP to a character and handle level ups
   * @param {Object} character - Character object
   * @param {number} xpGained - Amount of XP to add
   * @returns {Object} Result with level ups and rewards
   */
  addXP(character, xpGained) {
    const maxLevel = this.constants.MAX_LEVEL || 50;
    const result = {
      xpGained,
      currentLevel: character.level,
      newLevel: character.level,
      levelsGained: 0,
      levelUpRewards: [],
      totalSkillPoints: 0
    };

    // Add XP to character
    character.xp += xpGained;

    // Check for level ups - handle multiple levels if enough XP
    while (character.level < maxLevel && character.xp >= character.xpToNext) {
      // Subtract XP threshold from current XP (remainder carries over)
      character.xp -= character.xpToNext;
      
      // Increase level
      character.level++;
      result.levelsGained++;

      // Calculate stats gained this level (based on class stat distribution)
      const statsGained = this.calculateStatsGainedOnLevelUp(character.classType);
      
      // Calculate new XP requirement for next level
      character.xpToNext = this.calculateXPToNextLevel(character.level);

      // Award skill point
      const skillPointsGained = 1;
      result.totalSkillPoints += skillPointsGained;
      
      // Update character's skill points
      if (character.skillPoints !== undefined) {
        character.skillPoints += skillPointsGained;
      } else {
        character.skillPoints = skillPointsGained;
      }

      // Heal to full on level up and update maxHp
      const finalStats = character.getFinalStats();
      character.maxHp = finalStats.maxHp;
      character.hp = character.maxHp;
      
      // Also heal mana to full if character has mana
      if (character.maxMana !== undefined) {
        character.mana = character.maxMana;
      }

      // Award legacy points on level milestones (10, 20, 30, 40, 50)
      let legacyPointsAwarded = 0;
      if (character.level % 10 === 0 && this.passiveManager && this.permanentStats) {
        legacyPointsAwarded = this.passiveManager.awardLegacyPoints(this.permanentStats, 1);
      }

      result.levelUpRewards.push({
        level: character.level,
        statsGained,
        skillPoints: skillPointsGained,
        healedToFull: true,
        newMaxHp: character.maxHp,
        legacyPointsAwarded
      });
    }

    result.newLevel = character.level;
    result.remainingXP = character.xp;
    result.xpToNext = character.xpToNext;

    return result;
  }

  /**
   * Calculate stat increases on level up
   * All base stats increase by 1, plus class-specific bonuses
   * @param {string} classType - Character class type
   * @returns {Object} Stats gained
   */
  calculateStatsGainedOnLevelUp(classType) {
    const classData = this.classes[classType];
    const statsGained = {
      strength: 1,
      defense: 1,
      magic: 1,
      agility: 1,
      hp: 10 // Base HP per level
    };

    if (classData && classData.stat_bonuses) {
      const bonuses = classData.stat_bonuses;
      
      // Add class-specific bonuses (rounded)
      statsGained.strength += Math.floor(bonuses.strength_per_level || 0);
      statsGained.defense += Math.floor(bonuses.defense_per_level || 0);
      statsGained.magic += Math.floor(bonuses.magic_per_level || 0);
      statsGained.agility += Math.floor(bonuses.agility_per_level || 0);
      statsGained.hp += Math.floor(bonuses.hp_per_level || 0);
    }

    return statsGained;
  }

  /**
   * Handle character death
   * @param {Object} character - Character object
   * @param {boolean} isHardcore - Is hardcore mode enabled?
   * @param {Object} permanentStats - Permanent account-wide stats
   * @returns {Object} Death result
   */
  handleDeath(character, isHardcore = false, permanentStats = {}) {
    const result = {
      died: true,
      isHardcore,
      characterDeleted: false,
      goldLost: 0,
      xpLost: 0,
      soulsAwarded: 0,
      respawnLocation: 'Brindlewatch',
      permanentStatsRetained: permanentStats
    };

    // Award souls for death
    const soulsAwarded = this.passiveManager.awardSouls(permanentStats, character.level, isHardcore);
    result.soulsAwarded = soulsAwarded;

    if (isHardcore) {
      // Hardcore mode: Character is deleted, keep only permanent progression
      result.characterDeleted = true;
      result.message = `${character.name} has fallen in hardcore mode. All progress lost except permanent unlocks. You gained ${soulsAwarded} souls.`;
      
      // Return permanent stats for new character
      result.permanentStatsToRetain = {
        passiveLevels: permanentStats.passiveLevels || {},
        unlockedPassives: permanentStats.unlockedPassives || [],
        souls: permanentStats.souls || 0,
        legacyPoints: permanentStats.legacyPoints || 0,
        accountStats: permanentStats.accountStats || {},
        totalDeaths: (permanentStats.totalDeaths || 0) + 1,
        totalKills: permanentStats.totalKills || 0,
        totalGoldEarned: permanentStats.totalGoldEarned || 0,
        totalXPEarned: permanentStats.totalXPEarned || 0,
        highestLevelReached: Math.max(character.level, permanentStats.highestLevelReached || 1),
        totalCrits: permanentStats.totalCrits || 0
      };
    } else {
      // Normal mode: Lose some gold and XP, respawn in town
      const goldLoss = Math.floor(character.gold * 0.1); // Lose 10% gold
      const xpLoss = Math.floor(character.xp * 0.25); // Lose 25% current level XP
      
      character.gold = Math.max(0, character.gold - goldLoss);
      character.xp = Math.max(0, character.xp - xpLoss);
      character.hp = Math.floor(character.maxHp * 0.5); // Respawn with 50% HP
      character.location = 'Brindlewatch';
      character.inCombat = false;
      character.combat = null;

      result.goldLost = goldLoss;
      result.xpLost = xpLoss;
      result.respawnedWith = {
        hp: character.hp,
        maxHp: character.maxHp,
        gold: character.gold,
        xp: character.xp
      };
      result.message = `You died and lost ${goldLoss} gold and ${xpLoss} XP. You gained ${soulsAwarded} souls. You respawn in Brindlewatch with 50% HP.`;
    }

    return result;
  }

  /**
   * Handle character respawn after death
   * @param {Object} character - Character object
   * @returns {Object} Respawn result
   */
  respawn(character) {
    character.hp = Math.floor(character.maxHp * 0.5);
    character.location = 'Brindlewatch';
    character.inCombat = false;
    character.combat = null;

    return {
      success: true,
      message: `${character.name} respawns in Brindlewatch with ${character.hp}/${character.maxHp} HP.`,
      hp: character.hp,
      maxHp: character.maxHp,
      location: character.location
    };
  }

  /**
   * Get unlockable abilities for a class at a specific level
   * @param {string} classType - Character class
   * @param {number} level - Character level
   * @returns {Array} Available abilities
   */
  getUnlockedAbilities(classType, level) {
    const classData = this.classes[classType];
    if (!classData) return [];

    const abilities = [];

    // Add special ability at level 1
    if (classData.special_ability) {
      abilities.push({
        ...classData.special_ability,
        unlocked: true,
        level_required: 1
      });
    }

    // TODO: Add more abilities based on level from abilities.json
    // This would be expanded when ability system is fully implemented

    return abilities;
  }

  /**
   * Calculate stat increases based on permanent passives
   * @param {Array} unlockedPassives - Array of unlocked passive IDs
   * @param {Object} accountStats - Account-wide statistics
   * @returns {Object} Bonus stats from passives
   */
  /**
   * Calculate passive bonuses (delegates to PassiveManager)
   * @param {Object|Array} passiveLevelsOrArray - Passive levels object { passive_id: level } or array of IDs
   * @param {Object} accountStats - Account-wide stats for stack-based passives
   * @returns {Object} Bonus multipliers and flat bonuses
   */
  calculatePassiveBonuses(passiveLevelsOrArray = {}, accountStats = {}) {
    // Handle array input (convert to object with level 1)
    let passiveLevels = passiveLevelsOrArray;
    if (Array.isArray(passiveLevelsOrArray)) {
      passiveLevels = {};
      passiveLevelsOrArray.forEach(passiveId => {
        passiveLevels[passiveId] = 1; // Default level 1
      });
    }
    
    // Get base bonuses from PassiveManager
    const bonuses = this.passiveManager.calculatePassiveBonuses(passiveLevels);
    
    // Apply stack-based bonuses for passives that require accountStats
    for (const passiveId in passiveLevels) {
      if (passiveLevels[passiveId] === 0) continue;
      
      // Find passive definition
      let passive = null;
      for (const category in this.passives) {
        if (Array.isArray(this.passives[category])) {
          const found = this.passives[category].find(p => p.id === passiveId);
          if (found) {
            passive = found;
            break;
          }
        }
      }
      
      if (!passive || !passive.effect) continue;
      
      // Handle stack-based bonuses (like efficient_killer)
      if (passive.effect.type === 'damage_bonus' && passive.effect.stack_requirement) {
        const stacks = Math.floor((accountStats.monster_kills || 0) / passive.effect.stack_requirement);
        const cappedStacks = Math.min(stacks, passive.effect.max_stacks || 10);
        const bonus = cappedStacks * passive.effect.value_per_stack;
        bonuses.damageMultiplier += bonus;
      }
      
      // Handle combat stats bonuses (like improved_crits)
      if (passive.effect.type === 'combat_stats') {
        bonuses.critChance += passive.effect.crit_chance || 0;
        bonuses.critDamage += passive.effect.crit_damage || 0;
      }
    }
    
    return bonuses;
  }

  /**
   * Check if passive can be unlocked (delegates to PassiveManager)
   * @param {Object} passive - Passive object
   * @param {Object} character - Character object
   * @param {Object} accountStats - Account stats
   * @returns {Object} Can unlock status and message
   */
  canUnlockPassive(passive, character, accountStats) {
    // PassiveManager doesn't have this method, so we'll implement it here
    if (!passive.unlock_requirement) {
      return { canUnlock: true, message: 'No requirements' };
    }

    const req = passive.unlock_requirement;
    
    switch (req.type) {
      case 'level_reached':
        const canUnlock = accountStats.highestLevelReached >= req.value;
        return {
          canUnlock,
          message: canUnlock 
            ? `Unlocked (Level ${req.value} reached)` 
            : `Requires Level ${req.value} (currently ${accountStats.highestLevelReached})`
        };
      
      case 'total_kills':
        const killsCanUnlock = accountStats.totalKills >= req.value;
        return {
          canUnlock: killsCanUnlock,
          message: killsCanUnlock
            ? `Unlocked (${req.value} kills reached)`
            : `Requires ${req.value} kills (currently ${accountStats.totalKills || 0})`
        };
      
      case 'total_crits':
        const critsCanUnlock = accountStats.totalCrits >= req.value;
        return {
          canUnlock: critsCanUnlock,
          message: critsCanUnlock
            ? `Unlocked (${req.value} crits reached)`
            : `Requires ${req.value} crits (currently ${accountStats.totalCrits || 0})`
        };
      
      default:
        return { canUnlock: false, message: 'Unknown requirement type' };
    }
  }

  /**
   * Get all available passives (delegates to PassiveManager)
   * @param {Object} passiveLevels - Current passive levels
   * @returns {Array} All passives with metadata
   */
  getAvailablePassives(passiveLevels = {}) {
    return this.passiveManager.getAllPassives(passiveLevels);
  }
}

module.exports = ProgressionManager;
