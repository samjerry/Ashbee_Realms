const fs = require('fs');
const path = require('path');

class TutorialManager {
  constructor() {
    this.tutorialQuest = null;
    this.tooltips = new Map();
    this.gameplayTips = [];
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
}

module.exports = TutorialManager;
