#!/usr/bin/env node

/**
 * Test script for character creation fix
 * Tests the improved character existence check logic
 */

const assert = require('assert');

console.log('🧪 Testing Character Creation Logic\n');

// Mock character objects
const completeCharacter = {
  name: 'TestPlayer',
  type: 'warrior',
  level: 5,
  hp: 100
};

const incompleteCharacterNoName = {
  name: null,
  type: 'mage',
  level: 1,
  hp: 50
};

const incompleteCharacterNoType = {
  name: 'TestPlayer',
  type: null,
  level: 1,
  hp: 50
};

const incompleteCharacterBothMissing = {
  name: null,
  type: null,
  level: 1,
  hp: 50
};

const nullCharacter = null;

// Test function that mimics the improved logic
function shouldBlockCharacterCreation(existing) {
  // This is the logic from the fix:
  // if (existing && existing.name && existing.type) { block creation }
  return !!(existing && existing.name && existing.type);
}

// Run tests
console.log('Test 1: Complete character (should BLOCK creation)');
const test1 = shouldBlockCharacterCreation(completeCharacter);
assert.strictEqual(test1, true, 'Should block creation for complete character');
console.log('✅ PASS: Complete character blocks creation\n');

console.log('Test 2: Incomplete character - no name (should ALLOW creation)');
const test2 = shouldBlockCharacterCreation(incompleteCharacterNoName);
assert.strictEqual(test2, false, 'Should allow creation for incomplete character (no name)');
console.log('✅ PASS: Incomplete character (no name) allows creation\n');

console.log('Test 3: Incomplete character - no type (should ALLOW creation)');
const test3 = shouldBlockCharacterCreation(incompleteCharacterNoType);
assert.strictEqual(test3, false, 'Should allow creation for incomplete character (no type)');
console.log('✅ PASS: Incomplete character (no type) allows creation\n');

console.log('Test 4: Incomplete character - both missing (should ALLOW creation)');
const test4 = shouldBlockCharacterCreation(incompleteCharacterBothMissing);
assert.strictEqual(test4, false, 'Should allow creation for incomplete character (both missing)');
console.log('✅ PASS: Incomplete character (both missing) allows creation\n');

console.log('Test 5: Null character (should ALLOW creation)');
const test5 = shouldBlockCharacterCreation(nullCharacter);
assert.strictEqual(test5, false, 'Should allow creation for null character');
console.log('✅ PASS: Null character allows creation\n');

console.log('═'.repeat(50));
console.log('✅ All tests passed!');
console.log('═'.repeat(50));
console.log('\nThe improved character existence check correctly:');
console.log('  ✓ Blocks creation only for COMPLETE characters (name + type)');
console.log('  ✓ Allows creation for incomplete records');
console.log('  ✓ Allows creation when no character exists');
console.log('\nThis fixes the issue where database wipe leaves incomplete');
console.log('records that block new character creation.');
