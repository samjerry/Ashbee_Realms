const fs = require('fs');
const path = require('path');

// Load all valid monster IDs
const monstersPath = path.join(__dirname, 'data', 'monsters');
const validMonsters = new Set();

const monsterFiles = fs.readdirSync(monstersPath).filter(f => f.endsWith('.json'));
monsterFiles.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monstersPath, file), 'utf8'));
  const monsters = data.monsters || data;
  
  if (Array.isArray(monsters)) {
    monsters.forEach(m => validMonsters.add(m.id));
  }
});

console.log(`✅ Loaded ${validMonsters.size} valid monster IDs\n`);

// Clean up dungeons - remove invalid monster references
const dungeonsPath = path.join(__dirname, 'data', 'dungeons');
const difficulties = ['easy', 'medium', 'hard', 'very_hard', 'extreme', 'special'];

let cleanedDungeons = 0;
let removedReferences = 0;

difficulties.forEach(difficulty => {
  const difficultyPath = path.join(dungeonsPath, difficulty);
  if (!fs.existsSync(difficultyPath)) return;

  const dungeonFiles = fs.readdirSync(difficultyPath).filter(f => f.endsWith('.json'));
  
  dungeonFiles.forEach(file => {
    const dungeonPath = path.join(difficultyPath, file);
    const dungeon = JSON.parse(fs.readFileSync(dungeonPath, 'utf8'));
    let modified = false;
    
    // Filter rooms to remove invalid monster references
    if (dungeon.rooms) {
      const originalLength = dungeon.rooms.length;
      dungeon.rooms = dungeon.rooms.filter(room => {
        if (room.monsters) {
          // Check if all monsters in this room are valid
          const allValid = room.monsters.every(m => validMonsters.has(m.id));
          if (!allValid) {
            const invalid = room.monsters.filter(m => !validMonsters.has(m.id));
            console.log(`   Removing room from ${dungeon.name} with invalid monsters: ${invalid.map(m => m.id).join(', ')}`);
            removedReferences++;
            return false;
          }
        }
        return true;
      });
      
      if (dungeon.rooms.length !== originalLength) {
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(dungeonPath, JSON.stringify(dungeon, null, 2), 'utf8');
      cleanedDungeons++;
      console.log(`✅ Cleaned: ${dungeon.name}`);
    }
  });
});

console.log(`\n📊 Summary:`);
console.log(`   - Cleaned ${cleanedDungeons} dungeons`);
console.log(`   - Removed ${removedReferences} invalid room references`);
