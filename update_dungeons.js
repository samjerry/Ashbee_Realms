const fs = require('fs');
const path = require('path');

// Load all monster files
const monstersPath = path.join(__dirname, 'data', 'monsters');
const allMonsters = {};

const monsterFiles = fs.readdirSync(monstersPath).filter(f => f.endsWith('.json'));
monsterFiles.forEach(file => {
  const type = file.replace('.json', '');
  const monsters = JSON.parse(fs.readFileSync(path.join(monstersPath, file), 'utf8'));
  allMonsters[type] = monsters;
});

console.log('📊 Loaded monsters from', monsterFiles.length, 'creature types\n');

// Dungeon update mappings - add appropriate monsters to each dungeon
const dungeonUpdates = {
  // EASY DUNGEONS
  'bandit_hideout': {
    add_monsters: [
      { id: 'shadow_assassin', count: [1, 2] },  // stealthy humanoid
      { id: 'dark_cultist', count: [1, 2] }      // evil humanoid
    ]
  },
  'goblin_warrens': {
    add_monsters: [
      { id: 'hobgoblin', count: [2, 3] },        // tougher goblins
      { id: 'bugbear', count: [1, 2] }           // goblinoid
    ]
  },
  'haunted_ruins': {
    add_monsters: [
      { id: 'skeleton_warrior', count: [2, 3] }, // undead warrior
      { id: 'shade', count: [1, 2] },            // shadow undead
      { id: 'wraith', count: [1, 1] }            // powerful undead
    ]
  },
  'spider_nest': {
    add_monsters: [
      { id: 'giant_beetle', count: [2, 3] },     // insectoid
      { id: 'giant_mantis', count: [1, 2] }      // insectoid
    ]
  },
  'sunken_temple': {
    add_monsters: [
      { id: 'giant_crab', count: [2, 3] },       // aquatic
      { id: 'reef_shark', count: [1, 2] },       // aquatic
      { id: 'merfolk_warrior', count: [1, 2] }   // aquatic humanoid
    ]
  },

  // MEDIUM DUNGEONS
  'crypts_of_the_forgotten': {
    add_monsters: [
      { id: 'plague_lich', count: [1, 1] },      // undead boss
      { id: 'necromancer_supreme', count: [1, 1] }, // undead boss
      { id: 'bone_colossus', count: [1, 2] }     // undead construct
    ]
  },
  'cursed_asylum': {
    add_monsters: [
      { id: 'banshee', count: [1, 2] },          // undead
      { id: 'wailing_fey', count: [1, 1] },      // fey (renamed from banshee_fey)
      { id: 'doppelganger', count: [1, 2] }      // shapeshifter
    ]
  },
  'elemental_forge': {
    add_monsters: [
      { id: 'magma_elemental', count: [2, 3] },  // fire/earth hybrid
      { id: 'steam_elemental', count: [1, 2] },  // water/fire hybrid
      { id: 'storm_elemental', count: [1, 1] }   // air/water hybrid
    ]
  },
  'orc_stronghold': {
    add_monsters: [
      { id: 'ogre_brute', count: [1, 2] },       // giant-kin
      { id: 'hill_giant_youth', count: [1, 1] }, // giant
      { id: 'ettin', count: [1, 1] }             // two-headed giant
    ]
  },
  'void_rift': {
    add_monsters: [
      { id: 'void_stalker', count: [2, 3] },     // aberration
      { id: 'void_spawn', count: [2, 3] },       // aberration
      { id: 'starborn_horror', count: [1, 2] },  // aberration
      { id: 'cosmic_horror', count: [1, 1] }     // powerful aberration
    ]
  },

  // HARD DUNGEONS
  'construct_foundry': {
    add_monsters: [
      { id: 'mithril_golem', count: [1, 2] },    // rare construct
      { id: 'titan_golem', count: [1, 1] },      // powerful construct
      { id: 'golem_prime', count: [1, 1] }       // legendary construct
    ]
  },
  'crystal_depths': {
    add_monsters: [
      { id: 'crystal_guardian', count: [2, 3] }, // crystal construct
      { id: 'diamond_golem', count: [1, 1] }     // rare construct
    ]
  },
  'demon_gate': {
    add_monsters: [
      { id: 'fire_imp', count: [3, 5] },         // lesser demon
      { id: 'demon_lord_baal', count: [1, 1] },  // demon boss
      { id: 'retriever', count: [1, 1] },        // demon construct
      { id: 'zuggtmoy_aspect', count: [1, 1] }   // demon queen
    ]
  },
  'dragon_lair': {
    add_monsters: [
      { id: 'frost_wyvern', count: [1, 2] },     // frost dragon
      { id: 'young_leviathan', count: [1, 1] },  // water dragon
      { id: 'shadow_dragon', count: [1, 1] }     // shadow dragon
    ]
  },
  'plague_catacombs': {
    add_monsters: [
      { id: 'dracolich_spawn', count: [1, 1] },  // undead dragon
      { id: 'vampire_lord_ancient', count: [1, 1] }, // ancient vampire
      { id: 'death_emperor', count: [1, 1] }     // death boss
    ]
  },

  // VERY HARD DUNGEONS
  'arcane_sanctum': {
    add_monsters: [
      { id: 'archmage', count: [1, 2] },         // humanoid caster
      { id: 'lich_lord', count: [1, 1] },        // undead caster
      { id: 'void_emperor', count: [1, 1] }      // aberration boss
    ]
  },
  'blood_cathedral': {
    add_monsters: [
      { id: 'dracula_ancient', count: [1, 1] },  // vampire lord
      { id: 'blood_fiend', count: [2, 3] },      // demon
      { id: 'vampire_ascendant', count: [1, 1] } // powerful vampire
    ]
  },
  'frozen_citadel': {
    add_monsters: [
      { id: 'thrym_frost_king', count: [1, 1] },     // frost giant boss
      { id: 'ymir_frost_titan', count: [1, 1] },     // titan
      { id: 'frostmourne_winter_queen', count: [1, 1] } // ice queen
    ]
  },
  'necropolis_eternal': {
    add_monsters: [
      { id: 'frost_lich_lord', count: [1, 1] },  // lich variant
      { id: 'hrungnir_reborn', count: [1, 1] },  // undead giant
      { id: 'the_grim_reaper', count: [1, 1] }   // death incarnate
    ]
  },
  'titan_vault': {
    add_monsters: [
      { id: 'cloud_giant', count: [1, 2] },      // giant
      { id: 'storm_giant', count: [1, 1] },      // powerful giant
      { id: 'primordial_titan', count: [1, 1] }  // titan boss
    ]
  },

  // EXTREME DUNGEONS
  'apocalypse_chamber': {
    add_monsters: [
      { id: 'lucifer_fallen', count: [1, 1] },       // fallen angel
      { id: 'archangel_fallen', count: [1, 1] },     // fallen archangel
      { id: 'demon_lord_ultimate', count: [1, 1] }   // ultimate demon
    ]
  },
  'cosmic_observatory': {
    add_monsters: [
      { id: 'astral_colossus', count: [1, 1] },      // cosmic entity
      { id: 'void_leviathan', count: [1, 1] },       // void beast
      { id: 'azathoth_star_eater', count: [1, 1] }   // cosmic horror boss
    ]
  },
  'halls_of_ascension': {
    add_monsters: [
      { id: 'celestial_guardian', count: [2, 3] },   // celestial
      { id: 'phoenix_lord', count: [1, 1] },         // phoenix
      { id: 'eternal_phoenix', count: [1, 1] }       // legendary phoenix
    ]
  },
  'primordial_abyss': {
    add_monsters: [
      { id: 'leviathan', count: [1, 1] },            // aquatic boss
      { id: 'kraken_spawn', count: [1, 2] },         // aquatic
      { id: 'elder_aboleth', count: [1, 1] }         // aberration boss
    ]
  },
  'shadow_keep': {
    add_monsters: [
      { id: 'shade_lord', count: [1, 2] },           // shadow undead
      { id: 'night_king', count: [1, 1] },           // darkness boss
      { id: 'umbral_dragon', count: [1, 1] }         // shadow dragon
    ]
  }
};

console.log('🎯 Updating dungeons with new monsters...\n');

// Update each dungeon
const difficultiesPath = path.join(__dirname, 'data', 'dungeons');
const difficulties = ['easy', 'medium', 'hard', 'very_hard', 'extreme', 'special'];

let updatedCount = 0;

difficulties.forEach(difficulty => {
  const difficultyPath = path.join(difficultiesPath, difficulty);
  if (!fs.existsSync(difficultyPath)) return;

  const dungeonFiles = fs.readdirSync(difficultyPath).filter(f => f.endsWith('.json'));
  
  dungeonFiles.forEach(file => {
    const dungeonPath = path.join(difficultyPath, file);
    const dungeon = JSON.parse(fs.readFileSync(dungeonPath, 'utf8'));
    
    const updateInfo = dungeonUpdates[dungeon.id];
    if (updateInfo && updateInfo.add_monsters) {
      console.log(`\n✏️  Updating: ${dungeon.name} (${difficulty})`);
      console.log(`   Adding ${updateInfo.add_monsters.length} new monster types`);
      
      // Add new room types with the new monsters
      updateInfo.add_monsters.forEach(monster => {
        const newRoom = {
          type: 'combat',
          description: `New threats emerge`,
          monsters: [{
            id: monster.id,
            count: monster.count
          }]
        };
        dungeon.rooms.push(newRoom);
      });
      
      // Save updated dungeon
      fs.writeFileSync(dungeonPath, JSON.stringify(dungeon, null, 2), 'utf8');
      updatedCount++;
    }
  });
});

console.log(`\n\n✅ Successfully updated ${updatedCount} dungeons with new monsters!`);
console.log(`📊 Total dungeons processed: ${updatedCount}`);
