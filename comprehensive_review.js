const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE CREATURE CATEGORIZATION REVIEW\n');
console.log('='.repeat(80));

// Load all monsters
const monstersPath = path.join(__dirname, 'data', 'monsters');
const allMonsters = [];

const monsterFiles = fs.readdirSync(monstersPath).filter(f => f.endsWith('.json'));
monsterFiles.forEach(file => {
  const type = file.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(monstersPath, file), 'utf8'));
  const monsters = data.monsters || data;
  
  if (Array.isArray(monsters)) {
    monsters.forEach(m => {
      allMonsters.push({ ...m, current_type: type });
    });
  }
});

console.log(`\n📊 Total Monsters: ${allMonsters.length}\n`);

// Categorization rules and analysis
const miscategorized = [];
const warnings = [];

allMonsters.forEach(monster => {
  const name = monster.name.toLowerCase();
  const id = monster.id.toLowerCase();
  const desc = (monster.description || '').toLowerCase();
  const type = monster.current_type;
  
  // Check for obvious miscategorizations
  
  // Undead indicators
  if ((name.includes('undead') || name.includes('zombie') || name.includes('skeleton') || 
       name.includes('ghost') || name.includes('wraith') || name.includes('wight') ||
       name.includes('revenant') || name.includes('mummy') || name.includes('ghoul') ||
       desc.includes('risen from death') || desc.includes('undead') || 
       desc.includes('reanimated') || desc.includes('necromantic')) && type !== 'undead') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'undead',
      reason: 'Has undead indicators in name/description'
    });
  }
  
  // Dragon indicators
  if ((name.includes('dragon') || name.includes('drake') || name.includes('wyrm') || 
       name.includes('wyvern') || desc.includes('dragon') || desc.includes('draconic')) && 
      type !== 'dragons' && !name.includes('dragonfly')) {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'dragons',
      reason: 'Has dragon indicators'
    });
  }
  
  // Demon indicators
  if ((name.includes('demon') || name.includes('devil') || name.includes('fiend') || 
       name.includes('hellspawn') || desc.includes('demonic') || desc.includes('abyssal') ||
       desc.includes('infernal')) && type !== 'demons') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'demons',
      reason: 'Has demonic indicators'
    });
  }
  
  // Celestial indicators
  if ((name.includes('angel') || name.includes('seraph') || name.includes('celestial') || 
       name.includes('divine') || name.includes('holy') || name.includes('phoenix') ||
       desc.includes('celestial') || desc.includes('heavenly') || desc.includes('divine being')) && 
      type !== 'celestials') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'celestials',
      reason: 'Has celestial/divine indicators'
    });
  }
  
  // Elemental indicators
  if ((name.includes('elemental') || name.includes('wisp') || 
       (name.includes('fire') && desc.includes('elemental')) ||
       (name.includes('ice') && desc.includes('elemental')) ||
       (name.includes('water') && desc.includes('elemental')) ||
       (name.includes('earth') && desc.includes('elemental')) ||
       (name.includes('air') && desc.includes('elemental')) ||
       desc.includes('pure elemental')) && type !== 'elementals') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'elementals',
      reason: 'Has elemental indicators'
    });
  }
  
  // Construct indicators  
  if ((name.includes('golem') || name.includes('construct') || name.includes('automaton') || 
       name.includes('sentinel') || name.includes('guardian') && desc.includes('construct') ||
       desc.includes('magical construct') || desc.includes('animated') && desc.includes('magic')) && 
      type !== 'constructs') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'constructs',
      reason: 'Has construct indicators'
    });
  }
  
  // Aberration indicators
  if ((name.includes('aberration') || name.includes('horror') || name.includes('void') || 
       name.includes('eldritch') || name.includes('cosmic') || name.includes('starborn') ||
       name.includes('mind flayer') || name.includes('beholder') || name.includes('aboleth') ||
       desc.includes('reality') || desc.includes('otherworldly') || desc.includes('from beyond') ||
       desc.includes('incomprehensible')) && type !== 'aberrations') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'aberrations',
      reason: 'Has aberration/cosmic horror indicators'
    });
  }
  
  // Giant indicators
  if ((name.includes('giant') || name.includes('titan') || name.includes('colossus') || 
       name.includes('ogre') || name.includes('cyclops') || name.includes('ettin') ||
       desc.includes('towering') && desc.includes('giant')) && 
      type !== 'giants' && !name.includes('giant spider') && !name.includes('giant ant') && 
      !name.includes('giant beetle') && !name.includes('giant crab') && !name.includes('giant octopus') &&
      !name.includes('giant mantis') && !name.includes('giant wasp')) {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'giants',
      reason: 'Has giant/titan indicators'
    });
  }
  
  // Fey indicators
  if ((name.includes('fey') || name.includes('fairy') || name.includes('pixie') || 
       name.includes('sprite') || name.includes('nymph') || name.includes('dryad') ||
       name.includes('sidhe') || name.includes('archfey') || name.includes('satyr') ||
       name.includes('redcap') || desc.includes('fey realm') || desc.includes('feywild')) && 
      type !== 'fey') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'fey',
      reason: 'Has fey/fairy indicators'
    });
  }
  
  // Lycanthrope indicators
  if ((name.includes('were') || name.includes('lycan') || 
       desc.includes('lycanthrope') || desc.includes('shapeshifter') && desc.includes('wolf')) && 
      type !== 'lycanthropes') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'lycanthropes',
      reason: 'Has lycanthrope/werecreature indicators'
    });
  }
  
  // Ooze indicators
  if ((name.includes('ooze') || name.includes('slime') || name.includes('blob') || 
       name.includes('jelly') || desc.includes('gelatinous') || desc.includes('amorphous')) && 
      type !== 'oozes') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'oozes',
      reason: 'Has ooze/slime indicators'
    });
  }
  
  // Plant indicators
  if ((name.includes('treant') || name.includes('dryad') || name.includes('vine') || 
       name.includes('thorn') || name.includes('root') || name.includes('fungus') ||
       name.includes('myconid') || name.includes('spore') || name.includes('plant') ||
       desc.includes('plant creature') || desc.includes('sentient plant') || 
       desc.includes('animated plant')) && type !== 'plants') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'plants',
      reason: 'Has plant creature indicators'
    });
  }
  
  // Insectoid indicators
  if ((name.includes('spider') || name.includes('insect') || name.includes('beetle') || 
       name.includes('mantis') || name.includes('wasp') || name.includes('ant') ||
       name.includes('scorpion') || name.includes('centipede') || name.includes('formian') ||
       desc.includes('insectoid') || desc.includes('chitinous')) && type !== 'insectoids') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'insectoids',
      reason: 'Has insectoid indicators'
    });
  }
  
  // Aquatic indicators
  if ((name.includes('shark') || name.includes('fish') || name.includes('crab') || 
       name.includes('octopus') || name.includes('merfolk') || name.includes('naga') ||
       name.includes('kraken') || name.includes('leviathan') || name.includes('sea') ||
       name.includes('aquatic') || desc.includes('aquatic') || desc.includes('ocean') ||
       desc.includes('underwater')) && type !== 'aquatic' && type !== 'dragons') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'aquatic',
      reason: 'Has aquatic indicators'
    });
  }
  
  // Beast indicators - natural animals
  if ((name.includes('wolf') || name.includes('bear') || name.includes('lion') || 
       name.includes('tiger') || name.includes('boar') || name.includes('hawk') ||
       name.includes('eagle') || name.includes('panther') || name.includes('dire') ||
       desc.includes('natural predator') || desc.includes('wild beast')) && 
      type !== 'beasts' && type !== 'lycanthropes') {
    miscategorized.push({
      id: monster.id,
      name: monster.name,
      current: type,
      suggested: 'beasts',
      reason: 'Has beast/natural animal indicators'
    });
  }
});

// Display results
if (miscategorized.length === 0) {
  console.log('\n✅ ALL CREATURES PROPERLY CATEGORIZED!\n');
  console.log('Every monster is in its most suitable creature type.\n');
} else {
  console.log(`\n⚠️  Found ${miscategorized.length} potentially miscategorized creatures:\n`);
  console.log('='.repeat(80));
  
  miscategorized.forEach((issue, index) => {
    console.log(`\n${index + 1}. ${issue.name} (${issue.id})`);
    console.log(`   Current Type: ${issue.current}`);
    console.log(`   Suggested Type: ${issue.suggested}`);
    console.log(`   Reason: ${issue.reason}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Summary by Target Type:\n');
  
  const byTarget = {};
  miscategorized.forEach(m => {
    if (!byTarget[m.suggested]) byTarget[m.suggested] = [];
    byTarget[m.suggested].push(m);
  });
  
  Object.keys(byTarget).sort().forEach(target => {
    console.log(`\n${target.toUpperCase()} (${byTarget[target].length} creatures):`);
    byTarget[target].forEach(m => {
      console.log(`  - ${m.name} (from ${m.current})`);
    });
  });
}

console.log('\n' + '='.repeat(80));
console.log('Review complete!\n');
