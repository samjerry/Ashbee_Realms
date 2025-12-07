const { loadData } = require('../data/data_loader');

/**
 * NPC Manager - Handles NPC loading, interaction, and spawning
 */
class NPCManager {
  constructor() {
    this.npcsData = loadData('npcs');
    this.merchants = this.npcsData?.npcs?.merchants || [];
    this.questGivers = this.npcsData?.npcs?.quest_givers || [];
    this.companions = this.npcsData?.npcs?.companions || [];
    this.loreKeepers = this.npcsData?.npcs?.lore_keepers || [];
    
    // Combine all NPCs for easy searching
    this.allNPCs = [
      ...this.merchants,
      ...this.questGivers,
      ...this.companions,
      ...this.loreKeepers
    ];
  }

  /**
   * Get NPC by ID
   * @param {string} npcId - NPC ID
   * @returns {Object|null} NPC data
   */
  getNPC(npcId) {
    return this.allNPCs.find(npc => npc.id === npcId) || null;
  }

  /**
   * Get all NPCs
   * @returns {Array} Array of all NPCs
   */
  getAllNPCs() {
    return this.allNPCs.map(npc => ({
      id: npc.id,
      name: npc.name,
      description: npc.description,
      type: this.getNPCType(npc),
      spawn_locations: npc.spawn_locations || [],
      spawn_chance: npc.spawn_chance || 1.0
    }));
  }

  /**
   * Get NPCs by location
   * @param {string} location - Location/biome ID
   * @returns {Array} Array of NPCs in location
   */
  getNPCsInLocation(location) {
    return this.allNPCs.filter(npc => {
      const locations = npc.spawn_locations || [];
      return locations.includes(location);
    });
  }

  /**
   * Get NPCs by type
   * @param {string} type - NPC type (merchant, quest_giver, companion, lore_keeper)
   * @returns {Array} Array of NPCs of that type
   */
  getNPCsByType(type) {
    switch (type) {
      case 'merchant':
        return this.merchants;
      case 'quest_giver':
        return this.questGivers;
      case 'companion':
        return this.companions;
      case 'lore_keeper':
        return this.loreKeepers;
      default:
        return [];
    }
  }

  /**
   * Determine NPC type
   * @param {Object} npc - NPC object
   * @returns {string} NPC type
   */
  getNPCType(npc) {
    if (this.merchants.includes(npc)) return 'merchant';
    if (this.questGivers.includes(npc)) return 'quest_giver';
    if (this.companions.includes(npc)) return 'companion';
    if (this.loreKeepers.includes(npc)) return 'lore_keeper';
    return 'unknown';
  }

  /**
   * Check if NPC spawns (based on spawn chance)
   * @param {string} npcId - NPC ID
   * @returns {boolean} True if NPC spawns
   */
  checkNPCSpawn(npcId) {
    const npc = this.getNPC(npcId);
    
    if (!npc) {
      return false;
    }

    const spawnChance = npc.spawn_chance !== undefined ? npc.spawn_chance : 1.0;
    return Math.random() < spawnChance;
  }

  /**
   * Get NPC greeting
   * @param {string} npcId - NPC ID
   * @param {Object} character - Character object (optional, for personalized greetings)
   * @returns {string} Greeting message
   */
  getNPCGreeting(npcId, character = null) {
    const npc = this.getNPC(npcId);
    
    if (!npc) {
      return 'Hello, traveler.';
    }

    let greeting = npc.greeting || 'Greetings, adventurer.';

    // Personalize greeting if character provided
    if (character && character.name) {
      greeting = greeting.replace(/traveler|adventurer|stranger/gi, character.name);
    }

    return greeting;
  }

  /**
   * Get random NPC dialogue
   * @param {string} npcId - NPC ID
   * @returns {string} Random dialogue line
   */
  getRandomDialogue(npcId) {
    const npc = this.getNPC(npcId);
    
    if (!npc || !npc.dialogue || npc.dialogue.length === 0) {
      return 'I have nothing more to say.';
    }

    return npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
  }

  /**
   * Get NPC quest information (if quest giver)
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Quest information
   */
  getNPCQuest(npcId) {
    const npc = this.getNPC(npcId);
    
    if (!npc || !npc.quest) {
      return null;
    }

    return npc.quest;
  }

  /**
   * Interact with NPC
   * @param {string} npcId - NPC ID
   * @param {Object} character - Character object
   * @returns {Object} Interaction result
   */
  interactWithNPC(npcId, character) {
    const npc = this.getNPC(npcId);
    
    if (!npc) {
      return {
        success: false,
        message: 'NPC not found'
      };
    }

    const npcType = this.getNPCType(npc);
    const greeting = this.getNPCGreeting(npcId, character);
    const dialogue = this.getRandomDialogue(npcId);

    const interaction = {
      success: true,
      npc: {
        id: npc.id,
        name: npc.name,
        description: npc.description,
        type: npcType
      },
      greeting,
      dialogue,
      actions: []
    };

    // Add type-specific actions
    if (npcType === 'merchant') {
      interaction.actions.push({
        id: 'view_shop',
        name: 'View Shop',
        description: 'Browse this merchant\'s wares'
      });
    }

    if (npcType === 'quest_giver' && npc.quest) {
      interaction.actions.push({
        id: 'view_quest',
        name: 'Ask about quests',
        description: 'See what quests this NPC offers'
      });
    }

    // Add dialogue action if NPC has dialogue tree
    interaction.actions.push({
      id: 'talk',
      name: 'Talk',
      description: 'Engage in conversation'
    });

    return interaction;
  }

  /**
   * Spawn NPCs in a location (with spawn chances)
   * @param {string} location - Location/biome ID
   * @returns {Array} Array of spawned NPC IDs
   */
  spawnNPCsInLocation(location) {
    const npcsInLocation = this.getNPCsInLocation(location);
    const spawnedNPCs = [];

    for (const npc of npcsInLocation) {
      if (this.checkNPCSpawn(npc.id)) {
        spawnedNPCs.push(npc.id);
      }
    }

    return spawnedNPCs;
  }

  /**
   * Get NPC reputation modifier
   * @param {string} npcId - NPC ID
   * @returns {Object} Reputation modifiers
   */
  getNPCReputationModifier(npcId) {
    const npc = this.getNPC(npcId);
    
    if (!npc) {
      return null;
    }

    return {
      faction: npc.faction || null,
      reputation_required: npc.reputation_required || 0,
      reputation_gain: npc.reputation_gain || 0,
      reputation_loss: npc.reputation_loss || 0
    };
  }

  /**
   * Get merchant NPCs only
   * @returns {Array} Array of merchant NPCs
   */
  getMerchants() {
    return this.merchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      merchant_type: merchant.merchant_type,
      spawn_locations: merchant.spawn_locations
    }));
  }

  /**
   * Get quest giver NPCs only
   * @returns {Array} Array of quest giver NPCs
   */
  getQuestGivers() {
    return this.questGivers.map(questGiver => ({
      id: questGiver.id,
      name: questGiver.name,
      description: questGiver.description,
      quest_type: questGiver.quest?.type || null,
      spawn_locations: questGiver.spawn_locations
    }));
  }

  /**
   * Check if NPC is available to character (reputation, level, etc.)
   * @param {string} npcId - NPC ID
   * @param {Object} character - Character object
   * @returns {Object} Availability result
   */
  isNPCAvailable(npcId, character) {
    const npc = this.getNPC(npcId);
    
    if (!npc) {
      return {
        available: false,
        reason: 'NPC not found'
      };
    }

    // Check level requirement
    if (npc.required_level && character.level < npc.required_level) {
      return {
        available: false,
        reason: `Requires level ${npc.required_level}`
      };
    }

    // Check reputation requirement
    if (npc.reputation_required && character.reputation) {
      const factionRep = character.reputation[npc.faction] || 0;
      if (factionRep < npc.reputation_required) {
        return {
          available: false,
          reason: `Requires ${npc.reputation_required} reputation with ${npc.faction}`
        };
      }
    }

    return {
      available: true,
      reason: null
    };
  }

  /**
   * Get NPC completion text (for quest completion)
   * @param {string} npcId - NPC ID
   * @returns {string} Completion text
   */
  getNPCCompletionText(npcId) {
    const npc = this.getNPC(npcId);
    
    if (!npc) {
      return 'Thank you for your help.';
    }

    return npc.completion_text || 'Well done! Your efforts are appreciated.';
  }
}

module.exports = NPCManager;
