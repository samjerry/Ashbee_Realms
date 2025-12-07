const fs = require('fs');
const path = require('path');

class MonsterDataLoader {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.abilities = null;
    this.templates = null;
    this.lootTables = null;
    this.monsters = null;
  }

  load() {
    // Load all data files
    this.abilities = this.loadJSON('monster_abilities.json').abilities;
    this.templates = this.loadJSON('monster_templates.json');
    this.lootTables = this.loadJSON('monster_loot.json').loot_tables;
    this.monsters = this.loadJSON('monsters.json').monsters;

    // Build full monster objects
    return this.buildMonsters();
  }

  loadJSON(filename) {
    const filePath = path.join(this.dataDir, filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  buildMonsters() {
    const builtMonsters = {};

    // Organize by rarity
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    
    rarities.forEach(rarity => {
      builtMonsters[rarity] = [];
    });

    this.monsters.forEach(monsterData => {
      const monster = this.buildMonster(monsterData);
      builtMonsters[monster.rarity].push(monster);
    });

    return { monsters: builtMonsters };
  }

  buildMonster(data) {
    // Get template
    const template = this.templates.templates[data.template];
    const rarityMod = this.templates.rarity_modifiers[data.rarity];

    // Build stats object
    const [hp, attack, defense, agility] = data.stats;
    const multiplier = rarityMod.stat_multiplier;

    // Apply template multipliers
    const baseStats = {
      hp: Math.round(hp * multiplier * (template.base_multipliers?.hp || 1.0)),
      attack: Math.round(attack * multiplier * (template.base_multipliers?.attack || 1.0)),
      defense: Math.round(defense * multiplier * (template.base_multipliers?.defense || 1.0)),
      agility: Math.round(agility * multiplier * (template.base_multipliers?.agility || 1.0))
    };

    // Add magic stat if template has it or if data specifies it
    if (data.magic) {
      baseStats.magic = Math.round(data.magic * multiplier);
    } else if (template.base_multipliers?.magic) {
      baseStats.magic = Math.round(10 * multiplier * template.base_multipliers.magic);
    }

    // Build abilities array with full ability data
    const abilityList = [
      ...(template.base_abilities || []),
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
    const xp_reward = Math.round(rarityMod.xp_base * ((data.level_range[0] + data.level_range[1]) / 2));

    return {
      id: data.id,
      name: data.name,
      rarity: data.rarity,
      description: data.description,
      biomes: data.biomes,
      level_range: data.level_range,
      base_stats: baseStats,
      loot_table: lootTable,
      xp_reward,
      passive_abilities: passiveAbilities,
      active_abilities: activeAbilities,
      creature_type: template.creature_type
    };
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
