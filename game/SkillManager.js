/**
 * SkillManager.js
 * Manages character skills, abilities, and cooldowns
 */

class SkillManager {
  constructor(skills = {}) {
    // skills = { skillId: { cooldown: 0, lastUsed: 0 } }
    this.skills = skills;
    this.globalCooldown = 0; // Global cooldown in turns
  }

  /**
   * Check if a skill is available (off cooldown)
   * @param {string} skillId - Skill identifier
   * @param {number} currentTurn - Current combat turn number
   * @returns {boolean} True if skill is available
   */
  isAvailable(skillId, currentTurn = 0) {
    if (this.globalCooldown > 0) {
      return false;
    }

    const skill = this.skills[skillId];
    if (!skill) {
      return true; // First time using skill
    }

    return skill.cooldown <= 0;
  }

  /**
   * Use a skill and put it on cooldown
   * @param {string} skillId - Skill identifier
   * @param {number} cooldownDuration - Cooldown in turns
   * @param {number} currentTurn - Current combat turn
   * @returns {Object} Result
   */
  useSkill(skillId, cooldownDuration, currentTurn = 0) {
    if (!this.isAvailable(skillId, currentTurn)) {
      const skill = this.skills[skillId];
      return {
        success: false,
        message: `${skillId} is on cooldown for ${skill ? skill.cooldown : '?'} more turns.`
      };
    }

    // Initialize or update skill
    this.skills[skillId] = {
      cooldown: cooldownDuration,
      lastUsed: currentTurn
    };

    // Set global cooldown (prevents skill spam)
    this.globalCooldown = 1;

    return {
      success: true,
      message: `Used ${skillId}. Cooldown: ${cooldownDuration} turns.`
    };
  }

  /**
   * Reduce all cooldowns by 1 turn
   * Called at the end of each turn
   */
  tickCooldowns() {
    // Reduce global cooldown
    if (this.globalCooldown > 0) {
      this.globalCooldown--;
    }

    // Reduce individual skill cooldowns
    Object.keys(this.skills).forEach(skillId => {
      if (this.skills[skillId].cooldown > 0) {
        this.skills[skillId].cooldown--;
      }
    });
  }

  /**
   * Get cooldown remaining for a specific skill
   * @param {string} skillId - Skill identifier
   * @returns {number} Turns remaining on cooldown
   */
  getCooldown(skillId) {
    const skill = this.skills[skillId];
    return skill ? skill.cooldown : 0;
  }

  /**
   * Get all skills with their cooldown status
   * @returns {Object} Skills object
   */
  getAllSkills() {
    return { ...this.skills };
  }

  /**
   * Reset all cooldowns (e.g., combat end, rest at inn)
   */
  resetAllCooldowns() {
    Object.keys(this.skills).forEach(skillId => {
      this.skills[skillId].cooldown = 0;
    });
    this.globalCooldown = 0;
  }

  /**
   * Add a new skill to the manager
   * @param {string} skillId - Skill identifier
   * @param {Object} skillData - Skill data (cooldown, etc.)
   */
  learnSkill(skillId, skillData = {}) {
    if (!this.skills[skillId]) {
      this.skills[skillId] = {
        cooldown: 0,
        lastUsed: 0,
        ...skillData
      };
      return { success: true, message: `Learned ${skillId}!` };
    }
    return { success: false, message: `Already know ${skillId}.` };
  }

  /**
   * Serialize for database storage
   * @returns {Object} Serialized skills data
   */
  toJSON() {
    return {
      skills: this.skills,
      globalCooldown: this.globalCooldown
    };
  }

  /**
   * Create SkillManager from stored data
   * @param {Object} data - Serialized data
   * @returns {SkillManager} SkillManager instance
   */
  static fromJSON(data) {
    const manager = new SkillManager(data.skills || {});
    manager.globalCooldown = data.globalCooldown || 0;
    return manager;
  }
}

module.exports = SkillManager;
