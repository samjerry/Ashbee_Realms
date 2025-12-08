const fs = require('fs');
const path = require('path');

// Get all creature types
const monsterDir = path.join(__dirname, 'data', 'monsters');
const creatureTypes = fs.readdirSync(monsterDir)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''));

console.log('🎯 Creature Types Available:', creatureTypes.length);
console.log(creatureTypes.join(', '));
console.log();

// Check dungeons directory structure
const dungeonDir = path.join(__dirname, 'data', 'dungeons');
const difficulties = ['easy', 'medium', 'hard', 'very_hard', 'extreme', 'special'];

const allDungeons = [];
difficulties.forEach(diff => {
  const diffPath = path.join(dungeonDir, diff);
  if (fs.existsSync(diffPath)) {
    const files = fs.readdirSync(diffPath).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      const dungeon = JSON.parse(fs.readFileSync(path.join(diffPath, file), 'utf8'));
      allDungeons.push({
        id: dungeon.id,
        name: dungeon.name,
        difficulty: dungeon.difficulty,
        file: file
      });
    });
  }
});

console.log('🏰 Existing Dungeons:', allDungeons.length);
allDungeons.forEach(d => {
  console.log(`  - ${d.name} (${d.difficulty})`);
});
console.log();

// Suggest new dungeons for underrepresented creature types
const suggestions = {
  'oozes': 'The Gelatinous Caverns - Easy dungeon in cursed_swamp',
  'lycanthropes': 'The Moonlit Hunting Grounds - Medium dungeon during full moon',
  'plants': 'The Overgrown Conservatory - Medium dungeon in whispering_woods',
  'constructs': 'The Abandoned Workshop - Hard dungeon in forsaken_ruins',
  'celestials': 'The Fallen Sanctuary - Very Hard dungeon with fallen angels',
  'giants': 'The Titan\'s Foothold - Hard dungeon in highland_reaches',
  'aquatic': 'The Sunken Grotto - Medium dungeon (already exists as sunken_temple)',
  'fey': 'The Twilight Court - Hard dungeon in whispering_woods',
  'aberrations': 'The Reality Breach - Extreme dungeon in void_realm',
  'insectoids': 'The Hive Chambers - Medium dungeon with giant insects'
};

console.log('💡 New Dungeon Suggestions by Creature Type:');
Object.entries(suggestions).forEach(([type, desc]) => {
  console.log(`  ${type.padEnd(15)}: ${desc}`);
});
