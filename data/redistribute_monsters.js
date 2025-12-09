/**
 * Script to redistribute monsters to appropriate biomes
 * Based on creature type, theme, and level range
 */

const fs = require('fs');
const path = require('path');

// Load monsters
const monstersPath = path.join(__dirname, 'monsters.json');
const monstersData = JSON.parse(fs.readFileSync(monstersPath, 'utf8'));

// Biome assignments by creature characteristics
const biomeRules = {
  // Fire creatures
  fire: ['volcanic_peaks', 'infernal_rift', 'ashen_barrens'],
  infernal: ['infernal_rift', 'volcanic_peaks', 'shadowmere_abyss'],
  
  // Ice/frost creatures
  ice: ['frostwind_tundra', 'deep_caverns'],
  frost: ['frostwind_tundra', 'deep_caverns'],
  frozen: ['frostwind_tundra'],
  
  // Lightning/storm creatures
  lightning: ['tempest_spire', 'highland_reaches'],
  storm: ['tempest_spire', 'highland_reaches'],
  thunder: ['tempest_spire'],
  
  // Water/aquatic creatures
  water: ['twilight_wetlands', 'cursed_swamp', 'abyssal_trench'],
  aquatic: ['twilight_wetlands', 'abyssal_trench'],
  deep: ['abyssal_trench', 'deep_caverns'],
  
  // Nature/plant creatures
  nature: ['verdant_expanse', 'whispering_woods'],
  plant: ['verdant_expanse', 'whispering_woods'],
  vine: ['verdant_expanse'],
  treant: ['verdant_expanse', 'whispering_woods'],
  
  // Undead creatures
  undead: ['ancient_crypts', 'forsaken_ruins', 'cursed_swamp'],
  skeleton: ['ancient_crypts', 'forsaken_ruins'],
  zombie: ['ancient_crypts', 'forsaken_ruins', 'cursed_swamp'],
  ghost: ['ethereal_realm', 'ancient_crypts', 'forsaken_ruins'],
  wraith: ['ethereal_realm', 'shadowmere_abyss'],
  vampire: ['ancient_crypts', 'forsaken_ruins'],
  lich: ['shadowmere_abyss', 'ancient_crypts'],
  
  // Demons
  demon: ['infernal_rift', 'shadowmere_abyss'],
  imp: ['infernal_rift', 'volcanic_peaks'],
  devil: ['infernal_rift'],
  
  // Dragons
  dragon: ['dragons_roost', 'volcanic_peaks'],
  drake: ['dragons_roost', 'highland_reaches'],
  wyvern: ['dragons_roost', 'highland_reaches'],
  
  // Aberrations
  void: ['abyssal_trench', 'shadowmere_abyss'],
  aberration: ['abyssal_trench', 'shadowmere_abyss'],
  eldritch: ['abyssal_trench', 'shadowmere_abyss'],
  tentacle: ['abyssal_trench', 'cursed_swamp'],
  
  // Celestial
  celestial: ['celestial_sanctum'],
  angel: ['celestial_sanctum'],
  archon: ['celestial_sanctum'],
  
  // Constructs
  golem: ['clockwork_citadel', 'crystalline_caverns', 'deep_caverns'],
  construct: ['clockwork_citadel', 'forsaken_ruins'],
  automaton: ['clockwork_citadel'],
  
  // Crystal/magical
  crystal: ['crystalline_caverns', 'deep_caverns'],
  arcane: ['crystalline_caverns'],
  
  // Beasts by habitat
  wolf: ['whispering_woods', 'frostwind_tundra', 'highland_reaches'],
  bear: ['whispering_woods', 'highland_reaches', 'frostwind_tundra'],
  spider: ['whispering_woods', 'deep_caverns', 'cursed_swamp'],
  rat: ['goblin_tunnels', 'cursed_swamp', 'forsaken_ruins'],
  bat: ['deep_caverns', 'ancient_crypts', 'goblin_tunnels'],
  boar: ['whispering_woods', 'highland_reaches'],
  
  // Humanoids by habitat
  goblin: ['goblin_tunnels', 'whispering_woods'],
  orc: ['highland_reaches', 'ashen_barrens'],
  bandit: ['whispering_woods', 'highland_reaches', 'forsaken_ruins'],
  cultist: ['ancient_crypts', 'forsaken_ruins', 'shadowmere_abyss'],
  
  // Swamp creatures
  swamp: ['cursed_swamp', 'twilight_wetlands'],
  bog: ['cursed_swamp', 'twilight_wetlands'],
  marsh: ['twilight_wetlands']
};

function getBiomesForMonster(monster) {
  const name = monster.name.toLowerCase();
  const id = monster.id.toLowerCase();
  const template = monster.template;
  const level = monster.level_range[0]; // Use min level for placement
  
  let biomes = [];
  
  // Check name and ID against biome rules
  for (const [keyword, biomelist] of Object.entries(biomeRules)) {
    if (name.includes(keyword) || id.includes(keyword)) {
      biomes.push(...biomelist);
    }
  }
  
  // Template-based fallbacks
  if (biomes.length === 0) {
    switch (template) {
      case 'undead_base':
        biomes = ['ancient_crypts', 'forsaken_ruins'];
        break;
      case 'demon_base':
        biomes = ['infernal_rift', 'shadowmere_abyss'];
        break;
      case 'dragon_base':
        biomes = ['dragons_roost', 'volcanic_peaks'];
        break;
      case 'elemental_base':
        biomes = ['crystalline_caverns', 'deep_caverns'];
        break;
      case 'celestial_base':
        biomes = ['celestial_sanctum'];
        break;
      case 'aberration_base':
        biomes = ['abyssal_trench', 'shadowmere_abyss'];
        break;
      case 'construct_base':
        biomes = ['clockwork_citadel', 'forsaken_ruins'];
        break;
      case 'beast_base':
        if (level <= 5) {
          biomes = ['whispering_woods', 'twilight_wetlands'];
        } else if (level <= 15) {
          biomes = ['highland_reaches', 'deep_caverns'];
        } else {
          biomes = ['frostwind_tundra', 'volcanic_peaks'];
        }
        break;
      case 'humanoid_base':
        if (level <= 10) {
          biomes = ['whispering_woods', 'goblin_tunnels'];
        } else if (level <= 20) {
          biomes = ['highland_reaches', 'forsaken_ruins'];
        } else {
          biomes = ['forsaken_ruins', 'ashen_barrens'];
        }
        break;
      default:
        biomes = ['whispering_woods']; // Default fallback
    }
  }
  
  // Remove duplicates and keep existing biomes that make sense
  biomes = [...new Set(biomes)];
  
  // Limit to 2-4 biomes per creature
  if (biomes.length > 4) {
    biomes = biomes.slice(0, 4);
  }
  
  return biomes;
}

// Process all monsters
console.log('Redistributing monsters to appropriate biomes...');
let redistributedCount = 0;
let changes = [];

monstersData.monsters = monstersData.monsters.map(monster => {
  const oldBiomes = [...monster.biomes];
  const newBiomes = getBiomesForMonster(monster);
  
  // Keep some existing biomes if they still make sense
  const finalBiomes = [...new Set([...newBiomes])];
  
  monster.biomes = finalBiomes;
  
  if (JSON.stringify(oldBiomes.sort()) !== JSON.stringify(finalBiomes.sort())) {
    redistributedCount++;
    changes.push({
      name: monster.name,
      old: oldBiomes,
      new: finalBiomes
    });
  }
  
  return monster;
});

// Save updated monsters
fs.writeFileSync(monstersPath, JSON.stringify(monstersData, null, 2));

console.log(`✅ Successfully redistributed ${redistributedCount} monsters to new biomes`);
console.log('\nSample changes:');
changes.slice(0, 10).forEach(change => {
  console.log(`  ${change.name}:`);
  console.log(`    Old: ${change.old.join(', ')}`);
  console.log(`    New: ${change.new.join(', ')}`);
});

console.log(`\n... and ${Math.max(0, changes.length - 10)} more changes`);
console.log('\nNew biome populations:');

// Count creatures per biome
const biomeCounts = {};
monstersData.monsters.forEach(monster => {
  monster.biomes.forEach(biome => {
    biomeCounts[biome] = (biomeCounts[biome] || 0) + 1;
  });
});

Object.entries(biomeCounts).sort((a, b) => b[1] - a[1]).forEach(([biome, count]) => {
  console.log(`  ${biome}: ${count} creatures`);
});
