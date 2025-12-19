const fs = require('fs');
const path = require('path');

/**
 * Migration script to convert category-based monster files to rarity-based files
 */

// Define multi-type mappings for special monsters
const MULTI_TYPE_MAPPINGS = {
  // Aberration + Aquatic
  'aboleth': ['aberration', 'aquatic'],
  'elder_aboleth': ['aberration', 'aquatic'],
  'kraken_priest': ['aberration', 'aquatic'],
  
  // Dragon + Aquatic
  'dragon_turtle': ['dragon', 'aquatic'],
  'dragon_turtle_ancient': ['dragon', 'aquatic'],
  
  // Fiend + Construct + Insectoid
  'retriever': ['fiend', 'construct', 'insectoid'],
  
  // Fiend + Plant
  'zuggtmoy_aspect': ['fiend', 'plant'],
  
  // Giant + Monstrosity (for trolls and similar)
  'troll': ['giant', 'monstrosity'],
  'cave_troll': ['giant', 'monstrosity'],
  'frost_troll': ['giant', 'monstrosity'],
  'war_troll': ['giant', 'monstrosity'],
  'troll_shaman': ['giant', 'monstrosity'],
  
  // Undead + Dragon
  'dracolich': ['undead', 'dragon'],
  'undead_dragon': ['undead', 'dragon'],
  'skeletal_dragon': ['undead', 'dragon'],
  'zombie_dragon': ['undead', 'dragon'],
  
  // Lycanthrope + Monstrosity
  'hybrid_horror': ['lycanthrope', 'monstrosity']
};

// Category name to type name mapping
const CATEGORY_TO_TYPE = {
  'aberrations': 'aberration',
  'aquatic': 'aquatic',
  'beasts': 'beast',
  'celestials': 'celestial',
  'constructs': 'construct',
  'demons': 'fiend',  // demons -> fiend
  'fiends': 'fiend',
  'dragons': 'dragon',
  'elementals': 'elemental',
  'fey': 'fey',
  'giants': 'giant',
  'humanoids': 'humanoid',
  'insectoids': 'insectoid',
  'lycanthropes': 'lycanthrope',
  'monstrosities': 'monstrosity',
  'oozes': 'ooze',
  'plants': 'plant',
  'undead': 'undead'
};

const monstersPath = path.join(__dirname, 'monsters');

// Category files to migrate
const categoryFiles = [
  'aberrations.json',
  'aquatic.json',
  'beasts.json',
  'celestials.json',
  'constructs.json',
  'demons.json',
  'fiends.json',
  'dragons.json',
  'elementals.json',
  'fey.json',
  'giants.json',
  'humanoids.json',
  'insectoids.json',
  'lycanthropes.json',
  'monstrosities.json',
  'oozes.json',
  'plants.json',
  'undead.json'
];

/**
 * Infer tags from monster abilities and description
 */
function inferTags(monster) {
  const tags = [];
  const abilities = monster.abilities || [];
  const description = monster.description || '';
  
  // Tag based on abilities
  if (abilities.some(a => a.includes('psychic') || a.includes('mind'))) tags.push('psychic');
  if (abilities.some(a => a.includes('poison') || a.includes('venom'))) tags.push('poisonous');
  if (abilities.some(a => a.includes('fire') || a.includes('flame') || a.includes('burn'))) tags.push('fire');
  if (abilities.some(a => a.includes('ice') || a.includes('frost') || a.includes('freeze'))) tags.push('ice');
  if (abilities.some(a => a.includes('lightning') || a.includes('shock') || a.includes('electric'))) tags.push('lightning');
  if (abilities.some(a => a.includes('stealth') || a.includes('invisible'))) tags.push('stealthy');
  if (abilities.some(a => a.includes('regeneration') || a.includes('regen'))) tags.push('regenerating');
  if (abilities.some(a => a.includes('magic') || a.includes('spell'))) tags.push('magical');
  if (abilities.some(a => a.includes('summon'))) tags.push('summoner');
  if (abilities.some(a => a.includes('drain') || a.includes('life_steal'))) tags.push('draining');
  
  // Tag based on description
  if (description.includes('ancient')) tags.push('ancient');
  if (description.includes('undead') || description.includes('zombie') || description.includes('skeleton')) tags.push('undead');
  if (description.includes('leader') || description.includes('commander')) tags.push('leader');
  if (description.includes('enslav')) tags.push('enslaver');
  if (description.includes('swarm')) tags.push('swarm');
  if (description.includes('boss') || description.includes('lord') || description.includes('king')) tags.push('boss');
  
  return tags;
}

/**
 * Determine monster types based on category and multi-type mappings
 */
function determineTypes(monsterId, categoryName) {
  // Check if there's a special multi-type mapping
  if (MULTI_TYPE_MAPPINGS[monsterId]) {
    return MULTI_TYPE_MAPPINGS[monsterId];
  }
  
  // Default to single type based on category
  const primaryType = CATEGORY_TO_TYPE[categoryName];
  return primaryType ? [primaryType] : ['humanoid']; // fallback to humanoid
}

/**
 * Convert stats array to base_stats object
 */
function convertStats(statsArray) {
  if (!Array.isArray(statsArray) || statsArray.length < 4) {
    console.warn('Invalid stats array:', statsArray);
    return { hp: 10, attack: 5, defense: 5, speed: 5 };
  }
  
  return {
    hp: statsArray[0],
    attack: statsArray[1],
    defense: statsArray[2],
    speed: statsArray[3]
  };
}

/**
 * Migrate a single monster from old to new format
 */
function migrateMonster(monster, categoryName) {
  const types = determineTypes(monster.id, categoryName);
  const primaryType = types[0];
  const tags = inferTags(monster);
  const baseStats = convertStats(monster.stats);
  
  // Add magic stat to base_stats if it exists
  if (monster.magic !== undefined) {
    baseStats.magic = monster.magic;
  }
  
  return {
    id: monster.id,
    name: monster.name,
    types: types,
    primary_type: primaryType,
    tags: tags,
    rarity: monster.rarity,
    description: monster.description,
    biomes: monster.biomes,
    level_range: monster.level_range,
    base_stats: baseStats,
    abilities: monster.abilities || [],
    loot: monster.loot,
    ...(monster.template && { template: monster.template })
  };
}

/**
 * Main migration function
 */
function migrateMonsters() {
  console.log('Starting monster migration...\n');
  
  // Storage for monsters by rarity
  const monstersByRarity = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: [],
    mythic: [],
    boss: []
  };
  
  let totalMonstersProcessed = 0;
  const monsterIds = new Set();
  
  // Read all category files
  for (const filename of categoryFiles) {
    const filePath = path.join(monstersPath, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${filename} - file not found`);
      continue;
    }
    
    try {
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const categoryName = fileData.creature_type || filename.replace('.json', '');
      const monsters = fileData.monsters || [];
      
      console.log(`Processing ${filename}: ${monsters.length} monsters`);
      
      for (const monster of monsters) {
        // Check for duplicates
        if (monsterIds.has(monster.id)) {
          console.warn(`  WARNING: Duplicate monster ID found: ${monster.id}`);
          continue;
        }
        
        monsterIds.add(monster.id);
        
        // Migrate the monster
        const migratedMonster = migrateMonster(monster, categoryName);
        
        // Add to appropriate rarity group
        const rarity = migratedMonster.rarity || 'common';
        if (monstersByRarity[rarity]) {
          monstersByRarity[rarity].push(migratedMonster);
          totalMonstersProcessed++;
        } else {
          console.warn(`  WARNING: Unknown rarity '${rarity}' for monster ${monster.id}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${filename}:`, error.message);
    }
  }
  
  console.log(`\nTotal monsters processed: ${totalMonstersProcessed}`);
  console.log(`Unique monster IDs: ${monsterIds.size}\n`);
  
  // Write rarity-based files
  for (const rarity in monstersByRarity) {
    const monsters = monstersByRarity[rarity];
    const outputPath = path.join(monstersPath, `${rarity}.json`);
    
    const outputData = {
      rarity: rarity,
      version: "1.0",
      count: monsters.length,
      monsters: monsters
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`Created ${rarity}.json with ${monsters.length} monsters`);
  }
  
  console.log('\nMigration complete!');
  console.log('\nSummary:');
  for (const rarity in monstersByRarity) {
    console.log(`  ${rarity}: ${monstersByRarity[rarity].length} monsters`);
  }
  
  return {
    totalProcessed: totalMonstersProcessed,
    uniqueIds: monsterIds.size,
    byRarity: Object.fromEntries(
      Object.entries(monstersByRarity).map(([k, v]) => [k, v.length])
    )
  };
}

// Run migration if called directly
if (require.main === module) {
  const result = migrateMonsters();
  console.log('\nMigration result:', JSON.stringify(result, null, 2));
}

module.exports = { migrateMonsters };
