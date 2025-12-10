/**
 * QuestManager.js
 * Handles quest loading, state management, objective tracking, and rewards
 */

const { loadData } = require('../data/data_loader');

class QuestManager {
  constructor() {
    const questData = loadData('quests');
    this.mainQuests = questData?.quests?.main_story || [];
    this.sideQuests = questData?.quests?.side_quests || [];
    this.dailyQuests = questData?.quests?.daily_quests || [];
    
    // Create quest lookup by ID
    this.questsById = {};
    [...this.mainQuests, ...this.sideQuests, ...this.dailyQuests].forEach(quest => {
      this.questsById[quest.id] = quest;
    });
  }

  /**
   * Check if quest is a tutorial quest
   * @param {string} questId - Quest identifier
   * @returns {boolean} True if tutorial quest
   */
  isTutorialQuest(questId) {
    // "The Awakening" is the tutorial quest
    return questId === 'awakening';
  }

  /**
   * Get quest by ID
   * @param {string} questId - Quest identifier
   * @returns {Object|null} Quest data
   */
  getQuest(questId) {
    const quest = this.questsById[questId] || null;
    if (quest) {
      // Add tutorial flag to quest data
      quest.is_tutorial = this.isTutorialQuest(quest.id);
    }
    return quest;
  }

  /**
   * Get available quests for a character
   * @param {Object} character - Character object
   * @param {Array} activeQuestIds - Currently active quest IDs
   * @param {Array} completedQuestIds - Completed quest IDs
   * @returns {Array} Available quests
   */
  getAvailableQuests(character, activeQuestIds = [], completedQuestIds = []) {
    const allQuests = [...this.mainQuests, ...this.sideQuests, ...this.dailyQuests];
    
    return allQuests.filter(quest => {
      // Already active or completed (unless repeatable)
      if (activeQuestIds.includes(quest.id)) return false;
      if (completedQuestIds.includes(quest.id) && !quest.repeatable) return false;
      
      // Level requirement
      if (quest.required_level && character.level < quest.required_level) return false;
      
      // Prerequisites check
      if (quest.prerequisites && quest.prerequisites.length > 0) {
        const hasAllPrereqs = quest.prerequisites.every(preqId => 
          completedQuestIds.includes(preqId)
        );
        if (!hasAllPrereqs) return false;
      }
      
      return true;
    }).map(quest => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      required_level: quest.required_level,
      chapter: quest.chapter,
      is_main: this.mainQuests.some(q => q.id === quest.id),
      is_daily: this.dailyQuests.some(q => q.id === quest.id),
      is_tutorial: this.isTutorialQuest(quest.id),
      rewards: quest.rewards,
      objectives: (quest.objectives || []).map(obj => ({
        type: obj.type,
        description: obj.description
      }))
    }));
  }

  /**
   * Initialize quest state when accepting a quest
   * @param {string} questId - Quest to accept
   * @returns {Object} Initial quest state
   */
  acceptQuest(questId) {
    const quest = this.getQuest(questId);
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    // Create quest state
    const questState = {
      questId: quest.id,
      status: 'active',
      startedAt: Date.now(),
      objectives: quest.objectives.map((obj, index) => ({
        id: index,
        type: obj.type,
        target: obj.target,
        required: obj.count || 1,
        current: 0,
        completed: false,
        description: obj.description
      })),
      failConditions: quest.fail_conditions || []
    };

    return {
      success: true,
      questState,
      quest: {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        dialogue: quest.dialogue?.start || null
      }
    };
  }

  /**
   * Update quest progress based on an action
   * @param {Object} questState - Current quest state
   * @param {string} actionType - Type of action (talk_to_npc, kill_monster, etc.)
   * @param {string} target - Target of action (npc_id, monster_id, etc.)
   * @param {number} amount - Amount to increment (default 1)
   * @returns {Object} Updated quest state and events
   */
  updateProgress(questState, actionType, target, amount = 1) {
    if (questState.status !== 'active') {
      return { updated: false, questState };
    }

    const quest = this.getQuest(questState.questId);
    if (!quest) {
      return { updated: false, questState, error: 'Quest not found' };
    }

    let progressMade = false;
    const events = [];

    // Update matching objectives
    questState.objectives.forEach(objective => {
      if (objective.completed) return;
      
      if (objective.type === actionType && objective.target === target) {
        objective.current = Math.min(objective.current + amount, objective.required);
        progressMade = true;

        if (objective.current >= objective.required) {
          objective.completed = true;
          events.push({
            type: 'objective_completed',
            description: objective.description
          });
        }
      }
    });

    // Check if all objectives completed
    const allCompleted = questState.objectives.every(obj => obj.completed);
    if (allCompleted && questState.status === 'active') {
      questState.status = 'ready_to_complete';
      events.push({
        type: 'quest_ready',
        message: `Quest "${quest.name}" is ready to complete!`
      });
    }

    return {
      updated: progressMade,
      questState,
      events,
      allCompleted
    };
  }

  /**
   * Complete a quest and grant rewards
   * @param {Object} character - Character object
   * @param {Object} questState - Quest state
   * @returns {Object} Completion result with rewards
   */
  completeQuest(character, questState) {
    const quest = this.getQuest(questState.questId);
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    if (questState.status !== 'ready_to_complete') {
      return { success: false, error: 'Quest objectives not completed' };
    }

    // Grant rewards
    const rewards = {
      xp: 0,
      gold: 0,
      items: [],
      reputation: null,
      title: null,
      unlocks: []
    };

    if (quest.rewards) {
      rewards.xp = quest.rewards.xp || 0;
      rewards.gold = quest.rewards.gold || 0;
      rewards.items = quest.rewards.items || [];
      rewards.reputation = quest.rewards.reputation || null;
      rewards.title = quest.rewards.title || null;
      rewards.unlocks = quest.rewards.unlocks || [];
    }

    // Update character
    character.gold += rewards.gold;

    // Add items to inventory
    rewards.items.forEach(itemId => {
      try {
        character.inventory.addItem({ id: itemId, name: itemId, stackable: false });
      } catch (err) {
        // Inventory full or error
      }
    });

    return {
      success: true,
      rewards,
      quest: {
        id: quest.id,
        name: quest.name
      },
      dialogue: quest.dialogue?.complete || null,
      completedAt: Date.now()
    };
  }

  /**
   * Fail a quest
   * @param {Object} questState - Quest state
   * @param {string} reason - Failure reason
   * @returns {Object} Failure result
   */
  failQuest(questState, reason = 'Quest failed') {
    const quest = this.getQuest(questState.questId);
    
    questState.status = 'failed';
    questState.failedAt = Date.now();
    questState.failReason = reason;

    return {
      success: true,
      quest: quest ? {
        id: quest.id,
        name: quest.name
      } : null,
      reason
    };
  }

  /**
   * Abandon an active quest
   * @param {Object} questState - Quest state
   * @returns {Object} Abandon result
   */
  abandonQuest(questState) {
    const quest = this.getQuest(questState.questId);
    
    return {
      success: true,
      quest: quest ? {
        id: quest.id,
        name: quest.name
      } : null,
      message: 'Quest abandoned'
    };
  }

  /**
   * Get quest progress summary
   * @param {Object} questState - Quest state
   * @returns {Object} Progress summary
   */
  getQuestProgress(questState) {
    const quest = this.getQuest(questState.questId);
    if (!quest) return null;

    const totalObjectives = questState.objectives.length;
    const completedObjectives = questState.objectives.filter(obj => obj.completed).length;
    
    // Calculate overall progress including partial completion
    let totalProgress = 0;
    questState.objectives.forEach(obj => {
      totalProgress += obj.current / obj.required;
    });
    const progressPercent = Math.floor((totalProgress / totalObjectives) * 100);

    return {
      questId: quest.id,
      name: quest.name,
      description: quest.description,
      status: questState.status,
      progress: `${completedObjectives}/${totalObjectives}`,
      progressPercent,
      objectives: questState.objectives.map(obj => ({
        description: obj.description,
        progress: `${obj.current}/${obj.required}`,
        completed: obj.completed
      })),
      startedAt: questState.startedAt
    };
  }

  /**
   * Check if quest has time limit and if it's expired
   * @param {Object} questState - Quest state
   * @returns {boolean} True if expired
   */
  isQuestExpired(questState) {
    const quest = this.getQuest(questState.questId);
    if (!quest || !quest.time_limit) return false;

    const elapsed = Date.now() - questState.startedAt;
    const timeLimit = quest.time_limit * 60 * 1000; // Convert minutes to ms
    
    return elapsed > timeLimit;
  }

  /**
   * Get quest chain information
   * @param {string} questId - Quest ID
   * @returns {Object} Chain info
   */
  getQuestChain(questId) {
    const quest = this.getQuest(questId);
    if (!quest) return null;

    // Find prerequisites (quests that lead to this one)
    const prerequisites = quest.prerequisites || [];

    // Find quests that require this one
    const unlocks = [];
    Object.values(this.questsById).forEach(q => {
      if (q.prerequisites && q.prerequisites.includes(questId)) {
        unlocks.push({
          id: q.id,
          name: q.name,
          required_level: q.required_level
        });
      }
    });

    return {
      questId: quest.id,
      name: quest.name,
      chapter: quest.chapter,
      prerequisites: prerequisites.map(preqId => {
        const preq = this.getQuest(preqId);
        return preq ? { id: preq.id, name: preq.name } : null;
      }).filter(p => p !== null),
      unlocks
    };
  }

  /**
   * Get all main story quests in order
   * @returns {Array} Main quest chain
   */
  getMainStoryQuests() {
    return this.mainQuests.map(quest => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      chapter: quest.chapter,
      required_level: quest.required_level,
      prerequisites: quest.prerequisites || [],
      is_finale: quest.is_finale || false
    }));
  }

  /**
   * Get daily quests that can be accepted
   * @param {number} playerLevel - Player's level
   * @returns {Array} Available daily quests
   */
  getDailyQuests(playerLevel) {
    return this.dailyQuests
      .filter(quest => !quest.required_level || playerLevel >= quest.required_level)
      .map(quest => ({
        id: quest.id,
        name: quest.name,
        description: quest.description,
        objectives: (quest.objectives || []).length,
        rewards: quest.rewards
      }));
  }

  /**
   * Trigger quest objective updates based on game events
   * @param {Array} activeQuests - Array of active quest states
   * @param {string} eventType - Event type (monster_killed, npc_talked, item_collected, location_discovered)
   * @param {string} target - Event target
   * @param {number} amount - Amount
   * @returns {Object} All updates
   */
  triggerQuestEvent(activeQuests, eventType, target, amount = 1) {
    const updates = [];

    activeQuests.forEach(questState => {
      const result = this.updateProgress(questState, eventType, target, amount);
      if (result.updated) {
        updates.push({
          questId: questState.questId,
          questState: result.questState,
          events: result.events,
          allCompleted: result.allCompleted
        });
      }
    });

    return {
      updated: updates.length > 0,
      updates
    };
  }
}

module.exports = QuestManager;
