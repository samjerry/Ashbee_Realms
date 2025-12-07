/**
 * AchievementManager.js
 * 
 * Manages player achievements, progress tracking, and reward distribution.
 * Tracks various criteria types (kills, level, gold, etc.) and automatically
 * unlocks achievements when requirements are met.
 */

const fs = require('fs');
const path = require('path');

class AchievementManager {
  constructor() {
    this.achievements = null;
    this.achievementTiers = null;
    this.achievementsByCategory = {};
    this.achievementById = {};
    this.load();
  }

  /**
   * Load all achievements from achievements.json
   */
  load() {
    try {
      const filePath = path.join(__dirname, '../data/achievements.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      this.achievements = data.achievements;
      this.achievementTiers = data.achievement_tiers;
      
      // Index achievements by category and ID for quick lookup
      for (const [category, achievementList] of Object.entries(this.achievements)) {
        this.achievementsByCategory[category] = achievementList;
        
        for (const achievement of achievementList) {
          this.achievementById[achievement.id] = {
            ...achievement,
            category
          };
        }
      }
      
      console.log(`✅ Loaded ${Object.keys(this.achievementById).length} achievements across ${Object.keys(this.achievementsByCategory).length} categories`);
    } catch (error) {
      console.error('❌ Failed to load achievements:', error.message);
      this.achievements = {};
      this.achievementTiers = {};
    }
  }

  /**
   * Get all achievements with their unlock status for a character
   * @param {Object} character - Character instance
   * @returns {Array} Array of achievements with progress
   */
  getAllAchievements(character, includeHidden = false) {
    const unlockedIds = character.unlockedAchievements || [];
    const progress = character.achievementProgress || {};
    
    const achievements = [];
    
    for (const [id, achievement] of Object.entries(this.achievementById)) {
      // Skip hidden achievements unless they're unlocked or includeHidden is true
      if (achievement.hidden && !unlockedIds.includes(id) && !includeHidden) {
        continue;
      }
      
      const isUnlocked = unlockedIds.includes(id);
      const currentProgress = this.calculateProgress(achievement, character, progress);
      
      achievements.push({
        ...achievement,
        unlocked: isUnlocked,
        progress: currentProgress,
        unlockedAt: character.achievementUnlockDates?.[id] || null
      });
    }
    
    return achievements;
  }

  /**
   * Get achievements by category
   * @param {string} category - Achievement category
   * @param {Object} character - Character instance
   * @returns {Array} Achievements in that category
   */
  getAchievementsByCategory(category, character) {
    const categoryAchievements = this.achievementsByCategory[category] || [];
    const unlockedIds = character.unlockedAchievements || [];
    const progress = character.achievementProgress || {};
    
    return categoryAchievements.map(achievement => {
      const isUnlocked = unlockedIds.includes(achievement.id);
      const currentProgress = this.calculateProgress(achievement, character, progress);
      
      return {
        ...achievement,
        unlocked: isUnlocked,
        progress: currentProgress,
        unlockedAt: character.achievementUnlockDates?.[achievement.id] || null
      };
    });
  }

  /**
   * Get a specific achievement by ID
   * @param {string} achievementId - Achievement ID
   * @param {Object} character - Character instance (optional, for progress)
   * @returns {Object|null} Achievement with progress
   */
  getAchievement(achievementId, character = null) {
    const achievement = this.achievementById[achievementId];
    if (!achievement) return null;
    
    if (character) {
      const unlockedIds = character.unlockedAchievements || [];
      const progress = character.achievementProgress || {};
      const isUnlocked = unlockedIds.includes(achievementId);
      const currentProgress = this.calculateProgress(achievement, character, progress);
      
      return {
        ...achievement,
        unlocked: isUnlocked,
        progress: currentProgress,
        unlockedAt: character.achievementUnlockDates?.[achievementId] || null
      };
    }
    
    return achievement;
  }

  /**
   * Calculate current progress for an achievement
   * @param {Object} achievement - Achievement data
   * @param {Object} character - Character instance
   * @param {Object} progressData - Stored progress data
   * @returns {Object} Progress information
   */
  calculateProgress(achievement, character, progressData) {
    const criteria = achievement.criteria;
    const type = criteria.type;
    
    // Get stored progress or calculate from character stats
    let current = 0;
    let required = 0;
    let percentage = 0;
    
    switch (type) {
      case 'monster_kills':
        current = character.stats?.totalKills || 0;
        required = criteria.count;
        break;
        
      case 'boss_kills':
        current = character.stats?.bossKills || 0;
        required = criteria.count;
        break;
        
      case 'critical_hits':
        current = character.stats?.criticalHits || 0;
        required = criteria.count;
        break;
        
      case 'perfect_combat':
        current = progressData[achievement.id] || 0;
        required = criteria.count;
        break;
        
      case 'single_hit_damage':
        current = character.stats?.highestDamage || 0;
        required = criteria.amount;
        break;
        
      case 'survive_lethal':
      case 'kill_streak':
        current = progressData[achievement.id] || 0;
        required = criteria.count;
        break;
        
      case 'locations_visited':
        current = character.stats?.locationsVisited?.length || 0;
        required = criteria.count;
        break;
        
      case 'all_biomes_visited':
        current = character.stats?.biomesVisited?.length || 0;
        required = 13; // Total biomes
        break;
        
      case 'quests_completed':
        current = character.completedQuests?.length || 0;
        required = criteria.count;
        break;
        
      case 'all_main_quests':
        const mainQuests = character.completedQuests?.filter(q => q.type === 'main') || [];
        current = mainQuests.length;
        required = 5; // Total main quests
        break;
        
      case 'legendary_items':
        const legendaryCount = character.inventory?.filter(item => item.rarity === 'legendary').length || 0;
        current = legendaryCount;
        required = criteria.count;
        break;
        
      case 'gold_accumulated':
        current = character.stats?.totalGoldEarned || 0;
        required = criteria.amount;
        break;
        
      case 'gold_spent':
        current = character.stats?.totalGoldSpent || 0;
        required = criteria.amount;
        break;
        
      case 'level_reached':
        current = character.level;
        required = criteria.level;
        break;
        
      case 'no_death_level':
        // Requires special tracking - check if player reached level without dying
        const noDeath = character.stats?.deaths === 0 && character.level >= criteria.level;
        current = noDeath ? criteria.level : 0;
        required = criteria.level;
        break;
        
      case 'deaths':
        current = character.stats?.deaths || 0;
        required = criteria.count;
        break;
        
      case 'curses_active':
        current = character.activeCurses?.length || 0;
        required = criteria.count;
        break;
        
      case 'mysteries_solved':
        current = character.stats?.mysteriesSolved || 0;
        required = criteria.count === 'all' ? 10 : criteria.count; // Assuming 10 mysteries
        break;
        
      case 'all_factions_exalted':
        const exaltedFactions = Object.values(character.reputation || {}).filter(rep => rep >= 21000).length;
        current = exaltedFactions;
        required = 5; // Total factions
        break;
        
      default:
        // Generic progress tracking
        current = progressData[achievement.id] || 0;
        required = criteria.count || criteria.amount || 1;
    }
    
    percentage = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0;
    
    return {
      current,
      required,
      percentage,
      complete: current >= required
    };
  }

  /**
   * Check and unlock achievements for a character based on an event
   * @param {Object} character - Character instance
   * @param {string} eventType - Type of event that occurred
   * @param {Object} eventData - Data about the event
   * @returns {Array} Newly unlocked achievements
   */
  checkAchievements(character, eventType, eventData = {}) {
    const unlockedIds = character.unlockedAchievements || [];
    const progress = character.achievementProgress || {};
    const newlyUnlocked = [];
    
    // Find achievements that match this event type
    const relevantAchievements = Object.values(this.achievementById).filter(achievement => {
      // Skip already unlocked
      if (unlockedIds.includes(achievement.id)) return false;
      
      // Check if criteria type matches event
      return this.isRelevantForEvent(achievement.criteria.type, eventType);
    });
    
    // Check each relevant achievement
    for (const achievement of relevantAchievements) {
      const currentProgress = this.calculateProgress(achievement, character, progress);
      
      if (currentProgress.complete) {
        newlyUnlocked.push(achievement);
      }
    }
    
    return newlyUnlocked;
  }

  /**
   * Check if an achievement criteria is relevant for an event type
   * @param {string} criteriaType - Achievement criteria type
   * @param {string} eventType - Event type
   * @returns {boolean} Whether they match
   */
  isRelevantForEvent(criteriaType, eventType) {
    const eventMap = {
      'combat_victory': ['monster_kills', 'boss_kills', 'kill_streak', 'perfect_combat'],
      'critical_hit': ['critical_hits'],
      'damage_dealt': ['single_hit_damage'],
      'survival': ['survive_lethal'],
      'location_change': ['locations_visited', 'all_biomes_visited'],
      'quest_complete': ['quests_completed', 'all_main_quests'],
      'item_acquired': ['legendary_items'],
      'gold_gained': ['gold_accumulated'],
      'gold_spent': ['gold_spent'],
      'level_up': ['level_reached', 'no_death_level'],
      'death': ['deaths'],
      'curse_applied': ['curses_active'],
      'mystery_solved': ['mysteries_solved'],
      'reputation_change': ['all_factions_exalted']
    };
    
    const relevantTypes = eventMap[eventType] || [];
    return relevantTypes.includes(criteriaType);
  }

  /**
   * Unlock an achievement and grant rewards
   * @param {Object} character - Character instance
   * @param {string} achievementId - Achievement to unlock
   * @returns {Object} Unlock result with rewards
   */
  unlockAchievement(character, achievementId) {
    const achievement = this.achievementById[achievementId];
    if (!achievement) {
      return { success: false, error: 'Achievement not found' };
    }
    
    // Check if already unlocked
    const unlockedIds = character.unlockedAchievements || [];
    if (unlockedIds.includes(achievementId)) {
      return { success: false, error: 'Achievement already unlocked' };
    }
    
    // Add to unlocked list
    character.unlockedAchievements = [...unlockedIds, achievementId];
    
    // Track unlock date
    if (!character.achievementUnlockDates) {
      character.achievementUnlockDates = {};
    }
    character.achievementUnlockDates[achievementId] = new Date().toISOString();
    
    // Add achievement points
    if (!character.achievementPoints) {
      character.achievementPoints = 0;
    }
    character.achievementPoints += achievement.points;
    
    // Grant rewards
    const rewards = this.grantRewards(character, achievement.rewards);
    
    return {
      success: true,
      achievement,
      rewards,
      notification: this.createUnlockNotification(achievement)
    };
  }

  /**
   * Grant achievement rewards to character
   * @param {Object} character - Character instance
   * @param {Object} rewards - Rewards to grant
   * @returns {Object} Granted rewards
   */
  grantRewards(character, rewards) {
    const granted = {
      xp: 0,
      gold: 0,
      items: [],
      title: null,
      passive: null
    };
    
    if (rewards.xp) {
      character.xp += rewards.xp;
      granted.xp = rewards.xp;
    }
    
    if (rewards.gold) {
      character.gold += rewards.gold;
      granted.gold = rewards.gold;
    }
    
    if (rewards.items) {
      for (const itemId of rewards.items) {
        character.inventory.addItem({ id: itemId });
        granted.items.push(itemId);
      }
    }
    
    if (rewards.title) {
      if (!character.unlockedTitles) {
        character.unlockedTitles = [];
      }
      if (!character.unlockedTitles.includes(rewards.title)) {
        character.unlockedTitles.push(rewards.title);
      }
      granted.title = rewards.title;
    }
    
    if (rewards.passive_unlock) {
      if (!character.unlockedPassives) {
        character.unlockedPassives = [];
      }
      if (!character.unlockedPassives.includes(rewards.passive_unlock)) {
        character.unlockedPassives.push(rewards.passive_unlock);
      }
      granted.passive = rewards.passive_unlock;
    }
    
    return granted;
  }

  /**
   * Create a notification message for achievement unlock
   * @param {Object} achievement - Unlocked achievement
   * @returns {Object} Notification data
   */
  createUnlockNotification(achievement) {
    return {
      type: 'achievement_unlocked',
      icon: achievement.icon,
      title: achievement.name,
      description: achievement.description,
      rarity: achievement.rarity,
      points: achievement.points,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get achievement statistics for a character
   * @param {Object} character - Character instance
   * @returns {Object} Achievement statistics
   */
  getStatistics(character) {
    const unlockedIds = character.unlockedAchievements || [];
    const totalAchievements = Object.keys(this.achievementById).length;
    const points = character.achievementPoints || 0;
    
    // Count by rarity
    const byRarity = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };
    
    for (const id of unlockedIds) {
      const achievement = this.achievementById[id];
      if (achievement) {
        byRarity[achievement.rarity] = (byRarity[achievement.rarity] || 0) + 1;
      }
    }
    
    // Count by category
    const byCategory = {};
    for (const [category, achievements] of Object.entries(this.achievementsByCategory)) {
      const categoryUnlocked = achievements.filter(a => unlockedIds.includes(a.id)).length;
      byCategory[category] = {
        unlocked: categoryUnlocked,
        total: achievements.length,
        percentage: Math.round((categoryUnlocked / achievements.length) * 100)
      };
    }
    
    return {
      totalUnlocked: unlockedIds.length,
      totalAchievements,
      completionPercentage: Math.round((unlockedIds.length / totalAchievements) * 100),
      points,
      byRarity,
      byCategory,
      recentUnlocks: this.getRecentUnlocks(character, 5)
    };
  }

  /**
   * Get recently unlocked achievements
   * @param {Object} character - Character instance
   * @param {number} limit - Max number to return
   * @returns {Array} Recent achievements
   */
  getRecentUnlocks(character, limit = 10) {
    const unlockedIds = character.unlockedAchievements || [];
    const unlockDates = character.achievementUnlockDates || {};
    
    const recentUnlocks = unlockedIds
      .map(id => ({
        ...this.achievementById[id],
        unlockedAt: unlockDates[id]
      }))
      .filter(a => a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .slice(0, limit);
    
    return recentUnlocks;
  }

  /**
   * Update progress for manual tracking achievements
   * @param {Object} character - Character instance
   * @param {string} achievementId - Achievement to update
   * @param {number} amount - Amount to add to progress
   */
  updateProgress(character, achievementId, amount = 1) {
    if (!character.achievementProgress) {
      character.achievementProgress = {};
    }
    
    character.achievementProgress[achievementId] = (character.achievementProgress[achievementId] || 0) + amount;
  }

  /**
   * Reset progress for a specific achievement (useful for repeatable achievements)
   * @param {Object} character - Character instance
   * @param {string} achievementId - Achievement to reset
   */
  resetProgress(character, achievementId) {
    if (character.achievementProgress) {
      character.achievementProgress[achievementId] = 0;
    }
  }
}

module.exports = AchievementManager;
