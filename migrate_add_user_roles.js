/**
 * Migration: Add user_roles table to track user roles in each channel
 */

require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Starting migration: Add user_roles table...');

    // Create user_roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        player_id TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, channel_name),
        FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
        CHECK (role IN ('viewer', 'vip', 'moderator', 'streamer'))
      );

      CREATE INDEX IF NOT EXISTS idx_user_roles_channel ON user_roles(channel_name);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
    `);

    console.log('✅ Migration completed successfully');
    console.log('   - Created user_roles table');
    console.log('   - Added indexes for channel_name and role');

    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
