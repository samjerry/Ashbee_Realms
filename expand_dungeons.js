/**
 * Dungeon Expansion Script
 * Creates 25 themed dungeons (5 per difficulty tier) with 5 bosses each
 */

const fs = require('fs');
const path = require('path');

// Load existing dungeons
const existingDungeons = require('./data/dungeons.json');

// NEW DUNGEON DEFINITIONS
const newDungeons = {
  // === EASY DUNGEONS (Level 5-14) ===
  
  "bandit_hideout": {
    "id": "bandit_hideout",
    "name": "Bandit Hideout",
    "description": "A fortified camp where outlaws plot their next raid",
    "difficulty": "easy",
    "required_level": 6,
    "max_level": 11,
    "recommended_party_size": 1,
    "location": "forest_encampment",
    "floors": 3,
    "rooms_per_floor": [5, 6, 7],
    "boss_floor": 3,
    "time_limit": null,
    "respawn_time": 3600,
    "instance_type": "solo",
    "rooms": [
      {
        "type": "combat",
        "description": "Bandits patrol the perimeter",
        "monsters": [
          {"id": "bandit_thug", "count": [2, 4]},
          {"id": "bandit_archer", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "bandit_king",
        "name": "Blackjack the Bandit King",
        "description": "The ruthless leader of this outlaw band",
        "level_range": [6, 11],
        "health_multiplier": 3.0,
        "damage_multiplier": 1.6,
        "special_abilities": ["dual_wield", "smoke_bomb", "backstab"],
        "spawn_weight": 25
      },
      {
        "id": "crossbow_master",
        "name": "Hawkeye the Crossbow Master",
        "description": "A deadly marksman who never misses",
        "level_range": [6, 11],
        "health_multiplier": 2.4,
        "damage_multiplier": 2.0,
        "special_abilities": ["piercing_shot", "poison_bolt", "rapid_fire"],
        "spawn_weight": 20
      },
      {
        "id": "rogue_assassin",
        "name": "Silent Shade",
        "description": "A mysterious assassin employed by the bandits",
        "level_range": [7, 11],
        "health_multiplier": 2.6,
        "damage_multiplier": 1.9,
        "special_abilities": ["vanish", "critical_strike", "poison"],
        "spawn_weight": 20
      },
      {
        "id": "brute_enforcer",
        "name": "Crusher the Brute",
        "description": "A hulking enforcer who keeps order through fear",
        "level_range": [7, 11],
        "health_multiplier": 3.4,
        "damage_multiplier": 1.5,
        "special_abilities": ["power_slam", "intimidate", "thick_skin"],
        "spawn_weight": 20
      },
      {
        "id": "pyromancer_bandit",
        "name": "Ember the Pyromancer",
        "description": "A rogue mage who burns first and asks questions never",
        "level_range": [6, 11],
        "health_multiplier": 2.3,
        "damage_multiplier": 2.1,
        "special_abilities": ["fireball", "flame_wall", "explosive_trap"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 600,
      "gold": [250, 450],
      "guaranteed_loot": true,
      "loot_table": "dungeon_bandit",
      "first_clear_bonus": {
        "xp": 1200,
        "title": "outlaw_hunter",
        "items": ["blackjack_dual_daggers"]
      }
    }
  },

  "haunted_ruins": {
    "id": "haunted_ruins",
    "name": "Haunted Ruins",
    "description": "Ancient stone halls where restless spirits wander",
    "difficulty": "easy",
    "required_level": 7,
    "max_level": 12,
    "recommended_party_size": 1,
    "location": "abandoned_monastery",
    "floors": 3,
    "rooms_per_floor": [6, 6, 7],
    "boss_floor": 3,
    "time_limit": null,
    "respawn_time": 3600,
    "instance_type": "solo",
    "environmental_effects": {
      "haunting": {
        "description": "Spirits drain your will to fight",
        "defense_penalty": 0.10
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Ghosts drift through the corridors",
        "monsters": [
          {"id": "vengeful_spirit", "count": [2, 3]},
          {"id": "phantom", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "mad_monk",
        "name": "Brother Mortus the Mad",
        "description": "A monk driven insane by forbidden knowledge",
        "level_range": [7, 12],
        "health_multiplier": 2.8,
        "damage_multiplier": 1.7,
        "special_abilities": ["dark_prayer", "spirit_drain", "madness_aura"],
        "spawn_weight": 25
      },
      {
        "id": "headless_guardian",
        "name": "The Headless Guardian",
        "description": "A decapitated knight still defending the ruins",
        "level_range": [7, 12],
        "health_multiplier": 3.2,
        "damage_multiplier": 1.5,
        "special_abilities": ["blind_fury", "unstoppable", "spectral_slash"],
        "spawn_weight": 20
      },
      {
        "id": "wailing_widow",
        "name": "The Wailing Widow",
        "description": "A ghost bride searching for her lost love",
        "level_range": [8, 12],
        "health_multiplier": 2.5,
        "damage_multiplier": 1.8,
        "special_abilities": ["mournful_wail", "life_drain", "phase_through"],
        "spawn_weight": 20
      },
      {
        "id": "cursed_librarian",
        "name": "Keeper of Forbidden Tomes",
        "description": "A librarian cursed to guard dark knowledge forever",
        "level_range": [8, 12],
        "health_multiplier": 2.6,
        "damage_multiplier": 1.9,
        "special_abilities": ["tome_blast", "silence", "knowledge_overwhelm"],
        "spawn_weight": 20
      },
      {
        "id": "poltergeist_lord",
        "name": "Malevolent Poltergeist",
        "description": "A powerful spirit that hurls objects with telekinetic force",
        "level_range": [7, 12],
        "health_multiplier": 2.4,
        "damage_multiplier": 2.0,
        "special_abilities": ["telekinesis", "possession", "ethereal_form"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 700,
      "gold": [300, 500],
      "guaranteed_loot": true,
      "loot_table": "dungeon_spirit",
      "first_clear_bonus": {
        "xp": 1400,
        "title": "ghost_buster",
        "items": ["spirit_ward_amulet"]
      }
    }
  },

  "spider_nest": {
    "id": "spider_nest",
    "name": "Spider Nest",
    "description": "A cavern filled with webs and poisonous arachnids",
    "difficulty": "easy",
    "required_level": 8,
    "max_level": 13,
    "recommended_party_size": 1,
    "location": "webbed_caverns",
    "floors": 3,
    "rooms_per_floor": [5, 6, 7],
    "boss_floor": 3,
    "time_limit": null,
    "respawn_time": 3600,
    "instance_type": "solo",
    "environmental_effects": {
      "sticky_webs": {
        "description": "Movement speed reduced",
        "speed_penalty": 0.20
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Giant spiders lurk in the shadows",
        "monsters": [
          {"id": "giant_spider", "count": [3, 5]},
          {"id": "web_spinner", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "broodmother",
        "name": "Arachna the Broodmother",
        "description": "A massive spider that births countless offspring",
        "level_range": [8, 13],
        "health_multiplier": 3.0,
        "damage_multiplier": 1.6,
        "special_abilities": ["spawn_spiderlings", "web_trap", "poison_bite"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.6,
            "adds_spawn": {"id": "spiderling", "count": 5}
          }
        ]
      },
      {
        "id": "widow_queen",
        "name": "Black Widow Queen",
        "description": "A sleek black spider with lethal venom",
        "level_range": [8, 13],
        "health_multiplier": 2.5,
        "damage_multiplier": 2.0,
        "special_abilities": ["neurotoxin", "web_cocoon", "death_strike"],
        "spawn_weight": 20
      },
      {
        "id": "tarantula_king",
        "name": "Fang the Tarantula King",
        "description": "A hairy behemoth with crushing mandibles",
        "level_range": [9, 13],
        "health_multiplier": 3.4,
        "damage_multiplier": 1.5,
        "special_abilities": ["crushing_bite", "ground_shake", "barbed_hairs"],
        "spawn_weight": 20
      },
      {
        "id": "crystal_spider",
        "name": "Shimmer the Crystal Spider",
        "description": "A beautiful but deadly spider with crystalline carapace",
        "level_range": [8, 13],
        "health_multiplier": 2.7,
        "damage_multiplier": 1.7,
        "special_abilities": ["crystal_shard", "reflect", "prismatic_web"],
        "spawn_weight": 20
      },
      {
        "id": "web_weaver",
        "name": "Silkspinner the Weaver",
        "description": "A spider capable of creating complex magical web patterns",
        "level_range": [9, 13],
        "health_multiplier": 2.6,
        "damage_multiplier": 1.8,
        "special_abilities": ["web_maze", "silk_bind", "pattern_magic"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 800,
      "gold": [350, 550],
      "guaranteed_loot": true,
      "loot_table": "dungeon_spider",
      "first_clear_bonus": {
        "xp": 1600,
        "title": "arachnophobe",
        "items": ["web_silk_cloak"]
      }
    }
  },

  "sunken_temple": {
    "id": "sunken_temple",
    "name": "Sunken Temple",
    "description": "An ancient temple submerged beneath murky waters",
    "difficulty": "easy",
    "required_level": 9,
    "max_level": 14,
    "recommended_party_size": 1,
    "location": "flooded_ruins",
    "floors": 3,
    "rooms_per_floor": [6, 7, 7],
    "boss_floor": 3,
    "time_limit": null,
    "respawn_time": 3600,
    "instance_type": "solo",
    "environmental_effects": {
      "waterlogged": {
        "description": "All attacks have water element",
        "adds_water_damage": 10
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Aquatic creatures defend the temple",
        "monsters": [
          {"id": "water_elemental", "count": [2, 3]},
          {"id": "coral_guardian", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "tidal_lord",
        "name": "Thalassor the Tidal Lord",
        "description": "An ancient elemental that commands the seas",
        "level_range": [9, 14],
        "health_multiplier": 3.1,
        "damage_multiplier": 1.7,
        "special_abilities": ["tidal_wave", "whirlpool", "water_prison"],
        "spawn_weight": 25
      },
      {
        "id": "kraken_spawn",
        "name": "Spawn of the Deep",
        "description": "A tentacled horror from the ocean depths",
        "level_range": [10, 14],
        "health_multiplier": 3.3,
        "damage_multiplier": 1.6,
        "special_abilities": ["tentacle_grab", "ink_cloud", "crushing_grip"],
        "spawn_weight": 20
      },
      {
        "id": "coral_titan",
        "name": "Coralox the Living Reef",
        "description": "A massive creature made of living coral",
        "level_range": [9, 14],
        "health_multiplier": 3.5,
        "damage_multiplier": 1.4,
        "special_abilities": ["coral_spikes", "reef_regeneration", "calcify"],
        "spawn_weight": 20
      },
      {
        "id": "drowned_priest",
        "name": "High Priest Aquilus",
        "description": "The drowned priest still performing dark rituals",
        "level_range": [10, 14],
        "health_multiplier": 2.8,
        "damage_multiplier": 1.9,
        "special_abilities": ["drowning_curse", "water_blast", "summon_tide"],
        "spawn_weight": 20
      },
      {
        "id": "leviathan_calf",
        "name": "Young Leviathan",
        "description": "A juvenile sea serpent of immense size",
        "level_range": [9, 14],
        "health_multiplier": 3.2,
        "damage_multiplier": 1.7,
        "special_abilities": ["serpent_coil", "water_breath", "dive_strike"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 900,
      "gold": [400, 600],
      "guaranteed_loot": true,
      "loot_table": "dungeon_aquatic",
      "first_clear_bonus": {
        "xp": 1800,
        "title": "deep_diver",
        "items": ["tidal_trident"]
      }
    }
  }
};

// Add 2 more bosses to existing dungeons to make them all have 5
function expandExistingBossPools(dungeons) {
  // Goblin Warrens - already has 3, add 2 more
  dungeons.dungeons.goblin_warrens.boss_pool.push(
    {
      "id": "goblin_shaman",
      "name": "Grimtooth the Shaman",
      "description": "A cunning goblin shaman who wields dark magic",
      "level_range": [7, 10],
      "health_multiplier": 2.5,
      "damage_multiplier": 1.8,
      "special_abilities": ["hex_curse", "healing_totem", "lightning_bolt"],
      "spawn_weight": 20
    },
    {
      "id": "troll_enforcer",
      "name": "Gruk the Troll Enforcer",
      "description": "A massive troll hired to keep the goblins in line",
      "level_range": [8, 10],
      "health_multiplier": 3.5,
      "damage_multiplier": 1.4,
      "special_abilities": ["crushing_blow", "regeneration", "enrage"],
      "spawn_weight": 15
    }
  );

  // Crypts - already has 4, add 1 more
  dungeons.dungeons.crypts_of_the_forgotten.boss_pool.push(
    {
      "id": "vampire_count",
      "name": "Count Bloodmire",
      "description": "An immortal vampire who feeds on the living",
      "level_range": [12, 20],
      "health_multiplier": 3.9,
      "damage_multiplier": 2.0,
      "special_abilities": ["blood_drain", "mist_form", "charm", "bat_swarm"],
      "spawn_weight": 20
    }
  );

  // Crystal Depths - already has 4, add 1 more
  dungeons.dungeons.crystal_depths.boss_pool.push(
    {
      "id": "storm_warden",
      "name": "Voltaxus the Storm Warden",
      "description": "An elemental lord of lightning and thunder",
      "level_range": [22, 30],
      "health_multiplier": 5.7,
      "damage_multiplier": 2.7,
      "special_abilities": ["chain_lightning", "thunderstorm", "static_field", "overcharge"],
      "spawn_weight": 20
    }
  );

  // Shadow Keep - already has 5, perfect

  return dungeons;
}

// Merge and save
const expandedDungeons = expandExistingBossPools(existingDungeons);

// Add new difficulty tiers
expandedDungeons.dungeon_difficulties.very_hard = {
  "name": "Legendary",
  "stat_multiplier": 4.0,
  "reward_multiplier": 4.0,
  "color": "#FF6600"
};

expandedDungeons.dungeon_difficulties.extreme = {
  "name": "Transcendent",
  "stat_multiplier": 6.0,
  "reward_multiplier": 6.0,
  "color": "#FF0080"
};

// Add new dungeons
Object.assign(expandedDungeons.dungeons, newDungeons);

// Save to file
fs.writeFileSync(
  path.join(__dirname, 'data', 'dungeons_partial.json'),
  JSON.stringify(expandedDungeons, null, 2)
);

console.log('✅ Expanded dungeons created (Part 1)');
console.log(`📊 Total dungeons: ${Object.keys(expandedDungeons.dungeons).length}`);
console.log('📝 Easy dungeons added: 4 (bandit_hideout, haunted_ruins, spider_nest, sunken_temple)');
console.log('🎯 Boss pools expanded for: goblin_warrens, crypts, crystal_depths');
console.log('\n⚠️  Still need to add: 4 medium, 4 hard, 5 very_hard, 5 extreme dungeons');
