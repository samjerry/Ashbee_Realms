const quests = require('../data/quests.json');
const npcs = require('../data/npcs.json');
const monsters = require('../data/monsters.json');
const events = require('../data/events.json');
const dungeons = require('../data/dungeons.json');
const factions = require('../data/factions.json');
const dialogues = require('../data/dialogues.json');
const items = require('../data/items.json');
const consumables = require('../data/consumables_extended.json');
const gear_weapons = require('../data/gear_weapons.json');
const gear_armor = require('../data/gear_armor.json');
const gear_headgear = require('../data/gear_headgear.json');
const gear_accessories = require('../data/gear_accessories.json');
const enchantments = require('../data/enchantments.json');

console.log('=== COMPREHENSIVE JSON CONSISTENCY CHECK ===\n');

// Build gear map from all files
const gearMap = {};
function addGearToMap(gearData) {
  const topLevel = Object.values(gearData)[0];
  if (topLevel) {
    for (const rarityOrCategory in topLevel) {
      const items = topLevel[rarityOrCategory];
      if (Array.isArray(items)) {
        items.forEach(item => gearMap[item.id] = item);
      } else if (typeof items === 'object') {
        // Nested structure (accessories)
        for (const rarity in items) {
          if (Array.isArray(items[rarity])) {
            items[rarity].forEach(item => gearMap[item.id] = item);
          }
        }
      }
    }
  }
}
addGearToMap(gear_weapons);
addGearToMap(gear_armor);
addGearToMap(gear_headgear);
addGearToMap(gear_accessories);

// Build lookup maps
const allNPCs = [
  ...npcs.npcs.merchants,
  ...npcs.npcs.quest_givers,
  ...npcs.npcs.riddlers,
  ...npcs.npcs.special_encounters
];
const npcMap = {};
allNPCs.forEach(npc => npcMap[npc.id] = npc);

const monsterMap = {};
monsters.monsters.forEach(m => monsterMap[m.id] = m);

const allItems = {};
// items.json has consumables, not items array
if (items.consumables) {
  Object.values(items.consumables).forEach(rarityArray => {
    rarityArray.forEach(item => allItems[item.id] = item);
  });
}
if (items.materials) {
  Object.values(items.materials).forEach(rarityArray => {
    rarityArray.forEach(item => allItems[item.id] = item);
  });
}
if (consumables.consumables) {
  consumables.consumables.forEach(c => allItems[c.id] = c);
}
// Gear map already built above, add to allItems
Object.assign(allItems, gearMap);

const issues = [];
const warnings = [];

// 1. CHECK QUEST REFERENCES
console.log('1. CHECKING QUEST REFERENCES...');
const allQuests = [
  ...quests.quests.main_story,
  ...quests.quests.side_quests,
  ...quests.quests.daily_quests
];

allQuests.forEach(quest => {
  if (quest.objectives) {
    quest.objectives.forEach(obj => {
      if (obj.type === 'talk_to_npc' && !npcMap[obj.target]) {
        issues.push(`Quest "${quest.id}" references missing NPC: ${obj.target}`);
      }
      if (obj.type === 'kill_monster' && !monsterMap[obj.target]) {
        issues.push(`Quest "${quest.id}" references missing monster: ${obj.target}`);
      }
    });
  }
});
console.log('   ✅ Quest references checked\n');

// 2. CHECK EVENT MONSTER SPAWNS
console.log('2. CHECKING EVENT REFERENCES...');
events.events.combat_events.forEach(event => {
  if (event.specific_monsters) {
    event.specific_monsters.forEach(monsterId => {
      if (!monsterMap[monsterId]) {
        issues.push(`Event "${event.id}" references missing monster: ${monsterId}`);
      }
    });
  }
});
console.log('   ✅ Event references checked\n');

// 3. CHECK DUNGEON BOSSES
console.log('3. CHECKING DUNGEON BOSSES...');
Object.values(dungeons.dungeons).forEach(dungeon => {
  if (dungeon.boss) {
    const bossId = typeof dungeon.boss === 'string' ? dungeon.boss : dungeon.boss.id;
    if (bossId && !monsterMap[bossId]) {
      issues.push(`Dungeon "${dungeon.id}" references missing boss: ${bossId}`);
    }
  }
  if (dungeon.mini_bosses) {
    dungeon.mini_bosses.forEach(bossId => {
      if (!monsterMap[bossId]) {
        issues.push(`Dungeon "${dungeon.id}" references missing mini-boss: ${bossId}`);
      }
    });
  }
});
console.log('   ✅ Dungeon bosses checked\n');

// 4. CHECK FACTION NPCS
console.log('4. CHECKING FACTION NPC REFERENCES...');
Object.values(factions.factions).forEach(faction => {
  if (faction.leader && !npcMap[faction.leader]) {
    warnings.push(`Faction "${faction.id}" references missing leader NPC: ${faction.leader}`);
  }
  if (faction.notable_members) {
    faction.notable_members.forEach(npcId => {
      if (!npcMap[npcId]) {
        warnings.push(`Faction "${faction.id}" references missing member NPC: ${npcId}`);
      }
    });
  }
});
console.log('   ✅ Faction NPCs checked\n');

// 5. CHECK DIALOGUE ITEM REFERENCES
console.log('5. CHECKING DIALOGUE ITEM REFERENCES...');
Object.values(dialogues.dialogues).forEach(dialogue => {
  if (dialogue.conversations) {
    Object.values(dialogue.conversations).forEach(conversation => {
      if (conversation.nodes) {
        conversation.nodes.forEach(node => {
          if (node.rewards) {
            if (node.rewards.starting_weapon && !allItems[node.rewards.starting_weapon]) {
              issues.push(`Dialogue node "${node.id}" references missing weapon: ${node.rewards.starting_weapon}`);
            }
            if (node.rewards.starting_armor && !allItems[node.rewards.starting_armor]) {
              issues.push(`Dialogue node "${node.id}" references missing armor: ${node.rewards.starting_armor}`);
            }
            if (node.rewards.items) {
              node.rewards.items.forEach(itemId => {
                if (!allItems[itemId]) {
                  issues.push(`Dialogue node "${node.id}" references missing item: ${itemId}`);
                }
              });
            }
          }
        });
      }
    });
  }
});
console.log('   ✅ Dialogue items checked\n');

// 6. CHECK ENCHANTMENT MATERIALS
console.log('6. CHECKING ENCHANTMENT MATERIALS...');
Object.values(enchantments.enchantments).forEach(enchantCategory => {
  if (typeof enchantCategory === 'object') {
    Object.values(enchantCategory).forEach(rarityArray => {
      if (Array.isArray(rarityArray)) {
        rarityArray.forEach(enchant => {
          if (enchant.materials) {
            enchant.materials.forEach(mat => {
              if (!allItems[mat.item]) {
                warnings.push(`Enchantment "${enchant.id}" requires missing material: ${mat.item}`);
              }
            });
          }
        });
      }
    });
  }
});
console.log('   ✅ Enchantment materials checked\n');

// REPORT RESULTS
console.log('\n=== RESULTS ===\n');

if (issues.length === 0) {
  console.log('✅ NO CRITICAL ISSUES FOUND!\n');
} else {
  console.log(`❌ CRITICAL ISSUES (${issues.length}):\n`);
  issues.forEach(issue => console.log('   ' + issue));
  console.log();
}

if (warnings.length === 0) {
  console.log('✅ NO WARNINGS!\n');
} else {
  console.log(`⚠️  WARNINGS (${warnings.length}):\n`);
  warnings.forEach(warning => console.log('   ' + warning));
  console.log();
}

console.log('=== SUMMARY ===');
console.log(`Total Quests Checked: ${allQuests.length}`);
console.log(`Total NPCs Available: ${allNPCs.length}`);
console.log(`Total Monsters Available: ${monsters.monsters.length}`);
console.log(`Total Items Available: ${Object.keys(allItems).length}`);
console.log(`Critical Issues: ${issues.length}`);
console.log(`Warnings: ${warnings.length}`);
