const fs = require('fs');
const path = require('path');

console.log('🎯 MANUAL CATEGORIZATION REVIEW - REAL ISSUES ONLY\n');
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

console.log(`\n📊 Reviewing ${allMonsters.length} creatures for REAL miscategorizations...\n`);

const realIssues = [];

allMonsters.forEach(monster => {
  const name = monster.name;
  const id = monster.id;
  const type = monster.current_type;
  
  // REAL ISSUES ONLY - manually verified
  
  // Aboleth should be aberrations (classic aberration creature)
  if (id === 'aboleth' || id === 'elder_aboleth') {
    realIssues.push({
      id, name, current: type, suggested: 'aberrations',
      reason: 'Aboleths are classic aberrations - mind-controlling eldritch horrors'
    });
  }
  
  // Dragon Turtle should stay aquatic (it's a turtle, not really a dragon)
  // Tiamat's Leviathan is named after dragon god but is aquatic creature
  
  // Lich Lord is undead (lich = undead spellcaster)
  if (id === 'lich_lord') {
    realIssues.push({
      id, name, current: type, suggested: 'undead',
      reason: 'Liches are powerful undead spellcasters'
    });
  }
  
  // Dracolich spawn should stay undead (it's undead dragon)
  // Ignaroth/Morthanax in undead are clearly bosses, check if they're dracoliches
  if ((id === 'ancient_red_dragon' || id === 'elder_dracolich') && type === 'undead') {
    // These might be misnamed - check if they're actually dracoliches
    realIssues.push({
      id, name, current: type, suggested: 'CHECK',
      reason: 'Dragon boss in undead file - verify if this is a dracolich or living dragon'
    });
  }
  
  // Sentinel Protocol Alpha sounds like a construct, not undead
  if (id === 'sentinel_alpha') {
    realIssues.push({
      id, name, current: type, suggested: 'constructs',
      reason: 'Sentinel Protocol sounds like a construct/machine, not undead'
    });
  }
  
  // Will-o'-wisp is traditionally undead or fey, currently in fey - that's fine
  
  // Dryad should be plants (tree spirit)
  if (id === 'dryad') {
    realIssues.push({
      id, name, current: type, suggested: 'plants',
      reason: 'Dryads are tree spirits, plant creatures'
    });
  }
  
  // Slimes in beasts should be oozes
  if (id === 'moss_slime' || id === 'cave_slime') {
    realIssues.push({
      id, name, current: type, suggested: 'oozes',
      reason: 'Slimes are oozes, not beasts'
    });
  }
  
  // Elder Treant in beasts should be plants
  if (id === 'elder_treant' && type === 'beasts') {
    realIssues.push({
      id, name, current: type, suggested: 'plants',
      reason: 'Treants are animated trees, plant creatures'
    });
  }
  
  // Sprites in elementals that are clearly fey
  if ((id === 'ice_sprite' || id === 'flame_sprite' || id === 'crystal_sprite') && type === 'elementals') {
    // Actually sprites can be elemental or fey - if they're element-themed, elementals is fine
    // Skip this one
  }
  
  // Titans that are clearly bosses - need context
  // Ymir/Prometheus/etc in elementals might be elemental titans, which is correct
  
  // Void creatures in wrong categories
  if (id === 'void_wraith' && type === 'demons') {
    realIssues.push({
      id, name, current: type, suggested: 'undead',
      reason: 'Void Wraith is an undead creature, not a demon'
    });
  }
  
  if (id === 'void_cultist' || id === 'void_mage') {
    realIssues.push({
      id, name, current: type, suggested: 'aberrations',
      reason: 'Void-themed casters worship aberrations, but humanoid servants are fine in humanoids'
    });
  }
  
  // Horror-themed oozes
  if ((id === 'abyssal_ooze' || id === 'amalgam_horror') && type === 'oozes') {
    realIssues.push({
      id, name, current: type, suggested: 'aberrations',
      reason: 'Horror/abyssal themed - these are aberrations, not simple oozes'
    });
  }
  
  // Poison Ivy Horror
  if (id === 'poison_ivy_horror') {
    realIssues.push({
      id, name, current: type, suggested: 'aberrations',
      reason: 'Named "horror" - aberration, not normal plant'
    });
  }
  
  // Hybrid Horror in lycanthropes
  if (id === 'hybrid_horror') {
    realIssues.push({
      id, name, current: type, suggested: 'aberrations',
      reason: 'Named "horror" - aberration, not lycanthrope'
    });
  }
  
  // Dragonkin Warrior
  if (id === 'dragonkin_warrior') {
    realIssues.push({
      id, name, current: type, suggested: 'dragons',
      reason: 'Dragonkin are draconic creatures, should be in dragons'
    });
  }
  
  // Werewyrm (were-dragon)
  if (id === 'werewyrm') {
    // This is tricky - it's a lycanthrope that turns into a dragon
    // Could argue for either category, but lycanthrope makes sense
    // Skip this one
  }
  
  // Fey Dragon
  if (id === 'fey_dragon') {
    realIssues.push({
      id, name, current: type, suggested: 'dragons',
      reason: 'Fey Dragon is still a dragon, just with fey magic'
    });
  }
  
  // Cosmic/Star entities
  if (id === 'cosmic_dragon') {
    // Bahamut the Cosmic Dragon - it's still a dragon
    // Current category is dragons, so it's fine
  }
  
  // Check for construct-named things in wrong places
  if (name.includes('Golem') && !name.includes('Bone') && type !== 'constructs') {
    realIssues.push({
      id, name, current: type, suggested: 'constructs',
      reason: 'Golems are constructs'
    });
  }
});

// Display results
console.log('='.repeat(80));
console.log('\n🔍 REAL MISCATEGORIZATION ISSUES:\n');

if (realIssues.length === 0) {
  console.log('✅ No significant miscategorizations found!\n');
} else {
  realIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.name} (${issue.id})`);
    console.log(`   Current: ${issue.current} → Suggested: ${issue.suggested}`);
    console.log(`   Reason: ${issue.reason}\n`);
  });
  
  console.log('='.repeat(80));
  console.log(`\nTotal real issues: ${realIssues.length}\n`);
}
