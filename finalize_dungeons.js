/**
 * Final Dungeon Generation - Very Hard & Extreme Tiers
 * Completes the full 25 dungeon expansion
 */

const fs = require('fs');
const path = require('path');

// Load nearly complete dungeons
const nearlyComplete = require('./data/dungeons_nearly_complete.json');

const veryHardDungeons = {
  "titan_vault": {
    "id": "titan_vault",
    "name": "Titan Vault",
    "description": "An ancient prison holding the last of the titan race",
    "difficulty": "very_hard",
    "required_level": 36,
    "max_level": 42,
    "recommended_party_size": 1,
    "location": "primordial_prison",
    "floors": 8,
    "rooms_per_floor": [10, 11, 11, 12, 12, 13, 13, 14],
    "boss_floor": 8,
    "time_limit": 7200,
    "respawn_time": 21600,
    "instance_type": "solo",
    "environmental_effects": {
      "titan_pressure": {
        "description": "Overwhelming presence reduces all stats by 15%",
        "all_stats_penalty": 0.15
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Titan constructs guard the vault",
        "monsters": [
          {"id": "titan_sentinel", "count": [2, 3]},
          {"id": "stone_giant", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "atlas_titan",
        "name": "Atlas the World Bearer",
        "description": "A titan who once held the world on his shoulders",
        "level_range": [36, 42],
        "health_multiplier": 10.0,
        "damage_multiplier": 4.0,
        "special_abilities": ["world_crush", "titan_roar", "earthquake", "mountain_throw"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.4,
            "transformation": "titan_fury",
            "description": "Enters berserker rage, attacks become devastating"
          }
        ]
      },
      {
        "id": "frost_titan",
        "name": "Ymir the Frost Titan",
        "description": "A titan of eternal ice and winter",
        "level_range": [36, 42],
        "health_multiplier": 9.5,
        "damage_multiplier": 4.2,
        "special_abilities": ["glacial_fist", "blizzard_breath", "ice_age"],
        "spawn_weight": 20
      },
      {
        "id": "storm_titan",
        "name": "Typhon the Storm Titan",
        "description": "A titan commanding storms and lightning",
        "level_range": [37, 42],
        "health_multiplier": 9.0,
        "damage_multiplier": 4.4,
        "special_abilities": ["lightning_storm", "hurricane_winds", "thunder_clap"],
        "spawn_weight": 20
      },
      {
        "id": "fire_titan",
        "name": "Prometheus the Fire Titan",
        "description": "The titan who stole fire from the gods",
        "level_range": [37, 42],
        "health_multiplier": 9.3,
        "damage_multiplier": 4.3,
        "special_abilities": ["eternal_flame", "inferno_strike", "burning_world"],
        "spawn_weight": 20
      },
      {
        "id": "void_titan",
        "name": "Cronus the Devourer",
        "description": "A titan who consumes all things",
        "level_range": [38, 42],
        "health_multiplier": 10.5,
        "damage_multiplier": 3.8,
        "special_abilities": ["devour", "time_stop", "reality_rend"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 30000,
      "gold": [8000, 15000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_titan",
      "legendary_chance": 0.9,
      "mythic_chance": 0.2,
      "first_clear_bonus": {
        "xp": 60000,
        "title": "titan_slayer",
        "items": ["atlas_gauntlets_mythic"],
        "passive_unlock": "titan_strength"
      }
    }
  },

  "frozen_citadel": {
    "id": "frozen_citadel",
    "name": "Frozen Citadel",
    "description": "An ice fortress ruled by the Winter Queen",
    "difficulty": "very_hard",
    "required_level": 37,
    "max_level": 43,
    "recommended_party_size": 1,
    "location": "eternal_winter",
    "floors": 8,
    "rooms_per_floor": [10, 11, 12, 12, 13, 13, 14, 15],
    "boss_floor": 8,
    "time_limit": 7200,
    "respawn_time": 21600,
    "instance_type": "solo",
    "environmental_effects": {
      "absolute_zero": {
        "description": "Extreme cold, movement speed reduced 30%",
        "speed_penalty": 0.30,
        "periodic_damage": 100
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Ice elementals and frost wraiths attack",
        "monsters": [
          {"id": "ice_elemental", "count": [3, 5]},
          {"id": "frost_wraith", "count": [2, 3]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "winter_queen",
        "name": "Frostmourne the Winter Queen",
        "description": "The immortal ruler of eternal winter",
        "level_range": [37, 43],
        "health_multiplier": 9.5,
        "damage_multiplier": 4.1,
        "special_abilities": ["ice_crown", "frozen_tomb", "winter_storm", "absolute_zero"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.3,
            "arena_change": "eternal_winter",
            "description": "Summons eternal winter, freezing everything"
          }
        ]
      },
      {
        "id": "ice_dragon_ancient",
        "name": "Boreas the Frost Dragon",
        "description": "An ancient dragon of pure ice",
        "level_range": [37, 43],
        "health_multiplier": 9.8,
        "damage_multiplier": 4.0,
        "special_abilities": ["ice_breath", "blizzard", "frozen_aura"],
        "spawn_weight": 20
      },
      {
        "id": "frost_lich_lord",
        "name": "Kel'thuzad the Frost Lich",
        "description": "A powerful lich commanding ice magic",
        "level_range": [38, 43],
        "health_multiplier": 8.8,
        "damage_multiplier": 4.4,
        "special_abilities": ["frost_nova", "ice_lance", "glacial_prison"],
        "spawn_weight": 20
      },
      {
        "id": "ice_giant_king",
        "name": "Fimbulvetr the Giant King",
        "description": "King of the ice giants",
        "level_range": [38, 43],
        "health_multiplier": 10.2,
        "damage_multiplier": 3.8,
        "special_abilities": ["avalanche", "ice_hammer", "permafrost"],
        "spawn_weight": 20
      },
      {
        "id": "northern_hydra",
        "name": "Nidhogg the Northern Hydra",
        "description": "A multi-headed serpent of ice",
        "level_range": [39, 43],
        "health_multiplier": 9.2,
        "damage_multiplier": 4.2,
        "special_abilities": ["hydra_bite", "regrow_heads", "frozen_blood"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 32000,
      "gold": [9000, 16000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_frost",
      "legendary_chance": 0.95,
      "mythic_chance": 0.25,
      "first_clear_bonus": {
        "xp": 64000,
        "title": "winter_breaker",
        "items": ["frostmourne_blade_mythic"],
        "passive_unlock": "cold_immunity"
      }
    }
  },

  "necropolis_eternal": {
    "id": "necropolis_eternal",
    "name": "Necropolis Eternal",
    "description": "A city of the dead ruled by ancient death lords",
    "difficulty": "very_hard",
    "required_level": 38,
    "max_level": 44,
    "recommended_party_size": 1,
    "location": "city_of_death",
    "floors": 8,
    "rooms_per_floor": [11, 11, 12, 12, 13, 14, 14, 15],
    "boss_floor": 8,
    "time_limit": 7200,
    "respawn_time": 21600,
    "instance_type": "solo",
    "environmental_effects": {
      "death_aura": {
        "description": "Life force slowly drains",
        "hp_drain_per_second": 5,
        "healing_penalty": 0.50
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Elite undead warriors patrol",
        "monsters": [
          {"id": "death_knight", "count": [2, 3]},
          {"id": "lich", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "death_emperor",
        "name": "Nagash the Death Emperor",
        "description": "The supreme lord of undeath",
        "level_range": [38, 44],
        "health_multiplier": 10.5,
        "damage_multiplier": 4.2,
        "special_abilities": ["death_wave", "soul_harvest", "undead_legion", "mortality_curse"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.5,
            "adds_spawn": {"id": "death_knight", "count": 4}
          },
          {
            "hp_threshold": 0.2,
            "ability_unlock": "undead_ascension",
            "description": "Ascends to ultimate undead form"
          }
        ]
      },
      {
        "id": "vampire_lord_ancient",
        "name": "Dracula the Ancient",
        "description": "The progenitor of all vampires",
        "level_range": [38, 44],
        "health_multiplier": 9.0,
        "damage_multiplier": 4.5,
        "special_abilities": ["blood_god", "mist_lord", "vampire_swarm"],
        "spawn_weight": 20
      },
      {
        "id": "bone_colossus",
        "name": "Ossuary the Bone Lord",
        "description": "A massive construct of countless bones",
        "level_range": [39, 44],
        "health_multiplier": 11.0,
        "damage_multiplier": 3.8,
        "special_abilities": ["bone_prison", "skeletal_army", "death_rattle"],
        "spawn_weight": 20
      },
      {
        "id": "archlich",
        "name": "Vecna the Archlich",
        "description": "An ancient lich of terrible power",
        "level_range": [39, 44],
        "health_multiplier": 8.5,
        "damage_multiplier": 4.7,
        "special_abilities": ["finger_of_death", "time_stop", "wish_perversion"],
        "spawn_weight": 20
      },
      {
        "id": "pale_rider",
        "name": "Death Incarnate",
        "description": "Death itself given physical form",
        "level_range": [40, 44],
        "health_multiplier": 9.5,
        "damage_multiplier": 4.5,
        "special_abilities": ["death_touch", "reap_souls", "inevitability"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 34000,
      "gold": [10000, 17000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_necropolis",
      "legendary_chance": 1.0,
      "mythic_chance": 0.3,
      "first_clear_bonus": {
        "xp": 68000,
        "title": "deathless",
        "items": ["death_emperor_crown_mythic"],
        "passive_unlock": "undeath_mastery"
      }
    }
  },

  "blood_cathedral": {
    "id": "blood_cathedral",
    "name": "Blood Cathedral",
    "description": "A corrupted church where blood magic is practiced",
    "difficulty": "very_hard",
    "required_level": 39,
    "max_level": 45,
    "recommended_party_size": 1,
    "location": "crimson_sanctum",
    "floors": 8,
    "rooms_per_floor": [11, 12, 12, 13, 13, 14, 14, 15],
    "boss_floor": 8,
    "time_limit": 7200,
    "respawn_time": 21600,
    "instance_type": "solo",
    "environmental_effects": {
      "blood_curse": {
        "description": "Damage taken converted to blood magic energy for enemies",
        "enemy_power_gain": 0.10
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Blood cultists perform dark rituals",
        "monsters": [
          {"id": "blood_mage", "count": [2, 4]},
          {"id": "vampire_noble", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "blood_archbishop",
        "name": "Cardinal Sanguis",
        "description": "The high priest of blood magic",
        "level_range": [39, 45],
        "health_multiplier": 9.0,
        "damage_multiplier": 4.4,
        "special_abilities": ["blood_sacrifice", "crimson_nova", "hemorrhage", "transfusion"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.3,
            "ability_unlock": "blood_god_blessing",
            "description": "Channels the power of the blood god"
          }
        ]
      },
      {
        "id": "vampire_progenitor",
        "name": "Cain the First Vampire",
        "description": "The original vampire, source of the bloodline",
        "level_range": [39, 45],
        "health_multiplier": 9.5,
        "damage_multiplier": 4.3,
        "special_abilities": ["primal_bite", "blood_pool", "immortal_form"],
        "spawn_weight": 20
      },
      {
        "id": "blood_elemental",
        "name": "Hemoglobin the Living Blood",
        "description": "Blood given sentience and malevolence",
        "level_range": [40, 45],
        "health_multiplier": 8.5,
        "damage_multiplier": 4.6,
        "special_abilities": ["blood_wave", "coagulate", "arterial_spray"],
        "spawn_weight": 20
      },
      {
        "id": "crimson_knight",
        "name": "Sir Sanguine",
        "description": "A knight corrupted by blood magic",
        "level_range": [40, 45],
        "health_multiplier": 10.0,
        "damage_multiplier": 4.0,
        "special_abilities": ["blood_blade", "life_tap", "crimson_shield"],
        "spawn_weight": 20
      },
      {
        "id": "hemomancer",
        "name": "Vladislaus the Hemomancer",
        "description": "A master of blood manipulation",
        "level_range": [41, 45],
        "health_multiplier": 8.8,
        "damage_multiplier": 4.5,
        "special_abilities": ["blood_puppet", "exsanguinate", "blood_prison"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 36000,
      "gold": [11000, 18000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_blood",
      "legendary_chance": 1.0,
      "mythic_chance": 0.35,
      "first_clear_bonus": {
        "xp": 72000,
        "title": "blood_purger",
        "items": ["sanguis_chalice_mythic"],
        "passive_unlock": "blood_magic_mastery"
      }
    }
  },

  "arcane_sanctum": {
    "id": "arcane_sanctum",
    "name": "Arcane Sanctum",
    "description": "A tower of powerful mages experimenting with forbidden magic",
    "difficulty": "very_hard",
    "required_level": 40,
    "max_level": 46,
    "recommended_party_size": 1,
    "location": "wizard_spire",
    "floors": 8,
    "rooms_per_floor": [12, 12, 13, 13, 14, 14, 15, 16],
    "boss_floor": 8,
    "time_limit": 7200,
    "respawn_time": 21600,
    "instance_type": "solo",
    "environmental_effects": {
      "wild_magic": {
        "description": "Random magical effects occur",
        "random_spell_chance": 0.25,
        "magic_damage_bonus": 0.40
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Archmages and their constructs defend",
        "monsters": [
          {"id": "archmage", "count": [2, 3]},
          {"id": "arcane_construct", "count": [2, 4]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "archmage_supreme",
        "name": "Archmage Eternus",
        "description": "The most powerful mortal mage",
        "level_range": [40, 46],
        "health_multiplier": 8.0,
        "damage_multiplier": 5.0,
        "special_abilities": ["arcane_barrage", "time_warp", "meteor_storm", "spell_steal"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.4,
            "ability_unlock": "ascendance",
            "description": "Transforms into pure arcane energy"
          }
        ]
      },
      {
        "id": "chronomancer",
        "name": "Tempus the Chronomancer",
        "description": "A mage who controls time itself",
        "level_range": [40, 46],
        "health_multiplier": 7.5,
        "damage_multiplier": 5.2,
        "special_abilities": ["time_stop", "temporal_loop", "future_sight"],
        "spawn_weight": 20
      },
      {
        "id": "necromancer_supreme",
        "name": "Thanatos the Deathlord",
        "description": "Master of necromantic arts",
        "level_range": [41, 46],
        "health_multiplier": 8.5,
        "damage_multiplier": 4.7,
        "special_abilities": ["death_magic", "soul_rend", "undead_horde"],
        "spawn_weight": 20
      },
      {
        "id": "elementalist_lord",
        "name": "Elementor Prime",
        "description": "Commands all elements simultaneously",
        "level_range": [41, 46],
        "health_multiplier": 8.3,
        "damage_multiplier": 4.8,
        "special_abilities": ["elemental_fury", "prismatic_blast", "elemental_shield"],
        "spawn_weight": 20
      },
      {
        "id": "void_mage",
        "name": "Nul the Void Mage",
        "description": "A mage who studied the void too deeply",
        "level_range": [42, 46],
        "health_multiplier": 7.8,
        "damage_multiplier": 5.3,
        "special_abilities": ["void_erasure", "anti_magic", "reality_warp"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 38000,
      "gold": [12000, 19000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_arcane",
      "legendary_chance": 1.0,
      "mythic_chance": 0.4,
      "first_clear_bonus": {
        "xp": 76000,
        "title": "spellbreaker_supreme",
        "items": ["eternus_staff_mythic"],
        "passive_unlock": "arcane_mastery"
      }
    }
  }
};

const extremeDungeons = {
  "cosmic_observatory": {
    "id": "cosmic_observatory",
    "name": "Cosmic Observatory",
    "description": "A tower gazing into the cosmos, revealing horrors beyond comprehension",
    "difficulty": "extreme",
    "required_level": 46,
    "max_level": 55,
    "recommended_party_size": 1,
    "location": "stargazer_peak",
    "floors": 10,
    "rooms_per_floor": [12, 13, 13, 14, 14, 15, 15, 16, 16, 17],
    "boss_floor": 10,
    "time_limit": 9000,
    "respawn_time": 43200,
    "instance_type": "solo",
    "environmental_effects": {
      "cosmic_radiation": {
        "description": "Exposure to cosmic energy causes random mutations",
        "periodic_damage": 150,
        "stat_fluctuation": 0.20
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Cosmic horrors materialize",
        "monsters": [
          {"id": "star_spawn", "count": [2, 4]},
          {"id": "void_horror", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "star_eater",
        "name": "Azathoth the Star Eater",
        "description": "A cosmic entity that devours stars",
        "level_range": [46, 55],
        "health_multiplier": 12.0,
        "damage_multiplier": 5.0,
        "special_abilities": ["cosmic_devour", "supernova", "black_hole", "stellar_collapse"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.5,
            "arena_change": "void_space",
            "description": "Drags you into the void of space"
          },
          {
            "hp_threshold": 0.2,
            "transformation": "true_cosmic_form",
            "description": "Reveals incomprehensible true form"
          }
        ],
        "enrage_timer": 900
      },
      {
        "id": "void_god",
        "name": "Nyarlathotep the Void God",
        "description": "The crawling chaos from beyond reality",
        "level_range": [46, 55],
        "health_multiplier": 11.0,
        "damage_multiplier": 5.3,
        "special_abilities": ["reality_distortion", "maddening_truth", "void_tentacles"],
        "spawn_weight": 20
      },
      {
        "id": "dimension_lord",
        "name": "Cthulhu the Dreaming God",
        "description": "An ancient being from another dimension",
        "level_range": [48, 55],
        "health_multiplier": 11.5,
        "damage_multiplier": 5.1,
        "special_abilities": ["nightmare_realm", "psychic_scream", "dimensional_rift"],
        "spawn_weight": 20
      },
      {
        "id": "cosmic_dragon",
        "name": "Bahamut the Cosmic Dragon",
        "description": "A dragon born from the cosmos itself",
        "level_range": [48, 55],
        "health_multiplier": 12.5,
        "damage_multiplier": 4.8,
        "special_abilities": ["cosmic_breath", "star_fall", "nebula_burst"],
        "spawn_weight": 20
      },
      {
        "id": "entropy_god",
        "name": "The End of All Things",
        "description": "The personification of universe's heat death",
        "level_range": [50, 55],
        "health_multiplier": 13.0,
        "damage_multiplier": 4.7,
        "special_abilities": ["heat_death", "entropy_wave", "universal_decay"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 50000,
      "gold": [20000, 35000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_cosmic",
      "legendary_chance": 1.0,
      "mythic_chance": 0.7,
      "first_clear_bonus": {
        "xp": 100000,
        "title": "cosmic_horror_slayer",
        "items": ["star_eater_cloak_mythic", "cosmic_knowledge_tome"],
        "passive_unlock": "cosmic_insight"
      }
    }
  },

  "primordial_abyss": {
    "id": "primordial_abyss",
    "name": "Primordial Abyss",
    "description": "The birthplace of existence, where ancient evils older than time dwell",
    "difficulty": "extreme",
    "required_level": 48,
    "max_level": 57,
    "recommended_party_size": 1,
    "location": "creation_void",
    "floors": 10,
    "rooms_per_floor": [13, 13, 14, 14, 15, 15, 16, 16, 17, 18],
    "boss_floor": 10,
    "time_limit": 9000,
    "respawn_time": 43200,
    "instance_type": "solo",
    "environmental_effects": {
      "primordial_chaos": {
        "description": "Reality itself is unstable",
        "all_stats_penalty": 0.20,
        "random_damage": 200
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Primordial beings attack",
        "monsters": [
          {"id": "primordial", "count": [2, 3]},
          {"id": "chaos_elemental", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "primordial_one",
        "name": "The First Being",
        "description": "The entity that existed before existence",
        "level_range": [48, 57],
        "health_multiplier": 13.0,
        "damage_multiplier": 5.2,
        "special_abilities": ["primordial_word", "creation_unmaking", "before_time", "chaos_birth"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.3,
            "ability_unlock": "primordial_form",
            "description": "Returns to its original chaotic form"
          }
        ],
        "enrage_timer": 1000
      },
      {
        "id": "chaos_serpent",
        "name": "Apophis the Chaos Serpent",
        "description": "The serpent of infinite chaos",
        "level_range": [48, 57],
        "health_multiplier": 12.5,
        "damage_multiplier": 5.4,
        "special_abilities": ["chaos_breath", "reality_consume", "endless_coil"],
        "spawn_weight": 20
      },
      {
        "id": "old_god",
        "name": "Yogg-Saron the Old God",
        "description": "An ancient god of madness and death",
        "level_range": [50, 57],
        "health_multiplier": 12.0,
        "damage_multiplier": 5.6,
        "special_abilities": ["sanity_drain", "tentacle_storm", "old_god_whispers"],
        "spawn_weight": 20
      },
      {
        "id": "leviathan_primordial",
        "name": "Tiamat the Primordial Leviathan",
        "description": "The mother of all monsters",
        "level_range": [50, 57],
        "health_multiplier": 14.0,
        "damage_multiplier": 4.9,
        "special_abilities": ["spawn_monsters", "hydra_heads", "primordial_roar"],
        "spawn_weight": 20,
        "phases": [
          {
            "hp_threshold": 0.5,
            "adds_spawn": {"id": "dragon_spawn", "count": 5}
          }
        ]
      },
      {
        "id": "abyss_walker",
        "name": "The Nameless Horror",
        "description": "A being so ancient it has no name",
        "level_range": [52, 57],
        "health_multiplier": 13.5,
        "damage_multiplier": 5.3,
        "special_abilities": ["nameless_dread", "abyss_gaze", "forgotten_power"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 60000,
      "gold": [25000, 40000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_primordial",
      "legendary_chance": 1.0,
      "mythic_chance": 0.8,
      "first_clear_bonus": {
        "xp": 120000,
        "title": "primordial_vanquisher",
        "items": ["chaos_heart_mythic", "primordial_essence"],
        "passive_unlock": "primordial_power"
      }
    }
  },

  "halls_of_ascension": {
    "id": "halls_of_ascension",
    "name": "Halls of Ascension",
    "description": "A celestial palace where fallen angels wage eternal war",
    "difficulty": "extreme",
    "required_level": 50,
    "max_level": 59,
    "recommended_party_size": 1,
    "location": "celestial_realm",
    "floors": 10,
    "rooms_per_floor": [13, 14, 14, 15, 15, 16, 16, 17, 17, 18],
    "boss_floor": 10,
    "time_limit": 9000,
    "respawn_time": 43200,
    "instance_type": "solo",
    "environmental_effects": {
      "divine_judgment": {
        "description": "Holy energy damages the unworthy",
        "holy_damage_tick": 180,
        "dark_resistance_penalty": 0.30
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Fallen angels bar your path",
        "monsters": [
          {"id": "fallen_angel", "count": [2, 3]},
          {"id": "celestial_guardian", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "lucifer_fallen",
        "name": "Lucifer the Lightbringer",
        "description": "The first and most powerful fallen angel",
        "level_range": [50, 59],
        "health_multiplier": 14.0,
        "damage_multiplier": 5.5,
        "special_abilities": ["morning_star", "fallen_grace", "rebellious_light", "pride"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.4,
            "transformation": "true_angel_form",
            "description": "Reveals his original angelic power"
          }
        ],
        "enrage_timer": 1100
      },
      {
        "id": "seraphim_corrupted",
        "name": "Azazel the Fallen Seraph",
        "description": "A six-winged angel corrupted by power",
        "level_range": [50, 59],
        "health_multiplier": 13.0,
        "damage_multiplier": 5.7,
        "special_abilities": ["holy_fire", "wings_of_ruin", "divine_corruption"],
        "spawn_weight": 20
      },
      {
        "id": "archangel_fallen",
        "name": "Michael the Betrayer",
        "description": "The greatest warrior angel, now fallen",
        "level_range": [52, 59],
        "health_multiplier": 13.5,
        "damage_multiplier": 5.6,
        "special_abilities": ["holy_blade", "angelic_wrath", "divine_judgment"],
        "spawn_weight": 20
      },
      {
        "id": "cherubim_dark",
        "name": "Metatron the Dark Voice",
        "description": "The voice of god, now speaking blasphemy",
        "level_range": [52, 59],
        "health_multiplier": 12.5,
        "damage_multiplier": 5.9,
        "special_abilities": ["word_of_power", "divine_silence", "unholy_proclamation"],
        "spawn_weight": 20
      },
      {
        "id": "throne_angel",
        "name": "Uriel the Burning Throne",
        "description": "An angel of the highest choir, fallen to darkness",
        "level_range": [54, 59],
        "health_multiplier": 14.5,
        "damage_multiplier": 5.4,
        "special_abilities": ["throne_fire", "celestial_storm", "divine_retribution"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 70000,
      "gold": [30000, 45000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_celestial",
      "legendary_chance": 1.0,
      "mythic_chance": 0.9,
      "first_clear_bonus": {
        "xp": 140000,
        "title": "angel_slayer",
        "items": ["lucifer_wings_mythic", "fallen_halo"],
        "passive_unlock": "divine_resistance"
      }
    }
  },

  "apocalypse_chamber": {
    "id": "apocalypse_chamber",
    "name": "Apocalypse Chamber",
    "description": "Where the four horsemen await the end of all things",
    "difficulty": "extreme",
    "required_level": 52,
    "max_level": 60,
    "recommended_party_size": 1,
    "location": "end_times",
    "floors": 10,
    "rooms_per_floor": [14, 14, 15, 15, 16, 16, 17, 17, 18, 19],
    "boss_floor": 10,
    "time_limit": 9000,
    "respawn_time": 43200,
    "instance_type": "solo",
    "environmental_effects": {
      "apocalyptic_aura": {
        "description": "The end times drain all hope",
        "all_stats_penalty": 0.25,
        "periodic_damage": 250
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Harbingers of the apocalypse attack",
        "monsters": [
          {"id": "apocalypse_herald", "count": [2, 3]},
          {"id": "doomsday_cultist", "count": [2, 4]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "death_horseman",
        "name": "Death, the Pale Rider",
        "description": "The fourth horseman, Death itself",
        "level_range": [52, 60],
        "health_multiplier": 15.0,
        "damage_multiplier": 6.0,
        "special_abilities": ["pale_horse", "death_scythe", "reaping", "mortality"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.25,
            "ability_unlock": "apocalypse",
            "description": "Brings the end of all life"
          }
        ],
        "enrage_timer": 1200
      },
      {
        "id": "war_horseman",
        "name": "War, the Red Rider",
        "description": "The first horseman, bringer of conflict",
        "level_range": [52, 60],
        "health_multiplier": 14.5,
        "damage_multiplier": 6.2,
        "special_abilities": ["war_cry", "blood_frenzy", "endless_conflict"],
        "spawn_weight": 20
      },
      {
        "id": "famine_horseman",
        "name": "Famine, the Black Rider",
        "description": "The third horseman, drainer of life",
        "level_range": [54, 60],
        "health_multiplier": 13.5,
        "damage_multiplier": 6.4,
        "special_abilities": ["starvation", "life_drain", "resource_depletion"],
        "spawn_weight": 20
      },
      {
        "id": "pestilence_horseman",
        "name": "Pestilence, the White Rider",
        "description": "The second horseman, spreader of plague",
        "level_range": [54, 60],
        "health_multiplier": 14.0,
        "damage_multiplier": 6.1,
        "special_abilities": ["pandemic", "plague_cloud", "mass_infection"],
        "spawn_weight": 20
      },
      {
        "id": "beast_revelation",
        "name": "The Beast of Revelation",
        "description": "The ultimate evil prophesied in apocalypse",
        "level_range": [56, 60],
        "health_multiplier": 16.0,
        "damage_multiplier": 5.8,
        "special_abilities": ["mark_of_beast", "seven_heads", "ten_horns", "blasphemy"],
        "spawn_weight": 15,
        "phases": [
          {
            "hp_threshold": 0.5,
            "adds_spawn": {"id": "apocalypse_herald", "count": 7}
          }
        ]
      }
    ],
    "rewards": {
      "xp": 80000,
      "gold": [35000, 50000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_apocalypse",
      "legendary_chance": 1.0,
      "mythic_chance": 1.0,
      "first_clear_bonus": {
        "xp": 160000,
        "title": "apocalypse_survivor",
        "items": ["death_scythe_mythic", "pale_horse_mount", "end_times_armor_set"],
        "passive_unlock": "apocalypse_mastery"
      }
    }
  }
};

// Reclassify shadow_keep to extreme
nearlyComplete.dungeons.shadow_keep.difficulty = "extreme";
nearlyComplete.dungeons.shadow_keep.required_level = 54;
nearlyComplete.dungeons.shadow_keep.max_level = 60;

// Add all new dungeons
Object.assign(nearlyComplete.dungeons, veryHardDungeons, extremeDungeons);

// Save final version
fs.writeFileSync(
  path.join(__dirname, 'data', 'dungeons.json'),
  JSON.stringify(nearlyComplete, null, 2)
);

console.log('\n🎉 ===== DUNGEON EXPANSION COMPLETE! ===== 🎉\n');
console.log(`📊 Total Dungeons: ${Object.keys(nearlyComplete.dungeons).length}`);
console.log('\n📈 Breakdown by Difficulty:');

const difficulties = {};
Object.values(nearlyComplete.dungeons).forEach(d => {
  difficulties[d.difficulty] = (difficulties[d.difficulty] || 0) + 1;
});

Object.entries(difficulties).forEach(([diff, count]) => {
  console.log(`  ${diff}: ${count} dungeons`);
});

console.log('\n🎯 Boss Pool Status:');
let totalBosses = 0;
Object.values(nearlyComplete.dungeons).forEach(d => {
  if (d.boss_pool) totalBosses += d.boss_pool.length;
});
console.log(`  Total Unique Bosses: ${totalBosses}`);

console.log('\n✅ dungeons.json has been updated!');
console.log('🔄 Restart server and run tests to verify all dungeons work correctly.');
