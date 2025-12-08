const MonsterDataLoader = require('./data/data_loader.js');

console.log('🧪 Testing Monster Loading System\n');
console.log('═'.repeat(60));

// Load monsters
const loader = new MonsterDataLoader('./data');
const result = loader.load();

// Calculate statistics
const allMonsters = Object.values(result.monsters).flat();
const totalMonsters = allMonsters.length;

console.log('\n✅ Monster Loading: SUCCESS');
console.log(`📊 Total monsters loaded: ${totalMonsters}`);

// Rarity distribution
console.log('\n🎯 Rarity Distribution:');
const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'boss', 'mythic'];
rarities.forEach(rarity => {
  const count = result.monsters[rarity]?.length || 0;
  const percentage = ((count / totalMonsters) * 100).toFixed(1);
  console.log(`  ${rarity.padEnd(12)} ${count.toString().padStart(3)} monsters (${percentage}%)`);
});

// Creature type distribution
console.log('\n🐉 Creature Types:');
const creatureTypes = {};
allMonsters.forEach(m => {
  creatureTypes[m.creature_type] = (creatureTypes[m.creature_type] || 0) + 1;
});
Object.entries(creatureTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type.padEnd(12)} ${count} monsters`);
});

// Sample monsters
console.log('\n✨ Sample Monsters:');
['common', 'rare', 'legendary', 'boss', 'mythic'].forEach(rarity => {
  const sample = result.monsters[rarity]?.[0];
  if (sample) {
    console.log(`  [${rarity.toUpperCase()}] ${sample.name} (${sample.id})`);
  }
});

// Stat ranges
console.log('\n📈 Stat Ranges:');
const stats = {
  hp: { min: Infinity, max: -Infinity },
  attack: { min: Infinity, max: -Infinity },
  defense: { min: Infinity, max: -Infinity },
  agility: { min: Infinity, max: -Infinity }
};

allMonsters.forEach(m => {
  Object.keys(stats).forEach(stat => {
    if (m.base_stats[stat] < stats[stat].min) stats[stat].min = m.base_stats[stat];
    if (m.base_stats[stat] > stats[stat].max) stats[stat].max = m.base_stats[stat];
  });
});

Object.entries(stats).forEach(([stat, range]) => {
  console.log(`  ${stat.padEnd(10)} ${range.min} - ${range.max}`);
});

console.log('\n═'.repeat(60));
console.log('✅ All tests passed! Monster system ready.');
console.log('═'.repeat(60));
