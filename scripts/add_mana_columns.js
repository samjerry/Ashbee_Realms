#!/usr/bin/env node

/**
 * Database Migration Script: Add mana and max_mana columns
 * This script adds mana and max_mana columns to all player tables
 * and initializes mana based on character intelligence
 * 
 * NOTE: This migration now runs automatically on server startup.
 * You can also run it manually with: node scripts/add_mana_columns.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addManaColumns() {
  console.log('🔧 Starting mana columns migration...\n');
  
  try {
    // Get list of all player tables
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'players_%'
      ORDER BY tablename
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(`Found ${tables.length} player tables to migrate\n`);
    
    for (const table of tables) {
      console.log(`\n📊 Processing table: ${table}`);
      
      // Check if columns already exist
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND column_name IN ('mana', 'max_mana')
      `, [table]);
      
      if (columnsCheck.rows.length === 2) {
        console.log(`  ✅ Columns already exist, skipping...`);
        continue;
      }
      
      // Add columns if they don't exist
      if (columnsCheck.rows.length === 0) {
        console.log(`  ➕ Adding mana and max_mana columns...`);
        // Use pg_escape_identifier to safely escape table name
        const quotedTable = `"${table.replace(/"/g, '""')}"`;
        await pool.query(`
          ALTER TABLE ${quotedTable}
          ADD COLUMN IF NOT EXISTS mana INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS max_mana INTEGER DEFAULT 0
        `);
        console.log(`  ✅ Columns added successfully`);
      }
      
      // Get all players without mana initialized (mana = 0 or NULL)
      const quotedTable = `"${table.replace(/"/g, '""')}"`;
      const playersResult = await pool.query(`
        SELECT player_id, name, level, type, base_stats
        FROM ${quotedTable}
        WHERE mana = 0 OR mana IS NULL
      `);
      
      const players = playersResult.rows;
      console.log(`  👥 Found ${players.length} players to initialize`);
      
      // Initialize mana for each player
      for (const player of players) {
        // Parse base_stats if it's a string
        let baseStats = {};
        if (player.base_stats) {
          baseStats = typeof player.base_stats === 'string' 
            ? JSON.parse(player.base_stats) 
            : player.base_stats;
        }
        
        // Default intelligence based on class
        const classIntelligenceDefaults = {
          'mage': 15,
          'cleric': 12,
          'paladin': 10,
          'warrior': 8,
          'rogue': 10,
          'ranger': 10
        };
        
        const intelligence = baseStats.intelligence || 
                           classIntelligenceDefaults[player.type?.toLowerCase()] || 
                           10;
        
        // Calculate mana: 50 + (intelligence * 5)
        const maxMana = 50 + (intelligence * 5);
        const mana = maxMana; // Start with full mana
        
        // Update player
        const quotedTable2 = `"${table.replace(/"/g, '""')}"`;
        await pool.query(`
          UPDATE ${quotedTable2}
          SET mana = $1, max_mana = $2
          WHERE player_id = $3
        `, [mana, maxMana, player.player_id]);
        
        console.log(`    ✓ ${player.name} (${player.type || 'unknown'}): mana = ${mana}, max_mana = ${maxMana}`);
      }
      
      console.log(`  ✅ Table ${table} migration complete`);
    }
    
    // Verify migration
    console.log('\n🧪 Verifying migration...');
    for (const table of tables) {
      const verifyResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND column_name IN ('mana', 'max_mana')
      `, [table]);
      
      if (verifyResult.rows.length !== 2) {
        throw new Error(`Migration verification failed for table ${table}`);
      }
    }
    console.log('✅ Migration verified successfully');
    
    console.log('\n\n✅ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  addManaColumns()
    .then(() => {
      console.log('🎉 Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { addManaColumns };
