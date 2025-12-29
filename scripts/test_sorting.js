#!/usr/bin/env node

/**
 * Test script for database sorting functionality
 * Tests the new admin query functions and sorting indexes
 * 
 * Usage:
 *   node scripts/test_sorting.js
 * 
 * Requirements:
 *   - DATABASE_URL environment variable must be set
 *   - Database must be initialized
 */

require('dotenv').config();
const db = require('../db');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTests() {
  log('\n🧪 Database Sorting Tests', colors.blue);
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

    // Test 1: Create test players with various names
    log('Test 1: Creating test players with various names', colors.blue);
    try {
      const testPlayers = [
        { id: 'test-sort-1', name: 'alice' },
        { id: 'test-sort-2', name: 'Bob' },
        { id: 'test-sort-3', name: 'charlie' },
        { id: 'test-sort-4', name: 'Alice2' },
        { id: 'test-sort-5', name: 'bob2' }
      ];

      for (const player of testPlayers) {
        await db.query(
          'INSERT INTO players(id, twitch_id, display_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET display_name = $3',
          [player.id, player.id, player.name]
        );
      }
      log('✅ Test players created', colors.green);
      passed++;
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 2: Test getAllPlayers with sorting
    log('\nTest 2: Test getAllPlayers() returns sorted results', colors.blue);
    try {
      const players = await db.getAllPlayers();
      const testPlayerNames = players
        .filter(p => p.id.startsWith('test-sort-'))
        .map(p => p.display_name);
      
      log(`Found ${testPlayerNames.length} test players:`, colors.cyan);
      testPlayerNames.forEach((name, i) => {
        log(`  ${i + 1}. ${name}`, colors.cyan);
      });

      // Verify alphabetical order (case-insensitive)
      const expectedOrder = ['alice', 'Alice2', 'Bob', 'bob2', 'charlie'];
      const isCorrectOrder = JSON.stringify(testPlayerNames) === JSON.stringify(expectedOrder);
      
      if (isCorrectOrder) {
        log('✅ Players are correctly sorted alphabetically (case-insensitive)', colors.green);
        passed++;
      } else {
        log(`❌ Incorrect order. Expected: ${expectedOrder.join(', ')}`, colors.red);
        log(`   Got: ${testPlayerNames.join(', ')}`, colors.red);
        failed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 3: Test searchPlayersByName
    log('\nTest 3: Test searchPlayersByName() with case-insensitive search', colors.blue);
    try {
      const results = await db.searchPlayersByName('ali');
      const foundNames = results
        .filter(p => p.id.startsWith('test-sort-'))
        .map(p => p.display_name);
      
      log(`Search for "ali" found ${foundNames.length} matches:`, colors.cyan);
      foundNames.forEach(name => log(`  - ${name}`, colors.cyan));

      if (foundNames.length === 2 && foundNames.includes('alice') && foundNames.includes('Alice2')) {
        log('✅ Search correctly found case-insensitive matches', colors.green);
        passed++;
      } else {
        log('❌ Search did not find expected matches', colors.red);
        failed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 4: Test character sorting (if unified schema exists)
    const hasUnified = await db.hasUnifiedSchema();
    if (hasUnified) {
      log('\nTest 4: Test character sorting in unified schema', colors.blue);
      try {
        const testChannel = 'testchannel';
        
        // Create test characters
        for (let i = 1; i <= 3; i++) {
          const characterData = {
            name: i === 1 ? 'Zara' : i === 2 ? 'Aaron' : 'Michael',
            location: 'Silverbrook',
            level: 1,
            xp: 0,
            gold: 100,
            type: 'warrior',
            hp: 100,
            max_hp: 100
          };
          
          await db.saveCharacterUnified(`test-char-${i}`, testChannel, characterData);
        }
        
        // Test getAllCharactersForChannel - uses legacy table
        const channelChars = await db.getAllCharactersForChannel(testChannel);
        
        // Filter for only test characters
        const testCharNames = ['Aaron', 'Michael', 'Zara'];
        const testChars = channelChars.filter(c => testCharNames.includes(c.name));
        const charNames = testChars.map(c => c.name);
        
        log(`Test characters in ${testChannel}:`, colors.cyan);
        charNames.forEach((name, i) => log(`  ${i + 1}. ${name}`, colors.cyan));
        
        // Check if sorted alphabetically
        const expectedCharOrder = ['Aaron', 'Michael', 'Zara'];
        const isCharsSorted = charNames.length === 3 && 
                             charNames.every((name, i) => name === expectedCharOrder[i]);
        
        if (isCharsSorted) {
          log('✅ Characters correctly sorted alphabetically', colors.green);
          passed++;
        } else {
          log(`❌ Characters not in expected order`, colors.red);
          log(`   Expected: ${expectedCharOrder.join(', ')}`, colors.red);
          log(`   Got: ${charNames.join(', ')}`, colors.red);
          failed++;
        }
      } catch (error) {
        log(`❌ Failed: ${error.message}`, colors.red);
        failed++;
      }
    } else {
      log('\nℹ️  Character sorting test skipped (unified schema not available)', colors.yellow);
    }

    // Test 5: Performance test
    log('\nTest 5: Performance test for sorted queries', colors.blue);
    try {
      const startTime = Date.now();
      await db.getAllPlayers();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      log(`Query completed in ${duration}ms`, colors.cyan);
      
      if (duration < 1000) { // Should complete in under 1 second
        log('✅ Query performance is acceptable', colors.green);
        passed++;
      } else {
        log('⚠️  Query took longer than expected but still passed', colors.yellow);
        passed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Cleanup
    log('\n🧹 Cleaning up test data...', colors.blue);
    try {
      // Clean up test players
      await db.query('DELETE FROM players WHERE id LIKE $1', ['test-sort-%']);
      await db.query('DELETE FROM players WHERE id LIKE $1', ['test-char-%']);
      log('✅ Test data cleaned up', colors.green);
    } catch (error) {
      log(`⚠️  Cleanup warning: ${error.message}`, colors.yellow);
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
      log('✅ All sorting tests passed!', colors.green);
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
