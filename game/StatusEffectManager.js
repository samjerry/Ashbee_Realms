/**
 * Status Effect Manager - Handles buffs, debuffs, and DOT effects
 */
class StatusEffectManager {
  constructor() {
    this.activeEffects = new Map();
  }

  /**
   * Add a status effect
   * @param {Object} effect - Effect data
   * @returns {boolean} Success
   */
  addEffect(effect) {
    const effectId = effect.id || effect.name.toLowerCase().replace(/\s+/g, '_');

    // Check if effect already exists
    if (this.activeEffects.has(effectId)) {
      const existing = this.activeEffects.get(effectId);
      
      // If stackable, increase stacks
      if (effect.stacks && existing.current_stacks < (effect.max_stacks || 5)) {
        existing.current_stacks++;
        existing.duration = effect.duration; // Refresh duration
        return true;
      }
      
      // Otherwise just refresh duration
      existing.duration = effect.duration;
      return true;
    }

    // Add new effect
    this.activeEffects.set(effectId, {
      ...effect,
      current_stacks: 1,
      remaining_duration: effect.duration || 99
    });

    return true;
  }

  /**
   * Remove a status effect
   * @param {string} effectId - Effect ID to remove
   * @returns {boolean} Success
   */
  removeEffect(effectId) {
    return this.activeEffects.delete(effectId);
  }

  /**
   * Process turn - tick down durations and apply effects
   * @returns {Array<Object>} Results of processing
   */
  processTurn() {
    const results = [];

    for (const [effectId, effect] of this.activeEffects.entries()) {
      let damage = 0;
      let heal = 0;

      // Apply damage over time
      if (effect.damage_per_turn) {
        damage = effect.damage_per_turn * (effect.current_stacks || 1);
      }

      // Apply healing over time
      if (effect.effects?.hp_per_turn) {
        heal = effect.effects.hp_per_turn * (effect.current_stacks || 1);
      }

      if (effect.effects?.hp_percent_per_turn) {
        // Percentage-based healing (requires max_hp from context)
        heal += Math.floor(effect.effects.hp_percent_per_turn * 100); // Placeholder
      }

      results.push({
        effectId,
        name: effect.name,
        damage,
        heal,
        expired: false
      });

      // Decrement duration
      effect.remaining_duration--;

      // Remove expired effects
      if (effect.remaining_duration <= 0) {
        this.activeEffects.delete(effectId);
        results[results.length - 1].expired = true;
      }
    }

    return results;
  }

  /**
   * Get all modifier bonuses from active effects
   * @returns {Object} Combined modifiers
   */
  getModifiers() {
    const modifiers = {
      attack_bonus: 0,
      defense_bonus: 0,
      magic_bonus: 0,
      damage_multiplier: 0,
      damage_reduction: 0,
      crit_chance: 0,
      dodge_chance: 0,
      attack_speed: 0
    };

    for (const effect of this.activeEffects.values()) {
      const stacks = effect.current_stacks || 1;

      if (effect.effects) {
        // Flat bonuses
        if (effect.effects.attack_bonus) {
          modifiers.attack_bonus += effect.effects.attack_bonus * stacks;
        }
        if (effect.effects.defense_bonus) {
          modifiers.defense_bonus += effect.effects.defense_bonus * stacks;
        }
        if (effect.effects.magic_bonus) {
          modifiers.magic_bonus += effect.effects.magic_bonus * stacks;
        }

        // Multiplier bonuses
        if (effect.effects.attack_multiplier) {
          modifiers.damage_multiplier += effect.effects.attack_multiplier * stacks;
        }
        if (effect.effects.damage_reduction) {
          modifiers.damage_reduction += effect.effects.damage_reduction * stacks;
        }
        if (effect.effects.crit_chance) {
          modifiers.crit_chance += effect.effects.crit_chance;
        }
        if (effect.effects.dodge_chance) {
          modifiers.dodge_chance += effect.effects.dodge_chance;
        }
        if (effect.effects.attack_speed) {
          modifiers.attack_speed += effect.effects.attack_speed;
        }
      }
    }

    return modifiers;
  }

  /**
   * Get list of active effects
   * @returns {Array<Object>} Active effects
   */
  getActiveEffects() {
    return Array.from(this.activeEffects.values()).map(effect => ({
      id: effect.id,
      name: effect.name,
      type: effect.type,
      icon: effect.icon,
      stacks: effect.current_stacks,
      duration: effect.remaining_duration
    }));
  }

  /**
   * Clear all effects
   */
  clearAll() {
    this.activeEffects.clear();
  }

  /**
   * Check if has specific effect
   * @param {string} effectId - Effect ID
   * @returns {boolean} Has effect
   */
  hasEffect(effectId) {
    return this.activeEffects.has(effectId);
  }

  /**
   * Get specific effect
   * @param {string} effectId - Effect ID
   * @returns {Object|null} Effect data
   */
  getEffect(effectId) {
    return this.activeEffects.get(effectId) || null;
  }
}

module.exports = StatusEffectManager;
