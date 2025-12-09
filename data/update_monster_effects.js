/**
 * Script to add seasonal, time, weather, and moon effects to all monsters
 * Based on creature templates and themes
 */

const fs = require('fs');
const path = require('path');

// Load monsters
const monstersPath = path.join(__dirname, 'monsters.json');
const monstersData = JSON.parse(fs.readFileSync(monstersPath, 'utf8'));

// Effect templates by creature type
const effectTemplates = {
  beast_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.1, spawn_multiplier: 1.2 }, // Breeding season
      summer: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      autumn: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      winter: { stat_multiplier: 0.9, spawn_multiplier: 0.7 } // Harder to find food
    },
    time_effects: {
      dawn: { stat_multiplier: 1.1 }, // Crepuscular
      day: { stat_multiplier: 1.0 },
      dusk: { stat_multiplier: 1.1 }, // Crepuscular
      night: { stat_multiplier: 0.9, spawn_multiplier: 0.7 }
    },
    moon_effects: {
      new_moon: { bonus: 0 },
      full_moon: { bonus: 0.1 },
      blood_moon: { bonus: 0.5 }
    },
    weather_effects: {
      rain: { multiplier: 0.9 },
      storm: { multiplier: 0.8 },
      snow: { multiplier: 0.7 },
      fog: { multiplier: 1.0 }
    }
  },
  
  beast_nocturnal: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      summer: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      autumn: { stat_multiplier: 1.1, spawn_multiplier: 1.2 },
      winter: { stat_multiplier: 0.8, spawn_multiplier: 0.6 }
    },
    time_effects: {
      dawn: { stat_multiplier: 0.8, spawn_multiplier: 0.3 },
      day: { stat_multiplier: 0.5, spawn_multiplier: 0.1 },
      dusk: { stat_multiplier: 1.1, spawn_multiplier: 1.5 },
      night: { stat_multiplier: 1.3, spawn_multiplier: 2.0 }
    },
    moon_effects: {
      new_moon: { bonus: 0.3 },
      full_moon: { bonus: 0.5 },
      blood_moon: { bonus: 1.0 }
    },
    weather_effects: {
      rain: { multiplier: 1.1 },
      storm: { multiplier: 1.0 },
      snow: { multiplier: 0.8 },
      fog: { multiplier: 1.4 }
    }
  },

  undead_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 0.9, spawn_multiplier: 0.8 }, // Life blooms
      summer: { stat_multiplier: 0.8, spawn_multiplier: 0.7 }, // Sun strong
      autumn: { stat_multiplier: 1.2, spawn_multiplier: 1.3 }, // Veil thins
      winter: { stat_multiplier: 1.1, spawn_multiplier: 1.2 } // Death season
    },
    time_effects: {
      dawn: { stat_multiplier: 0.7, spawn_multiplier: 0.5, damage_per_turn: 10 },
      day: { stat_multiplier: 0.5, spawn_multiplier: 0.1, damage_per_turn: 20 },
      dusk: { stat_multiplier: 1.0, spawn_multiplier: 1.2 },
      night: { stat_multiplier: 1.2, spawn_multiplier: 1.5 }
    },
    moon_effects: {
      new_moon: { bonus: 0.2 },
      full_moon: { bonus: 0.5, spawn_multiplier: 2.0 },
      blood_moon: { bonus: 1.0, spawn_multiplier: 3.0 }
    },
    weather_effects: {
      rain: { multiplier: 1.1 },
      storm: { multiplier: 1.2 },
      snow: { multiplier: 1.3 },
      fog: { multiplier: 1.5 }
    }
  },

  elemental_fire: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      summer: { stat_multiplier: 1.5, spawn_multiplier: 3.0 }, // Peak power
      autumn: { stat_multiplier: 1.1, spawn_multiplier: 1.2 },
      winter: { stat_multiplier: 0.7, spawn_multiplier: 0.5 } // Weakened
    },
    time_effects: {
      dawn: { stat_multiplier: 1.1 },
      day: { stat_multiplier: 1.2 },
      dusk: { stat_multiplier: 1.0 },
      night: { stat_multiplier: 0.9 }
    },
    moon_effects: {
      new_moon: { bonus: 0 },
      full_moon: { bonus: 0.2 },
      blood_moon: { bonus: 0.8 }
    },
    weather_effects: {
      rain: { multiplier: 0.5, damage_per_turn: 20 },
      storm: { multiplier: 0.4, damage_per_turn: 30 },
      snow: { multiplier: 0.3, damage_per_turn: 40 },
      fog: { multiplier: 0.9 },
      heat_wave: { multiplier: 1.8 }
    }
  },

  elemental_ice: {
    seasonal_boosts: {
      spring: { stat_multiplier: 0.8, spawn_multiplier: 0.6 },
      summer: { stat_multiplier: 0.4, spawn_multiplier: 0.2 }, // Very weak
      autumn: { stat_multiplier: 1.1, spawn_multiplier: 1.3 },
      winter: { stat_multiplier: 1.5, spawn_multiplier: 3.0 } // Peak power
    },
    time_effects: {
      dawn: { stat_multiplier: 1.0 },
      day: { stat_multiplier: 0.9 },
      dusk: { stat_multiplier: 1.0 },
      night: { stat_multiplier: 1.2 }
    },
    moon_effects: {
      new_moon: { bonus: 0.1 },
      full_moon: { bonus: 0.3 },
      blood_moon: { bonus: 0.7 }
    },
    weather_effects: {
      rain: { multiplier: 1.2 },
      storm: { multiplier: 1.1 },
      snow: { multiplier: 1.4 },
      fog: { multiplier: 1.1 },
      blizzard: { multiplier: 1.8 },
      heat_wave: { multiplier: 0.2 }
    }
  },

  elemental_lightning: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.2, spawn_multiplier: 1.5 }, // Spring storms
      summer: { stat_multiplier: 1.3, spawn_multiplier: 1.8 }, // Summer storms
      autumn: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      winter: { stat_multiplier: 0.8, spawn_multiplier: 0.7 }
    },
    time_effects: {
      dawn: { stat_multiplier: 1.0 },
      day: { stat_multiplier: 1.1 },
      dusk: { stat_multiplier: 1.2 },
      night: { stat_multiplier: 1.3 }
    },
    moon_effects: {
      new_moon: { bonus: 0.1 },
      full_moon: { bonus: 0.5 },
      blood_moon: { bonus: 1.0 }
    },
    weather_effects: {
      rain: { multiplier: 1.5 },
      storm: { multiplier: 2.0 },
      snow: { multiplier: 0.8 },
      fog: { multiplier: 1.0 }
    }
  },

  demon_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 0.9, spawn_multiplier: 0.8 },
      summer: { stat_multiplier: 1.3, spawn_multiplier: 1.5 }, // Heat empowers
      autumn: { stat_multiplier: 1.1, spawn_multiplier: 1.2 },
      winter: { stat_multiplier: 1.0, spawn_multiplier: 1.0 }
    },
    time_effects: {
      dawn: { stat_multiplier: 0.8, spawn_multiplier: 0.6 },
      day: { stat_multiplier: 0.7, spawn_multiplier: 0.4 },
      dusk: { stat_multiplier: 1.1, spawn_multiplier: 1.3 },
      night: { stat_multiplier: 1.3, spawn_multiplier: 1.8 }
    },
    moon_effects: {
      new_moon: { bonus: 0.3 },
      full_moon: { bonus: 0.6 },
      blood_moon: { bonus: 1.5 }
    },
    weather_effects: {
      rain: { multiplier: 0.9 },
      storm: { multiplier: 1.2 },
      snow: { multiplier: 0.8 },
      fog: { multiplier: 1.3 },
      heat_wave: { multiplier: 1.5 }
    }
  },

  dragon_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      summer: { stat_multiplier: 1.2, spawn_multiplier: 1.1 },
      autumn: { stat_multiplier: 1.2, spawn_multiplier: 1.0, loot_multiplier: 1.3 }, // Hoarding
      winter: { stat_multiplier: 1.1, spawn_multiplier: 0.9 }
    },
    time_effects: {
      dawn: { stat_multiplier: 1.0 },
      day: { stat_multiplier: 1.1 },
      dusk: { stat_multiplier: 1.1 },
      night: { stat_multiplier: 1.0 }
    },
    moon_effects: {
      new_moon: { bonus: 0.1 },
      full_moon: { bonus: 0.3 },
      blood_moon: { bonus: 0.8 }
    },
    weather_effects: {
      rain: { multiplier: 1.0 },
      storm: { multiplier: 1.2 },
      snow: { multiplier: 1.1 },
      fog: { multiplier: 1.0 }
    }
  },

  celestial_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.3, spawn_multiplier: 1.5 }, // Renewal
      summer: { stat_multiplier: 1.2, spawn_multiplier: 1.3 },
      autumn: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      winter: { stat_multiplier: 0.9, spawn_multiplier: 0.8 }
    },
    time_effects: {
      dawn: { stat_multiplier: 1.3, spawn_multiplier: 1.5 },
      day: { stat_multiplier: 1.4, spawn_multiplier: 1.8 },
      dusk: { stat_multiplier: 1.1, spawn_multiplier: 1.2 },
      night: { stat_multiplier: 0.8, spawn_multiplier: 0.5 }
    },
    moon_effects: {
      new_moon: { bonus: -0.2 },
      full_moon: { bonus: 0.5 },
      blood_moon: { bonus: 0.3 }
    },
    weather_effects: {
      rain: { multiplier: 1.0 },
      storm: { multiplier: 0.8 },
      snow: { multiplier: 1.0 },
      fog: { multiplier: 0.7 }
    }
  },

  aberration_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      summer: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      autumn: { stat_multiplier: 1.1, spawn_multiplier: 1.2 },
      winter: { stat_multiplier: 1.1, spawn_multiplier: 1.2 }
    },
    time_effects: {
      dawn: { stat_multiplier: 1.0, spawn_multiplier: 0.8 },
      day: { stat_multiplier: 0.9, spawn_multiplier: 0.6 },
      dusk: { stat_multiplier: 1.1, spawn_multiplier: 1.3 },
      night: { stat_multiplier: 1.3, spawn_multiplier: 1.8 }
    },
    moon_effects: {
      new_moon: { bonus: 0.5 },
      full_moon: { bonus: 0.4 },
      blood_moon: { bonus: 1.2 }
    },
    weather_effects: {
      rain: { multiplier: 1.1 },
      storm: { multiplier: 1.3 },
      snow: { multiplier: 1.0 },
      fog: { multiplier: 1.6 }
    }
  },

  construct_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      summer: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      autumn: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      winter: { stat_multiplier: 1.0, spawn_multiplier: 1.0 }
    },
    time_effects: {
      dawn: { stat_multiplier: 1.0 },
      day: { stat_multiplier: 1.0 },
      dusk: { stat_multiplier: 1.0 },
      night: { stat_multiplier: 1.0 }
    },
    moon_effects: {
      new_moon: { bonus: 0 },
      full_moon: { bonus: 0 },
      blood_moon: { bonus: 0.3 }
    },
    weather_effects: {
      rain: { multiplier: 1.0 },
      storm: { multiplier: 0.9 }, // Lightning risk
      snow: { multiplier: 1.0 },
      fog: { multiplier: 1.0 }
    }
  },

  humanoid_base: {
    seasonal_boosts: {
      spring: { stat_multiplier: 1.0, spawn_multiplier: 1.1 },
      summer: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      autumn: { stat_multiplier: 1.0, spawn_multiplier: 1.0 },
      winter: { stat_multiplier: 0.9, spawn_multiplier: 0.8 }
    },
    time_effects: {
      dawn: { stat_multiplier: 1.0 },
      day: { stat_multiplier: 1.1 },
      dusk: { stat_multiplier: 1.0 },
      night: { stat_multiplier: 0.9 }
    },
    moon_effects: {
      new_moon: { bonus: 0 },
      full_moon: { bonus: 0.1 },
      blood_moon: { bonus: 0.5 }
    },
    weather_effects: {
      rain: { multiplier: 0.9 },
      storm: { multiplier: 0.8 },
      snow: { multiplier: 0.8 },
      fog: { multiplier: 1.1 }
    }
  }
};

// Special creature overrides (for werewolves, vampires, etc.)
const specialOverrides = {
  werewolf: {
    time_effects: {
      dawn: { stat_multiplier: 0.5, form: 'transforming' },
      day: { stat_multiplier: 0, hostile: false, form: 'human' },
      dusk: { stat_multiplier: 0.5, form: 'transforming' },
      night: { stat_multiplier: 1.4, spawn_multiplier: 2.0, form: 'wolf' }
    },
    moon_effects: {
      new_moon: { bonus: 0 },
      full_moon: { bonus: 1.0, spawn_multiplier: 3.0, forced_transform: true },
      blood_moon: { bonus: 1.5, spawn_multiplier: 5.0, forced_transform: true, rage: true }
    }
  },
  
  vampire: {
    time_effects: {
      dawn: { stat_multiplier: 0.3, spawn_multiplier: 0.1, damage_per_turn: 50 },
      day: { stat_multiplier: 0, spawn_multiplier: 0, in_coffin: true, damage_per_turn: 100 },
      dusk: { stat_multiplier: 1.0, spawn_multiplier: 1.5 },
      night: { stat_multiplier: 1.3, spawn_multiplier: 2.0, blood_frenzy: true }
    },
    moon_effects: {
      new_moon: { bonus: 0.2 },
      full_moon: { bonus: 0.5, blood_frenzy_bonus: 0.3 },
      blood_moon: { bonus: 1.0, spawn_multiplier: 3.0, daywalking: true }
    }
  },

  ghost: {
    time_effects: {
      dawn: { stat_multiplier: 0.8, spawn_multiplier: 0.5 },
      day: { stat_multiplier: 0.6, spawn_multiplier: 0.3 },
      dusk: { stat_multiplier: 1.2, spawn_multiplier: 1.5 },
      night: { stat_multiplier: 1.4, spawn_multiplier: 2.0, phase_through_walls: true }
    },
    weather_effects: {
      rain: { multiplier: 1.2 },
      storm: { multiplier: 1.3 },
      snow: { multiplier: 1.1 },
      fog: { multiplier: 1.8 }
    }
  }
};

// Apply effects to monsters
function applyEffects(monster) {
  const template = monster.template;
  const id = monster.id;
  const name = monster.name.toLowerCase();
  
  // Check for special overrides first
  if (name.includes('werewolf') || id.includes('werewolf')) {
    Object.assign(monster, specialOverrides.werewolf);
  } else if (name.includes('vampire') || id.includes('vampire')) {
    Object.assign(monster, specialOverrides.vampire);
  } else if (name.includes('ghost') || name.includes('wraith') || name.includes('banshee') || name.includes('specter')) {
    Object.assign(monster, specialOverrides.ghost);
  }
  // Check for elemental subtypes
  else if (template === 'elemental_base') {
    if (name.includes('fire') || name.includes('flame') || name.includes('infernal')) {
      Object.assign(monster, effectTemplates.elemental_fire);
    } else if (name.includes('ice') || name.includes('frost') || name.includes('frozen')) {
      Object.assign(monster, effectTemplates.elemental_ice);
    } else if (name.includes('storm') || name.includes('lightning') || name.includes('thunder')) {
      Object.assign(monster, effectTemplates.elemental_lightning);
    } else {
      Object.assign(monster, effectTemplates.elemental_fire); // Default
    }
  }
  // Check for nocturnal beasts
  else if (template === 'beast_base') {
    if (name.includes('bat') || name.includes('owl') || name.includes('wolf') || 
        name.includes('panther') || name.includes('spider')) {
      Object.assign(monster, effectTemplates.beast_nocturnal);
    } else {
      Object.assign(monster, effectTemplates.beast_base);
    }
  }
  // Apply template-based effects
  else if (effectTemplates[template]) {
    Object.assign(monster, effectTemplates[template]);
  }
  
  return monster;
}

// Process all monsters
console.log('Adding seasonal, time, weather, and moon effects to monsters...');
let processedCount = 0;

monstersData.monsters = monstersData.monsters.map(monster => {
  const updated = applyEffects(monster);
  processedCount++;
  return updated;
});

// Save updated monsters
fs.writeFileSync(monstersPath, JSON.stringify(monstersData, null, 2));

console.log(`✅ Successfully updated ${processedCount} monsters with environmental effects`);
console.log('Effects added:');
console.log('  - Seasonal boosts (spring/summer/autumn/winter)');
console.log('  - Time effects (dawn/day/dusk/night)');
console.log('  - Moon effects (new_moon/full_moon/blood_moon)');
console.log('  - Weather effects (rain/storm/snow/fog)');
console.log('\nSpecial creature behaviors:');
console.log('  - Werewolves: Transform at night and full moon');
console.log('  - Vampires: Cannot spawn during day, blood frenzy at night');
console.log('  - Ghosts: Phase through walls at night, empowered in fog');
console.log('  - Undead: Take sun damage during day, empowered at night');
console.log('  - Fire Elementals: +50% in summer, -50% in rain');
console.log('  - Ice Elementals: +50% in winter, -60% in summer');
