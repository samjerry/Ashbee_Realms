const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICATION: Dungeon & Monster System\n');
console.log('='.repeat(70));

let errors = [];
let warnings = [];

// Load all monsters
const monstersPath = path.join(__dirname, 'data', 'monsters');
const allMonsters = new Map();

console.log('\n📦 Loading Monsters...');
const monsterFiles = fs.readdirSync(monstersPath).filter(f => f.endsWith('.json'));
monsterFiles.forEach(file => {
  const type = file.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(monstersPath, file), 'utf8'));
  const monsters = data.monsters || data; // Handle both formats
  
  if (Array.isArray(monsters)) {
    monsters.forEach(m => {
      if (allMonsters.has(m.id)) {
        errors.push(`Duplicate monster ID: ${m.id} in ${type}`);
      }
      allMonsters.set(m.id, { ...m, type });
    });
  }
});

console.log(`   ✅ Loaded ${allMonsters.size} unique monsters from ${monsterFiles.length} types`);

// Verify no duplicates
const monsterIds = Array.from(allMonsters.keys());
const uniqueIds = new Set(monsterIds);
if (monsterIds.length !== uniqueIds.size) {
  errors.push(`Found ${monsterIds.length - uniqueIds.size} duplicate monster IDs`);
}

// Load and verify dungeons
const dungeonsPath = path.join(__dirname, 'data', 'dungeons');
const difficulties = ['easy', 'medium', 'hard', 'very_hard', 'extreme', 'special'];

console.log('\n🏰 Loading Dungeons...');
let totalDungeons = 0;
let totalRooms = 0;
let totalBosses = 0;
const dungeonMonsters = new Set();
const missingMonsters = new Set();

difficulties.forEach(difficulty => {
  const difficultyPath = path.join(dungeonsPath, difficulty);
  if (!fs.existsSync(difficultyPath)) return;

  const dungeonFiles = fs.readdirSync(difficultyPath).filter(f => f.endsWith('.json'));
  
  dungeonFiles.forEach(file => {
    const dungeon = JSON.parse(fs.readFileSync(path.join(difficultyPath, file), 'utf8'));
    totalDungeons++;
    
    // Verify dungeon structure
    if (!dungeon.id) errors.push(`Dungeon ${file} missing ID`);
    if (!dungeon.name) errors.push(`Dungeon ${file} missing name`);
    if (!dungeon.difficulty) errors.push(`Dungeon ${file} missing difficulty`);
    
    // Check rooms
    if (dungeon.rooms) {
      totalRooms += dungeon.rooms.length;
      dungeon.rooms.forEach(room => {
        if (room.monsters) {
          room.monsters.forEach(monster => {
            dungeonMonsters.add(monster.id);
            if (!allMonsters.has(monster.id)) {
              missingMonsters.add(monster.id);
              errors.push(`Dungeon ${dungeon.name} references missing monster: ${monster.id}`);
            }
          });
        }
      });
    }
    
    // Check bosses
    if (dungeon.boss_pool) {
      totalBosses += dungeon.boss_pool.length;
      dungeon.boss_pool.forEach(boss => {
        dungeonMonsters.add(boss.id);
        if (!allMonsters.has(boss.id)) {
          missingMonsters.add(boss.id);
          warnings.push(`Dungeon ${dungeon.name} references boss not in monster files: ${boss.id} (may be boss-only)`);
        }
      });
    }
  });
});

console.log(`   ✅ Loaded ${totalDungeons} dungeons`);
console.log(`   ✅ Found ${totalRooms} room encounters`);
console.log(`   ✅ Found ${totalBosses} boss encounters`);
console.log(`   ✅ Dungeons reference ${dungeonMonsters.size} unique monster/boss IDs`);

// Check creature type coverage
console.log('\n🎯 Creature Type Coverage:');
const coverageMap = {
  'aberrations': [],
  'aquatic': [],
  'beasts': [],
  'celestials': [],
  'constructs': [],
  'demons': [],
  'dragons': [],
  'elementals': [],
  'fey': [],
  'giants': [],
  'humanoids': [],
  'insectoids': [],
  'lycanthropes': [],
  'oozes': [],
  'plants': [],
  'undead': []
};

difficulties.forEach(difficulty => {
  const difficultyPath = path.join(dungeonsPath, difficulty);
  if (!fs.existsSync(difficultyPath)) return;

  const dungeonFiles = fs.readdirSync(difficultyPath).filter(f => f.endsWith('.json'));
  dungeonFiles.forEach(file => {
    const dungeon = JSON.parse(fs.readFileSync(path.join(difficultyPath, file), 'utf8'));
    
    if (dungeon.rooms) {
      dungeon.rooms.forEach(room => {
        if (room.monsters) {
          room.monsters.forEach(monster => {
            const monsterData = allMonsters.get(monster.id);
            if (monsterData && coverageMap[monsterData.type]) {
              if (!coverageMap[monsterData.type].includes(dungeon.name)) {
                coverageMap[monsterData.type].push(dungeon.name);
              }
            }
          });
        }
      });
    }
  });
});

Object.keys(coverageMap).sort().forEach(type => {
  const dungeons = coverageMap[type];
  if (dungeons.length === 0) {
    warnings.push(`Creature type '${type}' not featured in any dungeon rooms`);
    console.log(`   ⚠️  ${type}: NO DUNGEONS`);
  } else {
    console.log(`   ✅ ${type}: ${dungeons.length} dungeon(s)`);
  }
});

// Final report
console.log('\n' + '='.repeat(70));
console.log('📋 VERIFICATION SUMMARY');
console.log('='.repeat(70));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ ALL CHECKS PASSED!');
  console.log(`\n📊 Stats:`);
  console.log(`   - ${allMonsters.size} unique monsters`);
  console.log(`   - ${monsterFiles.length} creature types`);
  console.log(`   - ${totalDungeons} dungeons`);
  console.log(`   - ${totalBosses} boss encounters`);
  console.log(`   - ${totalRooms} room encounters`);
  console.log(`   - All monster references valid`);
  console.log(`   - All creature types featured in dungeons`);
} else {
  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }
}

console.log('\n' + '='.repeat(70));
