/**
 * migrate_add_base_stats.js
 * Migration script to add base_stats column to existing player_progress records
 * 
 * Run this if you have existing player data before the Character System was implemented
 */

const db = require('./db');

async function migrate() {
  console.log('🔄 Starting migration: Add base_stats column');
  console.log('=' .repeat(60));
  
  try {
    await db.initDB();
    
    // Check if base_stats column exists
    const checkColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='player_progress' 
      AND column_name='base_stats'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('➕ Adding base_stats column...');
      await db.query(`
        ALTER TABLE player_progress 
        ADD COLUMN IF NOT EXISTS base_stats JSONB DEFAULT '{}'
      `);
      console.log('✅ Column added successfully');
    } else {
      console.log('✅ base_stats column already exists');
    }
    
    // Update existing records to calculate base_stats from their class
    console.log('\n🔄 Updating existing player records...');
    const players = await db.query(`
      SELECT player_id, channel_name, type, level 
      FROM player_progress 
      WHERE type IS NOT NULL
    `);
    
    console.log(`Found ${players.rows.length} players to update`);
    
    const { loadData } = require('./data/data_loader');
    const classesData = loadData('classes');
    
    let updated = 0;
    for (const player of players.rows) {
      if (!player.type || !classesData.classes[player.type]) {
        console.log(`⚠️  Skipping ${player.player_id} - invalid class: ${player.type}`);
        continue;
      }
      
      const classData = classesData.classes[player.type];
      const level = player.level || 1;
      const levelDiff = level - 1;
      
      const baseStats = {
        strength: Math.floor((classData.starting_stats.strength || 0) + (classData.stat_bonuses.strength_per_level || 0) * levelDiff),
        defense: Math.floor((classData.starting_stats.defense || 0) + (classData.stat_bonuses.defense_per_level || 0) * levelDiff),
        magic: Math.floor((classData.starting_stats.magic || 0) + (classData.stat_bonuses.magic_per_level || 0) * levelDiff),
        agility: Math.floor((classData.starting_stats.agility || 0) + (classData.stat_bonuses.agility_per_level || 0) * levelDiff),
        maxHp: Math.floor((classData.starting_stats.max_hp || 100) + (classData.stat_bonuses.hp_per_level || 10) * levelDiff)
      };
      
      await db.query(`
        UPDATE player_progress 
        SET base_stats = $1 
        WHERE player_id = $2 AND channel_name = $3
      `, [JSON.stringify(baseStats), player.player_id, player.channel_name]);
      
      updated++;
      if (updated % 10 === 0) {
        console.log(`  Updated ${updated}/${players.rows.length} players...`);
      }
    }
    
    console.log(`✅ Updated ${updated} player records`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verification = await db.query(`
      SELECT COUNT(*) as total,
             COUNT(base_stats) as with_stats
      FROM player_progress
      WHERE type IS NOT NULL
    `);
    
    console.log(`Total players with class: ${verification.rows[0].total}`);
    console.log(`Players with base_stats: ${verification.rows[0].with_stats}`);
    
    if (verification.rows[0].total === verification.rows[0].with_stats) {
      console.log('✅ All records migrated successfully!');
    } else {
      console.log('⚠️  Some records may need manual review');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate().then(() => {
    console.log('\n👋 Migration script finished. Database connection closed.');
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
