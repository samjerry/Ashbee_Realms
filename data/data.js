const fs = require('fs');
const path = require('path');

// Cache for loaded data
const cache = {};

function loadJSON(filename) {
  if (cache[filename]) {
    return cache[filename];
  }
  
  const filePath = path.join(__dirname, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cache[filename] = data;
  return data;
}

module.exports = {
  // Core game data
  getClasses: () => loadJSON('classes.json').classes,
  getMonsters: () => loadJSON('monsters.json').monsters,
  getItems: () => loadJSON('items.json').consumables,
  getGear: () => {
    // Load weapons from new rarity-based structure
    const weapons = {};
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    
    for (const rarity of rarities) {
      const weaponFile = loadJSON(`gear/weapons/weapons_${rarity}.json`);
      if (weaponFile && weaponFile.weapons) {
        weapons[rarity] = weaponFile.weapons;
      }
    }
    
    const chest = loadJSON('gear_armor.json').armor || {};
    const headgear = loadJSON('gear_headgear.json').headgear || {};
    const accessories = loadJSON('gear_accessories.json').accessories || {};
    
    // Merge into equipment structure
    const equipment = {
      main_hand: weapons,
      chest: chest,
      headgear: headgear,
      ...accessories  // rings, amulets, belts, trinkets, relics
    };
    
    return equipment;
  },
  getBiomes: () => loadJSON('biomes.json').biomes,
  getConstants: () => loadJSON('constants.json').constants,
  
  // New game systems
  getQuests: () => loadJSON('quests.json').quests,
  getAchievements: () => loadJSON('achievements.json').achievements,
  getEvents: () => loadJSON('events.json').events,
  getFactions: () => loadJSON('factions.json').factions,
  getPassives: () => loadJSON('passives.json').passives,
  getDungeons: () => loadJSON('dungeons.json').dungeons,
  getEnchantments: () => loadJSON('enchantments.json').enchantments,
  getStatusEffects: () => loadJSON('status_effects.json').status_effects,
  getDialogues: () => loadJSON('dialogues.json').dialogues,
  getTitles: () => loadJSON('titles.json').titles,
  getWorldStates: () => loadJSON('world_states.json').world_states,
  getLore: () => loadJSON('lore.json').lore,
  getRaids: () => loadJSON('raids.json').raids,
  getConsumables: () => loadJSON('consumables_extended.json'),
  getSeasons: () => loadJSON('seasons.json').seasons,
  getRandomEncounters: () => loadJSON('random_encounters.json').encounters,
  getTwitchIntegration: () => loadJSON('twitch_integration.json').twitch_integration,
  getTimeMechanics: () => loadJSON('time_mechanics.json').time_system,
  getMysteries: () => loadJSON('mysteries.json').mysteries,
  getCurses: () => loadJSON('curses.json').curses,
  
  // Helper functions for core systems
  getClassById: (id) => {
    const classes = loadJSON('classes.json').classes;
    return classes[id];
  },
  
  getMonsterById: (id) => {
    const monsters = loadJSON('monsters.json').monsters;
    for (const rarity in monsters) {
      const found = monsters[rarity].find(m => m.id === id);
      if (found) return found;
    }
    return null;
  },
  
  getItemById: (id) => {
    const items = loadJSON('items.json').consumables;
    for (const rarity in items) {
      const found = items[rarity].find(i => i.id === id);
      if (found) return found;
    }
    return null;
  },
  
  getGearById: (id) => {
    try {
      // Search in weapons from new structure
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
      for (const rarity of rarities) {
        try {
          const weaponFile = loadJSON(`gear/weapons/weapons_${rarity}.json`);
          if (weaponFile && weaponFile.weapons) {
            const found = weaponFile.weapons.find(g => g.id === id);
            if (found) return found;
          }
        } catch (fileError) {
          // Continue to next file if this one fails
          continue;
        }
      }
      
      // Search in other gear files
      const gearFiles = ['gear_armor.json', 'gear_headgear.json', 'gear_accessories.json'];
      
      for (const file of gearFiles) {
        try {
          const gearData = loadJSON(file);
          // Each file has different top-level structure (weapons, armor, headgear, accessories)
          const topLevel = Object.values(gearData)[0];
          
          if (topLevel) {
            // Check if it's nested by category (like accessories: {rings, amulets, belts})
            const categories = Object.values(topLevel);
            for (const category of categories) {
              if (typeof category === 'object' && !Array.isArray(category)) {
                // It's a nested structure, search within rarities
                for (const rarity in category) {
                  if (Array.isArray(category[rarity])) {
                    const found = category[rarity].find(g => g.id === id);
                    if (found) return found;
                  }
                }
              } else if (Array.isArray(category)) {
                // Direct array of items
                const found = category.find(g => g.id === id);
                if (found) return found;
              }
            }
            
            // Also check top level rarities directly (for armor/headgear)
            for (const rarity in topLevel) {
              if (Array.isArray(topLevel[rarity])) {
                const found = topLevel[rarity].find(g => g.id === id);
                if (found) return found;
              }
            }
          }
        } catch (fileError) {
          console.error(`Error reading gear file ${file}:`, fileError);
          continue;
        }
      }
      return null;
    } catch (error) {
      console.error('Error in getGearById:', error);
      return null;
    }
  },
  
  getBiomeById: (id) => {
    const biomes = loadJSON('biomes.json').biomes;
    return biomes[id];
  },
  
  getRandomMonsterByRarity: (rarity) => {
    const monsters = loadJSON('monsters.json').monsters[rarity];
    return monsters[Math.floor(Math.random() * monsters.length)];
  },
  
  // Helper functions for new systems
  getQuestById: (id) => {
    const quests = loadJSON('quests.json').quests;
    for (const category in quests) {
      if (quests[category][id]) return quests[category][id];
    }
    return null;
  },
  
  getAchievementById: (id) => {
    const achievements = loadJSON('achievements.json').achievements;
    for (const category in achievements) {
      const found = achievements[category].find(a => a.id === id);
      if (found) return found;
    }
    return null;
  },
  
  getEventById: (id) => {
    const events = loadJSON('events.json').events;
    for (const category in events) {
      if (events[category][id]) return events[category][id];
    }
    return null;
  },
  
  getFactionById: (id) => {
    const factions = loadJSON('factions.json').factions;
    return factions[id];
  },
  
  getPassiveById: (id) => {
    const passives = loadJSON('passives.json').passives;
    for (const category in passives) {
      const found = passives[category].find(p => p.id === id);
      if (found) return found;
    }
    return null;
  },
  
  getDungeonById: (id) => {
    const dungeons = loadJSON('dungeons.json').dungeons;
    return dungeons[id];
  },
  
  getEnchantmentById: (id) => {
    const enchantments = loadJSON('enchantments.json').enchantments;
    for (const type in enchantments) {
      if (type === 'enchanting_system') continue;
      for (const rarity in enchantments[type]) {
        const found = enchantments[type][rarity].find(e => e.id === id);
        if (found) return found;
      }
    }
    return null;
  },
  
  getStatusEffectById: (id) => {
    const effects = loadJSON('status_effects.json').status_effects;
    for (const category in effects) {
      if (category === 'combos' || category === 'cleanse_priority') continue;
      const found = effects[category].find(e => e.id === id);
      if (found) return found;
    }
    return null;
  },
  
  getDialogueById: (npcId) => {
    const dialogues = loadJSON('dialogues.json').dialogues;
    return dialogues[npcId];
  },
  
  getTitleById: (id) => {
    const titles = loadJSON('titles.json').titles;
    for (const category in titles) {
      const found = titles[category].find(t => t.id === id);
      if (found) return found;
    }
    return null;
  },
  
  getRaidById: (id) => {
    const raids = loadJSON('raids.json').raids;
    return raids[id];
  },
  
  getMysteryById: (id) => {
    const mysteries = loadJSON('mysteries.json').mysteries;
    return mysteries[id];
  },
  
  getCurseById: (id) => {
    const curses = loadJSON('curses.json').curses;
    return curses[id] || loadJSON('curses.json').cursed_items[id];
  },
  
  // Random selection helpers
  getRandomEvent: (category = null) => {
    const events = loadJSON('events.json').events;
    if (category && events[category]) {
      const categoryEvents = Object.values(events[category]);
      return categoryEvents[Math.floor(Math.random() * categoryEvents.length)];
    }
    // Get random event from any category
    const allEvents = [];
    for (const cat in events) {
      allEvents.push(...Object.values(events[cat]));
    }
    return allEvents[Math.floor(Math.random() * allEvents.length)];
  },
  
  getRandomEncounter: () => {
    const encounters = loadJSON('random_encounters.json').encounters;
    const encounterArray = Object.values(encounters);
    return encounterArray[Math.floor(Math.random() * encounterArray.length)];
  }
};