#!/usr/bin/env node
// Script to reset tutorial progress for a specific player
// Usage: node scripts/reset_tutorial_progress.js <player_id>

const db = require('../db');

async function resetTutorialProgress(playerId) {
  console.log(`🔄 Resetting tutorial progress for player: ${playerId}`);
  
  try {
    // Reset account progress
    const accountProgress = await db.loadAccountProgress(playerId);
    if (accountProgress) {
      accountProgress.tutorial_completed = false;
      await db.saveAccountProgress(playerId, accountProgress);
      console.log('✅ Account progress reset - tutorial_completed = false');
    } else {
      console.log('⚠️  No account progress found for this player');
    }
    
    // Get all characters for this player and reset tutorial progress
    const characters = await db.getAllCharacters();
    const playerChars = characters.filter(c => c.player_id === playerId);
    
    console.log(`🔍 Found ${playerChars.length} character(s) for this player`);
    
    for (const char of playerChars) {
      if (char.tutorialProgress) {
        char.tutorialProgress = null;
        await db.saveCharacter(playerId, char.channel, char);
        console.log(`✅ Reset tutorial progress for character in ${char.channel}`);
      } else {
        console.log(`ℹ️  Character in ${char.channel} has no tutorial progress to reset`);
      }
    }
    
    console.log('✅ Tutorial progress reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting tutorial progress:', error);
    process.exit(1);
  }
}

const playerId = process.argv[2];
if (!playerId) {
  console.error('❌ Error: Player ID required');
  console.log('Usage: node scripts/reset_tutorial_progress.js <player_id>');
  process.exit(1);
}

resetTutorialProgress(playerId);
