/**
 * test_progression_system.js
 * Comprehensive tests for the progression system
 */

const ProgressionManager = require('../game/ProgressionManager');
const Character = require('../game/Character');

console.log('🧪 Testing Progression System\n');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// ==================== XP CALCULATION TESTS ====================

test('XP to next level calculation', () => {
  const progressionMgr = new ProgressionManager();
  const level1XP = progressionMgr.calculateXPToNextLevel(1);
  const level2XP = progressionMgr.calculateXPToNextLevel(2);
  const level10XP = progressionMgr.calculateXPToNextLevel(10);

  if (level1XP !== 100) throw new Error(`Expected 100, got ${level1XP}`);
  if (level2XP <= level1XP) throw new Error('Level 2 should require more XP than level 1');
  if (level10XP <= level2XP) throw new Error('Level 10 should require more XP than level 2');
  
  console.log(`   Level 1→2: ${level1XP} XP`);
  console.log(`   Level 2→3: ${level2XP} XP`);
  console.log(`   Level 10→11: ${level10XP} XP`);
});

test('Total XP to level calculation', () => {
  const progressionMgr = new ProgressionManager();
  const totalToLevel5 = progressionMgr.calculateTotalXPToLevel(5);
  const totalToLevel10 = progressionMgr.calculateTotalXPToLevel(10);

  if (totalToLevel5 <= 0) throw new Error('Total XP should be positive');
  if (totalToLevel10 <= totalToLevel5) throw new Error('Level 10 should require more total XP');
  
  console.log(`   Total XP to level 5: ${totalToLevel5}`);
  console.log(`   Total XP to level 10: ${totalToLevel10}`);
});

// ==================== LEVELING TESTS ====================

test('Single level up', () => {
  const characterData = {
    name: 'TestHero',
    type: 'warrior',
    level: 1,
    xp: 0,
    xp_to_next: 100,
    hp: 110,
    max_hp: 110,
    gold: 50,
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  const result = progressionMgr.addXP(character, 100);

  if (!result.levelUpRewards || result.levelUpRewards.length !== 1) {
    throw new Error('Should level up once with 100 XP');
  }
  if (character.level !== 2) throw new Error('Character should be level 2');
  if (character.hp !== character.maxHp) throw new Error('Should be healed to full on level up');
  if (character.skillPoints !== 1) throw new Error('Should have 1 skill point');

  console.log(`   Level: ${result.currentLevel} → ${result.newLevel}`);
  console.log(`   Skill Points: ${result.totalSkillPoints}`);
  console.log(`   HP: ${character.hp}/${character.maxHp}`);
});

test('Multiple level ups', () => {
  const characterData = {
    name: 'TestHero',
    type: 'mage',
    level: 1,
    xp: 0,
    xp_to_next: 100,
    hp: 80,
    max_hp: 80,
    gold: 50,
    inventory: [],
    equipped: {},
    skillPoints: 0
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  // Give enough XP for multiple levels
  const result = progressionMgr.addXP(character, 500);

  if (result.levelsGained < 2) throw new Error('Should level up multiple times');
  if (character.skillPoints !== result.levelsGained) {
    throw new Error(`Should have ${result.levelsGained} skill points`);
  }

  console.log(`   Levels gained: ${result.levelsGained}`);
  console.log(`   Final level: ${character.level}`);
  console.log(`   Skill points: ${character.skillPoints}`);
});

test('Stat increases on level up - all base stats +1', () => {
  const progressionMgr = new ProgressionManager();
  const warriorStats = progressionMgr.calculateStatsGainedOnLevelUp('warrior');
  const mageStats = progressionMgr.calculateStatsGainedOnLevelUp('mage');

  // Check base stat increases (all should be at least 1)
  if (warriorStats.strength < 1) throw new Error('Strength should increase by at least 1');
  if (warriorStats.defense < 1) throw new Error('Defense should increase by at least 1');
  if (warriorStats.magic < 1) throw new Error('Magic should increase by at least 1');
  if (warriorStats.agility < 1) throw new Error('Agility should increase by at least 1');

  // Check class bonuses (warrior should get more strength than mage)
  if (warriorStats.strength <= mageStats.strength) {
    throw new Error('Warrior should gain more strength than mage');
  }
  if (mageStats.magic <= warriorStats.magic) {
    throw new Error('Mage should gain more magic than warrior');
  }

  console.log(`   Warrior per level: Str +${warriorStats.strength}, Def +${warriorStats.defense}, Mag +${warriorStats.magic}, Agi +${warriorStats.agility}, HP +${warriorStats.hp}`);
  console.log(`   Mage per level: Str +${mageStats.strength}, Def +${mageStats.defense}, Mag +${mageStats.magic}, Agi +${mageStats.agility}, HP +${mageStats.hp}`);
});

// ==================== DEATH & RESPAWN TESTS ====================

test('Normal death (non-hardcore)', () => {
  const characterData = {
    name: 'TestHero',
    type: 'rogue',
    level: 5,
    xp: 50,
    xp_to_next: 200,
    hp: 0,
    max_hp: 150,
    gold: 1000,
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  const result = progressionMgr.handleDeath(character, false, {});

  if (result.characterDeleted) throw new Error('Character should not be deleted in normal mode');
  if (result.goldLost !== 100) throw new Error('Should lose 10% gold (100)');
  if (result.xpLost !== 12) throw new Error('Should lose 25% XP (12)'); // 25% of 50 = 12.5, floored = 12
  if (character.gold !== 900) throw new Error('Gold should be reduced');
  if (character.location !== 'Town Square') throw new Error('Should respawn in Town Square');

  console.log(`   Gold lost: ${result.goldLost}`);
  console.log(`   XP lost: ${result.xpLost}`);
  console.log(`   Respawn HP: ${result.respawnedWith.hp}/${result.respawnedWith.maxHp}`);
});

test('Hardcore death', () => {
  const characterData = {
    name: 'HardcoreHero',
    type: 'warrior',
    level: 10,
    xp: 100,
    xp_to_next: 500,
    hp: 0,
    max_hp: 250,
    gold: 5000,
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  const permanentStats = {
    unlockedPassives: ['efficient_killer'],
    accountStats: { monster_kills: 500 },
    totalDeaths: 2,
    totalKills: 500,
    highestLevelReached: 8
  };

  const result = progressionMgr.handleDeath(character, true, permanentStats);

  if (!result.characterDeleted) throw new Error('Character should be deleted in hardcore mode');
  if (!result.permanentStatsToRetain) throw new Error('Should retain permanent stats');
  if (result.permanentStatsToRetain.totalDeaths !== 3) throw new Error('Should increment death count');
  if (result.permanentStatsToRetain.highestLevelReached !== 10) {
    throw new Error('Should update highest level reached');
  }
  if (result.permanentStatsToRetain.unlockedPassives.length !== 1) {
    throw new Error('Should keep unlocked passives');
  }

  console.log(`   Character deleted: ${result.characterDeleted}`);
  console.log(`   Permanent stats retained: ${JSON.stringify(result.permanentStatsToRetain)}`);
});

test('Respawn mechanic', () => {
  const characterData = {
    name: 'TestHero',
    type: 'cleric',
    level: 3,
    xp: 0,
    xp_to_next: 150,
    hp: 0,
    max_hp: 120,
    gold: 500,
    location: 'Dark Forest',
    inCombat: true,
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  const result = progressionMgr.respawn(character);

  if (character.hp !== 60) throw new Error('Should respawn with 50% HP');
  if (character.location !== 'Town Square') throw new Error('Should respawn in Town Square');
  if (character.inCombat) throw new Error('Should not be in combat after respawn');

  console.log(`   Respawned at: ${character.location}`);
  console.log(`   HP: ${character.hp}/${character.maxHp}`);
});

// ==================== PASSIVE SYSTEM TESTS ====================

test('Passive bonus calculation', () => {
  const progressionMgr = new ProgressionManager();
  
  const unlockedPassives = ['efficient_killer', 'improved_crits'];
  const accountStats = { monster_kills: 500, totalCrits: 150 };

  const bonuses = progressionMgr.calculatePassiveBonuses(unlockedPassives, accountStats);

  if (bonuses.damageMultiplier <= 1.0) throw new Error('Should have damage multiplier > 1.0');
  if (bonuses.critChance <= 0) throw new Error('Should have crit chance bonus');

  console.log(`   Damage multiplier: ${bonuses.damageMultiplier.toFixed(2)}x`);
  console.log(`   Crit chance: +${(bonuses.critChance * 100).toFixed(1)}%`);
  console.log(`   Crit damage: +${(bonuses.critDamage * 100).toFixed(0)}%`);
});

test('Passive unlock requirements', () => {
  const characterData = {
    name: 'TestHero',
    type: 'warrior',
    level: 30,
    xp: 0,
    xp_to_next: 1000,
    hp: 300,
    max_hp: 300,
    gold: 1000,
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  const accountStats = {
    highestLevelReached: 30,
    totalKills: 1500,
    totalCrits: 200
  };

  // Find a passive with level requirement
  const allPassives = [
    ...(progressionMgr.passives.combat_passives || []),
    ...(progressionMgr.passives.survival_passives || []),
    ...(progressionMgr.passives.progression_passives || [])
  ];

  const levelPassive = allPassives.find(p => 
    p.unlock_requirement && p.unlock_requirement.type === 'level_reached'
  );

  if (levelPassive) {
    const unlockStatus = progressionMgr.canUnlockPassive(levelPassive, character, accountStats);
    console.log(`   Passive "${levelPassive.name}": ${unlockStatus.canUnlock ? 'Unlockable' : 'Locked'}`);
    console.log(`   Requirement: ${unlockStatus.message}`);
  }
});

// ==================== SKILL SYSTEM TESTS ====================

test('Character skill cooldowns', () => {
  const characterData = {
    name: 'TestMage',
    type: 'mage',
    level: 5,
    xp: 0,
    xp_to_next: 200,
    hp: 100,
    max_hp: 100,
    gold: 100,
    inventory: [],
    equipped: {},
    skills: { skills: {}, globalCooldown: 0 }
  };

  const character = new Character(characterData);

  // Use a skill
  const result = character.useSkill('fireball', 3, 0);
  if (!result.success) throw new Error('Should successfully use skill');

  // Try to use again immediately
  const result2 = character.useSkill('fireball', 3, 0);
  if (result2.success) throw new Error('Should not be able to use skill on cooldown');

  // Tick cooldowns
  character.tickSkillCooldowns();
  character.tickSkillCooldowns();
  character.tickSkillCooldowns();
  character.tickSkillCooldowns(); // Tick 4 times (1 GCD + 3 skill CD)

  // Should be available now
  const isAvailable = character.isSkillAvailable('fireball', 4);
  if (!isAvailable) throw new Error('Skill should be available after cooldown');

  console.log(`   Skill used and cooldown managed successfully`);
});

test('Character level up with skill points', () => {
  const characterData = {
    name: 'TestHero',
    type: 'ranger',
    level: 1,
    xp: 0,
    xp_to_next: 100,
    hp: 100,
    max_hp: 100,
    gold: 50,
    inventory: [],
    equipped: {},
    skillPoints: 0
  };

  const character = new Character(characterData);
  const oldSkillPoints = character.skillPoints;

  // Use Character's built-in gainXP (backward compatible)
  const result = character.gainXP(100);

  if (!result.leveledUp) throw new Error('Should level up');
  if (character.skillPoints !== oldSkillPoints + 1) throw new Error('Should gain 1 skill point');

  console.log(`   Level ${result.newLevel}, Skill Points: ${character.skillPoints}`);
});

// ==================== INTEGRATION TESTS ====================

test('Full progression flow: XP → Level Up → Stats Increase', () => {
  const characterData = {
    name: 'FullTestHero',
    type: 'warrior',
    level: 1,
    xp: 0,
    xp_to_next: 100,
    hp: 110,
    max_hp: 110,
    gold: 50,
    inventory: [],
    equipped: {}
  };

  const character = new Character(characterData);
  const progressionMgr = new ProgressionManager();

  const oldStats = character.getBaseStats();
  const result = progressionMgr.addXP(character, 250); // Enough for 2+ levels

  const newStats = character.getBaseStats();

  if (result.levelsGained < 1) throw new Error('Should level up at least once');
  
  // Check that stats increased
  const statsIncreased = 
    newStats.strength > oldStats.strength ||
    newStats.defense > oldStats.defense ||
    newStats.magic > oldStats.magic ||
    newStats.agility > oldStats.agility;

  if (!statsIncreased) throw new Error('Stats should increase after level up');

  console.log(`   Levels gained: ${result.levelsGained}`);
  console.log(`   Old strength: ${oldStats.strength}, New strength: ${newStats.strength}`);
  console.log(`   Skill points earned: ${result.totalSkillPoints}`);
});

// ==================== RESULTS ====================

console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed === 0) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}
