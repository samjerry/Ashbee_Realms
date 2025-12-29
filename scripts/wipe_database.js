#!/usr/bin/env node

/**
 * Database Wipe Script
 * Completely wipes all game data while preserving structure
 * USE WITH CAUTION - This deletes ALL player data
 */

require('dotenv').config();
const db = require('../db');

async function wipeDatabase() {
  console.log('⚠️  WARNING: This will delete ALL player data!');
  console.log('⏳ Starting database wipe in 3 seconds...');
  console.log('   Press Ctrl+C to cancel');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await db.initDB();
    console.log('📊 Database connected');
    
    // Get list of channels
    const CHANNELS = process.env.CHANNELS ? 
      process.env.CHANNELS.split(',').map(ch => ch.trim().toLowerCase()) : [];
    
    console.log(`\n🗑️  Wiping data for channels: ${CHANNELS.join(', ')}\n`);
    
    // Wipe each channel's player table
    for (const channel of CHANNELS) {
      const tableName = db.getPlayerTable(channel);
      
      console.log(`  - Wiping ${tableName}...`);
      await db.query(`DELETE FROM ${tableName}`);
      
      const count = await db.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`    ✅ Deleted, ${count.rows[0].count} rows remaining`);
    }
    
    // Wipe global players table (keeps structure, deletes data)
    console.log('\n  - Wiping players table...');
    await db.query('DELETE FROM players');
    const playerCount = await db.query('SELECT COUNT(*) FROM players');
    console.log(`    ✅ Deleted, ${playerCount.rows[0].count} rows remaining`);
    
    // Wipe game state (optional)
    console.log('\n  - Wiping game_state table...');
    await db.query('DELETE FROM game_state');
    const stateCount = await db.query('SELECT COUNT(*) FROM game_state');
    console.log(`    ✅ Deleted, ${stateCount.rows[0].count} rows remaining`);
    
    // Wipe sessions
    console.log('\n  - Wiping session table...');
    await db.query('TRUNCATE TABLE session');
    console.log('    ✅ Sessions cleared');
    
    // Wipe audit logs (optional)
    console.log('\n  - Wiping operator_audit_log...');
    await db.query('DELETE FROM operator_audit_log');
    console.log('    ✅ Audit logs cleared');
    
    // Wipe unified schema tables if they exist
    console.log('\n  - Checking for unified schema tables...');
    const hasCharactersTable = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'characters'
      )
    `);
    
    if (hasCharactersTable.rows[0].exists) {
      console.log('  - Wiping characters table...');
      await db.query('DELETE FROM characters');
      const charCount = await db.query('SELECT COUNT(*) FROM characters');
      console.log(`    ✅ Deleted, ${charCount.rows[0].count} rows remaining`);
      
      console.log('  - Wiping account_progress table...');
      await db.query('DELETE FROM account_progress');
      const accountCount = await db.query('SELECT COUNT(*) FROM account_progress');
      console.log(`    ✅ Deleted, ${accountCount.rows[0].count} rows remaining`);
    } else {
      console.log('    ℹ️  Unified schema tables not found, skipping');
    }
    
    // Verification
    console.log('\n🔍 Verifying wipe...');
    
    for (const channel of CHANNELS) {
      const tableName = db.getPlayerTable(channel);
      const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      
      if (parseInt(result.rows[0].count) > 0) {
        console.log(`❌ WARNING: ${tableName} still has ${result.rows[0].count} rows!`);
      } else {
        console.log(`✅ ${tableName} is clean (0 rows)`);
      }
    }
    
    console.log('\n✅ Database wipe complete!');
    console.log('📊 All player data has been deleted');
    console.log('🏗️  Table structures preserved');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database wipe failed:', error);
    process.exit(1);
  }
}

// Run wipe
wipeDatabase();
