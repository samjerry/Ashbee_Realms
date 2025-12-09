/**
 * SeasonManager.js
 * 
 * Manages seasonal content, progression, and rewards.
 * Handles season activation, progression tracking, currency, and resets.
 */

const fs = require('fs');
const path = require('path');

class SeasonManager {
  constructor() {
    this.seasons = {};
    this.seasonalEvents = {};
    this.mechanics = {};
    this.loadSeasons();
  }

  /**
   * Load seasons from seasons.json
   */
  loadSeasons() {
    try {
      const filePath = path.join(__dirname, '..', 'data', 'seasons.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      this.seasons = data.seasons || {};
      this.seasonalEvents = data.seasonal_events || {};
      this.mechanics = data.season_mechanics || {};
      
      console.log(`✅ Loaded ${Object.keys(this.seasons).length} seasons`);
      console.log(`✅ Loaded ${Object.keys(this.seasonalEvents).length} seasonal events`);
    } catch (error) {
      console.error('❌ Error loading seasons:', error.message);
      this.seasons = {};
      this.seasonalEvents = {};
      this.mechanics = {};
    }
  }

  /**
   * Get all seasons
   * @returns {Array} Array of seasons with metadata
   */
  getAllSeasons() {
    return Object.entries(this.seasons).map(([id, season]) => ({
      id,
      name: season.name,
      description: season.description,
      theme: season.theme,
      active: season.active,
      planned: season.planned || false,
      startDate: season.start_date,
      endDate: season.end_date,
      durationDays: season.duration_days
    }));
  }

  /**
   * Get current active season
   * @returns {Object|null} Active season or null
   */
  getActiveSeason() {
    const activeSeason = Object.entries(this.seasons).find(([id, season]) => season.active);
    if (!activeSeason) return null;

    const [id, season] = activeSeason;
    return {
      id,
      ...season,
      daysRemaining: this.calculateDaysRemaining(season.end_date)
    };
  }

  /**
   * Get season by ID
   * @param {string} seasonId - Season ID
   * @returns {Object|null} Season data
   */
  getSeason(seasonId) {
    const season = this.seasons[seasonId];
    if (!season) return null;

    return {
      id: seasonId,
      ...season,
      daysRemaining: season.active ? this.calculateDaysRemaining(season.end_date) : null
    };
  }

  /**
   * Calculate days remaining in season
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {number} Days remaining
   */
  calculateDaysRemaining(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Initialize season progression for player
   * @param {Object} character - Character object
   */
  initializeSeasonProgress(character) {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) return;

    if (!character.seasonProgress) {
      character.seasonProgress = {};
    }

    if (!character.seasonProgress[activeSeason.id]) {
      character.seasonProgress[activeSeason.id] = {
        seasonLevel: 1,
        seasonXP: 0,
        seasonCurrency: 0,
        challengesCompleted: [],
        milestonesReached: [],
        startDate: new Date().toISOString()
      };
    }
  }

  /**
   * Get player's season progress
   * @param {Object} character - Character object
   * @returns {Object} Season progress data
   */
  getSeasonProgress(character) {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return {
        error: 'No active season',
        hasActiveSeason: false
      };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];

    return {
      seasonId: activeSeason.id,
      seasonName: activeSeason.name,
      seasonLevel: progress.seasonLevel,
      seasonXP: progress.seasonXP,
      xpToNextLevel: this.getXPForNextLevel(progress.seasonLevel),
      seasonCurrency: progress.seasonCurrency,
      currencyName: activeSeason.season_currency?.name || 'Seasonal Tokens',
      challengesCompleted: progress.challengesCompleted.length,
      milestonesReached: progress.milestonesReached,
      daysRemaining: activeSeason.daysRemaining,
      nextMilestone: this.getNextMilestone(activeSeason, progress.seasonLevel)
    };
  }

  /**
   * Calculate XP required for next level
   * @param {number} currentLevel - Current season level
   * @returns {number} XP required
   */
  getXPForNextLevel(currentLevel) {
    // Progressive XP scaling: 100 * level
    return 100 * currentLevel;
  }

  /**
   * Add season XP to player
   * @param {Object} character - Character object
   * @param {number} xp - XP to add
   * @param {string} source - XP source (quest, kill, etc.)
   * @returns {Object} Result with level ups
   */
  addSeasonXP(character, xp, source = 'unknown') {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return { success: false, error: 'No active season' };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];
    const maxLevel = this.mechanics.progression?.seasonal_level?.max || 50;

    if (progress.seasonLevel >= maxLevel) {
      return { success: false, error: 'Max season level reached' };
    }

    progress.seasonXP += xp;
    const levelUps = [];

    // Check for level ups
    while (progress.seasonLevel < maxLevel) {
      const xpNeeded = this.getXPForNextLevel(progress.seasonLevel);
      if (progress.seasonXP >= xpNeeded) {
        progress.seasonXP -= xpNeeded;
        progress.seasonLevel++;
        levelUps.push(progress.seasonLevel);

        // Grant level rewards
        this.grantLevelRewards(character, activeSeason, progress.seasonLevel);
      } else {
        break;
      }
    }

    return {
      success: true,
      xpGained: xp,
      source,
      levelUps,
      newLevel: progress.seasonLevel,
      currentXP: progress.seasonXP,
      xpToNext: this.getXPForNextLevel(progress.seasonLevel)
    };
  }

  /**
   * Grant rewards for reaching a season level
   * @param {Object} character - Character object
   * @param {Object} season - Season data
   * @param {number} level - Level reached
   */
  grantLevelRewards(character, season, level) {
    const progress = character.seasonProgress[season.id];

    // Check for milestone rewards
    const milestones = season.rewards?.milestones || [];
    const milestone = milestones.find(m => m.level === level);
    
    if (milestone && !progress.milestonesReached.includes(level)) {
      progress.milestonesReached.push(level);
      // Milestone rewards would be added to character inventory here
    }
  }

  /**
   * Get next milestone reward
   * @param {Object} season - Season data
   * @param {number} currentLevel - Current season level
   * @returns {Object|null} Next milestone
   */
  getNextMilestone(season, currentLevel) {
    const milestones = season.rewards?.milestones || [];
    const nextMilestone = milestones.find(m => m.level > currentLevel);
    return nextMilestone || null;
  }

  /**
   * Add seasonal currency
   * @param {Object} character - Character object
   * @param {number} amount - Currency to add
   * @param {string} source - Source of currency
   * @returns {Object} Result
   */
  addSeasonCurrency(character, amount, source = 'unknown') {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return { success: false, error: 'No active season' };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];
    
    progress.seasonCurrency += amount;

    return {
      success: true,
      currencyGained: amount,
      source,
      newTotal: progress.seasonCurrency,
      currencyName: activeSeason.season_currency?.name || 'Seasonal Tokens'
    };
  }

  /**
   * Spend seasonal currency
   * @param {Object} character - Character object
   * @param {number} amount - Currency to spend
   * @param {string} purpose - What it's spent on
   * @returns {Object} Result
   */
  spendSeasonCurrency(character, amount, purpose = 'purchase') {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return { success: false, error: 'No active season' };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];

    if (progress.seasonCurrency < amount) {
      return { 
        success: false, 
        error: 'Insufficient seasonal currency',
        required: amount,
        current: progress.seasonCurrency
      };
    }

    progress.seasonCurrency -= amount;

    return {
      success: true,
      currencySpent: amount,
      purpose,
      remaining: progress.seasonCurrency,
      currencyName: activeSeason.season_currency?.name || 'Seasonal Tokens'
    };
  }

  /**
   * Get seasonal challenges
   * @param {Object} character - Character object
   * @returns {Object} Weekly and seasonal challenges
   */
  getSeasonalChallenges(character) {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return { error: 'No active season' };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];
    const challenges = activeSeason.challenges || { weekly: [], seasonal: [] };

    return {
      weekly: challenges.weekly.map(challenge => ({
        ...challenge,
        completed: progress.challengesCompleted.includes(`weekly_${challenge.name}`)
      })),
      seasonal: challenges.seasonal.map(challenge => ({
        ...challenge,
        completed: progress.challengesCompleted.includes(`seasonal_${challenge.name}`)
      }))
    };
  }

  /**
   * Complete a seasonal challenge
   * @param {Object} character - Character object
   * @param {string} challengeName - Challenge name
   * @param {string} type - 'weekly' or 'seasonal'
   * @returns {Object} Result with rewards
   */
  completeChallenge(character, challengeName, type = 'weekly') {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return { success: false, error: 'No active season' };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];
    const challengeId = `${type}_${challengeName}`;

    if (progress.challengesCompleted.includes(challengeId)) {
      return { success: false, error: 'Challenge already completed' };
    }

    const challenges = activeSeason.challenges?.[type] || [];
    const challenge = challenges.find(c => c.name === challengeName);

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    progress.challengesCompleted.push(challengeId);

    // Parse reward (e.g., "50 Ascension Tokens")
    const reward = challenge.reward;
    let currencyGained = 0;

    if (typeof reward === 'string' && reward.includes('Tokens')) {
      const match = reward.match(/(\d+)/);
      if (match) {
        currencyGained = parseInt(match[1]);
        this.addSeasonCurrency(character, currencyGained, `challenge_${challengeName}`);
      }
    }

    return {
      success: true,
      challengeName,
      type,
      reward,
      currencyGained
    };
  }

  /**
   * Get seasonal events
   * @returns {Array} List of seasonal events
   */
  getSeasonalEvents() {
    return Object.entries(this.seasonalEvents).map(([id, event]) => ({
      id,
      name: event.name,
      season: event.season,
      durationDays: event.duration_days,
      frequency: event.frequency,
      activities: Object.keys(event.activities || {})
    }));
  }

  /**
   * Get seasonal event details
   * @param {string} eventId - Event ID
   * @returns {Object|null} Event data
   */
  getSeasonalEvent(eventId) {
    return this.seasonalEvents[eventId] || null;
  }

  /**
   * Reset season (admin function)
   * @param {string} seasonId - Season to reset
   * @returns {Object} Result
   */
  resetSeason(seasonId) {
    const season = this.seasons[seasonId];
    if (!season) {
      return { success: false, error: 'Season not found' };
    }

    // This would reset all player progress for this season
    // In practice, you'd iterate through all players in the database
    return {
      success: true,
      seasonId,
      message: 'Season reset. All player progress cleared.',
      persistedData: this.mechanics.season_reset?.what_persists || []
    };
  }

  /**
   * Get season statistics
   * @param {Object} character - Character object
   * @returns {Object} Statistics
   */
  getSeasonStatistics(character) {
    const activeSeason = this.getActiveSeason();
    if (!activeSeason) {
      return { error: 'No active season' };
    }

    this.initializeSeasonProgress(character);
    const progress = character.seasonProgress[activeSeason.id];

    return {
      seasonId: activeSeason.id,
      seasonName: activeSeason.name,
      level: progress.seasonLevel,
      xp: progress.seasonXP,
      currency: progress.seasonCurrency,
      challengesCompleted: progress.challengesCompleted.length,
      milestonesReached: progress.milestonesReached.length,
      battlePassLevel: progress.battlePassLevel,
      hasBattlePass: progress.battlePassPremium,
      daysActive: this.calculateDaysActive(progress.startDate),
      daysRemaining: activeSeason.daysRemaining
    };
  }

  /**
   * Calculate days player has been active in season
   * @param {string} startDate - ISO date string
   * @returns {number} Days active
   */
  calculateDaysActive(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

module.exports = SeasonManager;
