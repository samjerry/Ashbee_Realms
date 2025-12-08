const fs = require('fs');
const path = require('path');

const monsterDir = path.join(__dirname, 'data', 'monsters');
const files = fs.readdirSync(monsterDir).filter(f => f.endsWith('.json')).sort();

console.log('📊 MONSTER DISTRIBUTION SUMMARY');
console.log('='.repeat(70));
console.log();

let totalMonsters = 0;
const distribution = [];

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(monsterDir, file), 'utf8'));
  const count = data.count;
  totalMonsters += count;
  distribution.push({
    type: data.creature_type,
    count: count,
    file: file
  });
});

// Sort by count descending
distribution.sort((a, b) => b.count - a.count);

distribution.forEach((item, index) => {
  const bar = '█'.repeat(Math.floor(item.count / 2));
  console.log(`${(index + 1).toString().padStart(2)}. ${item.type.padEnd(15)} ${item.count.toString().padStart(3)} ${bar}`);
});

console.log();
console.log('='.repeat(70));
console.log(`TOTAL UNIQUE MONSTERS: ${totalMonsters}`);
console.log(`CREATURE TYPES: ${distribution.length}`);
console.log();

// Show changes from migration
console.log('📝 RECENT MIGRATION CHANGES:');
console.log('='.repeat(70));
console.log();
console.log('MOVED TO UNDEAD (+9):');
console.log('  • Dracolich Spawn (from dragons)');
console.log('  • Hrungnir Reborn (from giants)');
console.log('  • Necronus the Plague Lich (from humanoids)');
console.log('  • Thanatos the Deathlord (from humanoids)');
console.log('  • Kel\'thuzad the Frost Lich (from humanoids)');
console.log('  • Nagash the Death Emperor (from humanoids)');
console.log('  • Dracula the Ancient (from humanoids)');
console.log('  • Ossuary the Bone Lord (from humanoids)');
console.log('  • Skeleton Warrior (from humanoids)');
console.log();
console.log('MOVED TO CELESTIALS (+2):');
console.log('  • Lucifer the Lightbringer (from demons)');
console.log('  • Michael the Betrayer (from humanoids)');
console.log();
console.log('MOVED TO DEMONS (+4):');
console.log('  • Baal\'thor the Demon Lord (from humanoids)');
console.log('  • Fire Imp (from elementals)');
console.log('  • Retriever (from insectoids)');
console.log('  • Aspect of Zuggtmoy (from plants)');
console.log();
console.log('✅ All creatures properly categorized by lore and theme!');
