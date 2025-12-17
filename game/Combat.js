const { loadData } = require('../data/data_loader');
const StatusEffectManager = require('./StatusEffectManager');
const LootGenerator = require('./LootGenerator');
const BestiaryManager = require('../utils/bestiaryManager');

/**
 * Combat System - Turn-based combat with speed-based turn order
 */
class Combat {
  static STATES = {
    IDLE: 'idle',
    IN_COMBAT: 'in_combat',
    VICTORY: 'victory',
    DEFEAT: 'defeat',
    FLED: 'fled'
  };

  /**
   * Create a new Combat instance
   * @param {Character} character - Player character
   * @param {Object} monster - Monster data with stats
   */
  constructor(character, monster) {
    this.character = character;
    this.monster = this.initializeMonster(monster);
    this.state = Combat.STATES.IN_COMBAT;
    this.turn = 0;
    this.combatLog = [];
    this.statusEffects = {
      player: new StatusEffectManager(),
      monster: new StatusEffectManager()
    };
    
    // Determine turn order based on speed
    this.turnOrder = this.calculateTurnOrder();
    this.currentActor = this.turnOrder[0];
    
    this.addLog(`Combat started! ${this.character.name} vs ${this.monster.name}`);
  }

  /**
   * Initialize monster with combat stats
   * @param {Object} monsterData - Monster from monsters.json
   * @returns {Object} Monster with combat stats
   */
  initializeMonster(monsterData) {
    return {
      ...monsterData,
      current_hp: monsterData.hp,
      max_hp: monsterData.hp,
      abilities: monsterData.abilities || [],
      ability_cooldowns: {}
    };
  }

  /**
   * Calculate turn order based on speed/agility
   * @returns {Array<string>} Turn order ['player', 'monster'] or vice versa
   */
  calculateTurnOrder() {
    const playerSpeed = this.character.getFinalStats().agility || 10;
    const monsterSpeed = this.monster.agility || this.monster.speed || 10;
    
    // Add randomness to prevent ties
    const playerRoll = playerSpeed + Math.random() * 5;
    const monsterRoll = monsterSpeed + Math.random() * 5;
    
    return playerRoll >= monsterRoll ? ['player', 'monster'] : ['monster', 'player'];
  }

  /**
   * Execute player attack action
   * @param {string} targetId - Target (usually 'monster')
   * @returns {Object} Result of attack
   */
  playerAttack(targetId = 'monster') {
    if (this.state !== Combat.STATES.IN_COMBAT) {
      return { success: false, message: 'Combat is not active' };
    }

    if (this.currentActor !== 'player') {
      return { success: false, message: 'Not your turn' };
    }

    const playerStats = this.character.getFinalStats();
    const damage = this.calculateDamage(
      playerStats.attack,
      this.monster.defense || 0,
      'player'
    );

    this.monster.current_hp -= damage.total;
    this.addLog(`${this.character.name} attacks for ${damage.total} damage!${damage.critical ? ' CRITICAL HIT!' : ''}`);

    // Check for victory
    if (this.monster.current_hp <= 0) {
      return this.handleVictory();
    }

    // End player turn
    this.endTurn();
    
    // Monster's turn
    return this.monsterTurn();
  }

  /**
   * Execute player skill action
   * @param {string} skillId - Skill to use
   * @returns {Object} Result of skill usage
   */
  playerSkill(skillId) {
    if (this.state !== Combat.STATES.IN_COMBAT) {
      return { success: false, message: 'Combat is not active' };
    }

    if (this.currentActor !== 'player') {
      return { success: false, message: 'Not your turn' };
    }

    const classData = loadData('classes');
    const playerClass = classData.classes[this.character.type];
    const skill = playerClass.skills?.find(s => s.id === skillId);

    if (!skill) {
      return { success: false, message: 'Skill not found' };
    }

    // Check cooldown
    if (this.character.skill_cooldown > 0) {
      return { success: false, message: `Skill on cooldown: ${this.character.skill_cooldown} turns` };
    }

    // Execute skill
    let result = { success: true, log: [] };
    
    if (skill.damage_multiplier) {
      const playerStats = this.character.getFinalStats();
      const baseDamage = playerStats.attack * skill.damage_multiplier;
      const damage = this.calculateDamage(baseDamage, this.monster.defense || 0, 'player');
      
      this.monster.current_hp -= damage.total;
      this.addLog(`${this.character.name} uses ${skill.name} for ${damage.total} damage!`);
      
      if (this.monster.current_hp <= 0) {
        return this.handleVictory();
      }
    }

    // Apply effects
    if (skill.effect) {
      this.applySkillEffect(skill);
    }

    // Set cooldown
    this.character.skill_cooldown = skill.cooldown || 3;

    this.endTurn();
    return this.monsterTurn();
  }

  /**
   * Use an item during combat
   * @param {string} itemId - Item to use
   * @returns {Object} Result of item usage
   */
  playerUseItem(itemId) {
    if (this.state !== Combat.STATES.IN_COMBAT) {
      return { success: false, message: 'Combat is not active' };
    }

    if (this.currentActor !== 'player') {
      return { success: false, message: 'Not your turn' };
    }

    const consumables = loadData('consumables_extended');
    const item = this.findConsumable(consumables, itemId);

    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    // Check if player has item
    const hasItem = this.character.inventory.hasItem(itemId);
    if (!hasItem) {
      return { success: false, message: 'You do not have this item' };
    }

    // Use item
    const result = this.applyItemEffect(item);
    
    // Remove from inventory
    this.character.inventory.removeItem(itemId, 1);

    this.endTurn();
    return this.monsterTurn();
  }

  /**
   * Attempt to flee from combat
   * @returns {Object} Result of flee attempt
   */
  playerFlee() {
    if (this.state !== Combat.STATES.IN_COMBAT) {
      return { success: false, message: 'Combat is not active' };
    }

    // Check if this is a boss fight (cannot flee)
    if (this.monster.is_boss || this.monster.rarity === 'legendary') {
      this.addLog(`Cannot flee from ${this.monster.name}! You must fight!`);
      return {
        success: false,
        message: 'Cannot flee from boss fights!',
        log: this.combatLog
      };
    }

    // Calculate escape chance
    const playerStats = this.character.getFinalStats();
    const monsterAgility = this.monster.agility || this.monster.speed || 10;
    
    // Base 40% chance
    let fleeChance = 0.4;
    
    // +2% per point of agility difference (capped at +/-20% for balance)
    const agilityDiff = Math.max(-10, Math.min(10, (playerStats.agility || 10) - monsterAgility));
    fleeChance += (agilityDiff * 0.02);
    
    // -10% if player HP < 30%
    const hpPercent = (this.character.current_hp / this.character.max_hp) * 100;
    if (hpPercent < 30) {
      fleeChance -= 0.1;
    }
    
    // Final cap between 10% and 90%
    fleeChance = Math.max(0.1, Math.min(0.9, fleeChance));
    
    const roll = Math.random();
    this.addLog(`${this.character.name} attempts to flee! (${Math.round(fleeChance * 100)}% chance)`);

    if (roll < fleeChance) {
      this.state = Combat.STATES.FLED;
      this.addLog(`${this.character.name} successfully fled from combat!`);
      
      // Small XP penalty for fleeing
      const xpPenalty = Math.floor(this.character.xp * 0.05);
      if (xpPenalty > 0) {
        this.character.xp = Math.max(0, this.character.xp - xpPenalty);
        this.addLog(`Lost ${xpPenalty} XP for fleeing.`);
      }
      
      return {
        success: true,
        state: this.state,
        fled: true,
        message: 'You escaped!',
        xp_penalty: xpPenalty,
        log: this.combatLog
      };
    } else {
      this.addLog(`${this.character.name} failed to flee! The monster gets a free attack!`);
      
      // Monster gets a free turn to attack
      const damage = this.calculateDamage(
        this.monster.attack || 10,
        playerStats.defense,
        'monster'
      );
      
      this.character.takeDamage(damage.total);
      this.addLog(`${this.monster.name} attacks for ${damage.total} damage!${damage.critical ? ' CRITICAL HIT!' : ''}`);
      
      // Check for defeat
      if (this.character.current_hp <= 0) {
        return this.handleDefeat();
      }
      
      // Return to player's turn
      return {
        success: false,
        message: 'Failed to escape!',
        log: this.combatLog,
        state: this.state
      };
    }
  }

  /**
   * Monster takes its turn
   * @returns {Object} Result of monster action
   */
  monsterTurn() {
    if (this.state !== Combat.STATES.IN_COMBAT) {
      return this.getState();
    }

    // Apply status effects
    this.applyStatusEffects('monster');

    // Check if monster died from status effects
    if (this.monster.current_hp <= 0) {
      return this.handleVictory();
    }

    // Monster decides action (use ability or basic attack)
    const action = this.monsterAI();

    if (action.type === 'ability') {
      return this.monsterUseAbility(action.ability);
    } else {
      return this.monsterAttack();
    }
  }

  /**
   * Monster AI decides which action to take
   * @returns {Object} Action decision
   */
  monsterAI() {
    // Check if monster has abilities off cooldown
    const abilities = loadData('monster_abilities').abilities;
    const availableAbilities = this.monster.abilities
      .map(abilityId => ({
        id: abilityId,
        data: abilities[abilityId]
      }))
      .filter(ability => {
        const cooldown = this.monster.ability_cooldowns[ability.id] || 0;
        return cooldown === 0 && ability.data.type !== 'passive';
      });

    // 40% chance to use ability if available
    if (availableAbilities.length > 0 && Math.random() < 0.4) {
      const chosen = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
      return { type: 'ability', ability: chosen };
    }

    return { type: 'attack' };
  }

  /**
   * Monster basic attack
   * @returns {Object} Result of attack
   */
  monsterAttack() {
    const playerStats = this.character.getFinalStats();
    const damage = this.calculateDamage(
      this.monster.attack || 10,
      playerStats.defense,
      'monster'
    );

    this.character.takeDamage(damage.total);
    this.addLog(`${this.monster.name} attacks for ${damage.total} damage!${damage.critical ? ' CRITICAL HIT!' : ''}`);

    // Check for defeat
    if (this.character.current_hp <= 0) {
      return this.handleDefeat();
    }

    this.endTurn();
    return this.getState();
  }

  /**
   * Monster uses an ability
   * @param {Object} ability - Ability data
   * @returns {Object} Result of ability
   */
  monsterUseAbility(ability) {
    const abilityData = ability.data;
    this.addLog(`${this.monster.name} uses ${abilityData.name}!`);

    if (abilityData.type === 'physical' || abilityData.type === 'magic') {
      const baseDamage = (this.monster.attack || 10) * (abilityData.damage_multiplier || 1.0);
      const playerStats = this.character.getFinalStats();
      const damage = this.calculateDamage(baseDamage, playerStats.defense, 'monster');

      this.character.takeDamage(damage.total);
      this.addLog(`Deals ${damage.total} damage!`);

      // Check for defeat
      if (this.character.current_hp <= 0) {
        return this.handleDefeat();
      }
    }

    // Apply debuff effects
    if (abilityData.effect) {
      this.applyAbilityEffect(abilityData, 'player');
    }

    // Set cooldown
    if (abilityData.cooldown) {
      this.monster.ability_cooldowns[ability.id] = abilityData.cooldown;
    }

    this.endTurn();
    return this.getState();
  }

  /**
   * Calculate damage with defense, criticals, and modifiers
   * @param {number} attack - Attacker's attack value
   * @param {number} defense - Defender's defense value
   * @param {string} attacker - 'player' or 'monster'
   * @returns {Object} Damage breakdown
   */
  calculateDamage(attack, defense, attacker) {
    // Base damage with defense reduction
    const defenseReduction = defense * 0.5;
    let baseDamage = Math.max(1, attack - defenseReduction);

    // Variance (90-110%)
    const variance = 0.9 + Math.random() * 0.2;
    baseDamage *= variance;

    // Critical hit check
    const critChance = attacker === 'player' ? 0.1 : 0.05;
    const isCritical = Math.random() < critChance;
    
    if (isCritical) {
      baseDamage *= 2.0;
    }

    // Apply status effect modifiers
    const statusMods = this.getStatusModifiers(attacker);
    baseDamage *= (1 + statusMods.damage_multiplier);

    return {
      total: Math.floor(baseDamage),
      critical: isCritical,
      base: Math.floor(baseDamage / (isCritical ? 2.0 : 1.0))
    };
  }

  /**
   * Apply status effects at turn start/end
   * @param {string} target - 'player' or 'monster'
   */
  applyStatusEffects(target) {
    const effects = this.statusEffects[target];
    const results = effects.processTurn();

    results.forEach(result => {
      if (result.damage) {
        if (target === 'player') {
          this.character.takeDamage(result.damage);
          this.addLog(`${this.character.name} takes ${result.damage} damage from ${result.name}`);
        } else {
          this.monster.current_hp -= result.damage;
          this.addLog(`${this.monster.name} takes ${result.damage} damage from ${result.name}`);
        }
      }

      if (result.heal) {
        if (target === 'player') {
          this.character.heal(result.heal);
          this.addLog(`${this.character.name} heals ${result.heal} HP from ${result.name}`);
        } else {
          this.monster.current_hp = Math.min(this.monster.max_hp, this.monster.current_hp + result.heal);
          this.addLog(`${this.monster.name} heals ${result.heal} HP from ${result.name}`);
        }
      }

      if (result.expired) {
        this.addLog(`${result.name} expired`);
      }
    });
  }

  /**
   * Get status effect modifiers for damage calculations
   * @param {string} target - 'player' or 'monster'
   * @returns {Object} Modifier values
   */
  getStatusModifiers(target) {
    const effects = this.statusEffects[target];
    return effects.getModifiers();
  }

  /**
   * Apply skill effect (buff/debuff)
   * @param {Object} skill - Skill data
   */
  applySkillEffect(skill) {
    // Implementation depends on skill effect types
    this.addLog(`${skill.name} effect applied!`);
  }

  /**
   * Apply ability effect to target
   * @param {Object} ability - Ability data
   * @param {string} target - 'player' or 'monster'
   */
  applyAbilityEffect(ability, target) {
    const statusEffectsData = loadData('status_effects').status_effects;

    if (ability.effect === 'poison_damage' || ability.effect === 'poison_damage_over_time') {
      // Apply poison debuff
      const poisonEffect = {
        id: 'poison',
        name: 'Poison',
        type: 'debuff',
        duration: ability.duration || 3,
        damage_per_turn: ability.damage_per_turn || 5
      };
      
      this.statusEffects[target].addEffect(poisonEffect);
      this.addLog(`${target === 'player' ? this.character.name : this.monster.name} is poisoned!`);
    }

    if (ability.effect === 'stun_chance') {
      const stunRoll = Math.random();
      if (stunRoll < ability.value) {
        // Stun effect would skip next turn
        this.addLog(`${target === 'player' ? this.character.name : this.monster.name} is stunned!`);
      }
    }

    if (ability.effect === 'slow') {
      this.addLog(`${target === 'player' ? this.character.name : this.monster.name} is slowed!`);
    }
  }

  /**
   * Apply consumable item effect
   * @param {Object} item - Item data
   * @returns {Object} Result
   */
  applyItemEffect(item) {
    if (item.effects?.heal_hp) {
      const healAmount = item.effects.heal_hp;
      this.character.heal(healAmount);
      this.addLog(`${this.character.name} uses ${item.name} and heals ${healAmount} HP!`);
    }

    if (item.effects?.restore_mana) {
      this.addLog(`${this.character.name} uses ${item.name} and restores mana!`);
    }

    if (item.effects?.buff) {
      this.addLog(`${this.character.name} gains ${item.name} buff!`);
    }

    return { success: true };
  }

  /**
   * Find consumable in data
   * @param {Object} consumables - Consumables data
   * @param {string} itemId - Item ID
   * @returns {Object|null} Item data
   */
  findConsumable(consumables, itemId) {
    if (!consumables || !consumables.consumables) return null;

    for (const category of Object.values(consumables.consumables)) {
      for (const rarity of Object.values(category)) {
        if (Array.isArray(rarity)) {
          const found = rarity.find(item => item.id === itemId);
          if (found) return found;
        }
      }
    }
    return null;
  }

  /**
   * End current turn and advance to next
   */
  endTurn() {
    // Reduce cooldowns
    if (this.currentActor === 'player' && this.character.skill_cooldown > 0) {
      this.character.skill_cooldown--;
    }

    if (this.currentActor === 'monster') {
      Object.keys(this.monster.ability_cooldowns).forEach(abilityId => {
        if (this.monster.ability_cooldowns[abilityId] > 0) {
          this.monster.ability_cooldowns[abilityId]--;
        }
      });
    }

    // Apply status effects for ending actor
    this.applyStatusEffects(this.currentActor);

    // Switch turns
    const currentIndex = this.turnOrder.indexOf(this.currentActor);
    const nextIndex = (currentIndex + 1) % this.turnOrder.length;
    this.currentActor = this.turnOrder[nextIndex];

    // Increment turn counter when back to first actor
    if (nextIndex === 0) {
      this.turn++;
    }
  }

  /**
   * Handle combat victory
   * @returns {Object} Victory result with rewards
   */
  handleVictory() {
    this.state = Combat.STATES.VICTORY;
    this.monster.current_hp = 0;

    // Generate rewards
    const lootGen = new LootGenerator();
    const loot = lootGen.generateLoot(this.monster);
    const xpGained = this.monster.xp_reward || Math.floor(this.monster.level * 25);

    // Award XP
    const leveledUp = this.character.gainXP(xpGained);

    this.addLog(`Victory! ${this.monster.name} defeated!`);
    this.addLog(`Gained ${xpGained} XP and ${loot.gold} gold`);

    if (leveledUp) {
      this.addLog(`🎉 LEVEL UP! Now level ${this.character.level}`);
    }

    return {
      success: true,
      state: this.state,
      victory: true,
      rewards: {
        xp: xpGained,
        gold: loot.gold,
        items: loot.items,
        leveledUp: leveledUp
      },
      log: this.combatLog,
      bestiaryUpdate: {
        monsterId: this.monster.id,
        defeated: true
      }
    };
  }

  /**
   * Handle combat defeat
   * @returns {Object} Defeat result
   */
  handleDefeat() {
    this.state = Combat.STATES.DEFEAT;
    this.character.current_hp = 0;

    this.addLog(`${this.character.name} was defeated by ${this.monster.name}...`);

    return {
      success: true,
      state: this.state,
      defeat: true,
      log: this.combatLog
    };
  }

  /**
   * Get current combat state
   * @returns {Object} Full combat state
   */
  getState() {
    return {
      success: true,
      state: this.state,
      turn: this.turn,
      currentActor: this.currentActor,
      player: {
        name: this.character.name,
        hp: this.character.current_hp,
        max_hp: this.character.max_hp,
        skill_cooldown: this.character.skill_cooldown || 0,
        status_effects: this.statusEffects.player.getActiveEffects()
      },
      monster: {
        name: this.monster.name,
        id: this.monster.id,
        hp: this.monster.current_hp,
        max_hp: this.monster.max_hp,
        level: this.monster.level,
        status_effects: this.statusEffects.monster.getActiveEffects()
      },
      log: this.combatLog,
      bestiaryUpdate: this.turn === 0 ? {
        monsterId: this.monster.id,
        encountered: true
      } : null
    };
  }

  /**
   * Add message to combat log
   * @param {string} message - Log message
   */
  addLog(message) {
    this.combatLog.push({
      turn: this.turn,
      message: message,
      timestamp: Date.now()
    });
  }
}

module.exports = Combat;
