/**
 * TimeEffectsCalculator.js
 * Calculates how time of day, season, weather, and moon phase affect creatures
 */

const { loadData } = require('../data/data_loader');

class TimeEffectsCalculator {
  constructor() {
    this.timeMechanics = loadData('time_mechanics')?.time_system || {};
    this.creatureEffects = this.timeMechanics.creature_time_effects || {};
  }

  /**
   * Get current game time phase (dawn/day/dusk/night)
   * @param {number} currentHour - Current hour (0-23)
   * @returns {string} Time phase
   */
  getCurrentTimePhase(currentHour = 12) {
    const phases = this.timeMechanics.day_night_cycle?.phases || {};
    
    if (currentHour >= phases.dawn?.start_hour && currentHour < phases.day?.start_hour) {
      return 'dawn';
    } else if (currentHour >= phases.day?.start_hour && currentHour < phases.dusk?.start_hour) {
      return 'day';
    } else if (currentHour >= phases.dusk?.start_hour && currentHour < phases.night?.start_hour) {
      return 'dusk';
    } else {
      return 'night';
    }
  }

  /**
   * Get current season
   * @param {number} currentDay - Current day of year (1-365)
   * @returns {string} Season
   */
  getCurrentSeason(currentDay = 1) {
    const seasons = this.timeMechanics.seasons?.cycle || {};
    
    // Simple division: 91 days per season
    if (currentDay <= 91) return 'spring';
    if (currentDay <= 182) return 'summer';
    if (currentDay <= 273) return 'autumn';
    return 'winter';
  }

  /**
   * Get current moon phase
   * @param {number} currentDay - Current day (for 8-day moon cycle)
   * @returns {string} Moon phase
   */
  getCurrentMoonPhase(currentDay = 1) {
    const dayInCycle = currentDay % 8;
    
    if (dayInCycle === 0) return 'full_moon';
    if (dayInCycle === 4) return 'new_moon';
    return 'normal';
  }

  /**
   * Check if it's a blood moon (10% chance on full moon)
   * @param {string} moonPhase - Current moon phase
   * @returns {boolean} Is blood moon
   */
  isBloodMoon(moonPhase) {
    return moonPhase === 'full_moon' && Math.random() < 0.1;
  }

  /**
   * Calculate all environmental modifiers for a creature
   * @param {Object} monster - Monster data with seasonal_boosts, time_effects, etc.
   * @param {Object} context - Environmental context
   * @returns {Object} Calculated modifiers
   */
  calculateCreatureModifiers(monster, context = {}) {
    const {
      timePhase = 'day',
      season = 'spring',
      moonPhase = 'normal',
      weather = 'clear',
      isBloodMoon = false
    } = context;

    let statMultiplier = 1.0;
    let spawnMultiplier = 1.0;
    let damagePerTurn = 0;
    const specialEffects = [];

    // Apply time effects
    if (monster.time_effects && monster.time_effects[timePhase]) {
      const timeEffect = monster.time_effects[timePhase];
      statMultiplier *= timeEffect.stat_multiplier || 1.0;
      spawnMultiplier *= timeEffect.spawn_multiplier || 1.0;
      damagePerTurn += timeEffect.damage_per_turn || 0;
      
      if (timeEffect.hostile === false) {
        specialEffects.push('not_hostile');
      }
      if (timeEffect.in_coffin) {
        specialEffects.push('in_coffin');
        spawnMultiplier = 0;
      }
      if (timeEffect.phase_through_walls) {
        specialEffects.push('phase_through_walls');
      }
    }

    // Apply seasonal boosts
    if (monster.seasonal_boosts && monster.seasonal_boosts[season]) {
      const seasonBoost = monster.seasonal_boosts[season];
      statMultiplier *= seasonBoost.stat_multiplier || 1.0;
      spawnMultiplier *= seasonBoost.spawn_multiplier || 1.0;
    }

    // Apply moon effects
    if (isBloodMoon && monster.moon_effects?.blood_moon) {
      const bloodMoonEffect = monster.moon_effects.blood_moon;
      statMultiplier *= (1 + (bloodMoonEffect.bonus || 0));
      spawnMultiplier *= bloodMoonEffect.spawn_multiplier || 1.0;
      
      if (bloodMoonEffect.daywalking) {
        specialEffects.push('daywalking');
      }
      if (bloodMoonEffect.rage) {
        specialEffects.push('blood_rage');
      }
    } else if (moonPhase !== 'normal' && monster.moon_effects?.[moonPhase]) {
      const moonEffect = monster.moon_effects[moonPhase];
      statMultiplier *= (1 + (moonEffect.bonus || 0));
      spawnMultiplier *= moonEffect.spawn_multiplier || 1.0;
      
      if (moonEffect.forced_transform) {
        specialEffects.push('forced_transformation');
      }
    }

    // Apply weather effects
    if (monster.weather_effects && monster.weather_effects[weather]) {
      const weatherEffect = monster.weather_effects[weather];
      statMultiplier *= weatherEffect.multiplier || 1.0;
      damagePerTurn += weatherEffect.damage_per_turn || 0;
    }

    // Cap multipliers to reasonable ranges
    statMultiplier = Math.max(0.1, Math.min(3.0, statMultiplier));
    spawnMultiplier = Math.max(0.0, Math.min(5.0, spawnMultiplier));

    return {
      statMultiplier,
      spawnMultiplier,
      damagePerTurn,
      specialEffects,
      canSpawn: spawnMultiplier > 0 && !specialEffects.includes('in_coffin'),
      warnings: this.generateWarnings(statMultiplier, specialEffects)
    };
  }

  /**
   * Generate player warnings based on modifiers
   * @param {number} statMultiplier - How strong creatures are
   * @param {Array} specialEffects - Special effects active
   * @returns {Array} Warning messages
   */
  generateWarnings(statMultiplier, specialEffects) {
    const warnings = [];
    
    if (statMultiplier >= 2.0) {
      warnings.push('⚠️ Creatures are extremely empowered in these conditions!');
    } else if (statMultiplier >= 1.5) {
      warnings.push('⚠️ Creatures are significantly stronger in these conditions!');
    }
    
    if (specialEffects.includes('phase_through_walls')) {
      warnings.push('👻 Ethereal creatures can phase through walls!');
    }
    if (specialEffects.includes('blood_rage')) {
      warnings.push('🩸 Blood rage: Creatures are in a frenzied state!');
    }
    if (specialEffects.includes('forced_transformation')) {
      warnings.push('🌕 Werewolves are forced to transform under the full moon!');
    }
    
    return warnings;
  }

  /**
   * Apply calculated modifiers to monster stats
   * @param {Object} monster - Monster data
   * @param {Object} modifiers - Calculated modifiers
   * @returns {Object} Modified monster
   */
  applyModifiersToMonster(monster, modifiers) {
    const modified = { ...monster };
    
    // Don't spawn if conditions prevent it
    if (!modifiers.canSpawn) {
      return null;
    }
    
    // Apply stat multiplier to all stats
    if (modified.stats && Array.isArray(modified.stats)) {
      modified.stats = modified.stats.map(stat => 
        Math.ceil(stat * modifiers.statMultiplier)
      );
    }
    
    // Add environmental damage
    if (modifiers.damagePerTurn > 0) {
      modified.environmental_damage = modifiers.damagePerTurn;
      modified.damage_description = `Takes ${modifiers.damagePerTurn} environmental damage per turn`;
    }
    
    // Add special effects
    if (modifiers.specialEffects.length > 0) {
      modified.special_effects = modifiers.specialEffects;
    }
    
    // Add visual indicator of power level
    if (modifiers.statMultiplier >= 2.0) {
      modified.name = `⚡ ${modified.name} ⚡`;
      modified.description += ' [EMPOWERED]';
    } else if (modifiers.statMultiplier >= 1.5) {
      modified.name = `💫 ${modified.name}`;
      modified.description += ' [Enhanced]';
    }
    
    return modified;
  }

  /**
   * Filter monsters by spawn chance considering environment
   * @param {Array} monsters - Array of monsters
   * @param {Object} context - Environmental context
   * @returns {Array} Filtered monsters that can spawn
   */
  filterSpawnableMonsters(monsters, context) {
    const spawnable = [];
    
    for (const monster of monsters) {
      const modifiers = this.calculateCreatureModifiers(monster, context);
      
      // Check if monster can spawn
      if (modifiers.canSpawn) {
        // Weight by spawn multiplier
        const spawnWeight = modifiers.spawnMultiplier;
        
        // Add multiple copies to array based on spawn weight
        // This makes more likely creatures appear more often
        const copies = Math.ceil(spawnWeight);
        for (let i = 0; i < copies; i++) {
          spawnable.push({
            original: monster,
            modifiers
          });
        }
      }
    }
    
    return spawnable;
  }

  /**
   * Get current environmental context
   * For now returns defaults, but can be hooked up to actual game time system
   * @returns {Object} Context
   */
  getCurrentContext() {
    // TODO: Hook up to actual game time tracking
    const currentHour = 12; // Default to noon
    const currentDay = 1; // Default to day 1
    
    const timePhase = this.getCurrentTimePhase(currentHour);
    const season = this.getCurrentSeason(currentDay);
    const moonPhase = this.getCurrentMoonPhase(currentDay);
    const bloodMoon = this.isBloodMoon(moonPhase);
    
    return {
      timePhase,
      season,
      moonPhase: bloodMoon ? 'blood_moon' : moonPhase,
      weather: 'clear', // TODO: Hook up to weather system
      isBloodMoon: bloodMoon,
      currentHour,
      currentDay
    };
  }
}

module.exports = TimeEffectsCalculator;
