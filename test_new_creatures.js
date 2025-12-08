// Test script to verify new creature types load correctly
const MonsterDataLoader = require('./data/data_loader.js');

const loader = new MonsterDataLoader();
const data = loader.load();

const totalCount = Object.values(data.monsters).reduce((sum, arr) => sum + arr.length, 0);

console.log('\n=== Monster Loading Test ===');
console.log(`Total monsters loaded: ${totalCount}`);
console.log('\nMonsters by rarity:');

Object.entries(data.monsters).forEach(([rarity, monsters]) => {
  console.log(`  ${rarity}: ${monsters.length}`);
});

// Count by creature type
const creatureTypes = {};
Object.values(data.monsters).forEach(rarityArray => {
  rarityArray.forEach(monster => {
    if (monster.creature_type) {
      const type = monster.creature_type;
      creatureTypes[type] = (creatureTypes[type] || 0) + 1;
    }
  });
});

console.log('\nMonsters by creature type:');
Object.entries(creatureTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// List new creature types
const newTypes = ['fey', 'giant', 'ooze', 'insectoid', 'aquatic', 'plant', 'lycanthrope'];
console.log('\nNew creature types:');
newTypes.forEach(type => {
  const count = creatureTypes[type] || 0;
  console.log(`  ${type}: ${count}`);
});

console.log('\n✓ Test completed successfully!');
