const fs = require('fs');
const path = require('path');

const monstersDir = './data/monsters';
const files = [
  'beasts.json', 'humanoids.json', 'undead.json', 'dragons.json', 
  'demons.json', 'elementals.json', 'aberrations.json', 'constructs.json', 'celestials.json',
  'fey.json', 'giants.json', 'oozes.json', 'insectoids.json', 
  'aquatic.json', 'plants.json', 'lycanthropes.json'
];

const allMonsters = [];

// Load all monsters with their creature type
files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monstersDir, file), 'utf-8'));
  data.monsters.forEach(m => {
    allMonsters.push({
      id: m.id,
      name: m.name.toLowerCase(),
      displayName: m.name,
      type: data.creature_type
    });
  });
});

// Find similar names
const similarNames = [];
for (let i = 0; i < allMonsters.length; i++) {
  for (let j = i + 1; j < allMonsters.length; j++) {
    const monster1 = allMonsters[i];
    const monster2 = allMonsters[j];
    
    // Skip if same creature type
    if (monster1.type === monster2.type) continue;
    
    // Check for similar names
    const name1 = monster1.name;
    const name2 = monster2.name;
    
    // Check if names share significant words (excluding common words)
    const commonWords = ['the', 'of', 'a', 'an', 'ancient', 'elder', 'great', 'lesser', 'young', 'old'];
    const words1 = name1.split(' ').filter(w => !commonWords.includes(w));
    const words2 = name2.split(' ').filter(w => !commonWords.includes(w));
    
    // Find overlapping significant words
    const overlap = words1.filter(w => words2.includes(w) && w.length > 3);
    
    if (overlap.length > 0) {
      similarNames.push({
        name1: monster1.displayName,
        type1: monster1.type,
        id1: monster1.id,
        name2: monster2.displayName,
        type2: monster2.type,
        id2: monster2.id,
        overlap: overlap
      });
    }
  }
}

if (similarNames.length > 0) {
  console.log('\n⚠️  Similar creature names found across different types:\n');
  similarNames.forEach(s => {
    console.log(`- "${s.name1}" (${s.type1}) vs "${s.name2}" (${s.type2})`);
    console.log(`  IDs: ${s.id1} vs ${s.id2}`);
    console.log(`  Shared words: ${s.overlap.join(', ')}\n`);
  });
  console.log(`Total similar pairs: ${similarNames.length}`);
} else {
  console.log('\n✓ No confusingly similar names found!');
}
