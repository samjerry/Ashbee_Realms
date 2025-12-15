/**
 * Database abstraction layer
 * PostgreSQL only - requires DATABASE_URL environment variable
 */

const fs = require('fs');
const path = require('path');

/**
 * Load beta tester usernames from Testers.txt
 * @returns {Array<string>} Array of tester usernames (lowercase)
 */
function loadTestersFromFile() {
  try {
    const testersPath = path.join(__dirname, 'Testers.txt');
    if (fs.existsSync(testersPath)) {
      const content = fs.readFileSync(testersPath, 'utf8');
      const testers = content
        .split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(line => line && !line.startsWith('#'));
      console.log(`📋 Loaded ${testers.length} beta testers from Testers.txt`);
      return testers;
    }
    console.log('⚠️ Testers.txt not found - no beta testers loaded');
    return [];
  } catch (error) {
    console.error('Error loading Testers.txt:', error);
    return [];
  }
}

const BETA_TESTERS = loadTestersFromFile();

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
  
  console.log('🔌 Creating PostgreSQL connection pool...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Railway requires this
    connectionTimeoutMillis: 30000, // 30 second timeout
    idleTimeoutMillis: 30000,
    max: 20 // Maximum pool size
  });

  // Test connection with timeout
  try {
    console.log('🧪 Testing database connection...');
    const startTime = Date.now();
    const res = await pool.query('SELECT NOW()');
    const connectTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Connected to PostgreSQL in ${connectTime}s:`, res.rows[0].now);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('Connection details:', {
      hasUrl: !!process.env.DATABASE_URL,
      urlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...'
    });
    throw err;
  }

  // Drop obsolete tables from old schema
  console.log('🗑️ Cleaning up obsolete tables...');
  await pool.query(`
    DROP TABLE IF EXISTS permanent_stats CASCADE;
    DROP TABLE IF EXISTS player_progress CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
  `);
  console.log('✅ Obsolete tables removed');

  // Create tables
  console.log('📋 Creating/verifying database tables...');
  const tableStart = Date.now();
  
  // Global tables (shared across all channels)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      twitch_id TEXT UNIQUE,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_state (
      channel_name TEXT PRIMARY KEY,
      weather TEXT DEFAULT 'Clear',
      time_of_day TEXT DEFAULT 'Day',
      season TEXT DEFAULT 'Spring',
      active_event TEXT DEFAULT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS operator_audit_log (
      id SERIAL PRIMARY KEY,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      command TEXT NOT NULL,
      params JSONB,
      success BOOLEAN DEFAULT true,
      error_message TEXT,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(operator_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_channel ON operator_audit_log(channel_name);
    CREATE INDEX IF NOT EXISTS idx_audit_log_operator ON operator_audit_log(operator_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_executed ON operator_audit_log(executed_at DESC);
  `);
  
  // Get list of channels from environment
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim().toLowerCase()) : [];
  
  // Create per-channel player tables
  for (const channel of CHANNELS) {
    const tableName = `players_${channel.replace(/[^a-z0-9_]/g, '_')}`;
    console.log(`📋 Creating table for channel: ${channel} (${tableName})`);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT 'Silverbrook',
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
        
        -- Permanent stats (account-wide for this channel)
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
        
        -- User roles (channel-specific permissions) - array for multiple roles
        roles JSONB DEFAULT '["viewer"]',
        
        -- Selected name color (for users with multiple roles)
        name_color TEXT DEFAULT NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_${tableName}_level ON ${tableName}(level DESC);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_gold ON ${tableName}(gold DESC);
    `);
    
    // Migration: Add name_color column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'name_color'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN name_color TEXT DEFAULT NULL;
        END IF;
      END $$;
    `);
    
    // Migration: Convert role TEXT to roles JSONB array
    await pool.query(`
      DO $$
      BEGIN
        -- Check if old 'role' column exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'role' AND data_type = 'text'
        ) THEN
          -- Add new roles column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = '${tableName}' AND column_name = 'roles'
          ) THEN
            ALTER TABLE ${tableName} ADD COLUMN roles JSONB DEFAULT '["viewer"]';
            -- Migrate existing role data to roles array
            UPDATE ${tableName} SET roles = jsonb_build_array(role) WHERE role IS NOT NULL;
          END IF;
          -- Drop old role column and its constraint
          ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_role_check;
          ALTER TABLE ${tableName} DROP COLUMN role;
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'roles'
        ) THEN
          -- If neither exists, add roles column
          ALTER TABLE ${tableName} ADD COLUMN roles JSONB DEFAULT '["viewer"]';
        END IF;
      END $$;
    `);
  }
  
  console.log(`✅ Tables created/verified in ${Date.now() - tableStart}ms`);
  
  const tableTime = ((Date.now() - tableStart) / 1000).toFixed(2);
  console.log(`✅ Database schema verified/created in ${tableTime}s`);

  db = pool;
}

// Helper function to get channel-specific player table name
function getPlayerTable(channelName) {
  if (!channelName) {
    throw new Error('Channel name is required');
  }
  const sanitized = channelName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `players_${sanitized}`;
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
  const table = getPlayerTable(channelName);
  const {
    name,
    location = 'Silverbrook',
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
    seasonal_challenges_completed = [],
    // Permanent stats
    passive_levels = {},
    souls = 5,
    legacy_points = 0,
    account_stats = {},
    total_deaths = 0,
    total_kills = 0,
    total_gold_earned = 0,
    total_xp_earned = 0,
    highest_level_reached = 1,
    total_crits = 0,
    // Roles array and name color
    roles = ['viewer'],
    nameColor = null
  } = playerData;

  await query(`
    INSERT INTO ${table} (
      player_id, name, location, level, xp, xp_to_next, max_hp, hp, gold,
      type, inventory, pending, combat, skill_cd, step, is_player, in_combat, equipped,
      base_stats, skills, skill_points, travel_state, active_quests, completed_quests,
      consumable_cooldowns, dialogue_history, reputation, unlocked_achievements,
      achievement_progress, achievement_unlock_dates, achievement_points,
      unlocked_titles, active_title, stats, dungeon_state, completed_dungeons,
      crafting_xp, known_recipes, season_progress, seasonal_challenges_completed,
      passive_levels, souls, legacy_points, account_stats, total_deaths, total_kills,
      total_gold_earned, total_xp_earned, highest_level_reached, total_crits, role, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24,
      $25, $26, $27, $28,
      $29, $30, $31,
      $32, $33, $34, $35, $36,
      $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46,
      $47, $48, $49, $50, $51, NOW()
    )
    ON CONFLICT(player_id) DO UPDATE SET
      name=$2, location=$3, level=$4, xp=$5, xp_to_next=$6, max_hp=$7, hp=$8, gold=$9,
      type=$10, inventory=$11, pending=$12, combat=$13, skill_cd=$14, step=$15, is_player=$16, in_combat=$17, equipped=$18,
      base_stats=$19, skills=$20, skill_points=$21, travel_state=$22, active_quests=$23, completed_quests=$24,
      consumable_cooldowns=$25, dialogue_history=$26, reputation=$27, unlocked_achievements=$28,
      achievement_progress=$29, achievement_unlock_dates=$30, achievement_points=$31,
      unlocked_titles=$32, active_title=$33, stats=$34, dungeon_state=$35, completed_dungeons=$36,
      crafting_xp=$37, known_recipes=$38, season_progress=$39, seasonal_challenges_completed=$40,
      passive_levels=$41, souls=$42, legacy_points=$43, account_stats=$44, total_deaths=$45, total_kills=$46,
      total_gold_earned=$47, total_xp_earned=$48, highest_level_reached=$49, total_crits=$50, roles=$51, name_color=$52, updated_at=NOW()
  `, [
    playerId, name, location, level, xp, xp_to_next, max_hp, hp, gold,
    type, JSON.stringify(inventory), JSON.stringify(pending), JSON.stringify(combat),
    skill_cd, step, is_player, in_combat, JSON.stringify(equipped),
    JSON.stringify(base_stats), JSON.stringify(skills), skill_points, JSON.stringify(travel_state),
    JSON.stringify(active_quests), JSON.stringify(completed_quests),
    JSON.stringify(consumable_cooldowns), JSON.stringify(dialogue_history), JSON.stringify(reputation),
    JSON.stringify(unlocked_achievements),
    JSON.stringify(achievement_progress), JSON.stringify(achievement_unlock_dates), achievement_points,
    JSON.stringify(unlocked_titles), active_title, JSON.stringify(stats), JSON.stringify(dungeon_state),
    JSON.stringify(completed_dungeons),
    crafting_xp, JSON.stringify(known_recipes), JSON.stringify(season_progress), JSON.stringify(seasonal_challenges_completed),
    JSON.stringify(passive_levels), souls, legacy_points, JSON.stringify(account_stats), total_deaths, total_kills,
    total_gold_earned, total_xp_earned, highest_level_reached, total_crits, JSON.stringify(roles), nameColor
  ]);
}

/**
 * Load player progress from database
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @returns {object|null} Player data or null if not found
 */
async function loadPlayerProgress(playerId, channelName) {
  const table = getPlayerTable(channelName);
  const result = await query(`SELECT * FROM ${table} WHERE player_id = $1`, [playerId]);

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
    // Permanent stats
    passive_levels: typeof row.passive_levels === 'string' ? JSON.parse(row.passive_levels) : (row.passive_levels || {}),
    souls: row.souls || 5,
    legacy_points: row.legacy_points || 0,
    account_stats: typeof row.account_stats === 'string' ? JSON.parse(row.account_stats) : (row.account_stats || {}),
    total_deaths: row.total_deaths || 0,
    total_kills: row.total_kills || 0,
    total_gold_earned: row.total_gold_earned || 0,
    total_xp_earned: row.total_xp_earned || 0,
    highest_level_reached: row.highest_level_reached || 1,
    total_crits: row.total_crits || 0,
    // Roles array and name color
    roles: typeof row.roles === 'string' ? JSON.parse(row.roles) : (row.roles || ['viewer']),
    nameColor: row.name_color || null,
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
 * Update or insert user roles in a channel
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Array<string>} newRoles - Array of roles: ['viewer'], ['subscriber', 'vip'], etc.
 */
async function updateUserRole(playerId, channelName, newRoles) {
  const validRoles = ['viewer', 'subscriber', 'vip', 'moderator', 'streamer', 'creator', 'tester'];
  const rolesToSet = Array.isArray(newRoles) ? newRoles : [newRoles];
  
  // Validate all roles
  for (const role of rolesToSet) {
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }
  }
  
  const table = getPlayerTable(channelName);
  await query(
    `INSERT INTO ${table} (player_id, roles, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (player_id) 
     DO UPDATE SET roles = $2, updated_at = NOW()`,
    [playerId, JSON.stringify(rolesToSet)]
  );
}

/**
 * Get user role in a channel
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @returns {Promise<string>} User role or 'viewer' if not found
 */
async function getUserRole(playerId, channelName) {
  const table = getPlayerTable(channelName);
  const result = await query(
    `SELECT roles FROM ${table} WHERE player_id = $1`,
    [playerId]
  );

  if (result.rows.length === 0) {
    return 'viewer';
  }
  
  const roles = typeof result.rows[0].roles === 'string' 
    ? JSON.parse(result.rows[0].roles) 
    : result.rows[0].roles;
  
  // Return highest priority role (creator > streamer > moderator > vip > subscriber > tester > viewer)
  // Note: Tester is cosmetic and doesn't grant permissions
  const hierarchy = ['creator', 'streamer', 'moderator', 'vip', 'subscriber', 'tester', 'viewer'];
  for (const role of hierarchy) {
    if (roles && roles.includes(role)) {
      return role;
    }
  }
  
  return 'viewer';
}

/**
 * Get all users with a specific role in a channel
 * @param {string} channelName - Channel name
 * @param {string} role - Role to filter by (optional)
 * @returns {Promise<Array>} List of users with their roles
 */
async function getChannelUsers(channelName, role = null) {
  const table = getPlayerTable(channelName);
  let sql = `
    SELECT t.player_id, t.role, t.updated_at as last_updated, p.display_name, t.level, t.gold
    FROM ${table} t
    LEFT JOIN players p ON t.player_id = p.id
  `;
  const params = [];

  if (role) {
    sql += ` WHERE t.role = $1`;
    params.push(role);
  }

  sql += ` ORDER BY t.role DESC, t.level DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Set user role in a channel
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {string} role - Role to set
 */
async function setUserRole(playerId, channelName, role) {
  const table = getPlayerTable(channelName);
  await query(
    `UPDATE ${table} SET role = $1, updated_at = NOW() WHERE player_id = $2`,
    [role, playerId]
  );
}

/**
 * Check if username is a beta tester
 * @param {string} username - Username to check
 * @returns {boolean} True if user is a beta tester
 */
function isBetaTester(username) {
  return BETA_TESTERS.includes(username.toLowerCase());
}

/**
 * Determine user roles from Twitch tags/badges
 * @param {string} username - Twitch username
 * @param {string} channelName - Channel name
 * @param {object} tags - Twitch message tags
 * @returns {Array<string>} Array of user roles
 */
function determineRoleFromTags(username, channelName, tags = {}) {
  const roles = [];
  
  // Check if user is the broadcaster/streamer
  if (tags.badges?.broadcaster || username.toLowerCase() === channelName.toLowerCase()) {
    roles.push('streamer');
  }

  // Check if user is a moderator
  if (tags.mod || tags.badges?.moderator) {
    roles.push('moderator');
  }

  // Check if user is a VIP
  if (tags.badges?.vip) {
    roles.push('vip');
  }

  // Check if user is a subscriber
  if (tags.subscriber || tags.badges?.subscriber || tags.badges?.founder) {
    roles.push('subscriber');
  }

  // Check if user is a beta tester (cosmetic role)
  if (isBetaTester(username)) {
    roles.push('tester');
  }

  // If no roles found, default to viewer
  if (roles.length === 0) {
    roles.push('viewer');
  }
  
  return roles;
}

/**
 * Log operator action to audit log
 * @param {string} operatorId - Operator's player ID
 * @param {string} operatorName - Operator's display name
 * @param {string} channelName - Channel name
 * @param {string} command - Command executed
 * @param {object} params - Command parameters
 * @param {boolean} success - Whether command succeeded
 * @param {string} errorMessage - Error message if failed
 */
async function logOperatorAction(operatorId, operatorName, channelName, command, params, success = true, errorMessage = null) {
  try {
    await query(
      `INSERT INTO operator_audit_log (operator_id, operator_name, channel_name, command, params, success, error_message, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [operatorId, operatorName, channelName.toLowerCase(), command, JSON.stringify(params), success, errorMessage]
    );
  } catch (error) {
    console.error('Failed to log operator action:', error);
    // Don't throw - logging failure shouldn't break the operator command
  }
}

/**
 * Get operator audit log
 * @param {string} channelName - Channel name (optional)
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Audit log entries
 */
async function getOperatorAuditLog(channelName = null, limit = 100) {
  let sql = `
    SELECT * FROM operator_audit_log
  `;
  const params = [];

  if (channelName) {
    sql += ` WHERE channel_name = $1`;
    params.push(channelName.toLowerCase());
    sql += ` ORDER BY executed_at DESC LIMIT $2`;
    params.push(limit);
  } else {
    sql += ` ORDER BY executed_at DESC LIMIT $1`;
    params.push(limit);
  }

  const result = await query(sql, params);
  return result.rows;
}

module.exports = {
  initDB,
  query,
  run,
  all,
  close,
  getDB: () => db,
  getPlayerTable,
  savePlayerProgress,
  loadPlayerProgress,
  initializeNewPlayer,
  getCharacter,
  saveCharacter,
  createCharacter,
  deleteCharacter,
  updateAchievementData,
  updateCharacterStats,
  updateDungeonState,
  addCompletedDungeon,
  updateReputation,
  setUserRole,
  getUserRole,
  updateUserRole,
  getChannelUsers,
  determineRoleFromTags,
  isBetaTester,
  logOperatorAction,
  getOperatorAuditLog
};
