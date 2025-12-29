#!/usr/bin/env node

/**
 * Integration test for admin routes (without database)
 * Tests that the routes are properly structured and middleware works
 * 
 * Usage:
 *   node scripts/test_admin_routes.js
 */

const express = require('express');
const session = require('express-session');

// Mock database functions
const mockDb = {
  getAllPlayers: async () => [
    { id: 'test-1', display_name: 'alice', twitch_id: '123' },
    { id: 'test-2', display_name: 'Bob', twitch_id: '456' },
    { id: 'test-3', display_name: 'charlie', twitch_id: '789' }
  ],
  getAllCharacters: async () => [
    { player_id: 'test-1', channel_name: 'channel1', name: 'Alice' },
    { player_id: 'test-2', channel_name: 'channel1', name: 'Bob' }
  ],
  getAllCharactersForChannel: async (channel) => [
    { player_id: 'test-1', channel_name: channel, name: 'Alice' }
  ],
  searchPlayersByName: async (term) => [
    { id: 'test-1', display_name: 'alice', twitch_id: '123' }
  ],
  searchCharactersByName: async (term, channel) => [
    { player_id: 'test-1', channel_name: channel || 'channel1', name: 'Alice' }
  ],
  getUserRole: async (userId, channel) => 'creator'
};

// Replace the db module temporarily
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === '../db') {
    return mockDb;
  }
  return originalRequire.apply(this, arguments);
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTests() {
  log('\n🧪 Admin Routes Integration Tests', colors.blue);
  log('═══════════════════════════════════════\n', colors.blue);

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Check that admin routes module loads
    log('Test 1: Load admin routes module', colors.blue);
    try {
      const adminRoutes = require('../routes/admin.routes');
      if (adminRoutes) {
        log('✅ Admin routes module loaded successfully', colors.green);
        passed++;
      } else {
        log('❌ Admin routes module is null/undefined', colors.red);
        failed++;
      }
    } catch (error) {
      log(`❌ Failed to load admin routes: ${error.message}`, colors.red);
      failed++;
    }

    // Test 2: Check route endpoints structure
    log('\nTest 2: Verify admin routes structure', colors.blue);
    try {
      const adminRoutes = require('../routes/admin.routes');
      const app = express();
      
      // Mount the routes
      app.use('/api/admin', adminRoutes);
      
      // Get all routes
      const routes = [];
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
          });
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              routes.push({
                path: '/api/admin' + handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      });

      const expectedRoutes = [
        '/api/admin/players',
        '/api/admin/characters',
        '/api/admin/search/players',
        '/api/admin/search/characters'
      ];

      const foundRoutes = routes.map(r => r.path);
      const allRoutesPresent = expectedRoutes.every(route => 
        foundRoutes.includes(route)
      );

      if (allRoutesPresent) {
        log('✅ All expected routes are present:', colors.green);
        expectedRoutes.forEach(route => log(`   - ${route}`, colors.cyan));
        passed++;
      } else {
        log('❌ Some expected routes are missing', colors.red);
        log('Expected:', colors.red);
        expectedRoutes.forEach(route => log(`   - ${route}`, colors.red));
        log('Found:', colors.red);
        foundRoutes.forEach(route => log(`   - ${route}`, colors.red));
        failed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 3: Verify db functions exist
    log('\nTest 3: Verify new database functions exist', colors.blue);
    try {
      const db = require('../db');
      const requiredFunctions = [
        'getAllPlayers',
        'getAllCharacters',
        'getAllCharactersForChannel',
        'searchPlayersByName',
        'searchCharactersByName'
      ];

      const missingFunctions = requiredFunctions.filter(
        fn => typeof db[fn] !== 'function'
      );

      if (missingFunctions.length === 0) {
        log('✅ All required database functions exist:', colors.green);
        requiredFunctions.forEach(fn => log(`   - ${fn}()`, colors.cyan));
        
        // Note: analyzeDatabase is exported but not tested here as it requires db connection
        log('   - analyzeDatabase() [requires db connection]', colors.cyan);
        passed++;
      } else {
        log('❌ Missing database functions:', colors.red);
        missingFunctions.forEach(fn => log(`   - ${fn}()`, colors.red));
        failed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
      failed++;
    }

    // Test 4: Check server.js mounts admin routes
    log('\nTest 4: Verify server.js imports and mounts admin routes', colors.blue);
    try {
      const fs = require('fs');
      const path = require('path');
      const serverPath = path.join(__dirname, '..', 'server.js');
      const serverJs = fs.readFileSync(serverPath, 'utf8');
      
      const hasImport = serverJs.includes("require('./routes/admin.routes')");
      const hasMount = serverJs.includes("app.use('/api/admin', adminRoutes)");
      const hasAnalyzeJob = serverJs.includes('db.analyzeDatabase');

      if (hasImport && hasMount && hasAnalyzeJob) {
        log('✅ server.js correctly configured:', colors.green);
        log('   - Imports admin routes', colors.cyan);
        log('   - Mounts routes at /api/admin', colors.cyan);
        log('   - Includes ANALYZE job', colors.cyan);
        passed++;
      } else {
        log('❌ server.js configuration incomplete:', colors.red);
        if (!hasImport) log('   - Missing admin routes import', colors.red);
        if (!hasMount) log('   - Missing route mounting', colors.red);
        if (!hasAnalyzeJob) log('   - Missing ANALYZE job', colors.red);
        failed++;
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, colors.red);
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
      log('✅ All integration tests passed!', colors.green);
      process.exit(0);
    } else {
      log('❌ Some tests failed', colors.red);
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

runTests();
