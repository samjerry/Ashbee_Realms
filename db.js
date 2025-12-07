/**
 * Database abstraction layer
 * Supports both PostgreSQL (production) and SQLite (development)
 */

const path = require('path');

let db;
let dbType; // 'postgres' or 'sqlite'

async function initDB() {
  const isProduction = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');
  
  if (isProduction) {
    dbType = 'postgres';
    console.log('📊 Using PostgreSQL database');
    await initPostgres();
  } else {
    dbType = 'sqlite';
    console.log('📊 Using SQLite database (local development)');
    initSQLite();
  }
}

function initSQLite() {
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'data.sqlite'));
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      twitch_id TEXT,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      inventory TEXT DEFAULT '["Potion"]',
      pending TEXT,
      combat TEXT,
      skill_cd INTEGER DEFAULT 0,
      step INTEGER DEFAULT 0,
      is_player INTEGER DEFAULT 1,
      in_combat INTEGER DEFAULT 0,
      equipped TEXT DEFAULT '{"headgear":null,"armor":null,"legs":null,"footwear":null,"hands":null,"cape":null,"off_hand":null,"amulet":null,"ring1":null,"ring2":null,"belt":null,"main_hand":null,"flavor1":null,"flavor2":null,"flavor3":null}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, channel_name),
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `);
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
      equipped JSONB DEFAULT '{"headgear":null,"armor":null,"legs":null,"footwear":null,"hands":null,"cape":null,"off_hand":null,"amulet":null,"ring1":null,"ring2":null,"belt":null,"main_hand":null,"flavor1":null,"flavor2":null,"flavor3":null}',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, channel_name),
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_player_progress_player_id ON player_progress(player_id);
    CREATE INDEX IF NOT EXISTS idx_player_progress_channel ON player_progress(channel_name);
  `);

  db = pool;
}

// Query interface (works for both)
async function query(sql, params = []) {
  if (dbType === 'sqlite') {
    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return { rows: stmt.all(...params) };
      } else {
        const info = stmt.run(...params);
        return { rows: [], changes: info.changes };
      }
    } catch (err) {
      console.error('SQLite error:', err.message, sql);
      throw err;
    }
  } else {
    return await db.query(sql, params);
  }
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
      flavor1: null, flavor2: null, flavor3: null
    }
  } = playerData;

  if (dbType === 'sqlite') {
    await query(`
      INSERT INTO player_progress (
        player_id, channel_name, name, location, level, xp, xp_to_next, max_hp, hp, gold,
        type, inventory, pending, combat, skill_cd, step, is_player, in_combat, equipped, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(player_id, channel_name) DO UPDATE SET
        name=?, location=?, level=?, xp=?, xp_to_next=?, max_hp=?, hp=?, gold=?,
        type=?, inventory=?, pending=?, combat=?, skill_cd=?, step=?, is_player=?, in_combat=?, equipped=?, updated_at=datetime('now')
    `, [
      playerId, channelName, name, location, level, xp, xp_to_next, max_hp, hp, gold,
      type, JSON.stringify(inventory), JSON.stringify(pending), JSON.stringify(combat),
      skill_cd, step, is_player ? 1 : 0, in_combat ? 1 : 0, JSON.stringify(equipped),
      // Update values
      name, location, level, xp, xp_to_next, max_hp, hp, gold,
      type, JSON.stringify(inventory), JSON.stringify(pending), JSON.stringify(combat),
      skill_cd, step, is_player ? 1 : 0, in_combat ? 1 : 0, JSON.stringify(equipped)
    ]);
  } else {
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
}

/**
 * Load player progress from database
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @returns {object|null} Player data or null if not found
 */
async function loadPlayerProgress(playerId, channelName) {
  const result = dbType === 'sqlite'
    ? await query('SELECT * FROM player_progress WHERE player_id = ? AND channel_name = ?', [playerId, channelName])
    : await query('SELECT * FROM player_progress WHERE player_id = $1 AND channel_name = $2', [playerId, channelName]);

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
    is_player: dbType === 'sqlite' ? row.is_player === 1 : row.is_player,
    in_combat: dbType === 'sqlite' ? row.in_combat === 1 : row.in_combat,
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
      flavor1: null, flavor2: null, flavor3: null
    }
  };

  await savePlayerProgress(playerId, channelName, defaultPlayer);
  return defaultPlayer;
}

function close() {
  if (dbType === 'sqlite') {
    db.close();
  } else if (db && db.end) {
    return db.end();
  }
}

module.exports = {
  initDB,
  query,
  run,
  all,
  close,
  getDB: () => db,
  getType: () => dbType,
  savePlayerProgress,
  loadPlayerProgress,
  initializeNewPlayer
};
