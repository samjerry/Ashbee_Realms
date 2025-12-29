#!/usr/bin/env node

/**
 * Verification script for unified schema migration
 * 
 * This script:
 * 1. Compares data counts between old and new tables
 * 2. Checks for data integrity issues
 * 3. Validates foreign key constraints
 * 4. Reports any discrepancies
 * 
 * Usage:
 *   node scripts/verify_migration.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL environment variable is required!', colors.red);
    process.exit(1);
  }

  log('\n🔍 Migration Verification Report', colors.bright + colors.cyan);
  log('═══════════════════════════════════════════════════════════\n', colors.cyan);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log('✅ Connected to database', colors.green);

    // Get list of channels
    const CHANNELS = process.env.CHANNELS 
      ? process.env.CHANNELS.split(',').map(ch => ch.trim().toLowerCase()) 
      : [];

    if (CHANNELS.length === 0) {
      log('⚠️  No channels configured in CHANNELS environment variable', colors.yellow);
      process.exit(0);
    }

    log(`📋 Checking ${CHANNELS.length} channel(s)\n`, colors.blue);

    let totalIssues = 0;
    let totalOldChars = 0;
    let totalNewChars = 0;

    for (const channel of CHANNELS) {
      const tableName = `players_${channel.replace(/[^a-z0-9_]/g, '_')}`;
      
      log(`📊 Verifying ${channel}...`, colors.blue);

      // Check if old table exists
      const tableExists = await pool.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [tableName]
      );

      if (!tableExists.rows[0].exists) {
        log(`   ℹ️  Old table ${tableName} does not exist - skipping\n`, colors.blue);
        continue;
      }

      // Count characters in old table
      const oldCount = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const oldCharCount = parseInt(oldCount.rows[0].count);

      // Count characters in new table for this channel
      const newCount = await pool.query(
        `SELECT COUNT(*) as count FROM characters WHERE channel_name = $1`,
        [channel]
      );
      const newCharCount = parseInt(newCount.rows[0].count);

      totalOldChars += oldCharCount;
      totalNewChars += newCharCount;

      log(`   Old table: ${oldCharCount} character(s)`, colors.cyan);
      log(`   New table: ${newCharCount} character(s)`, colors.cyan);

      // Check if counts match
      if (oldCharCount !== newCharCount) {
        log(`   ❌ Character count mismatch! Difference: ${Math.abs(oldCharCount - newCharCount)}`, colors.red);
        totalIssues++;
      } else {
        log(`   ✅ Character counts match`, colors.green);
      }

      // Sample check: Compare a few random characters
      if (oldCharCount > 0) {
        const sampleSize = Math.min(5, oldCharCount);
        const samples = await pool.query(
          `SELECT player_id, name, level, gold FROM ${tableName} ORDER BY RANDOM() LIMIT ${sampleSize}`
        );

        let sampleIssues = 0;
        for (const sample of samples.rows) {
          const newChar = await pool.query(
            `SELECT player_id, name, level, gold FROM characters WHERE player_id = $1 AND channel_name = $2`,
            [sample.player_id, channel]
          );

          if (newChar.rows.length === 0) {
            log(`   ⚠️  Character ${sample.name} (${sample.player_id}) not found in new table`, colors.yellow);
            sampleIssues++;
          } else {
            const newData = newChar.rows[0];
            if (newData.level !== sample.level || newData.gold !== sample.gold) {
              log(`   ⚠️  Data mismatch for ${sample.name}: level ${sample.level}→${newData.level}, gold ${sample.gold}→${newData.gold}`, colors.yellow);
              sampleIssues++;
            }
          }
        }

        if (sampleIssues === 0) {
          log(`   ✅ Sample data integrity check passed (${sampleSize} characters)`, colors.green);
        } else {
          log(`   ❌ Sample data issues found: ${sampleIssues}/${sampleSize}`, colors.red);
          totalIssues += sampleIssues;
        }
      }

      log('', ''); // Empty line
    }

    // Check foreign key constraints
    log('🔗 Checking foreign key constraints...', colors.blue);
    
    const orphanedChars = await pool.query(`
      SELECT COUNT(*) as count FROM characters c
      LEFT JOIN players p ON c.player_id = p.id
      WHERE p.id IS NULL
    `);
    
    if (parseInt(orphanedChars.rows[0].count) > 0) {
      log(`   ❌ Found ${orphanedChars.rows[0].count} orphaned character(s) without player records`, colors.red);
      totalIssues++;
    } else {
      log(`   ✅ All characters have valid player references`, colors.green);
    }

    const orphanedAccounts = await pool.query(`
      SELECT COUNT(*) as count FROM account_progress a
      LEFT JOIN players p ON a.player_id = p.id
      WHERE p.id IS NULL
    `);
    
    if (parseInt(orphanedAccounts.rows[0].count) > 0) {
      log(`   ❌ Found ${orphanedAccounts.rows[0].count} orphaned account progress records`, colors.red);
      totalIssues++;
    } else {
      log(`   ✅ All account progress records have valid player references`, colors.green);
    }

    // Check for JSONB data integrity
    log('\n📦 Checking JSONB data integrity...', colors.blue);
    
    const invalidJson = await pool.query(`
      SELECT COUNT(*) as count FROM characters 
      WHERE inventory IS NULL OR equipped IS NULL OR skills IS NULL
    `);
    
    if (parseInt(invalidJson.rows[0].count) > 0) {
      log(`   ⚠️  Found ${invalidJson.rows[0].count} character(s) with NULL JSONB fields`, colors.yellow);
      totalIssues++;
    } else {
      log(`   ✅ All JSONB fields are valid`, colors.green);
    }

    // Final summary
    log('\n═══════════════════════════════════════════════════════════', colors.cyan);
    log('📊 Verification Summary:', colors.bright);
    log(`   Total characters in old tables: ${totalOldChars}`, colors.blue);
    log(`   Total characters in new table: ${totalNewChars}`, colors.blue);
    log(`   Difference: ${Math.abs(totalOldChars - totalNewChars)}`, totalOldChars === totalNewChars ? colors.green : colors.red);
    
    if (totalIssues === 0) {
      log('\n✅ VERIFICATION PASSED - No issues found!', colors.green);
      log('   Migration appears successful. You may proceed with testing.', colors.green);
    } else {
      log(`\n⚠️  VERIFICATION FOUND ${totalIssues} ISSUE(S)`, colors.yellow);
      log('   Review the issues above before proceeding.', colors.yellow);
    }
    log('═══════════════════════════════════════════════════════════\n', colors.cyan);

  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
