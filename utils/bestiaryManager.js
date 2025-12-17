/**
 * Bestiary Manager - Handles bestiary tracking and data
 */

const { loadData } = require('../data/data_loader');

class BestiaryManager {
  /**
   * Record a monster encounter
   * @param {Object} currentBestiary - Player's current bestiary data
   * @param {string} monsterId - Monster ID
   * @returns {Object} Updated bestiary data
   */
  static recordEncounter(currentBestiary, monsterId) {
    const bestiary = { ...currentBestiary };
    
    if (!bestiary[monsterId]) {
      // First encounter with this monster
      bestiary[monsterId] = {
        monster_id: monsterId,
        encountered: true,
        defeated: false,
        encounter_count: 1,
        defeat_count: 0,
        first_encountered: new Date().toISOString(),
        last_encountered: new Date().toISOString()
      };
    } else {
      // Subsequent encounter
      bestiary[monsterId].encounter_count += 1;
      bestiary[monsterId].last_encountered = new Date().toISOString();
    }
    
    return bestiary;
  }

  /**
   * Record a monster defeat
   * @param {Object} currentBestiary - Player's current bestiary data
   * @param {string} monsterId - Monster ID
   * @returns {Object} Updated bestiary data
   */
  static recordDefeat(currentBestiary, monsterId) {
    const bestiary = { ...currentBestiary };
    
    if (!bestiary[monsterId]) {
      // Shouldn't happen, but handle it just in case
      bestiary[monsterId] = {
        monster_id: monsterId,
        encountered: true,
        defeated: true,
        encounter_count: 1,
        defeat_count: 1,
        first_encountered: new Date().toISOString(),
        last_encountered: new Date().toISOString()
      };
    } else {
      // Mark as defeated and increment count
      bestiary[monsterId].defeated = true;
      bestiary[monsterId].defeat_count += 1;
    }
    
    return bestiary;
  }

  /**
   * Get formatted bestiary data with monster information
   * @param {Object} bestiaryData - Player's bestiary data
   * @returns {Array} Array of bestiary entries with monster info
   */
  static getBestiaryEntries(bestiaryData) {
    const monstersData = loadData('monsters');
    const monsters = monstersData.monsters || [];
    
    // Create a map of all monsters
    const monsterMap = {};
    monsters.forEach(monster => {
      monsterMap[monster.id] = monster;
    });
    
    // Build bestiary entries
    const entries = [];
    
    // Add all monsters that have been encountered
    Object.keys(bestiaryData).forEach(monsterId => {
      const entry = bestiaryData[monsterId];
      const monsterInfo = monsterMap[monsterId];
      
      if (monsterInfo) {
        entries.push({
          ...entry,
          name: monsterInfo.name,
          description: monsterInfo.description,
          level_range: monsterInfo.level_range,
          stats: monsterInfo.stats,
          rarity: monsterInfo.rarity,
          biomes: monsterInfo.biomes,
          icon: monsterInfo.icon
        });
      }
    });
    
    return entries;
  }

  /**
   * Get bestiary statistics
   * @param {Object} bestiaryData - Player's bestiary data
   * @returns {Object} Statistics about bestiary completion
   */
  static getBestiaryStats(bestiaryData) {
    const monstersData = loadData('monsters');
    const totalMonsters = monstersData.monsters?.length || 0;
    
    const encountered = Object.keys(bestiaryData).length;
    const defeated = Object.values(bestiaryData).filter(entry => entry.defeated).length;
    
    const encounterPercentage = totalMonsters > 0 ? Math.round((encountered / totalMonsters) * 100) : 0;
    const defeatPercentage = totalMonsters > 0 ? Math.round((defeated / totalMonsters) * 100) : 0;
    
    return {
      totalMonsters,
      encountered,
      defeated,
      unknown: totalMonsters - encountered,
      encounterPercentage,
      defeatPercentage,
      completionPercentage: defeatPercentage
    };
  }

  /**
   * Check if bestiary should be unlocked
   * @param {Object} bestiaryData - Player's bestiary data
   * @returns {boolean} Whether bestiary should be unlocked
   */
  static shouldUnlockBestiary(bestiaryData) {
    // Unlock bestiary after first monster encounter
    return Object.keys(bestiaryData).length > 0;
  }

  /**
   * Filter bestiary entries
   * @param {Array} entries - Bestiary entries
   * @param {string} filter - Filter type: 'all', 'encountered', 'defeated', 'unknown'
   * @param {string} searchTerm - Search term for filtering by name
   * @returns {Array} Filtered entries
   */
  static filterEntries(entries, filter = 'all', searchTerm = '') {
    let filtered = [...entries];
    
    // Apply filter
    if (filter === 'encountered') {
      filtered = filtered.filter(entry => entry.encountered && !entry.defeated);
    } else if (filter === 'defeated') {
      filtered = filtered.filter(entry => entry.defeated);
    }
    // 'all' and 'unknown' are handled differently (unknown requires all monsters list)
    
    // Apply search
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(entry => 
        entry.name?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }
}

module.exports = BestiaryManager;
