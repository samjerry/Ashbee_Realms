#!/usr/bin/env node

/**
 * Migration script to add missing columns to account_progress table
 * This ensures the schema is complete even if the table was created before these columns were added
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateAccountProgress() {
  console.log('🔧 Migrating account_progress table...');
  
  try {
    // Add username column
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'account_progress' AND column_name = 'username'
        ) THEN
          ALTER TABLE account_progress ADD COLUMN username TEXT DEFAULT NULL;
          RAISE NOTICE 'Added username column to account_progress';
        ELSE
          RAISE NOTICE 'username column already exists';
        END IF;
      END $$;
    `);
    console.log('✅ username column verified');
    
    // Add tutorial_completed column
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'account_progress' AND column_name = 'tutorial_completed'
        ) THEN
          ALTER TABLE account_progress ADD COLUMN tutorial_completed BOOLEAN DEFAULT false;
          RAISE NOTICE 'Added tutorial_completed column to account_progress';
        ELSE
          RAISE NOTICE 'tutorial_completed column already exists';
        END IF;
      END $$;
    `);
    console.log('✅ tutorial_completed column verified');
    
    // Verify all required columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'account_progress'
      ORDER BY column_name
    `);
    
    const existingColumns = result.rows.map(r => r.column_name);
    const requiredColumns = [
      'player_id', 'username', 'tutorial_completed',
      'passive_levels', 'souls', 'legacy_points', 'account_stats',
      'total_deaths', 'total_kills', 'total_gold_earned', 
      'total_xp_earned', 'highest_level_reached', 'total_crits',
      'created_at', 'updated_at'
    ];
    
    console.log('\n📋 Column verification:');
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      console.log('\n⚠️  WARNING: Some required columns are missing!');
      console.log('You may need to recreate the account_progress table.');
    } else {
      console.log('✅ All required columns present');
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateAccountProgress()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrateAccountProgress };
