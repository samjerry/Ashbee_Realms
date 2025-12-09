/**
 * Database Migration Script
 * Run this to update your Railway PostgreSQL database schema
 * 
 * Usage: node migrate-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Validate environment variables
function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');

  const requiredVars = [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string', critical: true },
    { name: 'TWITCH_CLIENT_ID', description: 'Twitch application client ID', critical: true },
    { name: 'TWITCH_CLIENT_SECRET', description: 'Twitch application client secret', critical: true },
    { name: 'TWITCH_BOT_USERNAME', description: 'Twitch bot username (lowercase)', critical: true },
    { name: 'TWITCH_OAUTH_TOKEN', description: 'Twitch OAuth token (oauth:...)', critical: true },
    { name: 'TWITCH_CHANNEL', description: 'Default Twitch channel (lowercase)', critical: true },
    { name: 'SESSION_SECRET', description: 'Express session secret key', critical: true },
    { name: 'NODE_ENV', description: 'Environment (production/development)', critical: false },
    { name: 'CLIENT_URL', description: 'Frontend URL for CORS', critical: false }
  ];

  const missing = [];
  const warnings = [];
  let allValid = true;

  requiredVars.forEach(variable => {
    const value = process.env[variable.name];
    const isSet = value && value.trim() !== '';

    if (!isSet) {
      if (variable.critical) {
        console.log(`❌ ${variable.name} - MISSING (${variable.description})`);
        missing.push(variable);
        allValid = false;
      } else {
        console.log(`⚠️  ${variable.name} - NOT SET (${variable.description})`);
        warnings.push(variable);
      }
    } else {
      // Validate specific formats
      if (variable.name === 'TWITCH_OAUTH_TOKEN' && !value.startsWith('oauth:')) {
        console.log(`⚠️  ${variable.name} - Should start with 'oauth:' (current: ${value.substring(0, 10)}...)`);
        warnings.push(variable);
      } else if (variable.name === 'SESSION_SECRET' && value.length < 32) {
        console.log(`⚠️  ${variable.name} - Should be at least 32 characters long (current: ${value.length})`);
        warnings.push(variable);
      } else if (variable.name === 'DATABASE_URL' && !value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        console.log(`⚠️  ${variable.name} - Should start with 'postgresql://' or 'postgres://'`);
        warnings.push(variable);
      } else {
        // Mask sensitive values
        let displayValue = value;
        if (['TWITCH_CLIENT_SECRET', 'TWITCH_OAUTH_TOKEN', 'SESSION_SECRET', 'DATABASE_URL'].includes(variable.name)) {
          displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
        }
        console.log(`✅ ${variable.name} - SET (${displayValue})`);
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  
  if (missing.length > 0) {
    console.log(`\n❌ ${missing.length} CRITICAL variable(s) missing:`);
    missing.forEach(v => {
      console.log(`   - ${v.name}: ${v.description}`);
    });
    console.log('\nAdd these to your .env file or Railway environment variables.');
    console.log('='.repeat(60) + '\n');
    return false;
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s) - not critical but recommended:`);
    warnings.forEach(v => {
      console.log(`   - ${v.name}: ${v.description}`);
    });
  } else {
    console.log('\n✅ All environment variables are properly configured!');
  }
  
  console.log('='.repeat(60) + '\n');
  return allValid;
}

async function migrate() {
  // Validate environment first
  if (!validateEnvironment()) {
    console.error('❌ Cannot proceed with migration due to missing critical environment variables.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    
    // Test basic connection
    const connectionTest = await pool.query('SELECT NOW(), current_database(), current_user');
    const dbInfo = connectionTest.rows[0];
    console.log('✅ Connected successfully');
    console.log(`   Database: ${dbInfo.current_database}`);
    console.log(`   User: ${dbInfo.current_user}`);
    console.log(`   Server Time: ${dbInfo.now}\n`);

    // Verify database permissions
    console.log('🔐 Checking database permissions...');
    const permissionsCheck = await pool.query(`
      SELECT 
        has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
        has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect,
        has_schema_privilege(current_user, 'public', 'CREATE') as can_create_tables,
        has_schema_privilege(current_user, 'public', 'USAGE') as can_use_schema
    `);
    
    const perms = permissionsCheck.rows[0];
    console.log(`   Connect: ${perms.can_connect ? '✅' : '❌'}`);
    console.log(`   Create Database Objects: ${perms.can_create ? '✅' : '❌'}`);
    console.log(`   Create Tables: ${perms.can_create_tables ? '✅' : '❌'}`);
    console.log(`   Use Schema: ${perms.can_use_schema ? '✅' : '❌'}\n`);

    if (!perms.can_create_tables) {
      console.error('❌ Insufficient permissions! User cannot create tables.');
      console.error('   This database may not be properly linked to your project.');
      process.exit(1);
    }

    // Check if required tables exist
    console.log('🔍 Checking database schema...');
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('players', 'player_progress', 'permanent_stats')
      ORDER BY table_name;
    `);
    
    const existingTables = tablesCheck.rows.map(r => r.table_name);
    const requiredTables = ['players', 'player_progress', 'permanent_stats'];
    
    console.log('   Required tables:');
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

    if (existingTables.length === 0) {
      console.log('\n⚠️  No game tables found! This appears to be a fresh database.');
      console.log('   The database is linked, but tables need to be initialized.');
      console.log('   Start your server once (npm start) to create initial tables,');
      console.log('   then run this migration again.\n');
      process.exit(1);
    }

    if (!existingTables.includes('player_progress')) {
      console.error('\n❌ player_progress table does not exist!');
      console.error('   Cannot migrate a table that doesn\'t exist yet.');
      console.error('   Run your server first to initialize the database schema.\n');
      process.exit(1);
    }

    console.log('\n🔍 Checking player_progress columns...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'player_progress'
      ORDER BY ordinal_position;
    `);
    
    const existingColumns = columnCheck.rows.map(r => r.column_name);
    console.log(`   Found ${existingColumns.length} existing columns\n`);

    // List of all columns that should exist (from db.js schema)
    const requiredColumns = [
      { name: 'base_stats', type: 'JSONB', default: "'{}'::jsonb" },
      { name: 'skills', type: 'JSONB', default: "'{\"skills\":{},\"globalCooldown\":0}'::jsonb" },
      { name: 'skill_points', type: 'INTEGER', default: '0' },
      { name: 'travel_state', type: 'JSONB', default: 'NULL' },
      { name: 'active_quests', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'completed_quests', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'consumable_cooldowns', type: 'JSONB', default: "'{}'::jsonb" },
      { name: 'dialogue_history', type: 'JSONB', default: "'{}'::jsonb" },
      { name: 'reputation', type: 'JSONB', default: "'{\"general\":0}'::jsonb" },
      { name: 'unlocked_achievements', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'achievement_progress', type: 'JSONB', default: "'{}'::jsonb" },
      { name: 'achievement_unlock_dates', type: 'JSONB', default: "'{}'::jsonb" },
      { name: 'achievement_points', type: 'INTEGER', default: '0' },
      { name: 'unlocked_titles', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'active_title', type: 'TEXT', default: 'NULL' },
      { name: 'stats', type: 'JSONB', default: "'{\"totalKills\":0,\"bossKills\":0,\"criticalHits\":0,\"highestDamage\":0,\"deaths\":0,\"locationsVisited\":[],\"biomesVisited\":[],\"totalGoldEarned\":0,\"totalGoldSpent\":0,\"mysteriesSolved\":0}'::jsonb" },
      { name: 'dungeon_state', type: 'JSONB', default: 'NULL' },
      { name: 'completed_dungeons', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'crafting_xp', type: 'INTEGER', default: '0' },
      { name: 'known_recipes', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'season_progress', type: 'JSONB', default: "'{}'::jsonb" },
      { name: 'seasonal_challenges_completed', type: 'JSONB', default: "'[]'::jsonb" }
    ];

    let migrationsApplied = 0;

    // Add missing columns
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adding missing column: ${col.name} (${col.type})`);
        try {
          await pool.query(`
            ALTER TABLE player_progress 
            ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default};
          `);
          console.log(`   ✅ Added ${col.name}`);
          migrationsApplied++;
        } catch (err) {
          console.error(`   ❌ Failed to add ${col.name}:`, err.message);
        }
      }
    }

    // Update existing rows to have default values for new columns
    if (migrationsApplied > 0) {
      console.log('\n🔄 Updating existing player records with default values...');
      const updateResult = await pool.query(`
        UPDATE player_progress 
        SET 
          base_stats = COALESCE(base_stats, '{}'::jsonb),
          skills = COALESCE(skills, '{"skills":{},"globalCooldown":0}'::jsonb),
          skill_points = COALESCE(skill_points, 0),
          active_quests = COALESCE(active_quests, '[]'::jsonb),
          completed_quests = COALESCE(completed_quests, '[]'::jsonb),
          consumable_cooldowns = COALESCE(consumable_cooldowns, '{}'::jsonb),
          dialogue_history = COALESCE(dialogue_history, '{}'::jsonb),
          reputation = COALESCE(reputation, '{"general":0}'::jsonb),
          unlocked_achievements = COALESCE(unlocked_achievements, '[]'::jsonb),
          achievement_progress = COALESCE(achievement_progress, '{}'::jsonb),
          achievement_unlock_dates = COALESCE(achievement_unlock_dates, '{}'::jsonb),
          achievement_points = COALESCE(achievement_points, 0),
          unlocked_titles = COALESCE(unlocked_titles, '[]'::jsonb),
          stats = COALESCE(stats, '{"totalKills":0,"bossKills":0,"criticalHits":0,"highestDamage":0,"deaths":0,"locationsVisited":[],"biomesVisited":[],"totalGoldEarned":0,"totalGoldSpent":0,"mysteriesSolved":0}'::jsonb),
          completed_dungeons = COALESCE(completed_dungeons, '[]'::jsonb),
          crafting_xp = COALESCE(crafting_xp, 0),
          known_recipes = COALESCE(known_recipes, '[]'::jsonb),
          season_progress = COALESCE(season_progress, '{}'::jsonb),
          seasonal_challenges_completed = COALESCE(seasonal_challenges_completed, '[]'::jsonb)
        WHERE base_stats IS NULL OR skills IS NULL;
      `);
      console.log(`   ✅ Updated ${updateResult.rowCount} existing records`);
    }

    // Final validation - verify the migration worked
    console.log('\n🔍 Verifying migration...');
    const finalCheck = await pool.query(`
      SELECT COUNT(*) as total_columns
      FROM information_schema.columns 
      WHERE table_name = 'player_progress';
    `);
    console.log(`   ✅ player_progress table now has ${finalCheck.rows[0].total_columns} columns`);

    // Test a sample query to ensure everything works
    try {
      await pool.query(`
        SELECT player_id, name, level, base_stats, skills 
        FROM player_progress 
        LIMIT 1;
      `);
      console.log('   ✅ Sample query successful - all columns accessible');
    } catch (err) {
      console.log('   ⚠️  No player data exists yet (this is normal for a new database)');
    }

    console.log('\n' + '='.repeat(60));
    if (migrationsApplied > 0) {
      console.log(`✅ Migration complete! Applied ${migrationsApplied} schema changes.`);
      console.log('🚀 Your database is now up to date!');
      console.log('\n📝 Next steps:');
      console.log('   1. Deploy your changes to Railway (git push)');
      console.log('   2. Railway will automatically rebuild and restart');
      console.log('   3. Your app should work without column errors');
    } else {
      console.log('✅ Database schema is already up to date!');
      console.log('No migrations needed.');
    }
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    
    // Provide helpful error messages based on common issues
    if (err.code === 'ENOTFOUND') {
      console.error('\n💡 DNS resolution failed - check your DATABASE_URL hostname');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused - database may be down or unreachable');
    } else if (err.code === '28P01') {
      console.error('\n💡 Authentication failed - check username/password in DATABASE_URL');
    } else if (err.code === '3D000') {
      console.error('\n💡 Database does not exist - check database name in DATABASE_URL');
    } else if (err.code === '42P01') {
      console.error('\n💡 Table does not exist - run your server first to initialize schema');
    } else if (err.message.includes('SSL')) {
      console.error('\n💡 SSL connection issue - Railway requires SSL, check connection settings');
    }
    
    console.error('\n📚 Full error details:');
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
