const fs = require('fs');
const path = require('path');

const monstersDir = './data/monsters';
const files = [
  'beasts.json', 'humanoids.json', 'undead.json', 'dragons.json', 
  'demons.json', 'elementals.json', 'aberrations.json', 'constructs.json', 'celestials.json',
  'fey.json', 'giants.json', 'oozes.json', 'insectoids.json', 
  'aquatic.json', 'plants.json', 'lycanthropes.json'
];

const allMonsters = {};
const duplicates = [];

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monstersDir, file), 'utf-8'));
  data.monsters.forEach(m => {
    const key = m.id.toLowerCase();
    if (allMonsters[key]) {
      duplicates.push({
        id: m.id,
        name: m.name,
        type1: allMonsters[key].type,
        type2: data.creature_type
      });
    } else {
      allMonsters[key] = {
        name: m.name,
        type: data.creature_type
      };
    }
  });
});

if (duplicates.length > 0) {
  console.log('\n⚠️  Duplicate monsters found:\n');
  duplicates.forEach(d => {
    console.log(`- ${d.name} (ID: ${d.id})`);
    console.log(`  Found in: ${d.type1} AND ${d.type2}\n`);
  });
  console.log(`Total duplicates: ${duplicates.length}`);
} else {
  console.log('\n✓ No duplicates found!');
  console.log(`Total unique monsters: ${Object.keys(allMonsters).length}`);
}
