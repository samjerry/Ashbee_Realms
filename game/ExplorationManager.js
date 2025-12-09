/**
 * ExplorationManager.js
 * Handles biome exploration, travel mechanics, and random encounters
 * Travel between biomes takes time and multiple moves to complete
 */

const { loadData } = require('../data/data_loader');
const TimeEffectsCalculator = require('./TimeEffectsCalculator');

class ExplorationManager {
  constructor() {
    this.biomes = loadData('biomes')?.biomes || {};
    this.encounters = loadData('random_encounters')?.encounters || {};
    this.events = loadData('events')?.events || {};
    this.monsters = loadData('monsters')?.monsters || {};
    this.timeEffects = new TimeEffectsCalculator();
  }

  /**
   * Get biome information by ID
   * @param {string} biomeId - Biome identifier
   * @returns {Object|null} Biome data
   */
  getBiome(biomeId) {
    return this.biomes[biomeId] || null;
  }

  /**
   * Get all available biomes
   * @param {number} playerLevel - Player's level (for filtering)
   * @returns {Array} Array of biome info
   */
  getAvailableBiomes(playerLevel = 1) {
    return Object.values(this.biomes).map(biome => {
      const recLevel = biome.recommended_level || [1, 10]; // Default if missing
      return {
        id: biome.id,
        name: biome.name,
        description: biome.description,
        dangerLevel: biome.danger_level,
        recommendedLevel: recLevel,
        isSuitable: playerLevel >= recLevel[0] && 
                     playerLevel <= recLevel[1] + 5,
        tooEasy: playerLevel > recLevel[1] + 10,
        tooDangerous: playerLevel < recLevel[0] - 3
      };
    });
  }

  /**
   * Calculate travel distance between biomes
   * Based on danger level difference and world map logic
   * @param {string} fromBiomeId - Starting biome
   * @param {string} toBiomeId - Destination biome
   * @returns {Object} Travel information
   */
  calculateTravelDistance(fromBiomeId, toBiomeId) {
    const fromBiome = this.getBiome(fromBiomeId);
    const toBiome = this.getBiome(toBiomeId);

    if (!fromBiome || !toBiome) {
      return { canTravel: false, reason: 'Invalid biome' };
    }

    // Same biome = no travel needed
    if (fromBiomeId === toBiomeId) {
      return { canTravel: true, movesRequired: 0, timeRequired: 0 };
    }

    // Calculate base distance from danger level difference
    const dangerDiff = Math.abs(toBiome.danger_level - fromBiome.danger_level);
    
    // Base moves: 3-8 depending on danger level gap
    const baseMovesRequired = 3 + dangerDiff;
    
    // Movement penalties from environmental effects
    const movementPenalty = toBiome.environmental_effects?.movement_penalty || 0;
    const totalMoves = Math.ceil(baseMovesRequired * (1 + movementPenalty));

    // Each move takes 5-15 minutes (simulated time)
    const timePerMove = 10; // 10 minutes per move
    const totalTime = totalMoves * timePerMove;

    // Encounter chance per move (15-30% base, modified by biome)
    const encounterChancePerMove = 0.20 + (toBiome.danger_level * 0.02);

    return {
      canTravel: true,
      movesRequired: totalMoves,
      timeRequired: totalTime,
      encounterChancePerMove,
      dangerLevel: toBiome.danger_level,
      environmentalEffects: toBiome.environmental_effects || {},
      warnings: this.getTravelWarnings(toBiome)
    };
  }

  /**
   * Get travel warnings for a biome
   * @param {Object} biome - Biome data
   * @returns {Array} Warning messages
   */
  getTravelWarnings(biome) {
    const warnings = [];

    if (biome.danger_level >= 4) {
      warnings.push('⚠️ Extremely dangerous area - high level enemies');
    }

    if (biome.environmental_effects) {
      const effects = biome.environmental_effects;
      
      if (effects.movement_penalty > 0.3) {
        warnings.push('🚶 Difficult terrain - travel will be slow');
      }
      
      if (effects.visibility === 'very_low' || effects.visibility === 'low') {
        warnings.push('🌫️ Poor visibility - ambush risk increased');
      }
      
      if (effects.disease_chance > 0.1) {
        warnings.push('🦠 Disease risk - bring antidotes');
      }
      
      if (effects.extreme_cold || effects.extreme_heat) {
        warnings.push('🌡️ Extreme temperatures - take damage over time');
      }
    }

    return warnings;
  }

  /**
   * Start travel between biomes
   * @param {Object} character - Character object
   * @param {string} destinationBiomeId - Target biome
   * @returns {Object} Travel state
   */
  startTravel(character, destinationBiomeId) {
    const currentBiome = character.location;
    const travelInfo = this.calculateTravelDistance(currentBiome, destinationBiomeId);

    if (!travelInfo.canTravel) {
      return {
        success: false,
        message: travelInfo.reason
      };
    }

    // Create travel state
    const travelState = {
      inTravel: true,
      from: currentBiome,
      to: destinationBiomeId,
      movesTotal: travelInfo.movesRequired,
      movesCompleted: 0,
      encounterChance: travelInfo.encounterChancePerMove,
      startedAt: Date.now()
    };

    return {
      success: true,
      travelState,
      message: `Started journey to ${this.getBiome(destinationBiomeId).name}. ${travelInfo.movesRequired} moves required.`,
      warnings: travelInfo.warnings
    };
  }

  /**
   * Advance one move during travel
   * @param {Object} travelState - Current travel state
   * @returns {Object} Result of the move
   */
  advanceTravel(travelState) {
    if (!travelState || !travelState.inTravel) {
      return { success: false, message: 'Not currently traveling' };
    }

    travelState.movesCompleted++;
    
    const result = {
      success: true,
      movesCompleted: travelState.movesCompleted,
      movesRemaining: travelState.movesTotal - travelState.movesCompleted,
      arrived: false,
      encounter: null
    };

    // Check if arrived
    if (travelState.movesCompleted >= travelState.movesTotal) {
      result.arrived = true;
      result.destination = this.getBiome(travelState.to);
      result.message = `You have arrived at ${result.destination.name}!`;
      return result;
    }

    // Check for random encounter
    if (Math.random() < travelState.encounterChance) {
      const destinationBiome = this.getBiome(travelState.to);
      result.encounter = this.generateRandomEncounter(destinationBiome);
    }

    result.message = `Travel progress: ${result.movesCompleted}/${travelState.movesTotal} moves`;
    
    return result;
  }

  /**
   * Generate a random encounter during travel
   * @param {Object} biome - Current or destination biome
   * @returns {Object} Encounter data
   */
  generateRandomEncounter(biome) {
    const encounterType = Math.random();

    if (encounterType < 0.6) {
      // 60% chance: Monster encounter
      return this.generateMonsterEncounter(biome);
    } else if (encounterType < 0.85) {
      // 25% chance: Random event
      return this.generateRandomEvent(biome);
    } else {
      // 15% chance: Special encounter
      return this.generateSpecialEncounter();
    }
  }

  /**
   * Generate a monster encounter based on biome
   * @param {Object} biome - Biome data
   * @returns {Object} Monster encounter
   */
  generateMonsterEncounter(biome) {
    // Get current environmental context
    const context = this.timeEffects.getCurrentContext();
    
    // Filter monsters by biome
    const monstersInBiome = this.monsters.filter(monster => {
      if (!monster.biomes || !Array.isArray(monster.biomes)) return false;
      return monster.biomes.includes(biome.id);
    });

    if (monstersInBiome.length === 0) {
      // Fallback to any monster
      const randomMonster = this.monsters[Math.floor(Math.random() * this.monsters.length)];
      return {
        type: 'combat',
        subType: 'monster',
        monster: randomMonster,
        message: `A wild ${randomMonster.name} appears!`
      };
    }

    // Filter spawnable monsters based on time/season/weather
    const spawnableCandidates = this.timeEffects.filterSpawnableMonsters(monstersInBiome, context);
    
    if (spawnableCandidates.length === 0) {
      // No monsters can spawn in current conditions
      return {
        type: 'event',
        subType: 'peaceful',
        message: `The area is eerily quiet... No creatures stir in these conditions.`
      };
    }
    
    // Pick random spawnable monster
    const selected = spawnableCandidates[Math.floor(Math.random() * spawnableCandidates.length)];
    
    // Apply environmental modifiers to monster
    const modifiedMonster = this.timeEffects.applyModifiersToMonster(selected.original, selected.modifiers);
    
    if (!modifiedMonster) {
      return {
        type: 'event',
        subType: 'peaceful',
        message: `You sense a presence, but nothing appears...`
      };
    }
    
    // Check for ambush based on biome
    const isAmbush = Math.random() < (biome.environmental_effects?.ambush_chance || 0);

    // Build message with environmental context
    let message = isAmbush ? 
      `💥 Ambush! A ${modifiedMonster.name} attacks from the shadows!` :
      `A ${modifiedMonster.name} blocks your path!`;
    
    // Add time/weather context
    const timeDesc = this.getTimeDescription(context);
    if (timeDesc) {
      message += ` ${timeDesc}`;
    }
    
    // Add warnings if creature is empowered
    if (selected.modifiers.warnings.length > 0) {
      message += '\n' + selected.modifiers.warnings.join('\n');
    }

    return {
      type: 'combat',
      subType: 'monster',
      monster: modifiedMonster,
      isAmbush,
      environmental_context: context,
      message
    };
  }

  /**
   * Get time description for flavor text
   * @param {Object} context - Environmental context
   * @returns {string} Description
   */
  getTimeDescription(context) {
    const descriptions = {
      dawn: '(The dawn light creeps across the landscape)',
      day: '(The sun shines brightly overhead)',
      dusk: '(Shadows lengthen as day turns to night)',
      night: '(Darkness surrounds you)',
      blood_moon: '(The blood moon casts an ominous crimson glow)',
      full_moon: '(The full moon illuminates the night)',
      new_moon: '(The moonless night is pitch black)'
    };
    
    if (context.isBloodMoon || context.moonPhase === 'blood_moon') {
      return descriptions.blood_moon;
    } else if (context.moonPhase === 'full_moon' && context.timePhase === 'night') {
      return descriptions.full_moon;
    } else if (context.moonPhase === 'new_moon' && context.timePhase === 'night') {
      return descriptions.new_moon;
    }
    
    return descriptions[context.timePhase] || '';
  }

  /**
   * Generate a random event
   * @param {Object} biome - Biome data
   * @returns {Object} Event data
   */
  generateRandomEvent(biome) {
    const explorationEvents = this.events.exploration_events || [];
    
    if (explorationEvents.length === 0) {
      return {
        type: 'event',
        subType: 'nothing',
        message: 'The journey continues without incident.'
      };
    }

    // Filter events that can occur in this biome
    const availableEvents = explorationEvents.filter(event => {
      if (!event.biome_specific) return true;
      return event.biome_specific.includes(biome.id);
    });

    const randomEvent = availableEvents.length > 0 ?
      availableEvents[Math.floor(Math.random() * availableEvents.length)] :
      explorationEvents[Math.floor(Math.random() * explorationEvents.length)];

    return {
      type: 'event',
      subType: randomEvent.type,
      event: randomEvent,
      message: randomEvent.description
    };
  }

  /**
   * Generate a special encounter (NPCs, merchants, etc.)
   * @returns {Object} Special encounter
   */
  generateSpecialEncounter() {
    const encounterKeys = Object.keys(this.encounters);
    
    if (encounterKeys.length === 0) {
      return {
        type: 'event',
        subType: 'nothing',
        message: 'You continue your journey.'
      };
    }

    const randomKey = encounterKeys[Math.floor(Math.random() * encounterKeys.length)];
    const encounter = this.encounters[randomKey];

    return {
      type: 'encounter',
      subType: encounter.type,
      encounter: encounter,
      message: encounter.description
    };
  }

  /**
   * Explore current location (sub-location within biome)
   * @param {string} biomeId - Current biome
   * @returns {Object} Exploration result
   */
  exploreLocation(biomeId) {
    const biome = this.getBiome(biomeId);
    
    if (!biome) {
      return { success: false, message: 'Invalid location' };
    }

    // Select random sub-location
    const subLocations = biome.sub_locations || [];
    if (subLocations.length === 0) {
      return {
        success: false,
        message: 'No explorable areas in this biome'
      };
    }

    const subLocation = subLocations[Math.floor(Math.random() * subLocations.length)];

    // Check for guaranteed encounter
    if (subLocation.guaranteed_encounter) {
      return {
        success: true,
        subLocation,
        encounter: this.generateMonsterEncounter(biome),
        message: `You explore ${subLocation.name}: ${subLocation.description}`
      };
    }

    // Random encounter chance (30% base)
    const encounterChance = 0.30;
    const hasEncounter = Math.random() < encounterChance;

    if (hasEncounter) {
      return {
        success: true,
        subLocation,
        encounter: this.generateRandomEncounter(biome),
        message: `You explore ${subLocation.name}: ${subLocation.description}`
      };
    }

    // Safe exploration
    return {
      success: true,
      subLocation,
      encounter: null,
      message: `You explore ${subLocation.name}: ${subLocation.description}. The area is quiet.`
    };
  }

  /**
   * Get monsters that can spawn in a biome
   * @param {string} biomeId - Biome identifier
   * @param {number} count - Number of monsters to get
   * @returns {Array} Monster objects
   */
  getMonstersByBiome(biomeId, count = 1) {
    const biome = this.getBiome(biomeId);
    if (!biome) return [];

    const monstersInBiome = Object.values(this.monsters).filter(monster => {
      const monsterLevel = monster.level_range ? monster.level_range[0] : (monster.level || 1);
      const minLevel = biome.recommended_level[0];
      const maxLevel = biome.recommended_level[1];
      return monsterLevel >= minLevel - 2 && monsterLevel <= maxLevel + 2;
    });

    // Shuffle and take requested count
    const shuffled = monstersInBiome.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Cancel travel (e.g., player enters combat)
   * @param {Object} travelState - Current travel state
   * @returns {Object} Result
   */
  cancelTravel(travelState) {
    return {
      success: true,
      message: 'Travel interrupted',
      progressLost: travelState.movesCompleted,
      canResume: false // Travel must be restarted
    };
  }

  /**
   * Get travel summary
   * @param {Object} travelState - Travel state
   * @returns {Object} Summary information
   */
  getTravelSummary(travelState) {
    if (!travelState || !travelState.inTravel) {
      return { inTravel: false };
    }

    const destination = this.getBiome(travelState.to);
    const origin = this.getBiome(travelState.from);
    const progress = (travelState.movesCompleted / travelState.movesTotal) * 100;

    return {
      inTravel: true,
      from: origin?.name || travelState.from,
      to: destination?.name || travelState.to,
      progress: progress.toFixed(1) + '%',
      movesCompleted: travelState.movesCompleted,
      movesTotal: travelState.movesTotal,
      movesRemaining: travelState.movesTotal - travelState.movesCompleted
    };
  }
}

module.exports = ExplorationManager;
