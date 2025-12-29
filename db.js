/**
 * Database abstraction layer
 * PostgreSQL only - requires DATABASE_URL environment variable
 */

const fs = require('fs');
const path = require('path');

// Role hierarchy and colors (used throughout the application)
const ROLE_HIERARCHY = ['creator', 'streamer', 'moderator', 'vip', 'subscriber', 'tester', 'viewer'];
const ROLE_COLORS = {
  creator: '#FFD700',    // Gold - game creator/developer
  streamer: '#9146FF',   // Twitch purple
  moderator: '#00FF00',  // Green
  vip: '#FF1493',        // Deep pink
  subscriber: '#6441A5', // Purple
  tester: '#00FFFF',     // Cyan - beta testers
  viewer: '#FFFFFF'      // White
};
const DEFAULT_STARTING_LOCATION = 'Silverbrook';

/**
 * Load beta tester IDs from environment variable and Testers.txt
 * TESTERS env var should contain Twitch IDs (e.g., "32319902,12345678")
 * These will be converted to the internal format: twitch-{id}
 * @returns {Array<string>} Array of tester player IDs (twitch-{id} format)
 */
function loadTestersFromFile() {
  const testers = [];
  
  // First, load from TESTERS environment variable (comma-separated Twitch IDs)
  if (process.env.TESTERS) {
    const envTesters = process.env.TESTERS
      .split(',')
      .map(id => id.trim())
      .filter(id => id)
      .map(id => `twitch-${id}`);
    testers.push(...envTesters);
    console.log(`📋 Loaded ${envTesters.length} beta testers from TESTERS environment variable`);
  }
  
  // Then, load from Testers.txt file (supports both usernames and IDs)
  try {
    const testersPath = path.join(__dirname, 'Testers.txt');
    if (fs.existsSync(testersPath)) {
      const content = fs.readFileSync(testersPath, 'utf8');
      const fileTesters = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          // If it's a number, treat it as a Twitch ID
          if (/^\d+$/.test(line)) {
            return `twitch-${line}`;
          }
          // Otherwise, assume it's a username (legacy support)
          return line.toLowerCase();
        });
      
      // Merge with env testers (avoid duplicates)
      const uniqueFileTesters = fileTesters.filter(t => !testers.includes(t));
      testers.push(...uniqueFileTesters);
      console.log(`📋 Loaded ${fileTesters.length} beta testers from Testers.txt`);
    } else if (!process.env.TESTERS) {
      console.log('⚠️ No TESTERS environment variable and Testers.txt not found - no beta testers loaded');
    }
  } catch (error) {
    console.error('Error loading Testers.txt:', error);
  }
  
  if (testers.length > 0) {
    console.log(`✅ Total beta testers loaded: ${testers.length}`);
  }
  
  return testers;
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
    
    CREATE TABLE IF NOT EXISTS broadcaster_auth (
      channel_name TEXT PRIMARY KEY,
      broadcaster_id TEXT NOT NULL,
      broadcaster_name TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      scopes TEXT NOT NULL,
      authenticated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_state (
      channel_name TEXT PRIMARY KEY,
      weather TEXT DEFAULT 'Clear',
      time_of_day TEXT DEFAULT 'Day',
      season TEXT DEFAULT 'Spring',
      game_mode TEXT DEFAULT 'softcore',
      active_event TEXT DEFAULT NULL,
      maintenance_mode BOOLEAN DEFAULT false,
      last_broadcast TEXT DEFAULT NULL,
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
    
    -- Unified characters table (NEW) - replaces per-channel player tables
    CREATE TABLE IF NOT EXISTS characters (
      player_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'Silverbrook',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      xp_to_next INTEGER DEFAULT 10,
      max_hp INTEGER DEFAULT 100,
      hp INTEGER DEFAULT 100,
      mana INTEGER DEFAULT 100,
      max_mana INTEGER DEFAULT 100,
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
      bestiary JSONB DEFAULT '{}',
      bestiary_unlocked BOOLEAN DEFAULT false,
      map_knowledge JSONB DEFAULT '{"discovered_regions":["town_square"],"explored_sublocations":{"town_square":["inn","shop","blacksmith","temple"]},"visited_coordinates":[[5,5]],"discovered_coordinates":[[5,5]],"discovery_timestamp":{},"exploration_percentage":0}',
      roles JSONB DEFAULT '["viewer"]',
      name_color TEXT DEFAULT NULL,
      selected_role_badge TEXT DEFAULT NULL,
      theme TEXT DEFAULT 'crimson-knight',
      unlocked_abilities JSONB DEFAULT '[]',
      equipped_abilities JSONB DEFAULT '[]',
      ability_cooldowns JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(player_id, channel_name),
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    
    -- Account-wide progression table (NEW) - separate from character-specific data
    CREATE TABLE IF NOT EXISTS account_progress (
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    
    -- Performance indexes for new tables
    CREATE INDEX IF NOT EXISTS idx_characters_channel_player ON characters(channel_name, player_id);
    CREATE INDEX IF NOT EXISTS idx_characters_location ON characters(location);
    CREATE INDEX IF NOT EXISTS idx_characters_level_channel ON characters(channel_name, level DESC);
    CREATE INDEX IF NOT EXISTS idx_characters_gold_channel ON characters(channel_name, gold DESC);
    CREATE INDEX IF NOT EXISTS idx_characters_inventory ON characters USING gin(inventory);
    CREATE INDEX IF NOT EXISTS idx_characters_name_search ON characters USING gin(to_tsvector('english', name));
    CREATE INDEX IF NOT EXISTS idx_characters_in_combat ON characters(in_combat) WHERE in_combat = true;
    
    -- Sorting indexes for admin queries (case-insensitive)
    CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(LOWER(display_name));
    CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_characters_name_channel ON characters(channel_name, LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_account_progress_player ON account_progress(player_id);
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
        
        -- Bestiary tracking
        bestiary JSONB DEFAULT '{}',
        bestiary_unlocked BOOLEAN DEFAULT false,
        
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
        
        -- Abilities system
        unlocked_abilities JSONB DEFAULT '[]',
        equipped_abilities JSONB DEFAULT '[]',
        
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
    
    // Migration: Add selected_role_badge column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'selected_role_badge'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN selected_role_badge TEXT DEFAULT NULL;
        END IF;
      END $$;
    `);
    
    // Migration: Add theme column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'theme'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN theme TEXT DEFAULT 'crimson-knight';
        END IF;
      END $$;
    `);
    
    // Migration: Add unlocked_abilities column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'unlocked_abilities'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN unlocked_abilities JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
    
    // Migration: Add equipped_abilities column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'equipped_abilities'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN equipped_abilities JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
    
    // Migration: Add ability_cooldowns column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'ability_cooldowns'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN ability_cooldowns JSONB DEFAULT '{}';
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
    
    // Migration: Add bestiary columns if they don't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'bestiary'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN bestiary JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'bestiary_unlocked'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN bestiary_unlocked BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    
    // Migration: Add map_knowledge column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'map_knowledge'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN map_knowledge JSONB DEFAULT '{"discovered_regions":["town_square"],"explored_sublocations":{"town_square":["inn","shop","blacksmith","temple"]},"visited_coordinates":[[5,5]],"discovered_coordinates":[[5,5]],"discovery_timestamp":{},"exploration_percentage":0}';
        END IF;
      END $$;
    `);
  }
  
  // Migration: Add mana columns to all player tables if they don't exist
  console.log('🔧 Ensuring mana columns exist...');
  for (const channel of CHANNELS) {
    // SECURITY: getPlayerTable() sanitizes channel name, removing all non-alphanumeric characters
    // to prevent SQL injection. Table name format: players_{sanitized_channel}
    const tableName = getPlayerTable(channel);
    
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'mana'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN mana INTEGER DEFAULT 100;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'max_mana'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN max_mana INTEGER DEFAULT 100;
        END IF;
      END $$;
    `);
    
    // Initialize mana for existing characters without it
    await pool.query(`
      UPDATE ${tableName}
      SET mana = CASE 
        WHEN base_stats->>'intelligence' IS NOT NULL 
        THEN 50 + ((base_stats->>'intelligence')::int * 5)
        ELSE 100
      END,
      max_mana = CASE 
        WHEN base_stats->>'intelligence' IS NOT NULL 
        THEN 50 + ((base_stats->>'intelligence')::int * 5)
        ELSE 100
      END
      WHERE (mana = 0 OR mana IS NULL) AND (max_mana = 0 OR max_mana IS NULL)
    `);
  }
  console.log('✅ Mana columns verified');
  
  // Migration: Add game_mode column to game_state table if it doesn't exist
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_state' AND column_name = 'game_mode'
      ) THEN
        ALTER TABLE game_state ADD COLUMN game_mode TEXT DEFAULT 'softcore';
      END IF;
    END $$;
  `);
  
  // Migration: Add maintenance_mode column to game_state table if it doesn't exist
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_state' AND column_name = 'maintenance_mode'
      ) THEN
        ALTER TABLE game_state ADD COLUMN maintenance_mode BOOLEAN DEFAULT false;
      END IF;
    END $$;
  `);
  
  // Migration: Add last_broadcast column to game_state table if it doesn't exist
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_state' AND column_name = 'last_broadcast'
      ) THEN
        ALTER TABLE game_state ADD COLUMN last_broadcast TEXT DEFAULT NULL;
      END IF;
    END $$;
  `);
  
  console.log(`✅ Tables created/verified in ${Date.now() - tableStart}ms`);
  
  const tableTime = ((Date.now() - tableStart) / 1000).toFixed(2);
  console.log(`✅ Database schema verified/created in ${tableTime}s`);

  db = pool;
  
  // Sync tester roles for existing characters
  await syncTesterRoles();
}

/**
 * Synchronize tester roles for all existing characters on deployment
 * This ensures users added to TESTERS array get the role retroactively
 */
async function syncTesterRoles() {
  if (!db) {
    console.error('❌ Cannot sync tester roles: database not initialized');
    return;
  }
  
  if (BETA_TESTERS.length === 0) {
    console.log('ℹ️ No beta testers configured, skipping role sync');
    return;
  }
  
  console.log('🔄 Syncing tester roles for existing characters...');
  const syncStart = Date.now();
  let totalUpdated = 0;
  
  try {
    // Get list of channels from environment
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim().toLowerCase()) : [];
    
    for (const channel of CHANNELS) {
      // SECURITY: getPlayerTable() sanitizes channel name, removing all non-alphanumeric characters
      // to prevent SQL injection. Table name format: players_{sanitized_channel}
      const tableName = getPlayerTable(channel);
      
      // For each beta tester, check if they have a character and update their roles
      for (const testerId of BETA_TESTERS) {
        try {
          // Query to find character by player_id (parameterized to prevent SQL injection)
          const result = await db.query(
            `SELECT player_id, name, roles FROM ${tableName} WHERE player_id = $1`,
            [testerId]
          );
          
          if (result.rows.length > 0) {
            const character = result.rows[0];
            const currentRoles = character.roles || ['viewer'];
            
            // Check if tester role is already present
            if (!currentRoles.includes('tester')) {
              const updatedRoles = [...currentRoles, 'tester'];
              
              // Update the character's roles (parameterized to prevent SQL injection)
              await db.query(
                `UPDATE ${tableName} SET roles = $1 WHERE player_id = $2`,
                [JSON.stringify(updatedRoles), testerId]
              );
              
              totalUpdated++;
              console.log(`✅ Added tester role to ${character.name} in ${channel}`);
            }
          }
        } catch (error) {
          console.error(`Error syncing tester role for ${testerId} in ${channel}:`, error.message);
        }
      }
    }
    
    const syncTime = ((Date.now() - syncStart) / 1000).toFixed(2);
    if (totalUpdated > 0) {
      console.log(`✅ Synced tester roles: ${totalUpdated} character(s) updated in ${syncTime}s`);
    } else {
      console.log(`✅ Tester role sync complete: no updates needed (${syncTime}s)`);
    }
  } catch (error) {
    console.error('❌ Error during tester role sync:', error);
  }
}

// Helper function to get channel-specific player table name
// SECURITY: Table name is sanitized to prevent SQL injection
function getPlayerTable(channelName) {
  if (!channelName) {
    throw new Error('Channel name is required');
  }
  // Remove all characters except alphanumeric and underscores to prevent SQL injection
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
 * Saves to both old and new schema for backward compatibility
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @param {object} playerData - Player data object with all fields
 */
async function savePlayerProgress(playerId, channelName, playerData) {
  // Check if unified schema is available
  const useUnifiedSchema = await hasUnifiedSchema();
  
  if (useUnifiedSchema) {
    // Save to unified schema (new)
    await saveCharacterUnified(playerId, channelName, playerData);
    
    // Also save account-wide data to account_progress table
    const accountData = {
      passive_levels: playerData.passive_levels || {},
      souls: playerData.souls || 5,
      legacy_points: playerData.legacy_points || 0,
      account_stats: playerData.account_stats || {},
      total_deaths: playerData.total_deaths || 0,
      total_kills: playerData.total_kills || 0,
      total_gold_earned: playerData.total_gold_earned || 0,
      total_xp_earned: playerData.total_xp_earned || 0,
      highest_level_reached: playerData.highest_level_reached || 1,
      total_crits: playerData.total_crits || 0
    };
    await saveAccountProgress(playerId, accountData);
  }
  
  // Always save to old schema for backward compatibility during transition
  const table = getPlayerTable(channelName);
  const {
    name,
    location = 'Silverbrook',
    level = 1,
    xp = 0,
    xp_to_next = 10,
    max_hp = 100,
    hp = 100,
    mana = 0,
    max_mana = 0,
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
      headgear: null, chest: null, legs: null, footwear: null,
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
    nameColor = null,
    selectedRoleBadge = null,
    theme = 'crimson-knight',
    // Abilities
    unlocked_abilities = [],
    equipped_abilities = [],
    ability_cooldowns = {}
  } = playerData;

  await query(`
    INSERT INTO ${table} (
      player_id, name, location, level, xp, xp_to_next, max_hp, hp, mana, max_mana, gold,
      type, inventory, pending, combat, skill_cd, step, is_player, in_combat, equipped,
      base_stats, skills, skill_points, travel_state, active_quests, completed_quests,
      consumable_cooldowns, dialogue_history, reputation, unlocked_achievements,
      achievement_progress, achievement_unlock_dates, achievement_points,
      unlocked_titles, active_title, stats, dungeon_state, completed_dungeons,
      crafting_xp, known_recipes, season_progress, seasonal_challenges_completed,
      passive_levels, souls, legacy_points, account_stats, total_deaths, total_kills,
      total_gold_earned, total_xp_earned, highest_level_reached, total_crits, roles, name_color, selected_role_badge, theme,
      unlocked_abilities, equipped_abilities, ability_cooldowns, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26,
      $27, $28, $29, $30,
      $31, $32, $33,
      $34, $35, $36, $37, $38,
      $39, $40, $41, $42,
      $43, $44, $45, $46, $47, $48,
      $49, $50, $51, $52, $53, $54, $55, $56,
      $57, $58, $59, NOW()
    )
    ON CONFLICT(player_id) DO UPDATE SET
      name=$2, location=$3, level=$4, xp=$5, xp_to_next=$6, max_hp=$7, hp=$8, mana=$9, max_mana=$10, gold=$11,
      type=$12, inventory=$13, pending=$14, combat=$15, skill_cd=$16, step=$17, is_player=$18, in_combat=$19, equipped=$20,
      base_stats=$21, skills=$22, skill_points=$23, travel_state=$24, active_quests=$25, completed_quests=$26,
      consumable_cooldowns=$27, dialogue_history=$28, reputation=$29, unlocked_achievements=$30,
      achievement_progress=$31, achievement_unlock_dates=$32, achievement_points=$33,
      unlocked_titles=$34, active_title=$35, stats=$36, dungeon_state=$37, completed_dungeons=$38,
      crafting_xp=$39, known_recipes=$40, season_progress=$41, seasonal_challenges_completed=$42,
      passive_levels=$43, souls=$44, legacy_points=$45, account_stats=$46, total_deaths=$47, total_kills=$48,
      total_gold_earned=$49, total_xp_earned=$50, highest_level_reached=$51, total_crits=$52, roles=$53, name_color=$54, selected_role_badge=$55, theme=$56,
      unlocked_abilities=$57, equipped_abilities=$58, ability_cooldowns=$59, updated_at=NOW()
  `, [
    playerId, name, location, level, xp, xp_to_next, max_hp, hp, mana, max_mana, gold,
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
    total_gold_earned, total_xp_earned, highest_level_reached, total_crits, JSON.stringify(roles), nameColor, selectedRoleBadge, theme,
    JSON.stringify(unlocked_abilities), JSON.stringify(equipped_abilities), JSON.stringify(ability_cooldowns)
  ]);
}

/**
 * Load player progress from database
 * Tries unified schema first, falls back to old schema for backward compatibility
 * @param {string} playerId - The player's unique ID
 * @param {string} channelName - The streamer's channel name (lowercase)
 * @returns {object|null} Player data or null if not found
 */
async function loadPlayerProgress(playerId, channelName) {
  // Check if unified schema is available
  const useUnifiedSchema = await hasUnifiedSchema();
  
  if (useUnifiedSchema) {
    // Try loading from unified schema first
    const characterData = await loadCharacterUnified(playerId, channelName);
    
    if (characterData) {
      // Load account progress and merge it
      const accountProgress = await loadAccountProgress(playerId);
      
      if (accountProgress) {
        // Merge account-wide data into character data
        return {
          ...characterData,
          passive_levels: accountProgress.passive_levels,
          souls: accountProgress.souls,
          legacy_points: accountProgress.legacy_points,
          account_stats: accountProgress.account_stats,
          total_deaths: accountProgress.total_deaths,
          total_kills: accountProgress.total_kills,
          total_gold_earned: accountProgress.total_gold_earned,
          total_xp_earned: accountProgress.total_xp_earned,
          highest_level_reached: accountProgress.highest_level_reached,
          total_crits: accountProgress.total_crits
        };
      }
      
      return characterData;
    }
  }
  
  // Fall back to old schema
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
    mana: row.mana || 0,
    max_mana: row.max_mana || 0,
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
    // Bestiary
    bestiary: typeof row.bestiary === 'string' ? JSON.parse(row.bestiary) : (row.bestiary || {}),
    bestiary_unlocked: row.bestiary_unlocked || false,
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
    selectedRoleBadge: row.selected_role_badge || null,
    theme: row.theme || 'crimson-knight',
    // Abilities system
    unlocked_abilities: typeof row.unlocked_abilities === 'string' ? JSON.parse(row.unlocked_abilities) : (row.unlocked_abilities || []),
    equipped_abilities: typeof row.equipped_abilities === 'string' ? JSON.parse(row.equipped_abilities) : (row.equipped_abilities || []),
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
      headgear: null, chest: null, legs: null, footwear: null,
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
  try {
    const Character = require('./game/Character');
    const character = Character.createNew(playerName, classType, location);
    await saveCharacter(playerId, channelName, character);
    return character;
  } catch (error) {
    console.error('❌ Failed to create character:', error.message);
    
    // If it's a missing column error, provide helpful message
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      throw new Error(
        'Database schema is missing required columns. Please run: node scripts/add_mana_columns.js'
      );
    }
    
    throw error;
  }
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
  
  // Check if player exists first
  const existing = await query(
    `SELECT player_id FROM ${table} WHERE player_id = $1`,
    [playerId]
  );
  
  if (existing.rows.length > 0) {
    // Player exists, just update roles
    await query(
      `UPDATE ${table} SET roles = $1, updated_at = NOW() WHERE player_id = $2`,
      [JSON.stringify(rolesToSet), playerId]
    );
  } else {
    // Player doesn't exist, get their display name from the players table
    const playerInfo = await query(
      `SELECT display_name FROM players WHERE id = $1`,
      [playerId]
    );
    
    if (playerInfo.rows.length > 0) {
      const displayName = playerInfo.rows[0].display_name;
      // Create a minimal player entry with roles
      // Uses DEFAULT_STARTING_LOCATION as the initial spawn point for players who haven't created a character yet
      // This allows the bot to track roles for users before they officially create a character through the web UI
      await query(
        `INSERT INTO ${table} (player_id, name, location, roles, updated_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [playerId, displayName, DEFAULT_STARTING_LOCATION, JSON.stringify(rolesToSet)]
      );
    } else {
      // Player doesn't exist in global players table either - skip update
      console.warn(`Cannot update roles for ${playerId} - player not found in global players table`);
    }
  }
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
 * Check if user is a beta tester by player ID or username
 * @param {string} identifier - Player ID (twitch-{id}) or username to check
 * @returns {boolean} True if user is a beta tester
 */
function isBetaTester(identifier) {
  // Check if it's a player ID (twitch-{id}) or username
  if (identifier.startsWith('twitch-')) {
    return BETA_TESTERS.includes(identifier);
  }
  // Legacy support: check by username (lowercase)
  return BETA_TESTERS.includes(identifier.toLowerCase());
}

/**
 * Determine user roles from Twitch tags/badges
 * @param {string} username - Twitch username
 * @param {string} channelName - Channel name
 * @param {object} tags - Twitch message tags
 * @param {string} userId - Twitch user ID (optional, for tester checking)
 * @returns {Array<string>} Array of user roles
 */
function determineRoleFromTags(username, channelName, tags = {}, userId = null) {
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
  // Prefer checking by user ID (twitch-{id}), fallback to username
  const identifier = userId ? `twitch-${userId}` : username;
  if (isBetaTester(identifier)) {
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

/**
 * Save broadcaster authentication credentials
 * @param {string} channelName - Channel name
 * @param {string} broadcasterId - Broadcaster's Twitch ID
 * @param {string} broadcasterName - Broadcaster's display name
 * @param {string} accessToken - OAuth access token with expanded scopes
 * @param {string} refreshToken - OAuth refresh token
 * @param {Array<string>} scopes - Array of granted OAuth scopes
 */
async function saveBroadcasterAuth(channelName, broadcasterId, broadcasterName, accessToken, refreshToken, scopes) {
  await query(
    `INSERT INTO broadcaster_auth (channel_name, broadcaster_id, broadcaster_name, access_token, refresh_token, scopes, authenticated_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (channel_name)
     DO UPDATE SET 
       broadcaster_id = $2,
       broadcaster_name = $3,
       access_token = $4,
       refresh_token = $5,
       scopes = $6,
       updated_at = NOW()`,
    [channelName.toLowerCase(), broadcasterId, broadcasterName, accessToken, refreshToken, scopes.join(' ')]
  );
  console.log(`✅ Saved broadcaster auth for channel: ${channelName}`);
}

/**
 * Get broadcaster authentication credentials for a channel
 * @param {string} channelName - Channel name
 * @returns {Promise<Object|null>} Broadcaster auth data or null if not found
 */
async function getBroadcasterAuth(channelName) {
  const result = await query(
    `SELECT * FROM broadcaster_auth WHERE channel_name = $1`,
    [channelName.toLowerCase()]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    channelName: row.channel_name,
    broadcasterId: row.broadcaster_id,
    broadcasterName: row.broadcaster_name,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    scopes: row.scopes.split(' '),
    authenticatedAt: row.authenticated_at,
    updatedAt: row.updated_at
  };
}

/**
 * Check if broadcaster is authenticated for a channel
 * @param {string} channelName - Channel name
 * @returns {Promise<boolean>} True if broadcaster is authenticated
 */
async function isBroadcasterAuthenticated(channelName) {
  const auth = await getBroadcasterAuth(channelName);
  return auth !== null;
}

/**
 * Update a single field in player progress
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {string} fieldName - Field name to update
 * @param {any} value - New value
 */
async function updatePlayerField(playerId, channelName, fieldName, value) {
  const table = getPlayerTable(channelName);
  
  // For JSON/JSONB fields, stringify the value
  const jsonFields = ['inventory', 'equipped', 'base_stats', 'skills', 'active_quests', 
    'completed_quests', 'consumable_cooldowns', 'dialogue_history', 'reputation',
    'unlocked_achievements', 'achievement_progress', 'achievement_unlock_dates',
    'unlocked_titles', 'stats', 'dungeon_state', 'completed_dungeons',
    'known_recipes', 'season_progress', 'seasonal_challenges_completed',
    'passive_levels', 'account_stats', 'roles', 'bestiary'];
  
  const finalValue = jsonFields.includes(fieldName) && typeof value === 'object' 
    ? JSON.stringify(value) 
    : value;
  
  await query(
    `UPDATE ${table} SET ${fieldName} = $2, updated_at = NOW() WHERE player_id = $1`,
    [playerId, finalValue]
  );
}

/**
 * Get player progress (alias for loadPlayerProgress for consistency)
 */
async function getPlayerProgress(playerId, channelName) {
  return await loadPlayerProgress(playerId, channelName);
}

/**
 * Get game state for a channel
 * @param {string} channelName - Channel name
 * @returns {Object|null} Game state object or null if not found
 */
async function getGameState(channelName) {
  try {
    const result = await query(
      'SELECT * FROM game_state WHERE channel_name = $1',
      [channelName.toLowerCase()]
    );
    
    if (result.rows && result.rows.length > 0) {
      return result.rows[0];
    }
    
    // If no game state exists, create default one
    return null;
  } catch (error) {
    console.error('Error getting game state:', error);
    throw error;
  }
}

/**
 * Set/update game state for a channel
 * @param {string} channelName - Channel name
 * @param {Object} gameState - Game state object with weather, time_of_day, season, game_mode
 * @returns {Object} Updated game state
 */
async function setGameState(channelName, gameState) {
  try {
    const { weather, time_of_day, season, game_mode } = gameState;
    
    const result = await query(
      `INSERT INTO game_state (channel_name, weather, time_of_day, season, game_mode, last_updated)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (channel_name) 
       DO UPDATE SET 
         weather = $2,
         time_of_day = $3,
         season = $4,
         game_mode = $5,
         last_updated = NOW()
       RETURNING *`,
      [channelName.toLowerCase(), weather, time_of_day, season, game_mode]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error setting game state:', error);
    throw error;
  }
}

// ===== UNIFIED SCHEMA HELPER FUNCTIONS =====

/**
 * Check if unified schema is available
 * @returns {Promise<boolean>} True if characters table exists
 */
async function hasUnifiedSchema() {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'characters'
      )
    `);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

/**
 * Load character from unified schema
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @returns {Object|null} Character data or null if not found
 */
async function loadCharacterUnified(playerId, channelName) {
  const result = await query(
    `SELECT * FROM characters WHERE player_id = $1 AND channel_name = $2`,
    [playerId, channelName.toLowerCase()]
  );

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
    mana: row.mana || 0,
    max_mana: row.max_mana || 0,
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
    bestiary: typeof row.bestiary === 'string' ? JSON.parse(row.bestiary) : (row.bestiary || {}),
    bestiary_unlocked: row.bestiary_unlocked || false,
    map_knowledge: typeof row.map_knowledge === 'string' ? JSON.parse(row.map_knowledge) : (row.map_knowledge || {}),
    roles: typeof row.roles === 'string' ? JSON.parse(row.roles) : (row.roles || ['viewer']),
    nameColor: row.name_color || null,
    selectedRoleBadge: row.selected_role_badge || null,
    theme: row.theme || 'crimson-knight',
    unlocked_abilities: typeof row.unlocked_abilities === 'string' ? JSON.parse(row.unlocked_abilities) : (row.unlocked_abilities || []),
    equipped_abilities: typeof row.equipped_abilities === 'string' ? JSON.parse(row.equipped_abilities) : (row.equipped_abilities || []),
    ability_cooldowns: typeof row.ability_cooldowns === 'string' ? JSON.parse(row.ability_cooldowns) : (row.ability_cooldowns || {}),
    updated_at: row.updated_at
  };
}

/**
 * Save character to unified schema
 * @param {string} playerId - Player ID
 * @param {string} channelName - Channel name
 * @param {Object} playerData - Character data
 */
async function saveCharacterUnified(playerId, channelName, playerData) {
  const {
    name,
    location = 'Silverbrook',
    level = 1,
    xp = 0,
    xp_to_next = 10,
    max_hp = 100,
    hp = 100,
    mana = 0,
    max_mana = 0,
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
      headgear: null, chest: null, legs: null, footwear: null,
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
    bestiary = {},
    bestiary_unlocked = false,
    map_knowledge = {},
    roles = ['viewer'],
    nameColor = null,
    selectedRoleBadge = null,
    theme = 'crimson-knight',
    unlocked_abilities = [],
    equipped_abilities = [],
    ability_cooldowns = {}
  } = playerData;

  await query(`
    INSERT INTO characters (
      player_id, channel_name, name, location, level, xp, xp_to_next, max_hp, hp, mana, max_mana, gold,
      type, inventory, pending, combat, skill_cd, step, is_player, in_combat, equipped,
      base_stats, skills, skill_points, travel_state, active_quests, completed_quests,
      consumable_cooldowns, dialogue_history, reputation, unlocked_achievements,
      achievement_progress, achievement_unlock_dates, achievement_points,
      unlocked_titles, active_title, stats, dungeon_state, completed_dungeons,
      crafting_xp, known_recipes, season_progress, seasonal_challenges_completed,
      bestiary, bestiary_unlocked, map_knowledge, roles, name_color, selected_role_badge, theme,
      unlocked_abilities, equipped_abilities, ability_cooldowns, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25, $26, $27,
      $28, $29, $30, $31,
      $32, $33, $34,
      $35, $36, $37, $38, $39,
      $40, $41, $42, $43,
      $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, NOW()
    )
    ON CONFLICT(player_id, channel_name) DO UPDATE SET
      name=$3, location=$4, level=$5, xp=$6, xp_to_next=$7, max_hp=$8, hp=$9, mana=$10, max_mana=$11, gold=$12,
      type=$13, inventory=$14, pending=$15, combat=$16, skill_cd=$17, step=$18, is_player=$19, in_combat=$20, equipped=$21,
      base_stats=$22, skills=$23, skill_points=$24, travel_state=$25, active_quests=$26, completed_quests=$27,
      consumable_cooldowns=$28, dialogue_history=$29, reputation=$30, unlocked_achievements=$31,
      achievement_progress=$32, achievement_unlock_dates=$33, achievement_points=$34,
      unlocked_titles=$35, active_title=$36, stats=$37, dungeon_state=$38, completed_dungeons=$39,
      crafting_xp=$40, known_recipes=$41, season_progress=$42, seasonal_challenges_completed=$43,
      bestiary=$44, bestiary_unlocked=$45, map_knowledge=$46, roles=$47, name_color=$48, selected_role_badge=$49, theme=$50,
      unlocked_abilities=$51, equipped_abilities=$52, ability_cooldowns=$53, updated_at=NOW()
  `, [
    playerId, channelName.toLowerCase(), name, location, level, xp, xp_to_next, max_hp, hp, mana, max_mana, gold,
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
    JSON.stringify(bestiary), bestiary_unlocked, JSON.stringify(map_knowledge), JSON.stringify(roles), nameColor, selectedRoleBadge, theme,
    JSON.stringify(unlocked_abilities), JSON.stringify(equipped_abilities), JSON.stringify(ability_cooldowns)
  ]);
}

/**
 * Load account progress from unified schema
 * @param {string} playerId - Player ID
 * @returns {Object|null} Account progress data or null if not found
 */
async function loadAccountProgress(playerId) {
  const result = await query(
    `SELECT * FROM account_progress WHERE player_id = $1`,
    [playerId]
  );

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    passive_levels: typeof row.passive_levels === 'string' ? JSON.parse(row.passive_levels) : (row.passive_levels || {}),
    souls: row.souls || 5,
    legacy_points: row.legacy_points || 0,
    account_stats: typeof row.account_stats === 'string' ? JSON.parse(row.account_stats) : (row.account_stats || {}),
    total_deaths: row.total_deaths || 0,
    total_kills: row.total_kills || 0,
    total_gold_earned: row.total_gold_earned || 0,
    total_xp_earned: row.total_xp_earned || 0,
    highest_level_reached: row.highest_level_reached || 1,
    total_crits: row.total_crits || 0
  };
}

/**
 * Save account progress to unified schema
 * @param {string} playerId - Player ID
 * @param {Object} progressData - Account progress data
 */
async function saveAccountProgress(playerId, progressData) {
  const {
    passive_levels = {},
    souls = 5,
    legacy_points = 0,
    account_stats = {},
    total_deaths = 0,
    total_kills = 0,
    total_gold_earned = 0,
    total_xp_earned = 0,
    highest_level_reached = 1,
    total_crits = 0
  } = progressData;

  await query(`
    INSERT INTO account_progress (
      player_id, passive_levels, souls, legacy_points, account_stats,
      total_deaths, total_kills, total_gold_earned, total_xp_earned,
      highest_level_reached, total_crits, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
    )
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
      updated_at = NOW()
  `, [
    playerId,
    JSON.stringify(passive_levels),
    souls,
    legacy_points,
    JSON.stringify(account_stats),
    total_deaths,
    total_kills,
    total_gold_earned,
    total_xp_earned,
    highest_level_reached,
    total_crits
  ]);
}

// ===== ADMIN QUERY FUNCTIONS =====

/**
 * Get all players (admin function)
 * Returns players sorted alphabetically by display name
 */
async function getAllPlayers() {
  const result = await query(
    'SELECT * FROM players ORDER BY LOWER(display_name) ASC'
  );
  return result.rows;
}

/**
 * Get all characters for a channel (admin function)
 * Returns characters sorted alphabetically by name
 * NOTE: Table name is sanitized via getPlayerTable() which removes all non-alphanumeric chars
 *       preventing SQL injection. The function enforces format: players_{sanitized_channel}
 */
async function getAllCharactersForChannel(channelName) {
  const tableName = getPlayerTable(channelName); // Sanitized table name
  const result = await query(
    `SELECT * FROM ${tableName} ORDER BY LOWER(name) ASC`
  );
  return result.rows;
}

/**
 * Get all characters across all channels (admin function)
 * Returns characters sorted by channel, then by name
 */
async function getAllCharacters() {
  const result = await query(
    'SELECT * FROM characters ORDER BY channel_name ASC, LOWER(name) ASC'
  );
  return result.rows;
}

/**
 * Search players by name (admin function)
 * Case-insensitive search with alphabetical results
 */
async function searchPlayersByName(searchTerm) {
  const result = await query(
    `SELECT * FROM players 
     WHERE LOWER(display_name) LIKE LOWER($1) 
     ORDER BY LOWER(display_name) ASC`,
    [`%${searchTerm}%`]
  );
  return result.rows;
}

/**
 * Search characters by name (admin function)
 */
async function searchCharactersByName(searchTerm, channelName = null) {
  let sql, params;
  
  if (channelName) {
    sql = `SELECT * FROM characters 
           WHERE channel_name = $1 AND LOWER(name) LIKE LOWER($2)
           ORDER BY LOWER(name) ASC`;
    params = [channelName, `%${searchTerm}%`];
  } else {
    sql = `SELECT * FROM characters 
           WHERE LOWER(name) LIKE LOWER($1)
           ORDER BY channel_name ASC, LOWER(name) ASC`;
    params = [`%${searchTerm}%`];
  }
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Analyze database tables for better query planning
 * Should be run periodically (e.g., daily)
 */
async function analyzeDatabase() {
  console.log('📊 Analyzing database tables...');
  
  try {
    // Analyze global tables
    await query('ANALYZE players');
    await query('ANALYZE characters');
    await query('ANALYZE account_progress');
    
    // Analyze channel tables
    const CHANNELS = process.env.CHANNELS ? 
      process.env.CHANNELS.split(',').map(ch => ch.trim().toLowerCase()) : [];
    
    for (const channel of CHANNELS) {
      const tableName = getPlayerTable(channel);
      await query(`ANALYZE ${tableName}`);
    }
    
    console.log('✅ Database analysis complete');
  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  }
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
  getPlayerProgress,
  updatePlayerField,
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
  getOperatorAuditLog,
  // Broadcaster authentication
  saveBroadcasterAuth,
  getBroadcasterAuth,
  isBroadcasterAuthenticated,
  // Game state management
  getGameState,
  setGameState,
  // Unified schema functions (NEW)
  hasUnifiedSchema,
  loadCharacterUnified,
  saveCharacterUnified,
  loadAccountProgress,
  saveAccountProgress,
  // Admin query functions
  getAllPlayers,
  getAllCharacters,
  getAllCharactersForChannel,
  searchPlayersByName,
  searchCharactersByName,
  analyzeDatabase,
  // Constants
  ROLE_HIERARCHY,
  ROLE_COLORS,
  DEFAULT_STARTING_LOCATION
};
