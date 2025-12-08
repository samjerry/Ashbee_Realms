const fs = require('fs');
const path = require('path');

// Load all monster files
const monsterDir = path.join(__dirname, 'data', 'monsters');
const files = fs.readdirSync(monsterDir).filter(f => f.endsWith('.json'));

console.log('🔍 Analyzing creature categorization...\n');

const miscategorized = [];
const suggestions = [];

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monsterDir, file), 'utf8'));
  const creatureType = data.creature_type;
  
  data.monsters.forEach(monster => {
    const name = monster.name.toLowerCase();
    const desc = monster.description.toLowerCase();
    const id = monster.id;
    
    // Check for obvious miscategorizations
    
    // Undead creatures
    if ((name.includes('lich') || name.includes('vampire') || name.includes('dracula') || 
         name.includes('necro') || name.includes('death') || name.includes('bone') ||
         desc.includes('undead') || desc.includes('necrom') || desc.includes('risen')) && 
        creatureType !== 'undead') {
      miscategorized.push({
        id, name: monster.name, current: creatureType, 
        suggested: 'undead', reason: 'Undead theme'
      });
    }
    
    // Elementals
    if ((name.includes('elemental') || name.includes('djinn') || name.includes('titan') ||
         name.includes('primordial') && (desc.includes('elemental') || desc.includes('primordial force'))) && 
        creatureType !== 'elementals' && creatureType !== 'giants') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'elementals', reason: 'Elemental being'
      });
    }
    
    // Demons/Fiends
    if ((name.includes('demon') || name.includes('fiend') || name.includes('devil') ||
         name.includes('infernal') || desc.includes('demon') || desc.includes('infernal')) && 
        creatureType !== 'demons') {
      miscategorized.push({
        id, name: monster.name, current: creatureType,
        suggested: 'demons', reason: 'Demonic entity'
      });
    }
    
    // Dragons
    if ((name.includes('dragon') || name.includes('wyrm') || name.includes('drake') ||
         name.includes('hydra') || name.includes('serpent') && desc.includes('dragon')) && 
        creatureType !== 'dragons' && creatureType !== 'aquatic') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'dragons', reason: 'Draconic creature'
      });
    }
    
    // Giants
    if ((name.includes('giant') || name.includes('titan') || name.includes('colossus') ||
         name.includes('ogre') || name.includes('ettin') || name.includes('cyclops')) && 
        creatureType !== 'giants' && creatureType !== 'elementals') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'giants', reason: 'Giant-type creature'
      });
    }
    
    // Celestials/Angels
    if ((name.includes('angel') || name.includes('seraph') || name.includes('celestial') ||
         desc.includes('angel') || desc.includes('celestial') || desc.includes('divine')) && 
        creatureType !== 'celestials') {
      miscategorized.push({
        id, name: monster.name, current: creatureType,
        suggested: 'celestials', reason: 'Celestial being'
      });
    }
    
    // Aberrations
    if ((name.includes('void') || name.includes('aberr') || name.includes('eldritch') ||
         name.includes('cthulhu') || name.includes('horror') || name.includes('aboleth')) && 
        creatureType !== 'aberrations') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'aberrations', reason: 'Aberrant entity'
      });
    }
    
    // Constructs/Golems
    if ((name.includes('golem') || name.includes('construct') || name.includes('automaton') ||
         desc.includes('construct') || desc.includes('golem') || desc.includes('animated')) && 
        creatureType !== 'constructs') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'constructs', reason: 'Constructed being'
      });
    }
    
    // Fey
    if ((name.includes('fey') || name.includes('pixie') || name.includes('sprite') ||
         name.includes('dryad') || name.includes('nymph') || name.includes('satyr') ||
         desc.includes('fey') || desc.includes('fairy') || desc.includes('feywild')) && 
        creatureType !== 'fey') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'fey', reason: 'Fey creature'
      });
    }
    
    // Lycanthropes
    if ((name.includes('were') || name.includes('lycanthr') || name.includes('shifter')) && 
        creatureType !== 'lycanthropes') {
      miscategorized.push({
        id, name: monster.name, current: creatureType,
        suggested: 'lycanthropes', reason: 'Shapeshifter/lycanthrope'
      });
    }
    
    // Plants
    if ((name.includes('treant') || name.includes('spore') || name.includes('fungal') ||
         name.includes('vine') || desc.includes('plant') || desc.includes('vegetation')) && 
        creatureType !== 'plants') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'plants', reason: 'Plant creature'
      });
    }
    
    // Oozes/Slimes
    if ((name.includes('ooze') || name.includes('slime') || name.includes('puddle') ||
         name.includes('jelly') || desc.includes('ooze') || desc.includes('amorphous')) && 
        creatureType !== 'oozes') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'oozes', reason: 'Ooze/slime creature'
      });
    }
    
    // Insectoids/Spiders
    if ((name.includes('spider') || name.includes('insect') || name.includes('beetle') ||
         name.includes('mantis') || name.includes('scorpion') || name.includes('ant') ||
         name.includes('wasp') || desc.includes('insect') || desc.includes('arachnid')) && 
        creatureType !== 'insectoids') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'insectoids', reason: 'Insectoid creature'
      });
    }
    
    // Aquatic
    if ((name.includes('kraken') || name.includes('leviathan') || name.includes('shark') ||
         name.includes('octopus') || name.includes('squid') || name.includes('merfolk') ||
         desc.includes('aquatic') || desc.includes('underwater') || desc.includes('ocean')) && 
        creatureType !== 'aquatic' && creatureType !== 'dragons') {
      suggestions.push({
        id, name: monster.name, current: creatureType,
        suggested: 'aquatic', reason: 'Aquatic creature'
      });
    }
  });
});

console.log('❌ CLEAR MISCATEGORIZATIONS (should be moved):');
console.log('='.repeat(60));
if (miscategorized.length === 0) {
  console.log('✓ None found!');
} else {
  miscategorized.forEach(m => {
    console.log(`\n"${m.name}" (${m.id})`);
    console.log(`  Current: ${m.current}`);
    console.log(`  Should be: ${m.suggested}`);
    console.log(`  Reason: ${m.reason}`);
  });
}

console.log('\n\n💡 SUGGESTIONS (review needed):');
console.log('='.repeat(60));
if (suggestions.length === 0) {
  console.log('✓ None found!');
} else {
  // Group by current type
  const grouped = {};
  suggestions.forEach(s => {
    if (!grouped[s.current]) grouped[s.current] = [];
    grouped[s.current].push(s);
  });
  
  Object.keys(grouped).sort().forEach(type => {
    console.log(`\nFrom ${type}:`);
    grouped[type].forEach(s => {
      console.log(`  - "${s.name}" → ${s.suggested} (${s.reason})`);
    });
  });
}

console.log('\n\nTotal miscategorizations: ' + miscategorized.length);
console.log('Total suggestions: ' + suggestions.length);
