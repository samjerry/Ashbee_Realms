const fs = require('fs');
const path = require('path');

class TutorialManager {
  constructor() {
    this.tutorialQuest = null;
    this.tooltips = new Map();
    this.gameplayTips = [];
    this.dialogueTrees = new Map();
    this.npcData = new Map();
    this.loadTutorialData();
  }

  /**
   * Load tutorial quest and tips from JSON files
   */
  loadTutorialData() {
    try {
      // Load tutorial quest
      const tutorialPath = path.join(__dirname, '../data/tutorial_quest.json');
      this.tutorialQuest = JSON.parse(fs.readFileSync(tutorialPath, 'utf8'));

      // Load tooltips
      const tooltipsPath = path.join(__dirname, '../data/tooltips.json');
      if (fs.existsSync(tooltipsPath)) {
        const tooltipsData = JSON.parse(fs.readFileSync(tooltipsPath, 'utf8'));
        tooltipsData.tooltips.forEach(tip => {
          this.tooltips.set(tip.id, tip);
        });
      }

      // Load gameplay tips
      const tipsPath = path.join(__dirname, '../data/gameplay_tips.json');
      if (fs.existsSync(tipsPath)) {
        const tipsData = JSON.parse(fs.readFileSync(tipsPath, 'utf8'));
        this.gameplayTips = tipsData.tips;
      }

      // Load tutorial dialogue trees
      this.loadDialogueTrees();
      
      // Load tutorial NPCs
      this.loadTutorialNPCs();

      console.log('✅ Tutorial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading tutorial data:', error);
    }
  }

  /**
   * Initialize tutorial for a new character
   * @param {Object} character - Character object
   * @returns {Object} Tutorial state
   */
  initializeTutorial(character) {
    if (!character.tutorialProgress) {
      character.tutorialProgress = {
        isActive: true,
        currentStep: 0,
        completedSteps: [],
        startedAt: Date.now(),
        questId: this.tutorialQuest.id
      };
    }
    return character.tutorialProgress;
  }

  /**
   * Get current tutorial step
   * @param {Object} character - Character object
   * @returns {Object|null} Current step or null if tutorial complete
   */
  getCurrentStep(character) {
    if (!character.tutorialProgress || !character.tutorialProgress.isActive) {
      return null;
    }

    const stepIndex = character.tutorialProgress.currentStep;
    if (stepIndex >= this.tutorialQuest.steps.length) {
      return null;
    }

    return this.tutorialQuest.steps[stepIndex];
  }

  /**
   * Complete current tutorial step
   * @param {Object} character - Character object
   * @param {string} stepId - Step ID to complete
   * @returns {Object} Completion result with rewards
   */
  completeStep(character, stepId) {
    const currentStep = this.getCurrentStep(character);
    
    if (!currentStep || currentStep.id !== stepId) {
      return { success: false, error: 'Invalid step or tutorial not active' };
    }

    // Mark step as completed
    character.tutorialProgress.completedSteps.push(stepId);
    character.tutorialProgress.currentStep++;

    // Grant step rewards
    const rewards = {
      xp: currentStep.reward.xp || 0,
      gold: currentStep.reward.gold || 0,
      items: []
    };

    if (currentStep.reward.item) {
      rewards.items.push({
        id: currentStep.reward.item,
        quantity: currentStep.reward.itemQuantity || 1
      });
    }

    // Check if tutorial is complete
    const isComplete = character.tutorialProgress.currentStep >= this.tutorialQuest.steps.length;
    if (isComplete) {
      character.tutorialProgress.isActive = false;
      character.tutorialProgress.completedAt = Date.now();

      // Grant completion rewards
      rewards.xp += this.tutorialQuest.rewards.xp || 0;
      rewards.gold += this.tutorialQuest.rewards.gold || 0;
      if (this.tutorialQuest.rewards.items) {
        rewards.items.push(...this.tutorialQuest.rewards.items);
      }
      if (this.tutorialQuest.rewards.title) {
        rewards.title = this.tutorialQuest.rewards.title;
      }
    }

    // Get next step
    const nextStep = isComplete ? null : this.getCurrentStep(character);

    return {
      success: true,
      stepCompleted: currentStep,
      rewards,
      nextStep,
      tutorialComplete: isComplete,
      completionMessage: isComplete ? this.tutorialQuest.completion_message : null
    };
  }

  /**
   * Check if an action should trigger tutorial step completion
   * @param {Object} character - Character object
   * @param {string} actionType - Type of action performed
   * @param {Object} actionData - Additional action data
   * @returns {Object|null} Step completion result if triggered
   */
  checkStepTrigger(character, actionType, actionData = {}) {
    const currentStep = this.getCurrentStep(character);
    
    if (!currentStep) {
      return null;
    }

    let shouldComplete = false;

    switch (currentStep.type) {
      case 'dialogue':
        shouldComplete = actionType === 'dialogue' && 
          actionData.npcId === currentStep.target &&
          actionData.nodeId === currentStep.dialogue_node;
        break;
      
      case 'ui_interaction':
        shouldComplete = actionType === 'ui_interaction' && actionData.target === currentStep.target;
        break;
      
      case 'equip_item':
        shouldComplete = actionType === 'equip_item' && 
          (actionData.slot === currentStep.target || actionData.type === currentStep.target);
        break;
      
      case 'travel':
        shouldComplete = actionType === 'travel' && actionData.location === currentStep.target;
        break;
      
      case 'defeat_monster':
        shouldComplete = actionType === 'defeat_monster' && 
          (actionData.monsterId === currentStep.target || actionData.monsterType === currentStep.target);
        break;
      
      case 'collect_loot':
        shouldComplete = actionType === 'collect_loot';
        break;
      
      case 'reach_level':
        shouldComplete = actionType === 'level_up' && actionData.level >= currentStep.target;
        break;
      
      case 'interact_npc':
        shouldComplete = actionType === 'interact_npc' && 
          (actionData.npcType === currentStep.target || actionData.npcId === currentStep.target);
        break;
      
      case 'complete':
        shouldComplete = false; // Manual completion only
        break;
      
      default:
        shouldComplete = false;
    }

    if (shouldComplete) {
      return this.completeStep(character, currentStep.id);
    }

    return null;
  }

  /**
   * Skip tutorial (for experienced players)
   * @param {Object} character - Character object
   * @returns {Object} Skip result
   */
  skipTutorial(character) {
    if (!character.tutorialProgress || !character.tutorialProgress.isActive) {
      return { success: false, error: 'No active tutorial to skip' };
    }

    character.tutorialProgress.isActive = false;
    character.tutorialProgress.skipped = true;
    character.tutorialProgress.skippedAt = Date.now();

    return {
      success: true,
      message: 'Tutorial skipped. You can always view help tips in the settings!'
    };
  }

  /**
   * Get tooltip for a UI element
   * @param {string} tooltipId - Tooltip identifier
   * @returns {Object|null} Tooltip data
   */
  getTooltip(tooltipId) {
    return this.tooltips.get(tooltipId) || null;
  }

  /**
   * Get all tooltips for a category
   * @param {string} category - Tooltip category
   * @returns {Array} Array of tooltips
   */
  getTooltipsByCategory(category) {
    return Array.from(this.tooltips.values()).filter(tip => tip.category === category);
  }

  /**
   * Get random gameplay tip
   * @param {string} context - Optional context filter
   * @returns {Object|null} Random tip
   */
  getRandomTip(context = null) {
    let tips = this.gameplayTips;
    
    if (context) {
      tips = tips.filter(tip => tip.context === context || tip.context === 'general');
    }

    if (tips.length === 0) {
      return null;
    }

    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Get tips for specific context
   * @param {string} context - Context identifier (combat, exploration, etc.)
   * @returns {Array} Array of relevant tips
   */
  getTipsByContext(context) {
    return this.gameplayTips.filter(tip => 
      tip.context === context || tip.context === 'general'
    );
  }

  /**
   * Get tutorial progress summary
   * @param {Object} character - Character object
   * @returns {Object} Progress summary
   */
  getTutorialProgress(character) {
    if (!character.tutorialProgress) {
      return {
        isActive: false,
        notStarted: true
      };
    }

    const progress = character.tutorialProgress;
    const totalSteps = this.tutorialQuest.steps.length;
    const completedCount = progress.completedSteps.length;

    return {
      isActive: progress.isActive,
      currentStepIndex: progress.currentStep,
      currentStep: this.getCurrentStep(character),
      completedSteps: progress.completedSteps,
      completedCount,
      totalSteps,
      progressPercentage: Math.floor((completedCount / totalSteps) * 100),
      skipped: progress.skipped || false,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt || null
    };
  }

  /**
   * Reset tutorial (for testing or replaying)
   * @param {Object} character - Character object
   * @returns {Object} Reset result
   */
  resetTutorial(character) {
    character.tutorialProgress = {
      isActive: true,
      currentStep: 0,
      completedSteps: [],
      startedAt: Date.now(),
      questId: this.tutorialQuest.id
    };

    return {
      success: true,
      message: 'Tutorial reset successfully'
    };
  }

  /**
   * Get tutorial quest data
   * @returns {Object} Tutorial quest
   */
  getTutorialQuest() {
    return this.tutorialQuest;
  }

  /**
   * Check if character is in tutorial
   * @param {Object} character - Character object
   * @returns {boolean} True if in tutorial
   */
  isInTutorial(character) {
    return character.tutorialProgress && character.tutorialProgress.isActive;
  }

  /**
   * Load dialogue trees from dialogue folder
   */
  loadDialogueTrees() {
    try {
      const dialoguePath = path.join(__dirname, '../data/dialogue/tutorial_mentor_dialogue.json');
      if (fs.existsSync(dialoguePath)) {
        const dialogueData = JSON.parse(fs.readFileSync(dialoguePath, 'utf8'));
        this.dialogueTrees.set(dialogueData.dialogue_tree_id, dialogueData);
        console.log('✅ Tutorial dialogue tree loaded');
      }
    } catch (error) {
      console.error('❌ Error loading dialogue trees:', error);
    }
  }

  /**
   * Load tutorial NPC data
   */
  loadTutorialNPCs() {
    try {
      const npcPath = path.join(__dirname, '../data/npcs/tutorial_mentor.json');
      if (fs.existsSync(npcPath)) {
        const npcData = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
        this.npcData.set(npcData.id, npcData);
        console.log('✅ Tutorial NPC loaded');
      }
    } catch (error) {
      console.error('❌ Error loading tutorial NPCs:', error);
    }
  }

  /**
   * Get dialogue node by ID
   * @param {string} npcId - NPC ID
   * @param {string} nodeId - Dialogue node ID
   * @returns {Object|null} Dialogue node or null
   */
  getDialogueNode(npcId, nodeId) {
    const npc = this.npcData.get(npcId);
    if (!npc) {
      return null;
    }

    const dialogueTree = this.dialogueTrees.get(npc.dialogue_tree);
    if (!dialogueTree) {
      return null;
    }

    const node = dialogueTree.nodes.find(n => n.id === nodeId);
    return node || null;
  }

  /**
   * Get NPC data
   * @param {string} npcId - NPC ID
   * @returns {Object|null} NPC data or null
   */
  getNPC(npcId) {
    return this.npcData.get(npcId) || null;
  }

  /**
   * Advance dialogue and process choice
   * @param {Object} character - Character object
   * @param {string} npcId - NPC ID
   * @param {string} currentNodeId - Current dialogue node ID
   * @param {number} choiceIndex - Index of selected choice
   * @returns {Object} Result of dialogue advancement
   */
  advanceDialogue(character, npcId, currentNodeId, choiceIndex) {
    const currentNode = this.getDialogueNode(npcId, currentNodeId);
    
    if (!currentNode) {
      return {
        success: false,
        error: 'Current dialogue node not found'
      };
    }

    if (!currentNode.choices || choiceIndex >= currentNode.choices.length) {
      return {
        success: false,
        error: 'Invalid choice index'
      };
    }

    const choice = currentNode.choices[choiceIndex];

    // Record dialogue interaction
    if (!character.dialogueHistory) {
      character.dialogueHistory = {};
    }
    if (!character.dialogueHistory[npcId]) {
      character.dialogueHistory[npcId] = {
        nodes: [],
        lastInteraction: Date.now()
      };
    }
    character.dialogueHistory[npcId].nodes.push({
      nodeId: currentNodeId,
      choiceIndex,
      timestamp: Date.now()
    });
    character.dialogueHistory[npcId].lastInteraction = Date.now();

    return {
      success: true,
      nextNodeId: choice.next,
      action: choice.action || currentNode.action,
      actionTarget: choice.action_target || currentNode.action_target
    };
  }

  /**
   * Trigger dialogue action
   * @param {string} action - Action to trigger
   * @param {Object} character - Character object
   * @param {string} actionTarget - Optional action target
   * @returns {Object} Action result
   */
  triggerDialogueAction(action, character, actionTarget = null) {
    const result = {
      success: true,
      action,
      actionTarget
    };

    switch (action) {
      case 'open_bestiary':
        result.uiAction = 'open_bestiary';
        result.targetMonster = actionTarget || 'forest_slime';
        break;
      
      case 'open_character_sheet':
        result.uiAction = 'open_character_sheet';
        break;
      
      case 'open_quest_log':
        result.uiAction = 'open_quest_log';
        break;
      
      case 'assign_quest_step':
        // Handled by step completion
        break;
      
      case 'skip_tutorial':
        return this.skipTutorial(character);
      
      case 'complete_tutorial':
        // Mark tutorial as complete
        if (character.tutorialProgress) {
          character.tutorialProgress.isActive = false;
          character.tutorialProgress.completedAt = Date.now();
        }
        result.tutorialComplete = true;
        break;
      
      default:
        result.success = false;
        result.error = `Unknown action: ${action}`;
    }

    return result;
  }

  /**
   * Check if dialogue node conditions are met
   * @param {Object} character - Character object
   * @param {string} condition - Condition string
   * @returns {boolean} True if condition is met
   */
  checkDialogueConditions(character, condition) {
    if (!condition) {
      return true;
    }

    // Parse simple conditions like "level >= 2"
    const levelMatch = condition.match(/level\s*>=\s*(\d+)/);
    if (levelMatch) {
      const requiredLevel = parseInt(levelMatch[1]);
      return character.level >= requiredLevel;
    }

    // Add more condition types as needed
    return true;
  }

  /**
   * Check if current tutorial step requires dialogue
   * @param {Object} character - Character object
   * @returns {Object|null} Dialogue requirement or null
   */
  getCurrentDialogueRequirement(character) {
    const currentStep = this.getCurrentStep(character);
    
    if (!currentStep) {
      return null;
    }

    if (currentStep.type === 'dialogue') {
      return {
        npcId: currentStep.target,
        nodeId: currentStep.dialogue_node,
        stepId: currentStep.id
      };
    }

    return null;
  }
}

module.exports = TutorialManager;
