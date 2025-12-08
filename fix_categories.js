const fs = require('fs');
const path = require('path');

console.log('🔄 MIGRATING MISCATEGORIZED CREATURES');
console.log('='.repeat(80));

const monstersPath = path.join(__dirname, 'data', 'monsters');

// Define migrations (skipping items 5, 6, 7, 10, 11 from original list)
const migrations = [
  { id: 'aboleth', from: 'aquatic', to: 'aberrations' },
  { id: 'elder_aboleth', from: 'aquatic', to: 'aberrations' },
  { id: 'moss_slime', from: 'beasts', to: 'oozes' },
  { id: 'cave_slime', from: 'beasts', to: 'oozes' },
  { id: 'elder_treant', from: 'beasts', to: 'plants' },
  { id: 'void_wraith', from: 'demons', to: 'undead' },
  { id: 'lich_lord', from: 'humanoids', to: 'undead' },
  { id: 'hybrid_horror', from: 'lycanthropes', to: 'aberrations' },
  { id: 'sentinel_alpha', from: 'undead', to: 'constructs' }
];

console.log(`\nMigrating ${migrations.length} creatures:\n`);

migrations.forEach((m, i) => {
  console.log(`${i + 1}. ${m.id}: ${m.from} -> ${m.to}`);
});

console.log('\n' + '='.repeat(80));
console.log('\nProcessing migrations...\n');

// Process each migration
migrations.forEach(migration => {
  const fromFile = path.join(monstersPath, `${migration.from}.json`);
  const toFile = path.join(monstersPath, `${migration.to}.json`);
  
  // Load source file
  const fromData = JSON.parse(fs.readFileSync(fromFile, 'utf8'));
  const fromMonsters = fromData.monsters || [];
  
  // Find the monster to move
  const monsterIndex = fromMonsters.findIndex(m => m.id === migration.id);
  
  if (monsterIndex === -1) {
    console.log(`WARNING: ${migration.id} not found in ${migration.from}`);
    return;
  }
  
  const monster = fromMonsters[monsterIndex];
  console.log(`Found ${monster.name} in ${migration.from}`);
  
  // Remove from source
  fromMonsters.splice(monsterIndex, 1);
  fromData.count = fromMonsters.length;
  fromData.monsters = fromMonsters;
  
  // Load target file
  const toData = JSON.parse(fs.readFileSync(toFile, 'utf8'));
  const toMonsters = toData.monsters || [];
  
  // Add to target
  toMonsters.push(monster);
  toData.count = toMonsters.length;
  toData.monsters = toMonsters;
  
  // Save both files
  fs.writeFileSync(fromFile, JSON.stringify(fromData, null, 2), 'utf8');
  fs.writeFileSync(toFile, JSON.stringify(toData, null, 2), 'utf8');
  
  console.log(`  SUCCESS: Moved to ${migration.to}`);
});

console.log('\n' + '='.repeat(80));
console.log('\nMigration complete!\n');

// Show final counts
console.log('Final creature counts:\n');
const files = fs.readdirSync(monstersPath).filter(f => f.endsWith('.json')).sort();
files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monstersPath, file), 'utf8'));
  const type = file.replace('.json', '');
  console.log(`  ${type.padEnd(15)} : ${data.count} creatures`);
});

console.log('\n' + '='.repeat(80));
