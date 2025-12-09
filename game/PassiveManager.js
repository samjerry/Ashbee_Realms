const { loadData } = require('../data/data_loader');

/**
 * PassiveManager - Handles account-wide permanent passive progression
 * Features:
 * - Level-based passive upgrades (stackable bonuses)
 * - Currency system (Souls + Legacy Points)
 * - Cost scaling with level
 * - Respec system with 50% refund
 * - Bonus calculation for all game systems
 */
class PassiveManager {
  constructor() {
    const passiveData = loadData('passive_tree');
    this.passives = passiveData?.passives || {};
    this.categories = passiveData?.categories || {};
    this.costScaling = passiveData?.cost_scaling || {};
    this.legacyPointRequirement = passiveData?.legacy_point_requirement || {};
    this.respecConfig = passiveData?.respec || {};
    this.startingCurrency = passiveData?.starting_currency || { souls: 5, legacy_points: 0 };
  }

  /**
   * Get all passives with their current levels
   * @param {Object} passiveLevels - Current passive levels { passive_id: level }
   * @returns {Array} All passives with metadata
   */
  getAllPassives(passiveLevels = {}) {
    const allPassives = [];

    for (const category in this.passives) {
      const categoryPassives = this.passives[category];
      for (const passive of categoryPassives) {
        const currentLevel = passiveLevels[passive.id] || 0;
        allPassives.push({
          ...passive,
          current_level: currentLevel,
          is_maxed: currentLevel >= passive.max_level,
          next_level_cost: currentLevel < passive.max_level
            ? this.calculateUpgradeCost(passive, currentLevel)
            : null
        });
      }
    }

    return allPassives;
  }

  /**
   * Get passives by category
   * @param {string} category - Category name
   * @param {Object} passiveLevels - Current passive levels
   * @returns {Array} Passives in category
   */
  getPassivesByCategory(category, passiveLevels = {}) {
    const categoryPassives = this.passives[category] || [];
    return categoryPassives.map(passive => ({
      ...passive,
      current_level: passiveLevels[passive.id] || 0,
      is_maxed: (passiveLevels[passive.id] || 0) >= passive.max_level,
      next_level_cost: (passiveLevels[passive.id] || 0) < passive.max_level
        ? this.calculateUpgradeCost(passive, passiveLevels[passive.id] || 0)
        : null
    }));
  }

  /**
   * Get a specific passive by ID
   * @param {string} passiveId - Passive ID
   * @param {Object} passiveLevels - Current passive levels
   * @returns {Object|null} Passive data
   */
  getPassive(passiveId, passiveLevels = {}) {
    for (const category in this.passives) {
      const passive = this.passives[category].find(p => p.id === passiveId);
      if (passive) {
        const currentLevel = passiveLevels[passiveId] || 0;
        return {
          ...passive,
          current_level: currentLevel,
          is_maxed: currentLevel >= passive.max_level,
          next_level_cost: currentLevel < passive.max_level
            ? this.calculateUpgradeCost(passive, currentLevel)
            : null
        };
      }
    }
    return null;
  }

  /**
   * Calculate cost to upgrade a passive to next level
   * Cost scaling: base_cost + (current_level / 10) * 2 souls
   * Legacy Points: 1 LP required every 5 levels
   * @param {Object} passive - Passive data
   * @param {number} currentLevel - Current level
   * @returns {Object} Cost { souls, legacy_points }
   */
  calculateUpgradeCost(passive, currentLevel) {
    if (currentLevel >= passive.max_level) {
      return null;
    }

    const nextLevel = currentLevel + 1;
    const baseSouls = passive.base_cost.souls;

    // Scaling: +2 souls per 10 levels
    const scaledSouls = baseSouls + Math.floor(currentLevel / 10) * 2;

    // Legacy Points: 1 LP required every 5 levels
    const legacyPoints = (nextLevel % 5 === 0) ? 1 : 0;

    return {
      souls: scaledSouls,
      legacy_points: legacyPoints
    };
  }

  /**
   * Check if player can upgrade a passive
   * @param {string} passiveId - Passive ID
   * @param {Object} permanentStats - Player's permanent stats
   * @returns {Object} { canUpgrade: boolean, reason: string, cost: Object }
   */
  canUpgradePassive(passiveId, permanentStats) {
    const passive = this.getPassive(passiveId, permanentStats.passiveLevels || {});

    if (!passive) {
      return { canUpgrade: false, reason: 'Passive not found' };
    }

    const currentLevel = passive.current_level;

    if (currentLevel >= passive.max_level) {
      return { canUpgrade: false, reason: 'Passive is already at max level' };
    }

    const cost = this.calculateUpgradeCost(passive, currentLevel);
    const souls = permanentStats.souls || 0;
    const legacyPoints = permanentStats.legacyPoints || 0;

    if (souls < cost.souls) {
      return {
        canUpgrade: false,
        reason: `Not enough souls (need ${cost.souls}, have ${souls})`,
        cost
      };
    }

    if (legacyPoints < cost.legacy_points) {
      return {
        canUpgrade: false,
        reason: `Not enough legacy points (need ${cost.legacy_points}, have ${legacyPoints})`,
        cost
      };
    }

    return { canUpgrade: true, cost };
  }

  /**
   * Upgrade a passive (does not save to database - call savePermanentStats after)
   * @param {string} passiveId - Passive ID
   * @param {Object} permanentStats - Player's permanent stats (will be modified)
   * @returns {Object} { success: boolean, message: string, newLevel: number, cost: Object }
   */
  upgradePassive(passiveId, permanentStats) {
    const checkResult = this.canUpgradePassive(passiveId, permanentStats);

    if (!checkResult.canUpgrade) {
      return { success: false, message: checkResult.reason };
    }

    const cost = checkResult.cost;
    const currentLevel = (permanentStats.passiveLevels || {})[passiveId] || 0;
    const newLevel = currentLevel + 1;

    // Deduct currency
    permanentStats.souls -= cost.souls;
    permanentStats.legacyPoints -= cost.legacy_points;

    // Upgrade passive
    if (!permanentStats.passiveLevels) {
      permanentStats.passiveLevels = {};
    }
    permanentStats.passiveLevels[passiveId] = newLevel;

    return {
      success: true,
      message: `Upgraded to level ${newLevel}`,
      newLevel,
      cost
    };
  }

  /**
   * Calculate total souls spent on all passives
   * @param {Object} passiveLevels - Current passive levels
   * @returns {number} Total souls spent
   */
  calculateTotalSoulsSpent(passiveLevels) {
    let totalSouls = 0;

    for (const passiveId in passiveLevels) {
      const level = passiveLevels[passiveId];
      const passive = this.getPassive(passiveId);

      if (!passive) continue;

      // Calculate cost for each level (0 -> 1, 1 -> 2, ..., level-1 -> level)
      for (let i = 0; i < level; i++) {
        const cost = this.calculateUpgradeCost(passive, i);
        if (cost) {
          totalSouls += cost.souls;
        }
      }
    }

    return totalSouls;
  }

  /**
   * Calculate total legacy points spent on all passives
   * @param {Object} passiveLevels - Current passive levels
   * @returns {number} Total legacy points spent
   */
  calculateTotalLegacyPointsSpent(passiveLevels) {
    let totalLP = 0;

    for (const passiveId in passiveLevels) {
      const level = passiveLevels[passiveId];
      const passive = this.getPassive(passiveId);

      if (!passive) continue;

      // Calculate LP cost for each level
      for (let i = 0; i < level; i++) {
        const cost = this.calculateUpgradeCost(passive, i);
        if (cost) {
          totalLP += cost.legacy_points;
        }
      }
    }

    return totalLP;
  }

  /**
   * Reset all passives and refund 50% of souls (full LP refund)
   * @param {Object} permanentStats - Player's permanent stats (will be modified)
   * @returns {Object} { success: boolean, refund: Object }
   */
  respecPassives(permanentStats) {
    if (!this.respecConfig.enabled) {
      return { success: false, message: 'Respec is disabled' };
    }

    const soulsSpent = this.calculateTotalSoulsSpent(permanentStats.passiveLevels || {});
    const lpSpent = this.calculateTotalLegacyPointsSpent(permanentStats.passiveLevels || {});

    const soulsRefund = Math.floor(soulsSpent * this.respecConfig.refund_percentage);
    const lpRefund = lpSpent; // Full LP refund

    // Reset passives
    permanentStats.passiveLevels = {};

    // Refund currency
    permanentStats.souls += soulsRefund;
    permanentStats.legacyPoints += lpRefund;

    return {
      success: true,
      refund: {
        souls: soulsRefund,
        legacy_points: lpRefund,
        souls_lost: soulsSpent - soulsRefund
      }
    };
  }

  /**
   * Calculate all passive bonuses for a player
   * @param {Object} passiveLevels - Current passive levels
   * @returns {Object} Bonus multipliers and flat bonuses
   */
  calculatePassiveBonuses(passiveLevels = {}) {
    const bonuses = {
      // Flat stat bonuses
      strength: 0,
      defense: 0,
      magic: 0,
      agility: 0,
      maxHp: 0,
      inventorySpace: 0,

      // Multipliers (1.0 = no bonus, 1.5 = 50% bonus)
      damageMultiplier: 1.0,
      xpMultiplier: 1.0,
      goldMultiplier: 1.0,
      reputationMultiplier: 1.0,
      questRewardBonus: 1.0,
      movementSpeed: 1.0,
      lootLuck: 1.0,
      merchantDiscount: 1.0,
      potionBonus: 1.0,

      // Combat bonuses
      critChance: 0,
      critDamage: 0,
      damageReduction: 0,
      hpOnKill: 0
    };

    for (const passiveId in passiveLevels) {
      const level = passiveLevels[passiveId];
      if (level === 0) continue;

      const passive = this.getPassive(passiveId);
      if (!passive) continue;

      const totalBonus = passive.bonus_per_level * level;

      switch (passive.effect_type) {
        case 'stat_bonus':
          bonuses[passive.stat] += totalBonus;
          break;

        case 'max_hp':
          bonuses.maxHp += totalBonus;
          break;

        case 'damage_multiplier':
          bonuses.damageMultiplier += totalBonus;
          break;

        case 'xp_multiplier':
          bonuses.xpMultiplier += totalBonus;
          break;

        case 'gold_multiplier':
          bonuses.goldMultiplier += totalBonus;
          break;

        case 'reputation_multiplier':
          bonuses.reputationMultiplier += totalBonus;
          break;

        case 'quest_reward_bonus':
          bonuses.questRewardBonus += totalBonus;
          break;

        case 'movement_speed':
          bonuses.movementSpeed += totalBonus;
          break;

        case 'loot_luck':
          bonuses.lootLuck += totalBonus;
          break;

        case 'merchant_discount':
          bonuses.merchantDiscount += totalBonus;
          break;

        case 'inventory_space':
          bonuses.inventorySpace += totalBonus;
          break;

        case 'crit_chance':
          bonuses.critChance += totalBonus;
          break;

        case 'crit_damage':
          bonuses.critDamage += totalBonus;
          break;

        case 'damage_reduction':
          bonuses.damageReduction += totalBonus;
          break;

        case 'hp_on_kill':
          bonuses.hpOnKill += totalBonus;
          break;

        case 'potion_bonus':
          bonuses.potionBonus += totalBonus;
          break;
      }
    }

    return bonuses;
  }

  /**
   * Award souls to player (e.g., on death)
   * @param {Object} permanentStats - Player's permanent stats (will be modified)
   * @param {number} characterLevel - Character level at death
   * @param {boolean} isHardcore - Is hardcore mode
   * @returns {number} Souls awarded
   */
  awardSouls(permanentStats, characterLevel, isHardcore = false) {
    const baseSouls = 1 + Math.floor(characterLevel / 5);
    const hardcoreBonus = isHardcore ? 2 : 1;
    const soulsAwarded = baseSouls * hardcoreBonus;

    if (!permanentStats.souls) {
      permanentStats.souls = 0;
    }
    permanentStats.souls += soulsAwarded;

    return soulsAwarded;
  }

  /**
   * Award legacy points to player (e.g., on milestone)
   * @param {Object} permanentStats - Player's permanent stats (will be modified)
   * @param {number} amount - Legacy points to award
   * @returns {number} Legacy points awarded
   */
  awardLegacyPoints(permanentStats, amount) {
    if (!permanentStats.legacyPoints) {
      permanentStats.legacyPoints = 0;
    }
    permanentStats.legacyPoints += amount;

    return amount;
  }

  /**
   * Get passive tree summary (for UI)
   * @param {Object} passiveLevels - Current passive levels
   * @param {number} souls - Current souls
   * @param {number} legacyPoints - Current legacy points
   * @returns {Object} Summary data
   */
  getPassiveTreeSummary(passiveLevels = {}, souls = 0, legacyPoints = 0) {
    const allPassives = this.getAllPassives(passiveLevels);
    const totalLevels = Object.values(passiveLevels).reduce((sum, level) => sum + level, 0);
    const maxedPassives = allPassives.filter(p => p.is_maxed).length;
    const soulsSpent = this.calculateTotalSoulsSpent(passiveLevels);
    const lpSpent = this.calculateTotalLegacyPointsSpent(passiveLevels);

    return {
      currency: {
        souls,
        legacy_points: legacyPoints,
        souls_spent: soulsSpent,
        legacy_points_spent: lpSpent
      },
      progression: {
        total_passive_levels: totalLevels,
        maxed_passives: maxedPassives,
        total_passives: allPassives.length
      },
      categories: this.categories,
      respec: {
        enabled: this.respecConfig.enabled,
        refund_percentage: this.respecConfig.refund_percentage,
        potential_refund: Math.floor(soulsSpent * this.respecConfig.refund_percentage)
      }
    };
  }
}

module.exports = PassiveManager;
