#!/usr/bin/env node

/**
 * Basic smoke test for database functionality
 * Tests that the new schema and migration functions work correctly
 * 
 * Usage:
 *   node scripts/test_database.js
 * 
 * Requirements:
 *   - DATABASE_URL environment variable must be set
 *   - Database must be initialized (run server once first)
 */

require('dotenv').config();
const db = require('../db');

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
  log('\n🧪 Database Smoke Tests', colors.blue);
  log('═══════════════════════════════════════\n', colors.blue);

  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL environment variable required', colors.red);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  try {
    // Initialize database
    log('📊 Initializing database...', colors.blue);
    await db.initDB();
    log('✅ Database initialized\n', colors.green);

    // Test 1: Check if unified schema exists
    log('Test 1: Check unified schema availability', colors.blue);
    try {
      const hasUnified = await db.hasUnifiedSchema();
      if (hasUnified) {
        log('✅ Unified schema exists', colors.green);
        passed++;
      } else {
        log('⚠️  Unified schema not found (expected on first run)', colors.yellow);
        passed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 2: Create a test player
    log('\nTest 2: Create test player', colors.blue);
    try {
      const testPlayerId = 'test-player-' + Date.now();
      await db.query(
        'INSERT INTO players(id, twitch_id, display_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [testPlayerId, 'test123', 'TestPlayer']
      );
      log('✅ Test player created', colors.green);
      passed++;

      // Test 3: Save character to old schema
      log('\nTest 3: Save character to legacy schema', colors.blue);
      try {
        const testChannel = 'testchannel';
        const characterData = {
          name: 'TestCharacter',
          location: 'Silverbrook',
          level: 1,
          xp: 0,
          gold: 100,
          type: 'warrior',
          hp: 100,
          max_hp: 100
        };
        
        await db.savePlayerProgress(testPlayerId, testChannel, characterData);
        log('✅ Character saved to legacy schema', colors.green);
        passed++;

        // Test 4: Load character from schema
        log('\nTest 4: Load character from schema', colors.blue);
        try {
          const loaded = await db.loadPlayerProgress(testPlayerId, testChannel);
          if (loaded && loaded.name === 'TestCharacter') {
            log('✅ Character loaded successfully', colors.green);
            passed++;
          } else {
            log('❌ Character data mismatch', colors.red);
            failed++;
          }
        } catch (error) {
          log(`❌ Failed to load: ${error.message}`, colors.red);
          failed++;
        }

        // Test 5: Test unified schema functions (if available)
        const hasUnified = await db.hasUnifiedSchema();
        if (hasUnified) {
          log('\nTest 5: Save to unified schema', colors.blue);
          try {
            await db.saveCharacterUnified(testPlayerId, testChannel, characterData);
            log('✅ Character saved to unified schema', colors.green);
            passed++;

            log('\nTest 6: Load from unified schema', colors.blue);
            try {
              const unifiedLoaded = await db.loadCharacterUnified(testPlayerId, testChannel);
              if (unifiedLoaded && unifiedLoaded.name === 'TestCharacter') {
                log('✅ Character loaded from unified schema', colors.green);
                passed++;
              } else {
                log('❌ Unified character data mismatch', colors.red);
                failed++;
              }
            } catch (error) {
              log(`❌ Failed to load from unified: ${error.message}`, colors.red);
              failed++;
            }

            log('\nTest 7: Save/load account progress', colors.blue);
            try {
              const accountData = {
                souls: 10,
                legacy_points: 5,
                total_kills: 100
              };
              await db.saveAccountProgress(testPlayerId, accountData);
              
              const accountLoaded = await db.loadAccountProgress(testPlayerId);
              if (accountLoaded && accountLoaded.souls === 10) {
                log('✅ Account progress saved and loaded', colors.green);
                passed++;
              } else {
                log('❌ Account progress data mismatch', colors.red);
                failed++;
              }
            } catch (error) {
              log(`❌ Failed account progress test: ${error.message}`, colors.red);
              failed++;
            }
          } catch (error) {
            log(`❌ Failed to save to unified: ${error.message}`, colors.red);
            failed++;
          }
        } else {
          log('\nℹ️  Unified schema tests skipped (schema not available)', colors.yellow);
        }

        // Cleanup
        log('\n🧹 Cleaning up test data...', colors.blue);
        try {
          // Clean up test player
          await db.query('DELETE FROM players WHERE id = $1', [testPlayerId]);
          log('✅ Test data cleaned up', colors.green);
        } catch (error) {
          log(`⚠️  Cleanup warning: ${error.message}`, colors.yellow);
        }

      } catch (error) {
        log(`❌ Failed: ${error.message}`, colors.red);
        failed++;
      }
    } catch (error) {
      log(`❌ Failed to create player: ${error.message}`, colors.red);
      failed++;
    }

    // Summary
    log('\n═══════════════════════════════════════', colors.blue);
    log('📊 Test Summary:', colors.blue);
    log(`   ✅ Passed: ${passed}`, colors.green);
    if (failed > 0) {
      log(`   ❌ Failed: ${failed}`, colors.red);
    }
    log(`   📈 Total: ${passed + failed}`, colors.blue);
    log('═══════════════════════════════════════\n', colors.blue);

    if (failed === 0) {
      log('✅ All tests passed!', colors.green);
      process.exit(0);
    } else {
      log('❌ Some tests failed', colors.red);
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runTests();
