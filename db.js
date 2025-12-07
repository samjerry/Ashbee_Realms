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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, channel_name),
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permanent_stats (
      player_id TEXT PRIMARY KEY,
      unlocked_passives JSONB DEFAULT '[]',
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
    }
  } = playerData;

  await query(`
    INSERT INTO player_progress (
      player_id, channel_name, name, location, level, xp, xp_to_next, max_hp, hp, gold,
      type, inventory, pending, combat, skill_cd, step, is_player, in_combat, equipped, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
    ON CONFLICT(player_id, channel_name) DO UPDATE SET
      name=$3, location=$4, level=$5, xp=$6, xp_to_next=$7, max_hp=$8, hp=$9, gold=$10,
      type=$11, inventory=$12, pending=$13, combat=$14, skill_cd=$15, step=$16, is_player=$17, in_combat=$18, equipped=$19, updated_at=NOW()
  `, [
    playerId, channelName, name, location, level, xp, xp_to_next, max_hp, hp, gold,
    type, JSON.stringify(inventory), JSON.stringify(pending), JSON.stringify(combat),
    skill_cd, step, is_player, in_combat, JSON.stringify(equipped)
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

  // Parse JSON fields
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
    unlockedPassives: row.unlocked_passives || [],
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
      player_id, unlocked_passives, account_stats, total_deaths, total_kills,
      total_gold_earned, total_xp_earned, highest_level_reached, total_crits, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (player_id) DO UPDATE SET
      unlocked_passives = $2,
      account_stats = $3,
      total_deaths = $4,
      total_kills = $5,
      total_gold_earned = $6,
      total_xp_earned = $7,
      highest_level_reached = $8,
      total_crits = $9,
      updated_at = NOW()`,
    [
      playerId,
      JSON.stringify(stats.unlockedPassives || []),
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
  incrementPermanentStat
};
