#!/usr/bin/env node
/**
 * Reset Tutorial Progress Script
 * Usage: node scripts/reset_tutorial_progress.js <player_id>
 * 
 * This script resets a player's tutorial progress to allow re-testing
 * the tutorial flow without creating a new account.
 */

const db = require('../db');

async function resetTutorialProgress(playerId) {
  try {
    console.log(`\n🔄 Resetting tutorial progress for player: ${playerId}\n`);
    
    // Reset account progress
    console.log('📊 Loading account progress...');
    const accountProgress = await db.loadAccountProgress(playerId);
    
    if (accountProgress) {
      console.log(`   Current state: tutorial_completed = ${accountProgress.tutorial_completed}`);
      accountProgress.tutorial_completed = false;
      await db.saveAccountProgress(playerId, accountProgress);
      console.log('   ✅ Set tutorial_completed = false');
    } else {
      console.log('   ⚠️  No account progress found');
    }
    
    // Get all characters for this player and reset tutorial progress
    console.log('\n🎮 Checking characters...');
    const characters = await db.getAllCharacters();
    const playerChars = characters.filter(c => c.player_id === playerId);
    
    if (playerChars.length === 0) {
      console.log('   ℹ️  No characters found for this player');
    } else {
      for (const char of playerChars) {
        console.log(`   Checking character in channel: ${char.channel}`);
        if (char.tutorialProgress) {
          char.tutorialProgress = null;
          await db.saveCharacter(playerId, char.channel, char);
          console.log(`   ✅ Reset tutorial progress for ${char.channel}`);
        } else {
          console.log(`   ℹ️  No tutorial progress to reset`);
        }
      }
    }
    
    console.log('\n✅ Tutorial progress reset complete!\n');
    console.log('Next steps:');
    console.log('1. Log out of the application');
    console.log('2. Clear your browser session/cookies');
    console.log('3. Log in again to test tutorial flow\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error resetting tutorial progress:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const playerId = process.argv[2];

if (!playerId) {
  console.error('\n❌ Error: Player ID required\n');
  console.log('Usage: node scripts/reset_tutorial_progress.js <player_id>\n');
  console.log('Example: node scripts/reset_tutorial_progress.js 12345678\n');
  process.exit(1);
}

resetTutorialProgress(playerId);
