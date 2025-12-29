#!/usr/bin/env node

/**
 * Test script to verify account_progress migration
 * This checks that the migration script has correct syntax and structure
 * 
 * Usage:
 *   node scripts/test_account_progress_migration.js
 */

require('dotenv').config();

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTests() {
  log('\n🧪 Account Progress Migration Tests', colors.blue);
  log('═══════════════════════════════════════\n', colors.blue);

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Check migration module can be loaded
    log('Test 1: Load migration module', colors.blue);
    try {
      const { migrateAccountProgress } = require('./migrate_account_progress');
      if (typeof migrateAccountProgress === 'function') {
        log('✅ Migration module loaded successfully', colors.green);
        passed++;
      } else {
        throw new Error('migrateAccountProgress is not a function');
      }
    } catch (error) {
      log(`❌ Failed to load migration module: ${error.message}`, colors.red);
      failed++;
    }

    // Test 2: Check db.js has saveAccountProgress function
    log('\nTest 2: Verify db.js saveAccountProgress function', colors.blue);
    try {
      const db = require('../db');
      if (typeof db.saveAccountProgress === 'function') {
        log('✅ saveAccountProgress function exists', colors.green);
        passed++;
      } else {
        throw new Error('saveAccountProgress is not exported from db.js');
      }
    } catch (error) {
      log(`❌ db.js check failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 3: Verify server.js migration integration (syntax check)
    log('\nTest 3: Verify server.js migration integration', colors.blue);
    try {
      const fs = require('fs');
      const path = require('path');
      const serverContent = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
      if (serverContent.includes('migrateAccountProgress') && 
          serverContent.includes('./scripts/migrate_account_progress')) {
        log('✅ server.js includes account_progress migration', colors.green);
        passed++;
      } else {
        throw new Error('server.js does not include migration integration');
      }
    } catch (error) {
      log(`❌ server.js check failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 4: Verify db.js has migration SQL
    log('\nTest 4: Verify db.js has inline migration SQL', colors.blue);
    try {
      const fs = require('fs');
      const path = require('path');
      const dbContent = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');
      if (dbContent.includes('account_progress.username column verified') && 
          dbContent.includes('account_progress.tutorial_completed column verified')) {
        log('✅ db.js includes inline migration SQL', colors.green);
        passed++;
      } else {
        throw new Error('db.js does not include inline migration SQL');
      }
    } catch (error) {
      log(`❌ db.js migration SQL check failed: ${error.message}`, colors.red);
      failed++;
    }

    // Summary
    log('\n═══════════════════════════════════════', colors.blue);
    log(`\n📊 Test Results:`, colors.blue);
    log(`   ✅ Passed: ${passed}`, colors.green);
    if (failed > 0) {
      log(`   ❌ Failed: ${failed}`, colors.red);
    }
    log(`   📈 Total: ${passed + failed}\n`, colors.blue);

    if (failed === 0) {
      log('🎉 All tests passed!', colors.green);
      log('\n💡 Note: This only tests the migration structure.', colors.yellow);
      log('   To test actual database migration, ensure DATABASE_URL is set', colors.yellow);
      log('   and run: node scripts/migrate_account_progress.js\n', colors.yellow);
      process.exit(0);
    } else {
      log('❌ Some tests failed', colors.red);
      process.exit(1);
    }
  } catch (error) {
    log(`\n💥 Fatal error: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
