/**
 * Database abstraction layer
 * Supports both PostgreSQL (production) and SQLite (development)
 */

const path = require('path');

let db;
let dbType; // 'postgres' or 'sqlite'

async function initDB() {
  const isProduction = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');
  
  if (isProduction) {
    dbType = 'postgres';
    console.log('📊 Using PostgreSQL database');
    await initPostgres();
  } else {
    dbType = 'sqlite';
    console.log('📊 Using SQLite database (local development)');
    initSQLite();
  }
}

function initSQLite() {
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'data.sqlite'));
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      twitch_id TEXT,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT,
      key TEXT,
      value TEXT,
      FOREIGN KEY(player_id) REFERENCES players(id)
    );
  `);
}

async function initPostgres() {
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Railway requires this
  });

  // Test connection
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL:', res.rows[0].now);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    throw err;
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      twitch_id TEXT,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_state (
      id SERIAL PRIMARY KEY,
      player_id TEXT,
      key TEXT,
      value TEXT,
      FOREIGN KEY(player_id) REFERENCES players(id)
    );
  `);

  db = pool;
}

// Query interface (works for both)
async function query(sql, params = []) {
  if (dbType === 'sqlite') {
    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return { rows: stmt.all(...params) };
      } else {
        const info = stmt.run(...params);
        return { rows: [], changes: info.changes };
      }
    } catch (err) {
      console.error('SQLite error:', err.message, sql);
      throw err;
    }
  } else {
    return await db.query(sql, params);
  }
}

async function run(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0];
}

async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

function close() {
  if (dbType === 'sqlite') {
    db.close();
  } else if (db && db.end) {
    return db.end();
  }
}

module.exports = {
  initDB,
  query,
  run,
  all,
  close,
  getDB: () => db,
  getType: () => dbType
};
