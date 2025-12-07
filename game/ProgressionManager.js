/**
 * ProgressionManager.js
 * Handles XP gain, leveling, stat increases, skill points, and permanent progression
 */

const { loadData } = require('../data/data_loader');

class ProgressionManager {
  constructor() {
    this.constants = loadData('constants')?.constants || {};
    this.classes = loadData('classes')?.classes || {};
    this.passives = loadData('passives')?.passives || {};
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

    character.xp += xpGained;

    // Check for level ups
    while (character.level < maxLevel && character.xp >= character.xpToNext) {
      character.xp -= character.xpToNext;
      character.level++;
      result.levelsGained++;

      // Calculate stats gained this level
      const statsGained = this.calculateStatsGainedOnLevelUp(character.classType);
      
      // Calculate new XP requirement
      character.xpToNext = this.calculateXPToNextLevel(character.level);

      // Award skill point
      const skillPointsGained = 1;
      result.totalSkillPoints += skillPointsGained;
      
      // Update character's skill points
      if (character.skillPoints !== undefined) {
        character.skillPoints += skillPointsGained;
      }

      // Heal to full on level up
      const finalStats = character.getFinalStats();
      character.maxHp = finalStats.maxHp;
      character.hp = character.maxHp;

      result.levelUpRewards.push({
        level: character.level,
        statsGained,
        skillPoints: skillPointsGained,
        healedToFull: true,
        newMaxHp: character.maxHp
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
      respawnLocation: 'Town Square',
      permanentStatsRetained: permanentStats
    };

    if (isHardcore) {
      // Hardcore mode: Character is deleted, keep only permanent progression
      result.characterDeleted = true;
      result.message = `${character.name} has fallen in hardcore mode. All progress lost except permanent unlocks.`;
      
      // Return permanent stats for new character
      result.permanentStatsToRetain = {
        unlockedPassives: permanentStats.unlockedPassives || [],
        accountStats: permanentStats.accountStats || {},
        totalDeaths: (permanentStats.totalDeaths || 0) + 1,
        totalKills: permanentStats.totalKills || 0,
        totalGoldEarned: permanentStats.totalGoldEarned || 0,
        highestLevelReached: Math.max(character.level, permanentStats.highestLevelReached || 1)
      };
    } else {
      // Normal mode: Lose some gold and XP, respawn in town
      const goldLoss = Math.floor(character.gold * 0.1); // Lose 10% gold
      const xpLoss = Math.floor(character.xp * 0.25); // Lose 25% current level XP
      
      character.gold = Math.max(0, character.gold - goldLoss);
      character.xp = Math.max(0, character.xp - xpLoss);
      character.hp = Math.floor(character.maxHp * 0.5); // Respawn with 50% HP
      character.location = 'Town Square';
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
      result.message = `You died and lost ${goldLoss} gold and ${xpLoss} XP. You respawn in Town Square with 50% HP.`;
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
    character.location = 'Town Square';
    character.inCombat = false;
    character.combat = null;

    return {
      success: true,
      message: `${character.name} respawns in Town Square with ${character.hp}/${character.maxHp} HP.`,
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
  calculatePassiveBonuses(unlockedPassives = [], accountStats = {}) {
    const bonuses = {
      strength: 0,
      defense: 0,
      magic: 0,
      agility: 0,
      maxHp: 0,
      damageMultiplier: 1.0,
      xpMultiplier: 1.0,
      goldMultiplier: 1.0,
      critChance: 0,
      critDamage: 0,
      damageReduction: 0
    };

    // Flatten all passive arrays
    const allPassives = [
      ...(this.passives.combat_passives || []),
      ...(this.passives.survival_passives || []),
      ...(this.passives.progression_passives || []),
      ...(this.passives.resource_passives || [])
    ];

    unlockedPassives.forEach(passiveId => {
      const passive = allPassives.find(p => p.id === passiveId);
      if (!passive || !passive.effect) return;

      const effect = passive.effect;

      switch (effect.type) {
        case 'damage_bonus':
          // Calculate stacks based on account stats
          const stacks = Math.min(
            Math.floor((accountStats.monster_kills || 0) / effect.stack_requirement),
            effect.max_stacks || 1
          );
          bonuses.damageMultiplier += (effect.value_per_stack || 0) * stacks;
          break;

        case 'combat_stats':
          bonuses.critChance += effect.crit_chance || 0;
          bonuses.critDamage += effect.crit_damage || 0;
          break;

        case 'damage_reduction':
          bonuses.damageReduction += effect.value || 0;
          break;

        case 'xp_bonus':
          bonuses.xpMultiplier += effect.value || 0;
          break;

        case 'gold_bonus':
          bonuses.goldMultiplier += effect.value || 0;
          break;

        case 'stat_bonus':
          bonuses.strength += effect.strength || 0;
          bonuses.defense += effect.defense || 0;
          bonuses.magic += effect.magic || 0;
          bonuses.agility += effect.agility || 0;
          bonuses.maxHp += effect.max_hp || 0;
          break;
      }
    });

    return bonuses;
  }

  /**
   * Check if character can unlock a specific passive
   * @param {Object} passive - Passive data
   * @param {Object} character - Character object
   * @param {Object} accountStats - Account-wide stats
   * @returns {Object} Unlock status
   */
  canUnlockPassive(passive, character, accountStats) {
    if (!passive.unlock_requirement) {
      return { canUnlock: true };
    }

    const req = passive.unlock_requirement;

    switch (req.type) {
      case 'level_reached':
        return {
          canUnlock: accountStats.highestLevelReached >= req.level,
          message: `Requires highest level: ${req.level}`
        };

      case 'monster_kills':
        return {
          canUnlock: (accountStats.totalKills || 0) >= req.count,
          message: `Requires ${req.count} monster kills`
        };

      case 'critical_hits':
        return {
          canUnlock: (accountStats.totalCrits || 0) >= req.count,
          message: `Requires ${req.count} critical hits`
        };

      case 'gold_earned':
        return {
          canUnlock: (accountStats.totalGoldEarned || 0) >= req.amount,
          message: `Requires ${req.amount} total gold earned`
        };

      case 'deaths':
        return {
          canUnlock: (accountStats.totalDeaths || 0) >= req.count,
          message: `Requires ${req.count} deaths`
        };

      default:
        return { canUnlock: false, message: 'Unknown requirement' };
    }
  }

  /**
   * Get all available passives with unlock status
   * @param {Object} character - Character object
   * @param {Object} accountStats - Account-wide stats
   * @param {Array} unlockedPassives - Already unlocked passive IDs
   * @returns {Array} Passives with unlock status
   */
  getAvailablePassives(character, accountStats, unlockedPassives = []) {
    const allPassives = [
      ...(this.passives.combat_passives || []),
      ...(this.passives.survival_passives || []),
      ...(this.passives.progression_passives || []),
      ...(this.passives.resource_passives || [])
    ];

    return allPassives.map(passive => {
      const isUnlocked = unlockedPassives.includes(passive.id);
      const unlockStatus = isUnlocked ? 
        { canUnlock: true, message: 'Already unlocked' } :
        this.canUnlockPassive(passive, character, accountStats);

      return {
        ...passive,
        isUnlocked,
        canUnlock: unlockStatus.canUnlock,
        unlockMessage: unlockStatus.message
      };
    });
  }
}

module.exports = ProgressionManager;
