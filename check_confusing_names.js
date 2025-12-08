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

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monstersDir, file), 'utf-8'));
  data.monsters.forEach(m => {
    allMonsters.push({
      id: m.id,
      name: m.name,
      baseName: m.name.toLowerCase()
        .replace(/^the /, '')
        .replace(/^aspect of /, '')
        .replace(/^avatar of /, '')
        .replace(/^spawn of /, '')
        .replace(/^echo of /, '')
        .replace(/^herald of /, '')
        .replace(/^manifestation of /, '')
        .replace(/^fragment of /, '')
        .replace(/^shadow of /, '')
        .replace(/ (the|of|lord|queen|king|primal|incarnate|progenitor|reborn|unleashed|aspect|avatar|manifestation).*$/, '')
        .trim(),
      type: data.creature_type
    });
  });
});

// Find TRULY confusing similar names (same base creature in different types)
const confusing = [];
for (let i = 0; i < allMonsters.length; i++) {
  for (let j = i + 1; j < allMonsters.length; j++) {
    const m1 = allMonsters[i];
    const m2 = allMonsters[j];
    
    if (m1.type === m2.type) continue;
    
    // Skip generic words
    const genericWords = ['titan', 'guardian', 'horror', 'spawn', 'warrior', 'lord', 'queen', 'king', 'giant'];
    if (genericWords.includes(m1.baseName) || genericWords.includes(m2.baseName)) continue;
    
    // Check if base names are very similar
    if (m1.baseName === m2.baseName || 
        m1.baseName.includes(m2.baseName) || 
        m2.baseName.includes(m1.baseName)) {
      confusing.push({
        name1: m1.name,
        type1: m1.type,
        id1: m1.id,
        name2: m2.name,
        type2: m2.type,
        id2: m2.id,
        baseName: m1.baseName
      });
    }
  }
}

if (confusing.length > 0) {
  console.log('\n⚠️  Potentially confusing creature names:\n');
  confusing.forEach(c => {
    console.log(`- "${c.name1}" (${c.type1})`);
    console.log(`  vs "${c.name2}" (${c.type2})`);
    console.log(`  Base: ${c.baseName}\n`);
  });
  console.log(`Total confusing pairs: ${confusing.length}`);
} else {
  console.log('\n✓ No confusing similar names found!');
}
