/**
 * Combat Simulator
 * Simulates thousands of combat encounters to test balance
 */

const fs = require('fs');
const path = require('path');

// Load game data
const monsters = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/monsters.json'), 'utf8')).monsters;
const classes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/classes.json'), 'utf8')).classes;
const weaponsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gear_weapons.json'), 'utf8')).weapons;
const armorData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gear_armor.json'), 'utf8')).armor;

// Flatten gear arrays (they're nested by rarity)
const gearWeapons = Object.values(weaponsData).flat();
const gearArmor = Object.values(armorData).flat();

class CombatSimulator {
  constructor() {
    this.results = {
      simulations: [],
      classWinRates: {},
      monsterDifficulty: {},
      averageCombatLength: 0,
      recommendations: []
    };
  }

  // Simulate combat between player and monster
  simulateCombat(player, monster, verbose = false) {
    let playerHP = player.stats.max_hp;
    let monsterHP = monster.stats[0]; // HP
    let turn = 0;
    const maxTurns = 50; // Prevent infinite loops
    const log = [];

    while (playerHP > 0 && monsterHP > 0 && turn < maxTurns) {
      turn++;

      // Player's turn
      const playerDamage = this.calculateDamage(
        player.stats.attack,
        monster.stats[2], // Defense
        player.stats.critChance || 0.05,
        player.stats.critMultiplier || 1.5
      );
      monsterHP -= playerDamage;

      if (verbose) {
        log.push(`Turn ${turn} - Player attacks for ${playerDamage} damage. Monster HP: ${Math.max(0, monsterHP).toFixed(0)}`);
      }

      if (monsterHP <= 0) {
        return {
          winner: 'player',
          turns: turn,
          playerHPRemaining: playerHP,
          playerHPPercent: (playerHP / player.stats.max_hp) * 100,
          log
        };
      }

      // Monster's turn
      const monsterDamage = this.calculateDamage(
        monster.stats[1], // Attack
        player.stats.defense,
        0.05,
        1.5
      );

      // Check for dodge
      const dodgeChance = player.stats.agility * 0.01 || 0.05;
      if (Math.random() < dodgeChance) {
        if (verbose) {
          log.push(`Turn ${turn} - Player dodges the attack!`);
        }
      } else {
        playerHP -= monsterDamage;
        if (verbose) {
          log.push(`Turn ${turn} - Monster attacks for ${monsterDamage} damage. Player HP: ${Math.max(0, playerHP).toFixed(0)}`);
        }
      }

      if (playerHP <= 0) {
        return {
          winner: 'monster',
          turns: turn,
          monsterHPRemaining: monsterHP,
          monsterHPPercent: (monsterHP / monster.stats[0]) * 100,
          log
        };
      }
    }

    // Timeout - treat as player loss
    return {
      winner: 'timeout',
      turns: maxTurns,
      log
    };
  }

  // Calculate damage with variance and crits
  calculateDamage(attack, defense, critChance, critMultiplier) {
    const baseDamage = Math.max(1, attack - (defense * 0.5));
    const variance = Math.random() * 0.3 + 0.85; // 85-115% variance
    let damage = baseDamage * variance;

    // Critical hit
    if (Math.random() < critChance) {
      damage *= critMultiplier;
    }

    return Math.floor(damage);
  }

  // Create player character with gear
  createPlayer(className, level, gearQuality = 'balanced') {
    const classData = classes[className];
    
    // Calculate stats at level
    const stats = {
      level,
      max_hp: classData.starting_stats.max_hp + (classData.stat_bonuses.hp_per_level * (level - 1)),
      attack: classData.starting_stats.strength + (classData.stat_bonuses.strength_per_level * (level - 1)),
      defense: classData.starting_stats.defense + (classData.stat_bonuses.defense_per_level * (level - 1)),
      magic: classData.starting_stats.magic + ((classData.stat_bonuses.magic_per_level || 0) * (level - 1)),
      agility: classData.starting_stats.agility + (classData.stat_bonuses.agility_per_level * (level - 1)),
      critChance: 0.05,
      critMultiplier: 1.5
    };

    // Add gear bonuses
    const gear = this.getGearForLevel(level, gearQuality);
    if (gear.weapon && gear.weapon.stats) {
      stats.attack += gear.weapon.stats.attack || 0;
      stats.critChance += gear.weapon.stats.crit_chance || 0;
    }
    if (gear.armor && gear.armor.stats) {
      stats.defense += gear.armor.stats.defense || 0;
      stats.max_hp += gear.armor.stats.hp || 0;
    }

    return {
      class: className,
      level,
      stats,
      gear
    };
  }

  // Get appropriate gear for level
  getGearForLevel(level, quality) {
    // Filter gear by level requirement
    const availableWeapons = gearWeapons.filter(w => 
      (!w.required_level || w.required_level <= level)
    );
    const availableArmor = gearArmor.filter(a => 
      (!a.required_level || a.required_level <= level)
    );

    let weapon = null;
    let armor = null;

    if (quality === 'best') {
      // Get highest level requirement gear
      weapon = availableWeapons.sort((a, b) => (b.required_level || 0) - (a.required_level || 0))[0];
      armor = availableArmor.sort((a, b) => (b.required_level || 0) - (a.required_level || 0))[0];
    } else if (quality === 'balanced') {
      // Get gear within 5 levels
      const balancedWeapons = availableWeapons.filter(w => !w.required_level || w.required_level >= level - 5);
      const balancedArmor = availableArmor.filter(a => !a.required_level || a.required_level >= level - 5);
      weapon = balancedWeapons[Math.floor(balancedWeapons.length / 2)];
      armor = balancedArmor[Math.floor(balancedArmor.length / 2)];
    } else {
      // Get starting gear
      weapon = availableWeapons[0];
      armor = availableArmor[0];
    }

    return { weapon, armor };
  }

  // Run simulation suite for a specific level bracket
  simulateLevelBracket(minLevel, maxLevel, iterations = 100) {
    console.log(`\n=== Simulating Level ${minLevel}-${maxLevel} (${iterations} fights per class/monster) ===\n`);

    const classNames = Object.keys(classes);
    const avgLevel = Math.floor((minLevel + maxLevel) / 2);
    
    // Get monsters in this level range
    const relevantMonsters = monsters.filter(m => 
      m.level_range[0] <= maxLevel && m.level_range[1] >= minLevel
    );

    if (relevantMonsters.length === 0) {
      console.log('⚠️  No monsters found in this level range!\n');
      return;
    }

    // Test each class
    classNames.forEach(className => {
      let totalWins = 0;
      let totalFights = 0;
      let totalTurns = 0;
      let totalHPRemaining = 0;

      // Fight each monster type
      relevantMonsters.slice(0, 10).forEach(monster => { // Limit to 10 monster types for speed
        for (let i = 0; i < iterations; i++) {
          const player = this.createPlayer(className, avgLevel, 'balanced');
          const result = this.simulateCombat(player, monster);

          totalFights++;
          totalTurns += result.turns;

          if (result.winner === 'player') {
            totalWins++;
            totalHPRemaining += result.playerHPPercent;
          }
        }
      });

      const winRate = (totalWins / totalFights) * 100;
      const avgTurns = totalTurns / totalFights;
      const avgHPRemaining = totalHPRemaining / totalWins;

      // Store results
      if (!this.results.classWinRates[className]) {
        this.results.classWinRates[className] = [];
      }
      this.results.classWinRates[className].push({
        levelBracket: `${minLevel}-${maxLevel}`,
        winRate,
        avgTurns,
        avgHPRemaining
      });

      // Determine status
      let status = '✅';
      let comment = '';
      if (winRate < 40) {
        status = '❌';
        comment = ' - TOO HARD! Players will die frequently';
        this.results.recommendations.push(`Buff ${className} or nerf monsters in levels ${minLevel}-${maxLevel}`);
      } else if (winRate < 60) {
        status = '⚠️';
        comment = ' - Challenging (consider slight buff)';
      } else if (winRate > 90) {
        status = '⚠️';
        comment = ' - Too easy (consider slight nerf)';
      }

      console.log(`${status} ${className.padEnd(10)} | Win Rate: ${winRate.toFixed(1)}% | Avg Turns: ${avgTurns.toFixed(1)} | Avg HP Left: ${avgHPRemaining.toFixed(1)}%${comment}`);
    });
  }

  // Run full simulation suite
  runFullSimulation() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         ASHBEE REALMS - COMBAT SIMULATOR                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    const levelBrackets = [
      { min: 1, max: 10 },
      { min: 11, max: 20 },
      { min: 21, max: 30 },
      { min: 31, max: 40 },
      { min: 41, max: 50 }
    ];

    levelBrackets.forEach(bracket => {
      this.simulateLevelBracket(bracket.min, bracket.max, 50); // 50 iterations per monster
    });

    this.generateCombatReport();
  }

  // Test specific matchup (verbose)
  testMatchup(className, level, monsterId) {
    console.log(`\n=== Testing ${className} (Level ${level}) vs ${monsterId} ===\n`);

    const monster = monsters.find(m => m.id === monsterId);
    if (!monster) {
      console.log('❌ Monster not found!');
      return;
    }

    const player = this.createPlayer(className, level, 'balanced');
    console.log('Player Stats:', player.stats);
    console.log('Monster Stats:', { hp: monster.stats[0], attack: monster.stats[1], defense: monster.stats[2] });
    console.log('\n--- Combat Log ---\n');

    const result = this.simulateCombat(player, monster, true);
    
    result.log.forEach(line => console.log(line));
    
    console.log(`\n--- Result: ${result.winner.toUpperCase()} WINS in ${result.turns} turns ---`);
    if (result.winner === 'player') {
      console.log(`Player HP Remaining: ${result.playerHPRemaining.toFixed(0)} (${result.playerHPPercent.toFixed(1)}%)`);
    }
  }

  // Generate report
  generateCombatReport() {
    console.log('\n' + '='.repeat(60));
    console.log('COMBAT SIMULATION SUMMARY');
    console.log('='.repeat(60));

    // Overall class performance
    console.log('\nOverall Class Win Rates:');
    Object.entries(this.results.classWinRates).forEach(([className, brackets]) => {
      const avgWinRate = brackets.reduce((sum, b) => sum + b.winRate, 0) / brackets.length;
      const status = avgWinRate >= 60 && avgWinRate <= 80 ? '✅' : '⚠️';
      console.log(`${status} ${className.padEnd(10)}: ${avgWinRate.toFixed(1)}% average win rate`);
    });

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n⚠️  BALANCE RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    } else {
      console.log('\n✅ COMBAT BALANCE IS EXCELLENT!');
      console.log('   All classes have viable win rates across all levels.');
    }

    // Save results
    const reportPath = path.join(__dirname, 'combat_simulation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\nDetailed results saved to: ${reportPath}`);
  }

  // Quick balance check
  quickBalanceCheck() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         QUICK COMBAT BALANCE CHECK                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const testCases = [
      { class: 'warrior', level: 10, monster: 'forest_wolf' },     // Level 1-5
      { class: 'mage', level: 10, monster: 'forest_wolf' },
      { class: 'rogue', level: 10, monster: 'forest_wolf' },
      { class: 'warrior', level: 25, monster: 'stone_guardian' },  // Level 16-21
      { class: 'mage', level: 25, monster: 'stone_guardian' },
      { class: 'warrior', level: 40, monster: 'ancient_dragon' }   // Level 35-50
    ];

    testCases.forEach(test => {
      const monster = monsters.find(m => m.id === test.monster);
      if (!monster) {
        console.log(`⚠️  Skipping ${test.monster} (not found)`);
        return;
      }

      let wins = 0;
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const player = this.createPlayer(test.class, test.level, 'balanced');
        const result = this.simulateCombat(player, monster);
        if (result.winner === 'player') wins++;
      }

      const winRate = (wins / iterations) * 100;
      const status = winRate >= 50 && winRate <= 80 ? '✅' : '⚠️';
      console.log(`${status} ${test.class.padEnd(10)} L${test.level} vs ${test.monster.padEnd(20)}: ${winRate.toFixed(0)}% win rate`);
    });

    console.log('\n✅ Quick check complete! Run full simulation for detailed analysis.');
  }
}

// CLI interface
if (require.main === module) {
  const simulator = new CombatSimulator();
  const args = process.argv.slice(2);

  if (args[0] === 'full') {
    simulator.runFullSimulation();
  } else if (args[0] === 'quick') {
    simulator.quickBalanceCheck();
  } else if (args[0] === 'test' && args.length === 4) {
    // node combat_simulator.js test warrior 10 forest_wolf
    simulator.testMatchup(args[1], parseInt(args[2]), args[3]);
  } else {
    console.log('Usage:');
    console.log('  node combat_simulator.js quick              - Quick balance check');
    console.log('  node combat_simulator.js full               - Full simulation suite');
    console.log('  node combat_simulator.js test CLASS LVL MON - Test specific matchup');
    console.log('\nExamples:');
    console.log('  node combat_simulator.js quick');
    console.log('  node combat_simulator.js test warrior 10 forest_wolf');
    console.log('  node combat_simulator.js full');
  }
}

module.exports = CombatSimulator;
