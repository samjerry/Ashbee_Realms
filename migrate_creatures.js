const fs = require('fs');
const path = require('path');

const monsterDir = path.join(__dirname, 'data', 'monsters');

// Define migrations: [id, from_file, to_file, change_template]
const migrations = [
  // TO UNDEAD
  ['dracolich_spawn', 'dragons.json', 'undead.json', 'undead_base'],
  ['hrungnir_reborn', 'giants.json', 'undead.json', 'undead_base'],
  ['plague_lich', 'humanoids.json', 'undead.json', 'undead_base'],
  ['necromancer_supreme', 'humanoids.json', 'undead.json', 'undead_base'],
  ['frost_lich_lord', 'humanoids.json', 'undead.json', 'undead_base'],
  ['death_emperor', 'humanoids.json', 'undead.json', 'undead_base'],
  ['vampire_lord_ancient', 'humanoids.json', 'undead.json', 'undead_base'],
  ['bone_colossus', 'humanoids.json', 'undead.json', 'undead_base'],
  ['skeleton_warrior', 'humanoids.json', 'undead.json', 'undead_base'],
  
  // TO CELESTIALS
  ['lucifer_fallen', 'demons.json', 'celestials.json', 'celestial_base'],
  ['archangel_fallen', 'humanoids.json', 'celestials.json', 'celestial_base'],
  
  // TO DEMONS
  ['demon_lord_baal', 'humanoids.json', 'demons.json', 'demon_base'],
  ['fire_imp', 'elementals.json', 'demons.json', 'demon_base'],
  ['retriever', 'insectoids.json', 'demons.json', 'demon_base'],
  ['zuggtmoy_aspect', 'plants.json', 'demons.json', 'demon_base'],
];

console.log('🔄 Starting creature migrations...\n');

const movedCreatures = {};

migrations.forEach(([id, fromFile, toFile, newTemplate]) => {
  const fromPath = path.join(monsterDir, fromFile);
  const toPath = path.join(monsterDir, toFile);
  
  // Load source
  const sourceData = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
  const targetData = JSON.parse(fs.readFileSync(toPath, 'utf8'));
  
  // Find creature
  const creatureIndex = sourceData.monsters.findIndex(m => m.id === id);
  if (creatureIndex === -1) {
    console.log(`❌ Could not find ${id} in ${fromFile}`);
    return;
  }
  
  // Extract creature
  const creature = sourceData.monsters.splice(creatureIndex, 1)[0];
  
  // Update template
  creature.template = newTemplate;
  
  // Add to target
  targetData.monsters.push(creature);
  
  // Update counts
  sourceData.count = sourceData.monsters.length;
  targetData.count = targetData.monsters.length;
  
  // Save both files
  fs.writeFileSync(fromPath, JSON.stringify(sourceData, null, 2));
  fs.writeFileSync(toPath, JSON.stringify(targetData, null, 2));
  
  if (!movedCreatures[toFile]) movedCreatures[toFile] = [];
  movedCreatures[toFile].push(creature.name);
  
  console.log(`✓ Moved "${creature.name}" from ${fromFile} to ${toFile}`);
});

console.log('\n📊 Migration Summary:');
console.log('='.repeat(60));
Object.keys(movedCreatures).forEach(file => {
  console.log(`\n${file} (+${movedCreatures[file].length}):`);
  movedCreatures[file].forEach(name => console.log(`  - ${name}`));
});

console.log('\n✅ Migration complete!');
