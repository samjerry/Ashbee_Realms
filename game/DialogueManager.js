const { loadData } = require('../data/data_loader');

/**
 * Dialogue Manager - Handles dialogue trees, branching conversations, and rewards
 */
class DialogueManager {
  constructor() {
    this.dialoguesData = loadData('dialogues');
    this.dialogues = this.dialoguesData?.dialogues || {};
  }

  /**
   * Get dialogue by NPC ID
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Dialogue data
   */
  getDialogue(npcId) {
    return this.dialogues[npcId] || null;
  }

  /**
   * Get conversation by ID within an NPC's dialogues
   * @param {string} npcId - NPC ID
   * @param {string} conversationId - Conversation ID
   * @returns {Object|null} Conversation data
   */
  getConversation(npcId, conversationId) {
    const dialogue = this.getDialogue(npcId);
    
    if (!dialogue || !dialogue.conversations) {
      return null;
    }

    return dialogue.conversations[conversationId] || null;
  }

  /**
   * Get dialogue node by ID
   * @param {string} npcId - NPC ID
   * @param {string} conversationId - Conversation ID
   * @param {string} nodeId - Node ID
   * @returns {Object|null} Dialogue node
   */
  getNode(npcId, conversationId, nodeId) {
    const conversation = this.getConversation(npcId, conversationId);
    
    if (!conversation || !conversation.nodes) {
      return null;
    }

    return conversation.nodes.find(node => node.id === nodeId) || null;
  }

  /**
   * Start a conversation with an NPC
   * @param {string} npcId - NPC ID
   * @param {Object} character - Character object
   * @param {string} conversationId - Conversation ID (optional, defaults to first available)
   * @returns {Object} Conversation start result
   */
  startConversation(npcId, character, conversationId = null) {
    const dialogue = this.getDialogue(npcId);
    
    if (!dialogue) {
      return {
        success: false,
        message: `No dialogue found for NPC: ${npcId}`
      };
    }

    // If no conversation ID specified, find the first available conversation
    if (!conversationId && dialogue.conversations) {
      const conversationKeys = Object.keys(dialogue.conversations);
      if (conversationKeys.length > 0) {
        conversationId = conversationKeys[0];
      }
    }

    const conversation = this.getConversation(npcId, conversationId);
    
    if (!conversation) {
      return {
        success: false,
        message: `Conversation not found: ${conversationId}`
      };
    }

    // Check if conversation can be triggered
    if (conversation.trigger) {
      const canTrigger = this.checkTrigger(conversation.trigger, character);
      if (!canTrigger.success) {
        return {
          success: false,
          message: canTrigger.reason
        };
      }
    }

    // Get the starting node
    const startNode = conversation.nodes.find(node => node.id === 'start') || conversation.nodes[0];
    
    if (!startNode) {
      return {
        success: false,
        message: 'No starting node found in conversation'
      };
    }

    // Format node with default world name (Ashbee Realms)
    // The worldName parameter is optional and defaults to 'Ashbee Realms'
    return {
      success: true,
      npc: {
        id: npcId,
        name: dialogue.name,
        personality: dialogue.personality
      },
      conversation: {
        id: conversationId,
        currentNode: startNode.id
      },
      node: this.formatNode(startNode, character)
    };
  }

  /**
   * Make a dialogue choice
   * @param {string} npcId - NPC ID
   * @param {string} conversationId - Conversation ID
   * @param {string} currentNodeId - Current node ID
   * @param {number} choiceIndex - Index of choice made
   * @param {Object} character - Character object
   * @returns {Object} Choice result
   */
  makeChoice(npcId, conversationId, currentNodeId, choiceIndex, character) {
    const currentNode = this.getNode(npcId, conversationId, currentNodeId);
    
    if (!currentNode) {
      return {
        success: false,
        message: 'Current node not found'
      };
    }

    if (!currentNode.choices || choiceIndex >= currentNode.choices.length) {
      return {
        success: false,
        message: 'Invalid choice'
      };
    }

    const choice = currentNode.choices[choiceIndex];

    // Check if choice has requirements
    if (choice.requires) {
      const hasRequirement = this.checkRequirement(choice.requires, character);
      if (!hasRequirement.success) {
        return {
          success: false,
          message: hasRequirement.reason
        };
      }
    }

    // Apply choice effects
    const effects = this.applyChoiceEffects(choice, character);

    // Check if conversation ends
    if (choice.next === 'end') {
      return {
        success: true,
        conversationEnded: true,
        effects,
        message: 'Conversation ended'
      };
    }

    // Get next node
    const nextNode = this.getNode(npcId, conversationId, choice.next);
    
    if (!nextNode) {
      return {
        success: false,
        message: `Next node not found: ${choice.next}`
      };
    }

    // Format node with default world name (Ashbee Realms)
    // The worldName parameter is optional and defaults to 'Ashbee Realms'
    return {
      success: true,
      conversationEnded: false,
      node: this.formatNode(nextNode, character),
      effects
    };
  }

  /**
   * Format node for display (process variables, etc.)
   * @param {Object} node - Node object
   * @param {Object} character - Character object
   * @param {string} worldName - World name (defaults to 'Ashbee Realms')
   * @returns {Object} Formatted node
   * 
   * Note: This method is used by the backend DialogueManager when serving dialogue 
   * through the /api/dialogue routes. The tutorial system uses /api/tutorial routes
   * which return raw nodes, so the frontend must handle variable replacement.
   */
  formatNode(node, character, worldName = 'Ashbee Realms') {
    let text = node.text || '';

    // Replace character-specific variables
    if (character) {
      text = text.replace(/\{player_name\}/g, character.name || 'traveler');
      text = text.replace(/\{player_level\}/g, character.level || 1);
      text = text.replace(/\{player_class\}/g, character.class || 'adventurer');
    }

    // Replace world name
    text = text.replace(/\{world_name\}/g, worldName);

    return {
      id: node.id,
      text,
      choices: node.choices || [],
      reward: node.reward || null,
      unlocks: node.unlocks || [],
      effect: node.effect || null
    };
  }

  /**
   * Check if trigger condition is met
   * @param {string} trigger - Trigger condition
   * @param {Object} character - Character object
   * @returns {Object} Trigger check result
   */
  checkTrigger(trigger, character) {
    // Handle different trigger types
    if (trigger === 'first_encounter') {
      // Check if character has met this NPC before
      // This would be stored in character.dialogueHistory
      return { success: true };
    }

    if (trigger === 'new_player') {
      // Check if character is new (level 1, no quests completed)
      const completedQuests = character.completedQuests || character.quests_completed || [];
      const isNew = character.level === 1 && completedQuests.length === 0;
      return { 
        success: isNew,
        reason: isNew ? null : 'Only available to new players'
      };
    }

    if (trigger.startsWith('quest:')) {
      // Check if quest is completed
      const questId = trigger.split(':')[1];
      const completedQuests = character.completedQuests || character.quests_completed || [];
      const questCompleted = completedQuests.includes(questId);
      return {
        success: questCompleted,
        reason: questCompleted ? null : `Requires quest completion: ${questId}`
      };
    }

    if (trigger.startsWith('level:')) {
      // Check level requirement
      const requiredLevel = parseInt(trigger.split(':')[1]);
      const meetsLevel = character.level >= requiredLevel;
      return {
        success: meetsLevel,
        reason: meetsLevel ? null : `Requires level ${requiredLevel}`
      };
    }

    // Default: allow trigger
    return { success: true };
  }

  /**
   * Check if requirement is met
   * @param {string} requirement - Requirement
   * @param {Object} character - Character object
   * @returns {Object} Requirement check result
   */
  checkRequirement(requirement, character) {
    // Check for specific items
    if (requirement.startsWith('item:')) {
      const itemId = requirement.split(':')[1];
      const hasItem = character.inventory?.items && 
                      character.inventory.items[itemId] && 
                      character.inventory.items[itemId] > 0;
      return {
        success: hasItem,
        reason: hasItem ? null : `Requires item: ${itemId}`
      };
    }

    // Check for gold
    if (requirement.startsWith('gold:')) {
      const goldRequired = parseInt(requirement.split(':')[1]);
      const hasGold = character.gold >= goldRequired;
      return {
        success: hasGold,
        reason: hasGold ? null : `Requires ${goldRequired} gold`
      };
    }

    // Check for tokens/special items in inventory
    if (character.inventory?.items) {
      const hasRequirement = character.inventory.items[requirement] && 
                            character.inventory.items[requirement] > 0;
      return {
        success: hasRequirement,
        reason: hasRequirement ? null : `Requires: ${requirement}`
      };
    }

    return {
      success: false,
      reason: `Missing requirement: ${requirement}`
    };
  }

  /**
   * Apply effects from dialogue choice
   * @param {Object} choice - Choice object
   * @param {Object} character - Character object
   * @returns {Object} Applied effects
   */
  applyChoiceEffects(choice, character) {
    const effects = {
      reputation: 0,
      gold: 0,
      xp: 0,
      items: [],
      unlocks: [],
      classSet: null
    };

    // Apply reputation change
    if (choice.reputation !== undefined) {
      effects.reputation = choice.reputation;
      if (character.reputation) {
        character.reputation.general = (character.reputation.general || 0) + choice.reputation;
      }
    }

    // Apply gold change
    if (choice.gold !== undefined) {
      effects.gold = choice.gold;
      character.gold = (character.gold || 0) + choice.gold;
    }

    // Apply XP gain
    if (choice.xp !== undefined) {
      effects.xp = choice.xp;
      character.xp = (character.xp || 0) + choice.xp;
    }

    // Set class (for character creation)
    if (choice.set_class) {
      effects.classSet = choice.set_class;
      character.class = choice.set_class;
    }

    // Unlock features
    if (choice.unlocks) {
      effects.unlocks = choice.unlocks;
    }

    return effects;
  }

  /**
   * Get all available conversations for an NPC
   * @param {string} npcId - NPC ID
   * @param {Object} character - Character object
   * @returns {Array} Available conversations
   */
  getAvailableConversations(npcId, character) {
    const dialogue = this.getDialogue(npcId);
    
    if (!dialogue || !dialogue.conversations) {
      return [];
    }

    const available = [];

    for (const [conversationId, conversation] of Object.entries(dialogue.conversations)) {
      // Check if conversation can be triggered
      if (conversation.trigger) {
        const canTrigger = this.checkTrigger(conversation.trigger, character);
        if (!canTrigger.success) {
          continue; // Skip this conversation
        }
      }

      available.push({
        id: conversationId,
        trigger: conversation.trigger || 'available'
      });
    }

    return available;
  }

  /**
   * Process node rewards
   * @param {Object} node - Dialogue node
   * @param {Object} character - Character object
   * @returns {Object} Reward processing result
   */
  processNodeRewards(node, character) {
    if (!node.reward) {
      return {
        success: true,
        rewards: {}
      };
    }

    const rewards = {
      xp: 0,
      gold: 0,
      items: [],
      reputation: 0
    };

    // Grant XP
    if (node.reward.xp) {
      rewards.xp = node.reward.xp;
      character.xp = (character.xp || 0) + node.reward.xp;
    }

    // Grant gold
    if (node.reward.gold) {
      rewards.gold = node.reward.gold;
      character.gold = (character.gold || 0) + node.reward.gold;
    }

    // Grant items
    if (node.reward.items) {
      rewards.items = node.reward.items;
      // Items would be added to inventory here
    }

    // Grant reputation
    if (node.reward.reputation) {
      rewards.reputation = node.reward.reputation;
      if (character.reputation) {
        character.reputation.general = (character.reputation.general || 0) + node.reward.reputation;
      }
    }

    return {
      success: true,
      rewards
    };
  }

  /**
   * Get dialogue history for character
   * @param {Object} character - Character object
   * @param {string} npcId - NPC ID (optional)
   * @returns {Object} Dialogue history
   */
  getDialogueHistory(character, npcId = null) {
    if (!character.dialogueHistory) {
      return {};
    }

    if (npcId) {
      return character.dialogueHistory[npcId] || {};
    }

    return character.dialogueHistory;
  }

  /**
   * Record dialogue interaction
   * @param {Object} character - Character object
   * @param {string} npcId - NPC ID
   * @param {string} conversationId - Conversation ID
   * @param {string} nodeId - Node ID
   */
  recordDialogueInteraction(character, npcId, conversationId, nodeId) {
    if (!character.dialogueHistory) {
      character.dialogueHistory = {};
    }

    if (!character.dialogueHistory[npcId]) {
      character.dialogueHistory[npcId] = {
        conversations: {},
        lastInteraction: Date.now()
      };
    }

    if (!character.dialogueHistory[npcId].conversations[conversationId]) {
      character.dialogueHistory[npcId].conversations[conversationId] = {
        nodes: [],
        completed: false
      };
    }

    character.dialogueHistory[npcId].conversations[conversationId].nodes.push({
      nodeId,
      timestamp: Date.now()
    });

    character.dialogueHistory[npcId].lastInteraction = Date.now();
  }
}

module.exports = DialogueManager;
