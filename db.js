/**
 * Database abstraction layer
 * PostgreSQL only - requires DATABASE_URL environment variable
 */

let db;

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required!');
    console.error('❌ This project requires PostgreSQL. Please set DATABASE_URL.');
    process.exit(1);
  }
  
  console.log('📊 Using PostgreSQL database');
  await initPostgres();
}

async function initPostgres() {
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Railway requires this
  });

  // Test connection
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL:', res.rows[0].now);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    throw err;
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      twitch_id TEXT,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_progress (
      player_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      xp_to_next INTEGER DEFAULT 10,
      max_hp INTEGER DEFAULT 100,
      hp INTEGER DEFAULT 100,
      gold INTEGER DEFAULT 0,
      type TEXT,
      inventory JSONB DEFAULT '["Potion"]',
      pending JSONB,
      combat JSONB,
      skill_cd INTEGER DEFAULT 0,
      step INTEGER DEFAULT 0,
      is_player BOOLEAN DEFAULT true,
      in_combat BOOLEAN DEFAULT false,
      equipped JSONB DEFAULT '{"headgear":null,"armor":null,"legs":null,"footwear":null,"hands":null,"cape":null,"off_hand":null,"amulet":null,"ring1":null,"ring2":null,"belt":null,"main_hand":null,"relic1":null,"relic2":null,"relic3":null}',
      base_stats JSONB DEFAULT '{}',
      skills JSONB DEFAULT '{"skills":{},"globalCooldown":0}',
      skill_points INTEGER DEFAULT 0,
      travel_state JSONB DEFAULT NULL,
      active_quests JSONB DEFAULT '[]',
      completed_quests JSONB DEFAULT '[]',
      consumable_cooldowns JSONB DEFAULT '{}',
      dialogue_history JSONB DEFAULT '{}',
      reputation JSONB DEFAULT '{"general":0}',
      unlocked_achievements JSONB DEFAULT '[]',
      achievement_progress JSONB DEFAULT '{}',
      achievement_unlock_dates JSONB DEFAULT '{}',
      achievement_points INTEGER DEFAULT 0,
      unlocked_titles JSONB DEFAULT '[]',
      active_title TEXT DEFAULT NULL,
      stats JSONB DEFAULT '{"totalKills":0,"bossKills":0,"criticalHits":0,"highestDamage":0,"deaths":0,"locationsVisited":[],"biomesVisited":[],"totalGoldEarned":0,"totalGoldSpent":0,"mysteriesSolved":0}',
      dungeon_state JSONB DEFAULT NULL,
      completed_dungeons JSONB DEFAULT '[]',
      crafting_xp INTEGER DEFAULT 0,
      known_recipes JSONB DEFAULT '[]',
      season_progress JSONB DEFAULT '{}',
      seasonal_challenges_completed JSONB DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, channel_name),
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permanent_stats (
      player_id TEXT PRIMARY KEY,
      passive_levels JSONB DEFAULT '{}',
      souls INTEGER DEFAULT 5,
      legacy_points INTEGER DEFAULT 0,
      account_stats JSONB DEFAULT '{}',
      total_deaths INTEGER DEFAULT 0,
      total_kills INTEGER DEFAULT 0,
      total_gold_earned BIGINT DEFAULT 0,
      total_xp_earned BIGINT DEFAULT 0,
      highest_level_reached INTEGER DEFAULT 1,
      total_crits INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_player_progress_player_id ON player_progress(player_id);
    CREATE INDEX IF NOT EXISTS idx_player_progress_channel ON player_progress(channel_name);

    CREATE TABLE IF NOT EXISTS user_roles (
      player_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, channel_name),
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
      CHECK (role IN ('viewer', 'vip', 'moderator', 'streamer'))
    );

    CREATE INDEX IF NOT EXISTS idx_user_roles_channel ON user_roles(channel_name);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
  `);

  db = pool;
}

// Query interface (PostgreSQL only)
async function query(sql, params = []) {
  return await db.query(sql, params);
}

async function run(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0];
}

async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

// ===== PLAYER PROGRESS FUNCTIONS =====

/**
 * Save or update player progress
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @param {object} playerData - Player data object with all fields
 */
async function savePlayerProgress(playerId, channelName, playerData) {
  const {
    name,
    location,
    level = 1,
    xp = 0,
    xp_to_next = 10,
    max_hp = 100,
    hp = 100,
    gold = 0,
    type = null,
    inventory = ["Potion"],
    pending = null,
    combat = null,
    skill_cd = 0,
    step = 0,
    is_player = true,
    in_combat = false,
    equipped = {
      headgear: null, armor: null, legs: null, footwear: null,
      hands: null, cape: null, off_hand: null, amulet: null,
      ring1: null, ring2: null, belt: null, main_hand: null,
      relic1: null, relic2: null, relic3: null
    },
    base_stats = {},
    skills = { skills: {}, globalCooldown: 0 },
    skill_points = 0,
    travel_state = null,
    active_quests = [],
    completed_quests = [],
    consumable_cooldowns = {},
    dialogue_history = {},
    reputation = { general: 0 },
    unlocked_achievements = [],
    achievement_progress = {},
    achievement_unlock_dates = {},
    achievement_points = 0,
    unlocked_titles = [],
    active_title = null,
    stats = {},
    dungeon_state = null,
    completed_dungeons = [],
    crafting_xp = 0,
    known_recipes = [],
    season_progress = {},
    seasonal_challenges_completed = []
  } = playerData;

  await query(`
    INSERT INTO player_progress (
      player_id, channel_name, name, location, level, xp, xp_to_next, max_hp, hp, gold,
      type, inventory, pending, combat, skill_cd, step, is_player, in_combat, equipped,
      base_stats, skills, skill_points, travel_state, active_quests, completed_quests,
      consumable_cooldowns, dialogue_history, reputation, unlocked_achievements,
      achievement_progress, achievement_unlock_dates, achievement_points,
      unlocked_titles, active_title, stats, dungeon_state, completed_dungeons,
      crafting_xp, known_recipes, season_progress, seasonal_challenges_completed, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25,
      $26, $27, $28, $29,
      $30, $31, $32,
      $33, $34, $35, $36, $37,
      $38, $39, $40, $41, NOW()
    )
    ON CONFLICT(player_id, channel_name) DO UPDATE SET
      name=$3, location=$4, level=$5, xp=$6, xp_to_next=$7, max_hp=$8, hp=$9, gold=$10,
      type=$11, inventory=$12, pending=$13, combat=$14, skill_cd=$15, step=$16, is_player=$17, in_combat=$18, equipped=$19,
      base_stats=$20, skills=$21, skill_points=$22, travel_state=$23, active_quests=$24, completed_quests=$25,
      consumable_cooldowns=$26, dialogue_history=$27, reputation=$28, unlocked_achievements=$29,
      achievement_progress=$30, achievement_unlock_dates=$31, achievement_points=$32,
      unlocked_titles=$33, active_title=$34, stats=$35, dungeon_state=$36, completed_dungeons=$37,
      crafting_xp=$38, known_recipes=$39, season_progress=$40, seasonal_challenges_completed=$41, updated_at=NOW()
  `, [
    playerId, channelName, name, location, level, xp, xp_to_next, max_hp, hp, gold,
    type, JSON.stringify(inventory), JSON.stringify(pending), JSON.stringify(combat),
    skill_cd, step, is_player, in_combat, JSON.stringify(equipped),
    JSON.stringify(base_stats), JSON.stringify(skills), skill_points, JSON.stringify(travel_state),
    JSON.stringify(active_quests), JSON.stringify(completed_quests),
    JSON.stringify(consumable_cooldowns), JSON.stringify(dialogue_history), JSON.stringify(reputation),
    JSON.stringify(unlocked_achievements),
    JSON.stringify(achievement_progress), JSON.stringify(achievement_unlock_dates), achievement_points,
    JSON.stringify(unlocked_titles), active_title, JSON.stringify(stats), JSON.stringify(dungeon_state),
    JSON.stringify(completed_dungeons),
    crafting_xp, JSON.stringify(known_recipes), JSON.stringify(season_progress), JSON.stringify(seasonal_challenges_completed)
  ]);
}

/**
 * Load player progress from database
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @returns {object|null} Player data or null if not found
 */
async function loadPlayerProgress(playerId, channelName) {
  const result = await query('SELECT * FROM player_progress WHERE player_id = $1 AND channel_name = $2', [playerId, channelName]);

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Parse JSON fields and return complete character data
  return {
    name: row.name,
    location: row.location,
    level: row.level,
    xp: row.xp,
    xp_to_next: row.xp_to_next,
    max_hp: row.max_hp,
    hp: row.hp,
    gold: row.gold,
    type: row.type,
    inventory: typeof row.inventory === 'string' ? JSON.parse(row.inventory) : row.inventory,
    pending: row.pending ? (typeof row.pending === 'string' ? JSON.parse(row.pending) : row.pending) : null,
    combat: row.combat ? (typeof row.combat === 'string' ? JSON.parse(row.combat) : row.combat) : null,
    skill_cd: row.skill_cd,
    step: row.step,
    is_player: row.is_player,
    in_combat: row.in_combat,
    equipped: typeof row.equipped === 'string' ? JSON.parse(row.equipped) : row.equipped,
    base_stats: typeof row.base_stats === 'string' ? JSON.parse(row.base_stats) : (row.base_stats || {}),
    skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : (row.skills || { skills: {}, globalCooldown: 0 }),
    skill_points: row.skill_points || 0,
    travel_state: row.travel_state ? (typeof row.travel_state === 'string' ? JSON.parse(row.travel_state) : row.travel_state) : null,
    active_quests: typeof row.active_quests === 'string' ? JSON.parse(row.active_quests) : (row.active_quests || []),
    completed_quests: typeof row.completed_quests === 'string' ? JSON.parse(row.completed_quests) : (row.completed_quests || []),
    consumable_cooldowns: typeof row.consumable_cooldowns === 'string' ? JSON.parse(row.consumable_cooldowns) : (row.consumable_cooldowns || {}),
    dialogue_history: typeof row.dialogue_history === 'string' ? JSON.parse(row.dialogue_history) : (row.dialogue_history || {}),
    reputation: typeof row.reputation === 'string' ? JSON.parse(row.reputation) : (row.reputation || { general: 0 }),
    unlocked_achievements: typeof row.unlocked_achievements === 'string' ? JSON.parse(row.unlocked_achievements) : (row.unlocked_achievements || []),
    achievement_progress: typeof row.achievement_progress === 'string' ? JSON.parse(row.achievement_progress) : (row.achievement_progress || {}),
    achievement_unlock_dates: typeof row.achievement_unlock_dates === 'string' ? JSON.parse(row.achievement_unlock_dates) : (row.achievement_unlock_dates || {}),
    achievement_points: row.achievement_points || 0,
    unlocked_titles: typeof row.unlocked_titles === 'string' ? JSON.parse(row.unlocked_titles) : (row.unlocked_titles || []),
    active_title: row.active_title || null,
    stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : (row.stats || {}),
    dungeon_state: row.dungeon_state ? (typeof row.dungeon_state === 'string' ? JSON.parse(row.dungeon_state) : row.dungeon_state) : null,
    completed_dungeons: typeof row.completed_dungeons === 'string' ? JSON.parse(row.completed_dungeons) : (row.completed_dungeons || []),
    crafting_xp: row.crafting_xp || 0,
    known_recipes: typeof row.known_recipes === 'string' ? JSON.parse(row.known_recipes) : (row.known_recipes || []),
    season_progress: typeof row.season_progress === 'string' ? JSON.parse(row.season_progress) : (row.season_progress || {}),
    seasonal_challenges_completed: typeof row.seasonal_challenges_completed === 'string' ? JSON.parse(row.seasonal_challenges_completed) : (row.seasonal_challenges_completed || []),
    updated_at: row.updated_at
  };
}

/**
 * Initialize new player with default values
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @param {string} playerName - The player's display name
 * @param {string} startLocation - Starting location
 * @param {number} baseMaxHp - Base max HP value
 */
async function initializeNewPlayer(playerId, channelName, playerName, startLocation = "Town Square", baseMaxHp = 100) {
  const defaultPlayer = {
    name: playerName,
    location: startLocation,
    level: 1,
    xp: 0,
    xp_to_next: 10,
    max_hp: baseMaxHp,
    hp: baseMaxHp,
    gold: 0,
    type: null,
    inventory: ["Potion"],
    pending: null,
    combat: null,
    skill_cd: 0,
    step: 0,
    is_player: true,
    in_combat: false,
    equipped: {
      headgear: null, armor: null, legs: null, footwear: null,
      hands: null, cape: null, off_hand: null, amulet: null,
      ring1: null, ring2: null, belt: null, main_hand: null,
      relic1: null, relic2: null, relic3: null
    }
  };

  await savePlayerProgress(playerId, channelName, defaultPlayer);
  return defaultPlayer;
}

function close() {
  if (db && db.end) {
    return db.end();
  }
}

/**
 * Get or create a character instance for a player
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @returns {Character|null} Character instance or null
 */
async function getCharacter(playerId, channelName) {
  const Character = require('./game/Character');
  const data = await loadPlayerProgress(playerId, channelName);
  
  if (!data) {
    return null;
  }
  
  return new Character(data);
}

/**
 * Save a character instance to database
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Character} character - Character instance
 */
async function saveCharacter(playerId, channelName, character) {
  await savePlayerProgress(playerId, channelName, character.toDatabase());
}

/**
 * Create a new character with a class
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {string} playerName - Character name
 * @param {string} classType - Class type (warrior, mage, etc.)
 * @param {string} location - Starting location
 * @returns {Character} New character instance
 */
async function createCharacter(playerId, channelName, playerName, classType, location = "Town Square") {
  const Character = require('./game/Character');
  const character = Character.createNew(playerName, classType, location);
  await saveCharacter(playerId, channelName, character);
  return character;
}

/**
 * Delete a character
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 */
async function deleteCharacter(playerId, channelName) {
  await query(
    'DELETE FROM player_progress WHERE player_id = $1 AND channel_name = $2',
    [playerId, channelName.toLowerCase()]
  );
}

/**
 * Get permanent stats for a player (account-wide progression)
 * @param {string} playerId - Player ID
 * @returns {Object|null} Permanent stats object
 */
async function getPermanentStats(playerId) {
  const result = await query(
    'SELECT * FROM permanent_stats WHERE player_id = $1',
    [playerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    passiveLevels: row.passive_levels || {},
    souls: row.souls || 0,
    legacyPoints: row.legacy_points || 0,
    accountStats: row.account_stats || {},
    totalDeaths: row.total_deaths || 0,
    totalKills: row.total_kills || 0,
    totalGoldEarned: row.total_gold_earned || 0,
    totalXPEarned: row.total_xp_earned || 0,
    highestLevelReached: row.highest_level_reached || 1,
    totalCrits: row.total_crits || 0
  };
}

/**
 * Save permanent stats for a player
 * @param {string} playerId - Player ID
 * @param {Object} stats - Stats object
 */
async function savePermanentStats(playerId, stats) {
  await query(
    `INSERT INTO permanent_stats (
      player_id, passive_levels, souls, legacy_points, account_stats, total_deaths, total_kills,
      total_gold_earned, total_xp_earned, highest_level_reached, total_crits, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (player_id) DO UPDATE SET
      passive_levels = $2,
      souls = $3,
      legacy_points = $4,
      account_stats = $5,
      total_deaths = $6,
      total_kills = $7,
      total_gold_earned = $8,
      total_xp_earned = $9,
      highest_level_reached = $10,
      total_crits = $11,
      updated_at = NOW()`,
    [
      playerId,
      JSON.stringify(stats.passiveLevels || {}),
      stats.souls || 0,
      stats.legacyPoints || 0,
      JSON.stringify(stats.accountStats || {}),
      stats.totalDeaths || 0,
      stats.totalKills || 0,
      stats.totalGoldEarned || 0,
      stats.totalXPEarned || 0,
      stats.highestLevelReached || 1,
      stats.totalCrits || 0
    ]
  );
}

/**
 * Update account-wide stat (e.g., increment kill count)
 * @param {string} playerId - Player ID
 * @param {string} statName - Stat field name
 * @param {number} increment - Amount to increment
 */
async function incrementPermanentStat(playerId, statName, increment = 1) {
  const validStats = ['total_deaths', 'total_kills', 'total_gold_earned', 'total_xp_earned', 'total_crits'];
  if (!validStats.includes(statName)) {
    throw new Error(`Invalid stat name: ${statName}`);
  }

  // Ensure row exists
  await query(
    `INSERT INTO permanent_stats (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`,
    [playerId]
  );

  // Increment stat
  await query(
    `UPDATE permanent_stats SET ${statName} = ${statName} + $1, updated_at = NOW() WHERE player_id = $2`,
    [increment, playerId]
  );
}

/**
 * Update character achievement data
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Object} achievementData - Achievement data to update
 */
async function updateAchievementData(playerId, channelName, achievementData) {
  await query(
    `UPDATE player_progress SET 
      unlocked_achievements = $3,
      achievement_progress = $4,
      achievement_unlock_dates = $5,
      achievement_points = $6,
      unlocked_titles = $7,
      active_title = $8,
      updated_at = NOW()
    WHERE player_id = $1 AND channel_name = $2`,
    [
      playerId,
      channelName,
      JSON.stringify(achievementData.unlockedAchievements || []),
      JSON.stringify(achievementData.achievementProgress || {}),
      JSON.stringify(achievementData.achievementUnlockDates || {}),
      achievementData.achievementPoints || 0,
      JSON.stringify(achievementData.unlockedTitles || []),
      achievementData.activeTitle || null
    ]
  );
}

/**
 * Update character stats (for achievement tracking)
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Object} stats - Stats object
 */
async function updateCharacterStats(playerId, channelName, stats) {
  await query(
    `UPDATE player_progress SET 
      stats = $3,
      updated_at = NOW()
    WHERE player_id = $1 AND channel_name = $2`,
    [playerId, channelName, JSON.stringify(stats)]
  );
}

/**
 * Update character dungeon state
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Object} dungeonState - Dungeon state object (null to clear)
 */
async function updateDungeonState(playerId, channelName, dungeonState) {
  await query(
    `UPDATE player_progress SET 
      dungeon_state = $3,
      updated_at = NOW()
    WHERE player_id = $1 AND channel_name = $2`,
    [playerId, channelName, dungeonState ? JSON.stringify(dungeonState) : null]
  );
}

/**
 * Add completed dungeon to player's list
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {string} dungeonId - Dungeon ID to add
 */
async function addCompletedDungeon(playerId, channelName, dungeonId) {
  const result = await query(
    'SELECT completed_dungeons FROM player_progress WHERE player_id = $1 AND channel_name = $2',
    [playerId, channelName]
  );
  
  if (result.rows.length > 0) {
    const completed = result.rows[0].completed_dungeons || [];
    if (!completed.includes(dungeonId)) {
      completed.push(dungeonId);
      await query(
        `UPDATE player_progress SET 
          completed_dungeons = $3,
          updated_at = NOW()
        WHERE player_id = $1 AND channel_name = $2`,
        [playerId, channelName, JSON.stringify(completed)]
      );
    }
  }
}

/**
 * Update faction reputation for a character
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Object} reputation - Reputation object (faction_id: value pairs)
 */
async function updateReputation(playerId, channelName, reputation) {
  await query(
    `UPDATE player_progress SET 
      reputation = $3,
      updated_at = NOW()
    WHERE player_id = $1 AND channel_name = $2`,
    [playerId, channelName.toLowerCase(), JSON.stringify(reputation)]
  );
}

// ===== USER ROLE FUNCTIONS =====

/**
 * Update or insert user role in a channel
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {string} role - User role: 'viewer', 'vip', 'moderator', 'streamer'
 */
async function updateUserRole(playerId, channelName, role) {
  const validRoles = ['viewer', 'vip', 'moderator', 'streamer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
  }

  await query(
    `INSERT INTO user_roles (player_id, channel_name, role, last_updated)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (player_id, channel_name) 
     DO UPDATE SET role = $3, last_updated = NOW()`,
    [playerId, channelName.toLowerCase(), role]
  );
}

/**
 * Get user role in a channel
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @returns {Promise<string>} User role or 'viewer' if not found
 */
async function getUserRole(playerId, channelName) {
  const result = await query(
    `SELECT role FROM user_roles WHERE player_id = $1 AND channel_name = $2`,
    [playerId, channelName.toLowerCase()]
  );

  return result.rows.length > 0 ? result.rows[0].role : 'viewer';
}

/**
 * Get all users with a specific role in a channel
 * @param {string} channelName - Channel name
 * @param {string} role - Role to filter by (optional)
 * @returns {Promise<Array>} List of users with their roles
 */
async function getChannelUsers(channelName, role = null) {
  let sql = `
    SELECT ur.player_id, ur.role, ur.last_updated, p.display_name
    FROM user_roles ur
    LEFT JOIN players p ON ur.player_id = p.id
    WHERE ur.channel_name = $1
  `;
  const params = [channelName.toLowerCase()];

  if (role) {
    sql += ` AND ur.role = $2`;
    params.push(role);
  }

  sql += ` ORDER BY ur.role DESC, ur.last_updated DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Determine user role from Twitch tags/badges
 * @param {string} username - Twitch username
 * @param {string} channelName - Channel name
 * @param {object} tags - Twitch message tags
 * @returns {string} User role: 'streamer', 'moderator', 'vip', or 'viewer'
 */
function determineRoleFromTags(username, channelName, tags = {}) {
  // Check if user is the broadcaster/streamer
  if (tags.badges?.broadcaster || username.toLowerCase() === channelName.toLowerCase()) {
    return 'streamer';
  }

  // Check if user is a moderator
  if (tags.mod || tags.badges?.moderator) {
    return 'moderator';
  }

  // Check if user is a VIP
  if (tags.badges?.vip) {
    return 'vip';
  }

  // Default to viewer
  return 'viewer';
}

module.exports = {
  initDB,
  query,
  run,
  all,
  close,
  getDB: () => db,
  savePlayerProgress,
  loadPlayerProgress,
  initializeNewPlayer,
  getCharacter,
  saveCharacter,
  createCharacter,
  deleteCharacter,
  getPermanentStats,
  savePermanentStats,
  incrementPermanentStat,
  updateAchievementData,
  updateCharacterStats,
  updateDungeonState,
  addCompletedDungeon,
  updateReputation,
  updateUserRole,
  getUserRole,
  getChannelUsers,
  determineRoleFromTags
};
