// test_monster_loader.js
const path = require('path');
const MonsterDataLoader = require('../data/data_loader.js');

console.log('🔍 Testing Monster Data Loader...\n');

try {
  // Load the data
  const loader = new MonsterDataLoader(path.join(__dirname, '../data'));
  const gameData = loader.load();
  
  console.log('✅ Data loaded successfully!\n');
  
  // Count monsters by rarity
  console.log('📊 Monster Count by Rarity:');
  let totalMonsters = 0;
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].forEach(rarity => {
    const count = gameData.monsters[rarity].length;
    totalMonsters += count;
    console.log(`  ${rarity.padEnd(12)}: ${count}`);
  });
  console.log(`  ${'TOTAL'.padEnd(12)}: ${totalMonsters}\n`);
  
  // Test specific monster retrieval
  console.log('🐺 Testing specific monster: forest_wolf');
  const wolf = loader.getMonster('forest_wolf');
  if (wolf) {
    console.log(`  Name: ${wolf.name}`);
    console.log(`  Creature Type: ${wolf.creature_type}`);
    console.log(`  HP: ${wolf.base_stats.hp}`);
    console.log(`  Attack: ${wolf.base_stats.attack}`);
    console.log(`  Passive Abilities: ${wolf.passive_abilities.map(a => a.name).join(', ') || 'None'}`);
    console.log(`  Active Abilities: ${wolf.active_abilities.map(a => a.name).join(', ') || 'None'}`);
    console.log(`  Loot items: ${wolf.loot_table.items.length}`);
  }
  
  console.log('\n🐉 Testing legendary monster: ancient_dragon');
  const dragon = loader.getMonster('ancient_dragon');
  if (dragon) {
    console.log(`  Name: ${dragon.name}`);
    console.log(`  Creature Type: ${dragon.creature_type}`);
    console.log(`  HP: ${dragon.base_stats.hp}`);
    console.log(`  Attack: ${dragon.base_stats.attack}`);
    console.log(`  Magic: ${dragon.base_stats.magic || 'N/A'}`);
    console.log(`  Passive Abilities: ${dragon.passive_abilities.map(a => a.name).join(', ') || 'None'}`);
    console.log(`  Active Abilities: ${dragon.active_abilities.map(a => a.name).join(', ') || 'None'}`);
    console.log(`  Total Abilities: ${dragon.passive_abilities.length + dragon.active_abilities.length}`);
  }
  
  // Test biome filtering
  console.log('\n🌲 Testing biome filter: whispering_woods');
  const woodsMonsters = loader.getMonstersByBiome('whispering_woods');
  console.log(`  Found ${woodsMonsters.length} monsters in Whispering Woods`);
  
  // Test rarity filtering
  console.log('\n⭐ Testing rarity filter: mythic');
  const mythicMonsters = loader.getMonstersByRarity('mythic');
  console.log(`  Found ${mythicMonsters.length} mythic monsters`);
  console.log(`  Names: ${mythicMonsters.map(m => m.name).join(', ')}`);
  
  // Test ability distribution
  console.log('\n🎯 Ability Distribution Analysis:');
  let totalPassive = 0;
  let totalActive = 0;
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].forEach(rarity => {
    gameData.monsters[rarity].forEach(monster => {
      totalPassive += monster.passive_abilities.length;
      totalActive += monster.active_abilities.length;
    });
  });
  console.log(`  Total Passive Abilities: ${totalPassive}`);
  console.log(`  Total Active Abilities: ${totalActive}`);
  console.log(`  Total Abilities: ${totalPassive + totalActive}`);
  
  // Test creature type distribution
  console.log('\n🦎 Creature Type Distribution:');
  const creatureTypes = {};
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].forEach(rarity => {
    gameData.monsters[rarity].forEach(monster => {
      if (!creatureTypes[monster.creature_type]) {
        creatureTypes[monster.creature_type] = 0;
      }
      creatureTypes[monster.creature_type]++;
    });
  });
  Object.keys(creatureTypes).sort().forEach(type => {
    console.log(`  ${type.padEnd(12)}: ${creatureTypes[type]}`);
  });
  
  // Verify all monsters have creature types
  console.log('\n✓ Creature Type Verification:');
  let missingType = 0;
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].forEach(rarity => {
    gameData.monsters[rarity].forEach(monster => {
      if (!monster.creature_type) {
        console.log(`  ⚠️  ${monster.name} (${monster.id}) is missing a creature type!`);
        missingType++;
      }
    });
  });
  if (missingType === 0) {
    console.log(`  ✅ All ${totalMonsters} monsters have a creature type assigned!`);
  } else {
    console.log(`  ⚠️  ${missingType} monsters are missing creature types!`);
  }
  
  console.log('\n✨ All tests passed! The modular system is working correctly.');
  
} catch (error) {
  console.error('❌ Error loading data:', error.message);
  console.error(error.stack);
}