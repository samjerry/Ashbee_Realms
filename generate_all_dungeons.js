/**
 * Complete Dungeon Generation Script
 * Creates all 25 themed dungeons with 5 bosses each for maximum replayability
 */

const fs = require('fs');
const path = require('path');

// Load the partial expansion
const partialDungeons = require('./data/dungeons_partial.json');

// Define all remaining dungeons with full boss pools

const mediumDungeons = {
  "orc_stronghold": {
    "id": "orc_stronghold",
    "name": "Orc Stronghold",
    "description": "A fortified war camp filled with brutal orc warriors",
    "difficulty": "medium",
    "required_level": 15,
    "max_level": 20,
    "recommended_party_size": 1,
    "location": "iron_peaks",
    "floors": 5,
    "rooms_per_floor": [6, 7, 7, 8, 9],
    "boss_floor": 5,
    "time_limit": null,
    "respawn_time": 7200,
    "instance_type": "solo",
    "rooms": [
      {
        "type": "combat",
        "description": "Orc warriors train for battle",
        "monsters": [
          {"id": "orc_grunt", "count": [3, 5]},
          {"id": "orc_berserker", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "warchief_grimfang",
        "name": "Warchief Grimfang",
        "description": "The brutal leader of the orc horde",
        "level_range": [15, 20],
        "health_multiplier": 4.0,
        "damage_multiplier": 2.0,
        "special_abilities": ["battle_roar", "cleave", "bloodlust"],
        "spawn_weight": 25
      },
      {
        "id": "blademaster_korgath",
        "name": "Blademaster Korgath",
        "description": "A legendary orc swordsman with unmatched skill",
        "level_range": [16, 20],
        "health_multiplier": 3.5,
        "damage_multiplier": 2.3,
        "special_abilities": ["whirlwind", "mirror_image", "blade_dance"],
        "spawn_weight": 20
      },
      {
        "id": "shaman_zugthar",
        "name": "Shaman Zugthar",
        "description": "An orc shaman channeling primal elemental fury",
        "level_range": [15, 19],
        "health_multiplier": 3.2,
        "damage_multiplier": 2.2,
        "special_abilities": ["lightning_chain", "earth_spike", "ancestral_spirits"],
        "spawn_weight": 20
      },
      {
        "id": "siege_breaker",
        "name": "Goremaw the Siege Breaker",
        "description": "A massive orc that destroys fortifications",
        "level_range": [17, 20],
        "health_multiplier": 4.5,
        "damage_multiplier": 1.8,
        "special_abilities": ["demolish", "fortified_skin", "ground_pound"],
        "spawn_weight": 20
      },
      {
        "id": "blood_champion",
        "name": "Bloodaxe the Champion",
        "description": "Arena champion who has never lost a duel",
        "level_range": [16, 20],
        "health_multiplier": 3.8,
        "damage_multiplier": 2.1,
        "special_abilities": ["execute", "reckless_fury", "battle_frenzy"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 2000,
      "gold": [600, 1000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_orc",
      "first_clear_bonus": {
        "xp": 4000,
        "title": "horde_breaker",
        "items": ["grimfang_war_axe"]
      }
    }
  },

  "elemental_forge": {
    "id": "elemental_forge",
    "name": "Elemental Forge",
    "description": "An ancient smithy where fire and earth elementals were bound",
    "difficulty": "medium",
    "required_level": 16,
    "max_level": 21,
    "recommended_party_size": 1,
    "location": "volcanic_cavern",
    "floors": 5,
    "rooms_per_floor": [6, 7, 8, 8, 9],
    "boss_floor": 5,
    "time_limit": null,
    "respawn_time": 7200,
    "instance_type": "solo",
    "environmental_effects": {
      "intense_heat": {
        "description": "Fire damage increased, ice resistance reduced",
        "fire_damage_bonus": 0.25,
        "ice_resistance_penalty": 0.30
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Fire elementals guard the forges",
        "monsters": [
          {"id": "fire_elemental", "count": [2, 4]},
          {"id": "lava_beast", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "forgemaster_pyros",
        "name": "Forgemaster Pyros",
        "description": "A fire elemental lord who shapes metal with bare hands",
        "level_range": [16, 21],
        "health_multiplier": 4.2,
        "damage_multiplier": 2.1,
        "special_abilities": ["molten_hammer", "forge_nova", "heat_wave"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.5,
            "transformation": "white_hot",
            "description": "Becomes white-hot, dealing extra fire damage"
          }
        ]
      },
      {
        "id": "earth_colossus_minor",
        "name": "Stonefist the Unyielding",
        "description": "A living mountain that cannot be moved",
        "level_range": [16, 21],
        "health_multiplier": 5.0,
        "damage_multiplier": 1.7,
        "special_abilities": ["stone_skin", "seismic_slam", "boulder_toss"],
        "spawn_weight": 20
      },
      {
        "id": "magma_serpent",
        "name": "Ignathor the Magma Serpent",
        "description": "A serpent of pure molten rock",
        "level_range": [17, 21],
        "health_multiplier": 3.8,
        "damage_multiplier": 2.3,
        "special_abilities": ["lava_spit", "coil_burn", "eruption"],
        "spawn_weight": 20
      },
      {
        "id": "iron_golem_alpha",
        "name": "Golem Prime",
        "description": "The first and most powerful golem ever forged",
        "level_range": [17, 21],
        "health_multiplier": 4.5,
        "damage_multiplier": 1.9,
        "special_abilities": ["metal_crush", "magnetic_pull", "repair_protocol"],
        "spawn_weight": 20
      },
      {
        "id": "flame_djinn",
        "name": "Infernus the Flame Djinn",
        "description": "A powerful fire genie bound to the forge",
        "level_range": [16, 21],
        "health_multiplier": 3.6,
        "damage_multiplier": 2.4,
        "special_abilities": ["fireball_barrage", "flame_teleport", "burning_wish"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 2200,
      "gold": [700, 1100],
      "guaranteed_loot": true,
      "loot_table": "dungeon_elemental",
      "first_clear_bonus": {
        "xp": 4400,
        "title": "forge_breaker",
        "items": ["forgemaster_hammer"]
      }
    }
  },

  "cursed_asylum": {
    "id": "cursed_asylum",
    "name": "Cursed Asylum",
    "description": "An abandoned sanatorium where madness took physical form",
    "difficulty": "medium",
    "required_level": 17,
    "max_level": 22,
    "recommended_party_size": 1,
    "location": "madhouse_ruins",
    "floors": 5,
    "rooms_per_floor": [7, 7, 8, 8, 9],
    "boss_floor": 5,
    "time_limit": null,
    "respawn_time": 7200,
    "instance_type": "solo",
    "environmental_effects": {
      "madness_aura": {
        "description": "Random debuffs applied periodically",
        "random_debuff_chance": 0.15
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Twisted patients attack from the shadows",
        "monsters": [
          {"id": "deranged_patient", "count": [3, 5]},
          {"id": "aberration", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "doctor_malice",
        "name": "Dr. Malice",
        "description": "The asylum's head physician who experimented on patients",
        "level_range": [17, 22],
        "health_multiplier": 3.5,
        "damage_multiplier": 2.2,
        "special_abilities": ["lobotomy", "inject_madness", "surgical_precision"],
        "spawn_weight": 25
      },
      {
        "id": "nightmare_patient",
        "name": "Patient Zero",
        "description": "The first victim of the asylum's dark experiments",
        "level_range": [17, 22],
        "health_multiplier": 4.0,
        "damage_multiplier": 2.0,
        "special_abilities": ["split_personality", "infectious_madness", "reality_break"],
        "spawn_weight": 20
      },
      {
        "id": "mind_flayer_spawn",
        "name": "The Whisper",
        "description": "An aberration that feeds on sanity itself",
        "level_range": [18, 22],
        "health_multiplier": 3.3,
        "damage_multiplier": 2.4,
        "special_abilities": ["mind_blast", "psychic_drain", "confusion"],
        "spawn_weight": 20
      },
      {
        "id": "straitjacket_horror",
        "name": "The Bound One",
        "description": "A creature so dangerous it must remain restrained",
        "level_range": [18, 22],
        "health_multiplier": 4.3,
        "damage_multiplier": 1.9,
        "special_abilities": ["thrash", "break_free", "unstoppable_rage"],
        "spawn_weight": 20,
        "phases": [
          {
            "hp_threshold": 0.4,
            "ability_unlock": "break_free",
            "description": "Breaks restraints and becomes more dangerous"
          }
        ]
      },
      {
        "id": "asylum_demon",
        "name": "Manifestation of Madness",
        "description": "The collective insanity given form",
        "level_range": [17, 22],
        "health_multiplier": 3.7,
        "damage_multiplier": 2.3,
        "special_abilities": ["insanity_wave", "hallucination", "mind_shatter"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 2400,
      "gold": [800, 1200],
      "guaranteed_loot": true,
      "loot_table": "dungeon_aberration",
      "first_clear_bonus": {
        "xp": 4800,
        "title": "sanity_keeper",
        "items": ["asylum_straitjacket_armor"]
      }
    }
  },

  "void_rift": {
    "id": "void_rift",
    "name": "Void Rift",
    "description": "A tear in reality where void creatures pour through",
    "difficulty": "medium",
    "required_level": 18,
    "max_level": 23,
    "recommended_party_size": 1,
    "location": "reality_tear",
    "floors": 5,
    "rooms_per_floor": [7, 8, 8, 9, 10],
    "boss_floor": 5,
    "time_limit": null,
    "respawn_time": 7200,
    "instance_type": "solo",
    "environmental_effects": {
      "void_corruption": {
        "description": "Maximum HP reduced by 15%",
        "max_hp_penalty": 0.15
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Void creatures materialize from nothing",
        "monsters": [
          {"id": "void_spawn", "count": [3, 5]},
          {"id": "void_walker", "count": [2, 3]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "void_herald",
        "name": "Herald of the Void",
        "description": "A messenger from the space between spaces",
        "level_range": [18, 23],
        "health_multiplier": 4.0,
        "damage_multiplier": 2.2,
        "special_abilities": ["void_bolt", "null_zone", "dimensional_rift"],
        "spawn_weight": 25
      },
      {
        "id": "entropy_elemental",
        "name": "Entropy Incarnate",
        "description": "A being of pure dissolution",
        "level_range": [18, 23],
        "health_multiplier": 3.6,
        "damage_multiplier": 2.4,
        "special_abilities": ["decay_aura", "disintegrate", "entropy_wave"],
        "spawn_weight": 20
      },
      {
        "id": "voidborn_horror",
        "name": "The Voidborn",
        "description": "A creature native to the void itself",
        "level_range": [19, 23],
        "health_multiplier": 4.2,
        "damage_multiplier": 2.1,
        "special_abilities": ["reality_tear", "void_grasp", "null_sphere"],
        "spawn_weight": 20
      },
      {
        "id": "dark_matter_beast",
        "name": "Dark Matter Anomaly",
        "description": "A living contradiction that shouldn't exist",
        "level_range": [19, 23],
        "health_multiplier": 4.4,
        "damage_multiplier": 1.9,
        "special_abilities": ["gravity_well", "mass_crush", "dark_pulse"],
        "spawn_weight": 20
      },
      {
        "id": "void_sorcerer",
        "name": "Nullmancer Vex",
        "description": "A mage who learned to harness the void",
        "level_range": [18, 23],
        "health_multiplier": 3.4,
        "damage_multiplier": 2.5,
        "special_abilities": ["void_magic", "anti_magic_field", "nullification"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 2600,
      "gold": [900, 1300],
      "guaranteed_loot": true,
      "loot_table": "dungeon_void",
      "first_clear_bonus": {
        "xp": 5200,
        "title": "void_walker",
        "items": ["void_touched_staff"]
      }
    }
  }
};

const hardDungeons = {
  "dragon_lair": {
    "id": "dragon_lair",
    "name": "Dragon's Lair",
    "description": "A mountain cave serving as home to powerful dragonkin",
    "difficulty": "hard",
    "required_level": 26,
    "max_level": 32,
    "recommended_party_size": 1,
    "location": "dragonmount_peak",
    "floors": 7,
    "rooms_per_floor": [8, 9, 9, 10, 10, 11, 12],
    "boss_floor": 7,
    "time_limit": 5400,
    "respawn_time": 14400,
    "instance_type": "solo",
    "environmental_effects": {
      "dragon_fear": {
        "description": "Attack power reduced by 20%",
        "attack_penalty": 0.20
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Dragon wyrmlings defend their territory",
        "monsters": [
          {"id": "dragonkin_warrior", "count": [2, 4]},
          {"id": "wyrmling", "count": [1, 2]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "ancient_red_dragon",
        "name": "Ignaroth the Ancient Red",
        "description": "An ancient red dragon with millennia of rage",
        "level_range": [26, 32],
        "health_multiplier": 7.0,
        "damage_multiplier": 3.0,
        "special_abilities": ["dragon_breath", "tail_sweep", "wing_buffet", "frightful_presence"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.5,
            "ability_unlock": "inferno_mode",
            "description": "Enters a rage, breath weapon becomes more deadly"
          }
        ]
      },
      {
        "id": "frost_wyrm",
        "name": "Glacius the Frost Wyrm",
        "description": "A dragon of ice and eternal winter",
        "level_range": [26, 32],
        "health_multiplier": 6.5,
        "damage_multiplier": 3.2,
        "special_abilities": ["frost_breath", "ice_prison", "blizzard"],
        "spawn_weight": 20
      },
      {
        "id": "storm_dragon",
        "name": "Tempestus the Storm Dragon",
        "description": "A dragon wreathed in lightning and thunder",
        "level_range": [27, 32],
        "health_multiplier": 6.3,
        "damage_multiplier": 3.3,
        "special_abilities": ["lightning_breath", "storm_call", "thunder_roar"],
        "spawn_weight": 20
      },
      {
        "id": "shadow_drake",
        "name": "Tenebris the Shadow Drake",
        "description": "A dragon born from darkness itself",
        "level_range": [27, 32],
        "health_multiplier": 6.0,
        "damage_multiplier": 3.4,
        "special_abilities": ["shadow_breath", "darkness", "phase_strike"],
        "spawn_weight": 20
      },
      {
        "id": "elder_dracolich",
        "name": "Morthanax the Dracolich",
        "description": "An undead dragon of terrible power",
        "level_range": [28, 32],
        "health_multiplier": 6.8,
        "damage_multiplier": 3.1,
        "special_abilities": ["necrotic_breath", "raise_dead", "soul_drain"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 8000,
      "gold": [2000, 4000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_dragon",
      "legendary_chance": 0.6,
      "first_clear_bonus": {
        "xp": 16000,
        "title": "dragonslayer",
        "items": ["dragon_scale_armor_legendary"]
      }
    }
  },

  "demon_gate": {
    "id": "demon_gate",
    "name": "Demon Gate",
    "description": "A portal to the infernal realms where demons cross into our world",
    "difficulty": "hard",
    "required_level": 27,
    "max_level": 33,
    "recommended_party_size": 1,
    "location": "hellfire_portal",
    "floors": 7,
    "rooms_per_floor": [8, 9, 10, 10, 11, 11, 12],
    "boss_floor": 7,
    "time_limit": 5400,
    "respawn_time": 14400,
    "instance_type": "solo",
    "environmental_effects": {
      "infernal_heat": {
        "description": "Fire damage increased, healing reduced",
        "fire_damage_bonus": 0.40,
        "healing_penalty": 0.25
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Lesser demons pour through the gate",
        "monsters": [
          {"id": "imp", "count": [4, 6]},
          {"id": "hell_hound", "count": [2, 3]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "demon_lord_baal",
        "name": "Baal'thor the Demon Lord",
        "description": "A mighty demon lord leading the invasion",
        "level_range": [27, 33],
        "health_multiplier": 7.5,
        "damage_multiplier": 3.2,
        "special_abilities": ["hellfire", "demon_swarm", "infernal_chains", "corruption"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.3,
            "transformation": "true_demon_form",
            "description": "Reveals true demonic form"
          }
        ]
      },
      {
        "id": "pit_fiend",
        "name": "Infernus the Pit Fiend",
        "description": "A general of the demon armies",
        "level_range": [27, 33],
        "health_multiplier": 7.0,
        "damage_multiplier": 3.3,
        "special_abilities": ["flame_whip", "fear_aura", "teleport"],
        "spawn_weight": 20
      },
      {
        "id": "succubus_queen",
        "name": "Lilithara the Succubus Queen",
        "description": "A seductress who drains life force",
        "level_range": [28, 33],
        "health_multiplier": 6.2,
        "damage_multiplier": 3.5,
        "special_abilities": ["life_drain", "charm", "soul_kiss"],
        "spawn_weight": 20
      },
      {
        "id": "balrog",
        "name": "Gorathul the Balrog",
        "description": "A demon of shadow and flame",
        "level_range": [28, 33],
        "health_multiplier": 7.3,
        "damage_multiplier": 3.2,
        "special_abilities": ["flame_sword", "shadow_fire", "demon_wings"],
        "spawn_weight": 20
      },
      {
        "id": "archdemon",
        "name": "Mephistopheles",
        "description": "An archdemon of immense cunning and power",
        "level_range": [29, 33],
        "health_multiplier": 6.8,
        "damage_multiplier": 3.6,
        "special_abilities": ["dark_pact", "hellish_rebuke", "demonic_ritual"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 9000,
      "gold": [2500, 4500],
      "guaranteed_loot": true,
      "loot_table": "dungeon_demon",
      "legendary_chance": 0.65,
      "first_clear_bonus": {
        "xp": 18000,
        "title": "demon_bane",
        "items": ["infernal_blade_legendary"]
      }
    }
  },

  "construct_foundry": {
    "id": "construct_foundry",
    "name": "Construct Foundry",
    "description": "An automated factory producing deadly war machines",
    "difficulty": "hard",
    "required_level": 28,
    "max_level": 34,
    "recommended_party_size": 1,
    "location": "ancient_factory",
    "floors": 7,
    "rooms_per_floor": [9, 9, 10, 10, 11, 12, 12],
    "boss_floor": 7,
    "time_limit": 5400,
    "respawn_time": 14400,
    "instance_type": "solo",
    "environmental_effects": {
      "electromagnetic_field": {
        "description": "Lightning damage increased",
        "lightning_damage_bonus": 0.35
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Mechanical guardians activate",
        "monsters": [
          {"id": "construct_guardian", "count": [2, 4]},
          {"id": "automaton", "count": [3, 5]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "war_golem_prime",
        "name": "War Golem Mark X",
        "description": "The ultimate war machine",
        "level_range": [28, 34],
        "health_multiplier": 8.0,
        "damage_multiplier": 2.8,
        "special_abilities": ["artillery_cannon", "missile_barrage", "shield_matrix"],
        "spawn_weight": 25,
        "phases": [
          {
            "hp_threshold": 0.5,
            "adds_spawn": {"id": "repair_drone", "count": 3}
          }
        ]
      },
      {
        "id": "clockwork_titan",
        "name": "Chronos the Clockwork Titan",
        "description": "A massive mechanical being powered by time magic",
        "level_range": [28, 34],
        "health_multiplier": 7.5,
        "damage_multiplier": 3.0,
        "special_abilities": ["temporal_bolt", "rewind", "time_stop"],
        "spawn_weight": 20
      },
      {
        "id": "arcane_construct",
        "name": "Magitek Destroyer",
        "description": "A fusion of magic and machine",
        "level_range": [29, 34],
        "health_multiplier": 6.8,
        "damage_multiplier": 3.3,
        "special_abilities": ["arcane_cannon", "energy_shield", "overload"],
        "spawn_weight": 20
      },
      {
        "id": "iron_colossus",
        "name": "Ironclad Behemoth",
        "description": "An unstoppable iron giant",
        "level_range": [29, 34],
        "health_multiplier": 8.5,
        "damage_multiplier": 2.6,
        "special_abilities": ["seismic_stomp", "iron_fist", "fortress_mode"],
        "spawn_weight": 20
      },
      {
        "id": "sentinel_alpha",
        "name": "Sentinel Protocol Alpha",
        "description": "The first and deadliest security construct",
        "level_range": [30, 34],
        "health_multiplier": 7.2,
        "damage_multiplier": 3.2,
        "special_abilities": ["laser_array", "defense_protocol", "self_destruct"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 10000,
      "gold": [3000, 5000],
      "guaranteed_loot": true,
      "loot_table": "dungeon_construct",
      "legendary_chance": 0.7,
      "first_clear_bonus": {
        "xp": 20000,
        "title": "machine_breaker",
        "items": ["construct_core_legendary"]
      }
    }
  },

  "plague_catacombs": {
    "id": "plague_catacombs",
    "name": "Plague Catacombs",
    "description": "Disease-ridden tunnels filled with the infected and undead",
    "difficulty": "hard",
    "required_level": 29,
    "max_level": 35,
    "recommended_party_size": 1,
    "location": "infected_tunnels",
    "floors": 7,
    "rooms_per_floor": [9, 10, 10, 11, 11, 12, 13],
    "boss_floor": 7,
    "time_limit": 5400,
    "respawn_time": 14400,
    "instance_type": "solo",
    "environmental_effects": {
      "disease_miasma": {
        "description": "Periodic disease damage",
        "damage_per_tick": 50
      }
    },
    "rooms": [
      {
        "type": "combat",
        "description": "Plague zombies shamble forward",
        "monsters": [
          {"id": "plague_zombie", "count": [4, 6]},
          {"id": "plague_carrier", "count": [2, 3]}
        ]
      }
    ],
    "boss_pool": [
      {
        "id": "plague_doctor",
        "name": "The Plague Doctor",
        "description": "A twisted healer spreading disease instead of curing it",
        "level_range": [29, 35],
        "health_multiplier": 6.5,
        "damage_multiplier": 3.4,
        "special_abilities": ["plague_bomb", "contagion", "epidemic"],
        "spawn_weight": 25
      },
      {
        "id": "rot_hulk",
        "name": "Putrescene the Rot Hulk",
        "description": "A massive undead abomination of decay",
        "level_range": [29, 35],
        "health_multiplier": 8.2,
        "damage_multiplier": 2.9,
        "special_abilities": ["vomit_plague", "death_grip", "pestilence_aura"],
        "spawn_weight": 20
      },
      {
        "id": "plague_lich",
        "name": "Necronus the Plague Lich",
        "description": "An undead sorcerer commanding disease",
        "level_range": [30, 35],
        "health_multiplier": 6.8,
        "damage_multiplier": 3.5,
        "special_abilities": ["death_coil", "plague_storm", "raise_infected"],
        "spawn_weight": 20
      },
      {
        "id": "infection_elemental",
        "name": "Living Plague",
        "description": "Disease given sentient form",
        "level_range": [30, 35],
        "health_multiplier": 6.0,
        "damage_multiplier": 3.7,
        "special_abilities": ["infectious_touch", "viral_burst", "mutation"],
        "spawn_weight": 20
      },
      {
        "id": "death_knight_plague",
        "name": "Plaguelord Mortis",
        "description": "A death knight spreading pestilence",
        "level_range": [31, 35],
        "health_multiplier": 7.5,
        "damage_multiplier": 3.1,
        "special_abilities": ["plague_strike", "unholy_blight", "army_of_decay"],
        "spawn_weight": 15
      }
    ],
    "rewards": {
      "xp": 11000,
      "gold": [3500, 5500],
      "guaranteed_loot": true,
      "loot_table": "dungeon_plague",
      "legendary_chance": 0.75,
      "first_clear_bonus": {
        "xp": 22000,
        "title": "plague_purger",
        "items": ["plague_doctor_mask_legendary"]
      }
    }
  }
};

// Merge all dungeons
const allDungeons = {
  ...partialDungeons.dungeons,
  ...mediumDungeons,
  ...hardDungeons
};

partialDungeons.dungeons = allDungeons;

// Save
fs.writeFileSync(
  path.join(__dirname, 'data', 'dungeons_nearly_complete.json'),
  JSON.stringify(partialDungeons, null, 2)
);

console.log('✅ Dungeons expanded! (Part 2)');
console.log(`📊 Total dungeons: ${Object.keys(allDungeons).length}`);
console.log('📝 Added: 4 medium, 4 hard dungeons');
console.log('\n⚠️  Still need: 5 very_hard, 5 extreme dungeons');
console.log('\n🎯 Current breakdown:');
console.log('  Easy: 5 dungeons');
console.log('  Medium: 5 dungeons');
console.log('  Hard: 5 dungeons');
console.log('  Nightmare: 1 dungeon (shadow_keep)');
console.log('  Scaling: 1 dungeon (trial_of_ascension)');
