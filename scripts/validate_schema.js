#!/usr/bin/env node

/**
 * Schema Validation Script
 * Checks that all required columns exist in database tables
 * Returns detailed report of missing columns
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Define required columns for each table
const REQUIRED_SCHEMA = {
  characters: [
    'player_id', 'channel_name', 'name', 'location',
    'level', 'xp', 'xp_to_next',
    'max_hp', 'hp', 'mana', 'max_mana', 'gold', 'type',
    'inventory', 'equipped', 'base_stats', 'skills',
    'in_combat', 'combat', 'skill_points',
    'active_quests', 'completed_quests',
    'roles', 'theme', 'created_at', 'updated_at'
  ],
  account_progress: [
    'player_id', 'username', 'tutorial_completed',
    'passive_levels', 'souls', 'legacy_points',
    'total_deaths', 'total_kills', 'total_gold_earned',
    'created_at', 'updated_at'
  ],
  players: [
    'id', 'twitch_id', 'display_name',
    'access_token', 'refresh_token', 'created_at'
  ]
};

async function validateSchema() {
  console.log('🔍 Validating database schema...\n');
  
  let hasErrors = false;
  const missingColumns = {};
  
  try {
    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
      // Check if table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (!tableExists.rows[0].exists) {
        console.log(`❌ Table '${tableName}' does not exist!`);
        hasErrors = true;
        continue;
      }
      
      // Get existing columns
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);
      
      const existingColumns = columnsResult.rows.map(r => r.column_name);
      
      // Find missing columns
      const missing = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missing.length > 0) {
        console.log(`⚠️  Table '${tableName}' is missing ${missing.length} column(s):`);
        missing.forEach(col => console.log(`   - ${col}`));
        console.log('');
        missingColumns[tableName] = missing;
        hasErrors = true;
      } else {
        console.log(`✅ Table '${tableName}' has all required columns`);
      }
    }
    
    // Check legacy player tables
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    console.log(`\n📋 Checking ${CHANNELS.length} legacy player tables...\n`);
    
    for (const channel of CHANNELS) {
      const tableName = `players_${channel.replace(/[^a-z0-9_]/g, '_')}`;
      
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (!tableExists.rows[0].exists) {
        console.log(`⚠️  Legacy table '${tableName}' does not exist`);
        continue;
      }
      
      // Check for mana columns in legacy tables
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND column_name IN ('mana', 'max_mana')
      `, [tableName]);
      
      if (columnsResult.rows.length < 2) {
        console.log(`⚠️  Legacy table '${tableName}' missing mana columns`);
        hasErrors = true;
      } else {
        console.log(`✅ Legacy table '${tableName}' has mana columns`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (hasErrors) {
      console.log('\n❌ Schema validation FAILED');
      console.log('\n📋 Recommended actions:');
      console.log('   1. Run: node scripts/add_mana_columns.js');
      console.log('   2. Restart the server');
      console.log('   3. Run validation again\n');
      process.exit(1);
    } else {
      console.log('\n✅ Schema validation PASSED');
      console.log('All required columns are present!\n');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Validation error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  validateSchema();
}

module.exports = { validateSchema, REQUIRED_SCHEMA };
