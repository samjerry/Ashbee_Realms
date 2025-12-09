/**
 * FactionManager.js
 * Manages faction reputation, rewards, and relationships
 * Features: Reputation tracking (Hostile → Exalted), faction-specific rewards,
 *           faction abilities, vendor discounts, faction quests
 */

const { loadData } = require('../data/data_loader');

class FactionManager {
  constructor() {
    this.factions = null;
    this.reputationTiers = ['hostile', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted'];
  }

  /**
   * Load faction data from factions.json
   */
  async loadFactions() {
    if (!this.factions) {
      const data = await loadData('factions');
      this.factions = data.factions;
    }
    return this.factions;
  }

  /**
   * Get all factions
   */
  async getAllFactions() {
    await this.loadFactions();
    return Object.values(this.factions).map(faction => ({
      id: faction.id,
      name: faction.name,
      description: faction.description,
      alignment: faction.alignment,
      territory: faction.territory,
      leader: faction.leader
    }));
  }

  /**
   * Get faction by ID
   */
  async getFaction(factionId) {
    await this.loadFactions();
    return this.factions[factionId];
  }

  /**
   * Initialize faction reputation for a new character
   */
  initializeReputation() {
    return {
      whispering_woods_rangers: 0,
      highland_militia: 0,
      merchants_guild: 0,
      arcane_academy: 0,
      druid_circle: 0,
      thieves_syndicate: 0,
      demon_cult: 0,
      goblin_clans: -1000, // Start hostile
      undead_legion: -1000, // Start hostile
      bandit_brotherhood: -500 // Start unfriendly
    };
  }

  /**
   * Get character's reputation with a faction
   */
  getReputation(character, factionId) {
    if (!character.reputation) {
      character.reputation = this.initializeReputation();
    }
    return character.reputation[factionId] || 0;
  }

  /**
   * Get reputation tier for a reputation value
   */
  getReputationTier(reputation) {
    if (reputation <= -3000) return 'hostile';
    if (reputation < 0) return 'unfriendly';
    if (reputation < 1000) return 'neutral';
    if (reputation < 3000) return 'friendly';
    if (reputation < 6000) return 'honored';
    return 'exalted';
  }

  /**
   * Get faction standing (tier info) for character
   */
  async getFactionStanding(character, factionId) {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) {
      throw new Error(`Faction ${factionId} not found`);
    }

    const reputation = this.getReputation(character, factionId);
    const tier = this.getReputationTier(reputation);
    const tierInfo = faction.reputation_tiers[tier];

    return {
      faction_id: factionId,
      faction_name: faction.name,
      reputation: reputation,
      tier: tier,
      title: tierInfo.title,
      effects: tierInfo.effects,
      next_tier: this.getNextTier(tier),
      reputation_to_next_tier: this.getReputationToNextTier(reputation, tier)
    };
  }

  /**
   * Get all faction standings for character
   */
  async getAllStandings(character) {
    await this.loadFactions();
    const standings = [];

    for (const factionId of Object.keys(this.factions)) {
      const standing = await this.getFactionStanding(character, factionId);
      standings.push(standing);
    }

    return standings.sort((a, b) => b.reputation - a.reputation);
  }

  /**
   * Get next reputation tier
   */
  getNextTier(currentTier) {
    const index = this.reputationTiers.indexOf(currentTier);
    if (index === -1 || index === this.reputationTiers.length - 1) {
      return null;
    }
    return this.reputationTiers[index + 1];
  }

  /**
   * Calculate reputation needed to reach next tier
   */
  getReputationToNextTier(currentReputation, currentTier) {
    const tierMinThresholds = {
      hostile: -3000,
      unfriendly: -999,
      neutral: 0,
      friendly: 1000,
      honored: 3000,
      exalted: 6000
    };

    const nextTier = this.getNextTier(currentTier);
    if (!nextTier) return 0;

    return tierMinThresholds[nextTier] - currentReputation;
  }

  /**
   * Add reputation with a faction
   */
  async addReputation(character, factionId, amount, reason = '') {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) {
      throw new Error(`Faction ${factionId} not found`);
    }

    if (!character.reputation) {
      character.reputation = this.initializeReputation();
    }

    const oldReputation = character.reputation[factionId] || 0;
    const oldTier = this.getReputationTier(oldReputation);

    character.reputation[factionId] = Math.max(-3000, Math.min(999999, oldReputation + amount));
    const newReputation = character.reputation[factionId];
    const newTier = this.getReputationTier(newReputation);

    const result = {
      faction_id: factionId,
      faction_name: faction.name,
      amount: amount,
      reason: reason,
      old_reputation: oldReputation,
      new_reputation: newReputation,
      old_tier: oldTier,
      new_tier: newTier,
      tier_changed: oldTier !== newTier
    };

    // Apply allied/enemy faction changes
    if (amount > 0) {
      // Gain rep with allies
      for (const allyId of faction.allied_factions || []) {
        const allyGain = Math.floor(amount * 0.25);
        if (allyGain > 0 && character.reputation[allyId] !== undefined) {
          character.reputation[allyId] = Math.max(-3000, Math.min(999999, 
            (character.reputation[allyId] || 0) + allyGain));
        }
      }

      // Lose rep with enemies
      for (const enemyId of faction.enemy_factions || []) {
        const enemyLoss = Math.floor(amount * 0.5);
        if (enemyLoss > 0 && character.reputation[enemyId] !== undefined) {
          character.reputation[enemyId] = Math.max(-3000, Math.min(999999, 
            (character.reputation[enemyId] || 0) - enemyLoss));
        }
      }
    }

    // Handle tier change rewards/penalties
    if (result.tier_changed) {
      const tierInfo = faction.reputation_tiers[newTier];
      result.tier_rewards = this.getTierRewards(tierInfo);
    }

    return result;
  }

  /**
   * Handle action-based reputation gains/losses
   */
  async handleAction(character, action, context = {}) {
    await this.loadFactions();
    const results = [];

    for (const [factionId, faction] of Object.entries(this.factions)) {
      // Check reputation gains
      if (faction.reputation_gains && faction.reputation_gains[action]) {
        const amount = faction.reputation_gains[action];
        const result = await this.addReputation(character, factionId, amount, action);
        results.push(result);
      }

      // Check reputation losses
      if (faction.reputation_losses && faction.reputation_losses[action]) {
        const amount = faction.reputation_losses[action];
        const result = await this.addReputation(character, factionId, amount, action);
        results.push(result);
      }
    }

    return results.filter(r => r.amount !== 0);
  }

  /**
   * Get tier rewards
   */
  getTierRewards(tierInfo) {
    const rewards = [];

    if (tierInfo.effects.faction_ability) {
      rewards.push({
        type: 'ability',
        value: tierInfo.effects.faction_ability
      });
    }

    if (tierInfo.effects.mount_access) {
      rewards.push({
        type: 'mount',
        value: tierInfo.effects.mount_access
      });
    }

    if (tierInfo.effects.unique_gear) {
      rewards.push({
        type: 'item',
        value: tierInfo.effects.unique_gear
      });
    }

    if (tierInfo.effects.passive_unlock) {
      rewards.push({
        type: 'passive',
        value: tierInfo.effects.passive_unlock
      });
    }

    return rewards;
  }

  /**
   * Get merchant price multiplier for faction
   */
  async getMerchantPriceMultiplier(character, factionId) {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) return 1.0;

    const reputation = this.getReputation(character, factionId);
    const tier = this.getReputationTier(reputation);
    const tierInfo = faction.reputation_tiers[tier];

    return tierInfo.effects.merchant_prices || 1.0;
  }

  /**
   * Check if character can access faction quests
   */
  async canAccessQuests(character, factionId) {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) return false;

    const reputation = this.getReputation(character, factionId);
    const tier = this.getReputationTier(reputation);
    
    // Hostile tiers block access
    if (tier === 'hostile' || tier === 'unfriendly') return false;
    
    // Neutral and higher always have at least basic access
    if (reputation >= 0) return true;
    
    // Check specific tier effects
    const tierInfo = faction.reputation_tiers[tier];
    return tierInfo.effects.quest_access || 
           tierInfo.effects.basic_quest_access || 
           tierInfo.effects.basic_quests ||
           tierInfo.effects.advanced_quest_access ||
           tierInfo.effects.all_quest_access || false;
  }

  /**
   * Get faction abilities for character
   */
  async getFactionAbilities(character) {
    await this.loadFactions();
    const abilities = [];

    for (const [factionId, faction] of Object.entries(this.factions)) {
      const reputation = this.getReputation(character, factionId);
      const tier = this.getReputationTier(reputation);
      const tierInfo = faction.reputation_tiers[tier];

      if (tierInfo.effects.faction_ability) {
        abilities.push({
          faction_id: factionId,
          faction_name: faction.name,
          ability_id: tierInfo.effects.faction_ability,
          tier_required: tier
        });
      }
    }

    return abilities;
  }

  /**
   * Get faction mounts for character
   */
  async getFactionMounts(character) {
    await this.loadFactions();
    const mounts = [];

    for (const [factionId, faction] of Object.entries(this.factions)) {
      const reputation = this.getReputation(character, factionId);
      const tier = this.getReputationTier(reputation);
      const tierInfo = faction.reputation_tiers[tier];

      if (tierInfo.effects.mount_access) {
        mounts.push({
          faction_id: factionId,
          faction_name: faction.name,
          mount_id: tierInfo.effects.mount_access,
          tier_required: tier
        });
      }
    }

    return mounts;
  }

  /**
   * Check if character is attacked on sight by faction
   */
  async isHostile(character, factionId) {
    await this.loadFactions();
    const reputation = this.getReputation(character, factionId);
    const tier = this.getReputationTier(reputation);
    
    // If tier is hostile, they're hostile regardless of faction definition
    if (tier === 'hostile') return true;
    
    // Check faction-specific hostility effects if faction exists
    const faction = this.factions[factionId];
    if (!faction) return false;
    
    const tierInfo = faction.reputation_tiers[tier];
    if (!tierInfo) return false;

    return tierInfo.effects.attacked_on_sight || 
           tierInfo.effects.guards_attack || false;
  }

  /**
   * Get faction conflicts (enemies who will lose rep)
   */
  async getFactionConflicts(character, factionId) {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) return [];

    const conflicts = [];
    for (const enemyId of faction.enemy_factions || []) {
      const enemyFaction = this.factions[enemyId];
      if (enemyFaction) {
        conflicts.push({
          faction_id: enemyId,
          faction_name: enemyFaction.name,
          current_reputation: this.getReputation(character, enemyId)
        });
      }
    }

    return conflicts;
  }

  /**
   * Get available faction quests for character
   */
  async getAvailableFactionQuests(character, factionId) {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) return [];

    const canAccess = await this.canAccessQuests(character, factionId);
    if (!canAccess) return [];

    const reputation = this.getReputation(character, factionId);
    const tier = this.getReputationTier(reputation);

    // Return faction-specific quests based on tier
    // This would integrate with QuestManager
    return {
      faction_id: factionId,
      faction_name: faction.name,
      tier: tier,
      quest_access_level: this.getQuestAccessLevel(tier, faction.reputation_tiers[tier])
    };
  }

  /**
   * Get quest access level
   */
  getQuestAccessLevel(tier, tierInfo) {
    if (tierInfo.effects.all_quest_access) return 'all';
    if (tierInfo.effects.advanced_quest_access) return 'advanced';
    if (tierInfo.effects.quest_access) return 'standard';
    if (tierInfo.effects.basic_quest_access || tierInfo.effects.basic_quests) return 'basic';
    return 'none';
  }

  /**
   * Get faction summary for character
   */
  async getFactionSummary(character) {
    await this.loadFactions();

    const standings = await this.getAllStandings(character);
    const abilities = await this.getFactionAbilities(character);
    const mounts = await this.getFactionMounts(character);

    // Count tier distribution
    const tierCounts = {};
    for (const tier of this.reputationTiers) {
      tierCounts[tier] = standings.filter(s => s.tier === tier).length;
    }

    return {
      total_factions: standings.length,
      tier_distribution: tierCounts,
      highest_reputation: standings[0],
      hostile_factions: standings.filter(s => s.tier === 'hostile'),
      unlocked_abilities: abilities,
      unlocked_mounts: mounts,
      exalted_count: tierCounts.exalted || 0
    };
  }

  /**
   * Award reputation for quest completion
   */
  async awardQuestReputation(character, questData) {
    if (!questData.faction_rewards) return [];

    const results = [];
    for (const [factionId, amount] of Object.entries(questData.faction_rewards)) {
      const result = await this.addReputation(character, factionId, amount, 'quest_complete');
      results.push(result);
    }

    return results;
  }

  /**
   * Check if character has faction ability
   */
  async hasFactionAbility(character, abilityId) {
    const abilities = await this.getFactionAbilities(character);
    return abilities.some(a => a.ability_id === abilityId);
  }

  /**
   * Get faction territory
   */
  async isInFactionTerritory(character, factionId) {
    await this.loadFactions();
    const faction = this.factions[factionId];
    if (!faction) return false;

    return faction.territory.includes(character.location);
  }
}

module.exports = FactionManager;
