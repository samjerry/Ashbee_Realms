/**
 * Enhanced Status Effect Manager - Phase 3.5
 * Handles buffs, debuffs, DOT effects, combos, cleansing, and auras
 */

const fs = require('fs');
const path = require('path');

class StatusEffectManager {
  constructor() {
    this.activeEffects = new Map();
    this.auraEffects = new Map(); // Permanent aura effects
    this.loadStatusEffectData();
  }

  /**
   * Load status effect data from JSON
   */
  loadStatusEffectData() {
    try {
      const dataPath = path.join(__dirname, '../data/status_effects.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      
      this.statusEffectData = data.status_effects;
      this.effectCombos = data.effect_interactions?.combos || [];
      this.effectResistances = data.effect_interactions?.resistances || [];
      this.cleansePriorities = data.cleanse_priorities || [];
    } catch (error) {
      console.error('Error loading status effect data:', error.message);
      this.statusEffectData = { buffs: {}, debuffs: {}, special: {} };
      this.effectCombos = [];
      this.effectResistances = [];
      this.cleansePriorities = [];
    }
  }

  /**
   * Get status effect template by ID
   * @param {string} effectId - Effect ID
   * @returns {Object|null} Effect template
   */
  getEffectTemplate(effectId) {
    // Search in all categories
    for (const category of Object.values(this.statusEffectData)) {
      if (category[effectId]) {
        return { ...category[effectId] };
      }
    }
    return null;
  }

  /**
   * Add a status effect with full data support
   * @param {string|Object} effectIdOrData - Effect ID or full effect object
   * @param {Object} options - Override options (duration, stacks, source)
   * @returns {Object} Result object
   */
  addEffect(effectIdOrData, options = {}) {
    let effect;
    
    // Handle both ID and full object
    if (typeof effectIdOrData === 'string') {
      effect = this.getEffectTemplate(effectIdOrData);
      if (!effect) {
        return { success: false, reason: 'Effect not found' };
      }
    } else {
      effect = { ...effectIdOrData };
    }

    // Apply options overrides
    if (options.duration !== undefined) effect.duration = options.duration;
    if (options.source) effect.source = options.source;

    const effectId = effect.id;

    // Check for immunity
    if (this.hasImmunity(effect.type, effectId)) {
      return { success: false, reason: 'Immune to this effect' };
    }

    // Check for resistance/counter effects
    const resistance = this.checkResistance(effectId);
    if (resistance) {
      return { success: false, reason: `Countered by ${resistance}` };
    }

    // Check if effect already exists
    if (this.activeEffects.has(effectId)) {
      const existing = this.activeEffects.get(effectId);
      
      // Check if can be removed
      if (existing.effects?.cannot_be_removed) {
        return { success: false, reason: 'Effect cannot be refreshed or stacked' };
      }
      
      // If stackable, increase stacks
      if (effect.stacks && existing.current_stacks < (effect.max_stacks || 5)) {
        existing.current_stacks++;
        existing.remaining_duration = effect.duration; // Refresh duration
        return { 
          success: true, 
          action: 'stacked', 
          stacks: existing.current_stacks,
          effectId 
        };
      }
      
      // Otherwise just refresh duration
      existing.remaining_duration = effect.duration;
      return { success: true, action: 'refreshed', effectId };
    }

    // Add new effect
    this.activeEffects.set(effectId, {
      ...effect,
      current_stacks: options.initialStacks || 1,
      remaining_duration: effect.duration || 99,
      appliedAt: Date.now()
    });

    // Check for combo effects
    const combo = this.checkCombos();
    if (combo) {
      return {
        success: true,
        action: 'added',
        effectId,
        combo: combo
      };
    }

    return { success: true, action: 'added', effectId };
  }

  /**
   * Check for effect combos
   * @returns {Object|null} Combo result or null
   */
  checkCombos() {
    for (const combo of this.effectCombos) {
      const hasAllEffects = combo.effects.every(effectId => 
        this.activeEffects.has(effectId)
      );

      if (hasAllEffects) {
        // Remove consumed effects
        combo.effects.forEach(effectId => this.activeEffects.delete(effectId));
        
        // Add result effect
        const result = {
          comboName: `${combo.effects.join(' + ')} = ${combo.result}`,
          resultEffect: combo.result,
          bonusDamage: combo.bonus_damage || 0,
          condition: combo.condition
        };

        // Add the result effect
        this.addEffect(combo.result);

        return result;
      }
    }
    return null;
  }

  /**
   * Check if has immunity to effect type or specific effect
   * @param {string} effectType - Effect type to check
   * @param {string} effectId - Specific effect ID to check
   * @returns {boolean} Has immunity
   */
  hasImmunity(effectType, effectId) {
    for (const effect of this.activeEffects.values()) {
      // Check immunity to curses (for cursed effect)
      if (effect.effects?.immunity_to_curses && (effectId === 'cursed' || effectId?.includes('curse'))) {
        return true;
      }
      // Check physical immunity
      if (effect.effects?.physical_immunity && effectType === 'physical') {
        return true;
      }
      // Add more immunity checks as needed
    }
    return false;
  }

  /**
   * Check if effect is countered by active effects
   * @param {string} effectId - Effect to check
   * @returns {string|null} Countering effect or null
   */
  checkResistance(effectId) {
    for (const resistance of this.effectResistances) {
      if (resistance.effect === effectId && this.hasEffect(resistance.countered_by)) {
        return resistance.countered_by;
      }
    }
    return null;
  }

  /**
   * Remove a status effect
   * @param {string} effectId - Effect ID to remove
   * @returns {Object} Result object
   */
  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (!effect) {
      return { success: false, reason: 'Effect not found' };
    }

    if (effect.effects?.cannot_be_removed) {
      return { success: false, reason: 'Effect cannot be removed' };
    }

    this.activeEffects.delete(effectId);
    return { success: true, removedEffect: effectId };
  }

  /**
   * Cleanse effects (remove debuffs)
   * @param {Object} options - Cleanse options
   * @returns {Object} Cleanse result
   */
  cleanse(options = {}) {
    const { 
      count = 1,          // How many effects to remove
      type = 'debuff',    // Which type to remove
      specific = null     // Specific effect ID to target
    } = options;

    const removed = [];
    
    // If specific effect requested
    if (specific) {
      const effect = this.activeEffects.get(specific);
      if (effect && effect.effects?.cannot_be_removed) {
        return { success: false, reason: 'Effect cannot be removed', removed: [], count: 0 };
      }
      
      const result = this.removeEffect(specific);
      if (result.success) {
        removed.push(specific);
      }
      return { success: result.success, removed, count: removed.length };
    }

    // Remove by priority
    const candidates = [];
    for (const [effectId, effect] of this.activeEffects.entries()) {
      // Skip effects that cannot be removed
      if (effect.effects?.cannot_be_removed) {
        continue;
      }
      
      if (effect.type === type && effect.can_cleanse !== false) {
        const priority = this.cleansePriorities.indexOf(effectId);
        candidates.push({ effectId, priority: priority === -1 ? 999 : priority });
      }
    }

    // Sort by priority (lower = more important to cleanse)
    candidates.sort((a, b) => a.priority - b.priority);

    // Remove top N effects
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const result = this.removeEffect(candidates[i].effectId);
      if (result.success) {
        removed.push(candidates[i].effectId);
      }
    }

    return { success: true, removed, count: removed.length };
  }

  /**
   * Dispel effects (remove buffs from enemy)
   * @param {Object} options - Dispel options
   * @returns {Object} Dispel result
   */
  dispel(options = {}) {
    return this.cleanse({ ...options, type: 'buff' });
  }

  /**
   * Add an aura effect (permanent until removed)
   * @param {string} auraId - Aura ID
   * @param {Object} auraData - Aura effect data
   * @returns {Object} Result
   */
  addAura(auraId, auraData) {
    this.auraEffects.set(auraId, {
      ...auraData,
      isPermanent: true
    });
    return { success: true, auraId };
  }

  /**
   * Remove an aura
   * @param {string} auraId - Aura ID
   * @returns {Object} Result
   */
  removeAura(auraId) {
    const removed = this.auraEffects.delete(auraId);
    return { success: removed, auraId };
  }

  /**
   * Process turn - tick down durations and apply DOT/HOT effects
   * @param {Object} context - Context object with target's stats
   * @returns {Object} Processing results
   */
  processTurn(context = {}) {
    const results = {
      damage: 0,
      heal: 0,
      effects: [],
      expired: [],
      combos: []
    };

    // Process active effects (temporary effects with duration)
    for (const [effectId, effect] of this.activeEffects.entries()) {
      let effectResult = {
        effectId,
        name: effect.name,
        icon: effect.icon,
        damage: 0,
        heal: 0,
        expired: false
      };

      const stacks = effect.current_stacks || 1;

      // Apply damage over time
      if (effect.effects?.damage_per_turn) {
        const damage = effect.effects.damage_per_turn * stacks;
        effectResult.damage = damage;
        results.damage += damage;
      }

      // Apply healing over time
      if (effect.effects?.hp_per_turn) {
        const heal = effect.effects.hp_per_turn * stacks;
        effectResult.heal = heal;
        results.heal += heal;
      }

      // Apply percentage-based healing
      if (effect.effects?.hp_percent_per_turn && context.maxHp) {
        const heal = Math.floor(context.maxHp * effect.effects.hp_percent_per_turn * stacks);
        effectResult.heal += heal;
        results.heal += heal;
      }

      // Apply mana regeneration
      if (effect.effects?.mana_regen && context.maxMana) {
        effectResult.manaRegen = effect.effects.mana_regen * stacks;
      }

      results.effects.push(effectResult);

      // Decrement duration
      effect.remaining_duration--;

      // Remove expired effects
      if (effect.remaining_duration <= 0) {
        this.activeEffects.delete(effectId);
        effectResult.expired = true;
        results.expired.push(effectId);
      }
    }

    // Process aura effects (permanent effects, no duration)
    for (const [auraId, aura] of this.auraEffects.entries()) {
      let auraResult = {
        effectId: auraId,
        name: aura.name,
        icon: aura.icon,
        damage: 0,
        heal: 0,
        expired: false
      };

      // Apply aura healing
      if (aura.effects?.hp_per_turn) {
        const heal = aura.effects.hp_per_turn;
        auraResult.heal = heal;
        results.heal += heal;
      }

      // Apply aura percentage healing
      if (aura.effects?.hp_percent_per_turn && context.maxHp) {
        const heal = Math.floor(context.maxHp * aura.effects.hp_percent_per_turn);
        auraResult.heal += heal;
        results.heal += heal;
      }

      if (auraResult.heal > 0) {
        results.effects.push(auraResult);
      }
    }

    // Check for new combos after processing
    const combo = this.checkCombos();
    if (combo) {
      results.combos.push(combo);
    }

    return results;
  }

  /**
   * Get all modifier bonuses from active effects + auras
   * @returns {Object} Combined modifiers
   */
  getModifiers() {
    const modifiers = {
      // New 5-stat system bonuses
      strength_bonus: 0,
      dexterity_bonus: 0,
      constitution_bonus: 0,
      intelligence_bonus: 0,
      wisdom_bonus: 0,
      // Legacy stat bonuses
      attack_bonus: 0,
      defense_bonus: 0,
      magic_bonus: 0,
      agility_bonus: 0,
      // Multipliers and derived stats
      damage_multiplier: 1.0,
      defense_multiplier: 1.0,
      magic_damage_multiplier: 1.0,
      damage_reduction: 0,
      crit_chance: 0,
      crit_damage: 0,
      dodge_chance: 0,
      attack_speed: 1.0,
      movement_speed: 1.0,
      healing_reduction: 0,
      life_steal: 0,
      xp_bonus: 0,
      gold_find: 0,
      loot_quality: 0,
      special_flags: []
    };

    // Process active effects
    for (const effect of this.activeEffects.values()) {
      this.applyEffectModifiers(effect, modifiers);
    }

    // Process aura effects
    for (const aura of this.auraEffects.values()) {
      this.applyEffectModifiers(aura, modifiers);
    }

    return modifiers;
  }

  /**
   * Apply modifiers from a single effect
   * @param {Object} effect - Effect to process
   * @param {Object} modifiers - Modifiers object to update
   */
  applyEffectModifiers(effect, modifiers) {
    if (!effect.effects) return;

    const stacks = effect.current_stacks || 1;
    const effects = effect.effects;

    // New 5-stat system flat bonuses
    if (effects.strength_bonus) modifiers.strength_bonus += effects.strength_bonus * stacks;
    if (effects.dexterity_bonus) modifiers.dexterity_bonus += effects.dexterity_bonus * stacks;
    if (effects.constitution_bonus) modifiers.constitution_bonus += effects.constitution_bonus * stacks;
    if (effects.intelligence_bonus) modifiers.intelligence_bonus += effects.intelligence_bonus * stacks;
    if (effects.wisdom_bonus) modifiers.wisdom_bonus += effects.wisdom_bonus * stacks;
    
    // Legacy flat bonuses (for backward compatibility)
    if (effects.attack_bonus) modifiers.attack_bonus += effects.attack_bonus * stacks;
    if (effects.defense_bonus) modifiers.defense_bonus += effects.defense_bonus * stacks;
    if (effects.magic_bonus) modifiers.magic_bonus += effects.magic_bonus * stacks;
    if (effects.agility_bonus) modifiers.agility_bonus += effects.agility_bonus * stacks;

    // Multipliers (additive)
    if (effects.attack_multiplier) modifiers.damage_multiplier += effects.attack_multiplier * stacks;
    if (effects.damage_multiplier) modifiers.damage_multiplier += effects.damage_multiplier * stacks;
    if (effects.defense_multiplier) modifiers.defense_multiplier *= effects.defense_multiplier;
    if (effects.magic_damage) modifiers.magic_damage_multiplier += effects.magic_damage;
    if (effects.all_stats_multiplier) {
      const bonus = effects.all_stats_multiplier;
      modifiers.damage_multiplier += bonus;
      modifiers.defense_multiplier += bonus;
      modifiers.magic_damage_multiplier += bonus;
    }

    // Percentage bonuses
    if (effects.damage_reduction) modifiers.damage_reduction += effects.damage_reduction * stacks;
    if (effects.crit_chance) modifiers.crit_chance += effects.crit_chance * stacks;
    if (effects.crit_damage) modifiers.crit_damage += effects.crit_damage * stacks;
    if (effects.dodge_chance) modifiers.dodge_chance += effects.dodge_chance;
    if (effects.attack_speed) modifiers.attack_speed += effects.attack_speed;
    if (effects.movement_speed) modifiers.movement_speed += effects.movement_speed;
    if (effects.healing_reduction) modifiers.healing_reduction += effects.healing_reduction;
    if (effects.life_steal) modifiers.life_steal += effects.life_steal;
    
    // Loot/progression bonuses
    if (effects.xp_bonus) modifiers.xp_bonus += effects.xp_bonus;
    if (effects.gold_find) modifiers.gold_find += effects.gold_find;
    if (effects.loot_quality) modifiers.loot_quality += effects.loot_quality;

    // Special flags
    if (effects.untargetable) modifiers.special_flags.push('untargetable');
    if (effects.physical_immunity) modifiers.special_flags.push('physical_immunity');
    if (effects.cannot_attack_physical) modifiers.special_flags.push('cannot_attack_physical');
    if (effects.breaks_on_attack) modifiers.special_flags.push('breaks_on_attack');
  }

  /**
   * Get list of active effects
   * @returns {Array<Object>} Active effects
   */
  getActiveEffects() {
    return Array.from(this.activeEffects.values()).map(effect => ({
      id: effect.id,
      name: effect.name,
      description: effect.description,
      type: effect.type,
      icon: effect.icon,
      stacks: effect.current_stacks,
      maxStacks: effect.max_stacks,
      duration: effect.remaining_duration,
      source: effect.source
    }));
  }

  /**
   * Get active auras
   * @returns {Array<Object>} Active auras
   */
  getActiveAuras() {
    return Array.from(this.auraEffects.values()).map(aura => ({
      id: aura.id,
      name: aura.name,
      description: aura.description,
      icon: aura.icon,
      isPermanent: true
    }));
  }

  /**
   * Clear all effects (optionally keep auras)
   * @param {boolean} keepAuras - Whether to keep aura effects
   */
  clearAll(keepAuras = false) {
    this.activeEffects.clear();
    if (!keepAuras) {
      this.auraEffects.clear();
    }
  }

  /**
   * Check if has specific effect
   * @param {string} effectId - Effect ID
   * @returns {boolean} Has effect
   */
  hasEffect(effectId) {
    return this.activeEffects.has(effectId) || this.auraEffects.has(effectId);
  }

  /**
   * Get specific effect
   * @param {string} effectId - Effect ID
   * @returns {Object|null} Effect data
   */
  getEffect(effectId) {
    return this.activeEffects.get(effectId) || this.auraEffects.get(effectId) || null;
  }

  /**
   * Get effect count by type
   * @param {string} type - Effect type (buff/debuff/special)
   * @returns {number} Count
   */
  getEffectCountByType(type) {
    let count = 0;
    for (const effect of this.activeEffects.values()) {
      if (effect.type === type) count++;
    }
    return count;
  }

  /**
   * Get all available status effects from data
   * @returns {Object} All status effects organized by category
   */
  getAllStatusEffects() {
    return this.statusEffectData;
  }

  /**
   * Get effect combos
   * @returns {Array} Effect combos
   */
  getEffectCombos() {
    return this.effectCombos;
  }
}

module.exports = StatusEffectManager;
