const fs = require('fs');
const path = require('path');

class MonsterDataLoader {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.abilities = null;
    this.templates = null;
    this.lootTables = null;
    this.monsters = null;
    this.typeTemplates = null;
    this.allMonsters = [];
  }

  load() {
    // Load all data files
    this.abilities = this.loadJSON('monster_abilities.json').abilities;
    this.templates = this.loadJSON('monster_templates.json');
    this.lootTables = this.loadJSON('monster_loot.json').loot_tables;
    
    // Load type templates for stat calculations
    const typeTemplatesPath = path.join(this.dataDir, 'monsters', 'type_templates.json');
    if (fs.existsSync(typeTemplatesPath)) {
      this.typeTemplates = JSON.parse(fs.readFileSync(typeTemplatesPath, 'utf-8'));
    }
    
    // Try to load monsters from new folder structure first
    this.monsters = this.loadMonsters();

    // Build full monster objects
    return this.buildMonsters();
  }

  loadMonsters() {
    const monstersPath = path.join(this.dataDir, 'monsters');
    
    // Check if new folder structure exists
    if (fs.existsSync(monstersPath) && fs.statSync(monstersPath).isDirectory()) {
      console.log('Loading monsters from new folder structure...');
      return this.loadMonstersFromFolders();
    } else {
      // Fallback to legacy monsters.json
      console.log('Loading monsters from legacy monsters.json...');
      return this.loadJSON('monsters.json').monsters;
    }
  }

  loadMonstersFromFolders() {
    const monsters = [];
    const monstersPath = path.join(this.dataDir, 'monsters');
    
    // Try new rarity-based structure first
    const rarityFiles = ['common.json', 'uncommon.json', 'rare.json', 'epic.json', 'legendary.json', 'mythic.json', 'boss.json'];
    let loadedFromRarityFiles = false;
    
    for (const file of rarityFiles) {
      const filePath = path.join(monstersPath, file);
      
      if (fs.existsSync(filePath)) {
        loadedFromRarityFiles = true;
        const rarityData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Each file has { rarity, version, count, monsters: [...] }
        if (rarityData.monsters && Array.isArray(rarityData.monsters)) {
          monsters.push(...rarityData.monsters);
        }
      }
    }
    
    // Fallback to old category-based structure if rarity files don't exist
    if (!loadedFromRarityFiles) {
      const creatureTypeFiles = [
        'beasts.json', 'humanoids.json', 'undead.json', 'dragons.json', 
        'demons.json', 'elementals.json', 'aberrations.json', 'constructs.json', 'celestials.json',
        'fey.json', 'giants.json', 'oozes.json', 'insectoids.json', 
        'aquatic.json', 'plants.json', 'lycanthropes.json', 'monstrosities.json', 'fiends.json'
      ];
      
      for (const file of creatureTypeFiles) {
        const filePath = path.join(monstersPath, file);
        
        if (!fs.existsSync(filePath)) continue;
        
        const creatureTypeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Each file has { creature_type, count, monsters: [...] }
        if (creatureTypeData.monsters && Array.isArray(creatureTypeData.monsters)) {
          monsters.push(...creatureTypeData.monsters);
        }
      }
    }
    
    return monsters;
  }

  loadJSON(filename) {
    const filePath = path.join(this.dataDir, filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  buildMonsters() {
    const builtMonsters = {};

    // Organize by rarity
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'boss', 'mythic'];
    
    rarities.forEach(rarity => {
      builtMonsters[rarity] = [];
    });

    this.monsters.forEach(monsterData => {
      const monster = this.buildMonster(monsterData);
      builtMonsters[monster.rarity].push(monster);
      
      // Store in allMonsters array for querying
      this.allMonsters.push(monster);
    });

    return { monsters: builtMonsters };
  }

  buildMonster(data) {
    // Check if this is new format (has base_stats) or old format (has stats array)
    let baseStats;
    if (data.base_stats) {
      // New format - use base_stats directly
      baseStats = { ...data.base_stats };
    } else if (data.stats && Array.isArray(data.stats)) {
      // Old format - convert stats array to object
      const [hp, attack, defense, agility] = data.stats;
      const template = this.templates.templates[data.template];
      const rarityMod = this.templates.rarity_modifiers[data.rarity];
      const multiplier = rarityMod.stat_multiplier;

      baseStats = {
        hp: Math.round(hp * multiplier * (template?.base_multipliers?.hp || 1.0)),
        attack: Math.round(attack * multiplier * (template?.base_multipliers?.attack || 1.0)),
        defense: Math.round(defense * multiplier * (template?.base_multipliers?.defense || 1.0)),
        agility: Math.round(agility * multiplier * (template?.base_multipliers?.agility || 1.0))
      };

      // Add magic stat if template has it or if data specifies it
      if (data.magic) {
        baseStats.magic = Math.round(data.magic * multiplier);
      } else if (template?.base_multipliers?.magic) {
        baseStats.magic = Math.round(10 * multiplier * template.base_multipliers.magic);
      }
    } else {
      // Fallback
      baseStats = {
        hp: 10,
        attack: 5,
        defense: 5,
        agility: 5
      };
    }
    
    // Calculate final stats with type modifiers if available
    const finalStats = this.typeTemplates ? this.calculateMonsterStats(data, baseStats) : baseStats;
    
    // Get template if available
    const template = data.template ? this.templates.templates[data.template] : null;

    // Build abilities array with full ability data
    const abilityList = [
      ...(template?.base_abilities || []),
      ...(data.abilities || [])
    ];
    
    // Separate passive and active abilities
    const passiveAbilities = [];
    const activeAbilities = [];
    
    abilityList.forEach(abilityName => {
      const ability = this.abilities[abilityName] || { 
        name: abilityName, 
        type: "unknown", 
        effects: {} 
      };
      
      if (ability.type === "passive") {
        passiveAbilities.push(ability);
      } else if (ability.type === "active") {
        activeAbilities.push(ability);
      } else {
        // Default to passive if type is unclear
        passiveAbilities.push(ability);
      }
    });

    // Get loot table
    const lootTable = this.lootTables[data.loot] || { gold: [0, 0], items: [] };

    // Calculate XP
    const rarityMod = this.templates.rarity_modifiers[data.rarity];
    const xp_reward = Math.round(rarityMod.xp_base * ((data.level_range[0] + data.level_range[1]) / 2));

    const monster = {
      id: data.id,
      name: data.name,
      rarity: data.rarity,
      description: data.description,
      biomes: data.biomes,
      level_range: data.level_range,
      base_stats: finalStats,
      loot_table: lootTable,
      xp_reward,
      passive_abilities: passiveAbilities,
      active_abilities: activeAbilities
    };
    
    // Add types and primary_type if available (new format)
    if (data.types) {
      monster.types = data.types;
      monster.primary_type = data.primary_type || data.types[0];
    } else if (template?.creature_type) {
      // Old format - get from template
      monster.creature_type = template.creature_type;
    }
    
    // Add tags if available
    if (data.tags) {
      monster.tags = data.tags;
    }

    return monster;
  }

  // Get monster by ID
  getMonster(id) {
    for (const rarity in this.buildMonsters().monsters) {
      const monster = this.buildMonsters().monsters[rarity].find(m => m.id === id);
      if (monster) return monster;
    }
    return null;
  }

  // Get monsters by biome
  getMonstersByBiome(biome) {
    const allMonsters = this.buildMonsters().monsters;
    const result = [];

    for (const rarity in allMonsters) {
      allMonsters[rarity].forEach(monster => {
        if (monster.biomes.includes(biome)) {
          result.push(monster);
        }
      });
    }

    return result;
  }

  // Get monsters by rarity
  getMonstersByRarity(rarity) {
    return this.buildMonsters().monsters[rarity] || [];
  }
  
  // Calculate final stats based on type modifiers
  calculateMonsterStats(monster, baseStats) {
    if (!monster.types || !this.typeTemplates) {
      return baseStats;
    }
    
    let finalStats = { ...baseStats };
    let typeCount = monster.types.length;
    
    let avgModifiers = {
      hp_multiplier: 0,
      attack_multiplier: 0,
      defense_multiplier: 0,
      speed_multiplier: 0,
      magic_bonus: 0
    };
    
    for (let type of monster.types) {
      let template = this.typeTemplates[type];
      if (template && template.stat_modifiers) {
        avgModifiers.hp_multiplier += template.stat_modifiers.hp_multiplier;
        avgModifiers.attack_multiplier += template.stat_modifiers.attack_multiplier;
        avgModifiers.defense_multiplier += template.stat_modifiers.defense_multiplier;
        avgModifiers.speed_multiplier += template.stat_modifiers.speed_multiplier;
        avgModifiers.magic_bonus += (template.stat_modifiers.magic_bonus || 0);
      }
    }
    
    for (let key in avgModifiers) {
      if (key.includes('multiplier')) {
        avgModifiers[key] = avgModifiers[key] / typeCount;
      } else {
        avgModifiers[key] = Math.floor(avgModifiers[key] / typeCount);
      }
    }
    
    finalStats.hp = Math.floor(finalStats.hp * avgModifiers.hp_multiplier);
    finalStats.attack = Math.floor(finalStats.attack * avgModifiers.attack_multiplier);
    finalStats.defense = Math.floor(finalStats.defense * avgModifiers.defense_multiplier);
    finalStats.speed = Math.floor((finalStats.speed || finalStats.agility || 5) * avgModifiers.speed_multiplier);
    finalStats.magic = (finalStats.magic || 0) + avgModifiers.magic_bonus;
    
    // Handle agility/speed compatibility
    if (finalStats.agility !== undefined && finalStats.speed === undefined) {
      finalStats.speed = finalStats.agility;
    }
    
    return finalStats;
  }

  // Get monsters by type
  getMonstersByType(type) {
    return this.allMonsters.filter(m => m.types && m.types.includes(type));
  }

  // Get monsters by types (with requireAll option)
  getMonstersByTypes(types, requireAll = false) {
    if (requireAll) {
      return this.allMonsters.filter(m => 
        m.types && types.every(type => m.types.includes(type))
      );
    } else {
      return this.allMonsters.filter(m => 
        m.types && types.some(type => m.types.includes(type))
      );
    }
  }

  // Generate full monsters.json for backward compatibility
  generateFullJSON(outputPath) {
    const fullData = this.buildMonsters();
    fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2));
    console.log(`Generated full monsters.json at ${outputPath}`);
  }
}

// Usage example
if (require.main === module) {
  const loader = new MonsterDataLoader('./data');
  loader.load();
  
  // Generate full JSON for backward compatibility
  loader.generateFullJSON('./data/monsters_generated.json');
  
  // Example queries
  console.log('Common monsters:', loader.getMonstersByRarity('common').length);
  console.log('Whispering Woods monsters:', loader.getMonstersByBiome('whispering_woods').length);
}

module.exports = MonsterDataLoader;

// General data loading utility
const dataCache = new Map();

/**
 * Load any JSON data file from the data directory
 * @param {string} dataName - Name of the data file without .json extension
 * @returns {Object|null} Parsed JSON data or null if not found
 */
function loadData(dataName) {
  // Check cache first
  if (dataCache.has(dataName)) {
    return dataCache.get(dataName);
  }

  try {
    const filePath = path.join(__dirname, `${dataName}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Cache the result
    dataCache.set(dataName, parsed);
    return parsed;
  } catch (error) {
    console.error(`Error loading data file ${dataName}.json:`, error.message);
    return null;
  }
}

/**
 * Clear the data cache
 */
function clearDataCache() {
  dataCache.clear();
}

/**
 * Reload a specific data file
 * @param {string} dataName - Name of the data file to reload
 * @returns {Object|null} Parsed JSON data or null if not found
 */
function reloadData(dataName) {
  dataCache.delete(dataName);
  return loadData(dataName);
}

module.exports.loadData = loadData;
module.exports.clearDataCache = clearDataCache;
module.exports.reloadData = reloadData;
