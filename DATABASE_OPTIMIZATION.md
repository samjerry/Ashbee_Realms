# Database Optimization Guide

This document provides SQL queries and recommendations for optimizing the Ashbee Realms database.

## Recommended Indexes

### Player Progress Table
```sql
-- Index for quick player lookup by username
CREATE INDEX IF NOT EXISTS idx_player_progress_username 
ON player_progress(username);

-- Index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_player_progress_channel 
ON player_progress(channel);

-- Composite index for username + channel lookups
CREATE INDEX IF NOT EXISTS idx_player_progress_user_channel 
ON player_progress(username, channel);

-- Index for level-based leaderboards
CREATE INDEX IF NOT EXISTS idx_player_progress_level 
ON player_progress(level DESC);

-- Index for gold leaderboards
CREATE INDEX IF NOT EXISTS idx_player_progress_gold 
ON player_progress(gold DESC);
```

### User Roles Table
```sql
-- Index for user role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_username_channel 
ON user_roles(username, channel);

-- Index for channel-based role queries
CREATE INDEX IF NOT EXISTS idx_user_roles_channel 
ON user_roles(channel);
```

### Permanent Stats Table
```sql
-- Index for player ID lookups
CREATE INDEX IF NOT EXISTS idx_permanent_stats_player_id 
ON permanent_stats(player_id);

-- Index for legacy points leaderboards
CREATE INDEX IF NOT EXISTS idx_permanent_stats_legacy_points 
ON permanent_stats(legacy_points DESC);

-- Index for souls leaderboards
CREATE INDEX IF NOT EXISTS idx_permanent_stats_souls 
ON permanent_stats(souls DESC);
```

### Leaderboards Table
```sql
-- Composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_season_rank 
ON leaderboards(type, season_id, rank);

-- Index for player leaderboard lookups
CREATE INDEX IF NOT EXISTS idx_leaderboards_player 
ON leaderboards(player_id, type);
```

### Active Quests Table
```sql
-- Index for player quest lookups
CREATE INDEX IF NOT EXISTS idx_active_quests_player 
ON active_quests(player_id);

-- Index for quest status queries
CREATE INDEX IF NOT EXISTS idx_active_quests_status 
ON active_quests(status);
```

## Query Optimization Tips

### 1. Use Prepared Statements
Always use parameterized queries to avoid SQL injection and improve performance:

```javascript
// Good
db.prepare('SELECT * FROM player_progress WHERE username = ? AND channel = ?')
  .get(username, channel);

// Bad
db.query(`SELECT * FROM player_progress WHERE username = '${username}'`);
```

### 2. Limit Result Sets
Use LIMIT for queries that may return many rows:

```javascript
// Get top 100 players instead of all
db.prepare('SELECT * FROM player_progress ORDER BY level DESC LIMIT 100').all();
```

### 3. Use Transactions for Multiple Updates
Group related updates into transactions:

```javascript
const transaction = db.transaction((updates) => {
  for (const update of updates) {
    db.prepare('UPDATE player_progress SET gold = gold + ? WHERE id = ?')
      .run(update.gold, update.id);
  }
});

transaction(updates);
```

### 4. Avoid SELECT *
Only select columns you need:

```javascript
// Good
db.prepare('SELECT id, username, level, gold FROM player_progress WHERE id = ?').get(id);

// Bad
db.prepare('SELECT * FROM player_progress WHERE id = ?').get(id);
```

### 5. Use Indexes for WHERE Clauses
Ensure WHERE clause columns have indexes:

```sql
-- This will be slow without index on level
SELECT * FROM player_progress WHERE level > 50;

-- After adding index, it's fast
CREATE INDEX idx_player_progress_level ON player_progress(level);
```

## Connection Pooling

For PostgreSQL in production, use connection pooling:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use pool for queries
const result = await pool.query('SELECT * FROM player_progress WHERE id = $1', [id]);
```

## Monitoring Queries

### Check Slow Queries (PostgreSQL)
```sql
-- Enable slow query log
ALTER DATABASE ashbee_realms SET log_min_duration_statement = 1000; -- Log queries taking > 1 second

-- View slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Analyze Query Performance
```sql
-- Explain query plan
EXPLAIN ANALYZE 
SELECT * FROM player_progress 
WHERE username = 'player1' AND channel = 'channel1';
```

## Regular Maintenance

### Vacuum (PostgreSQL)
```sql
-- Reclaim storage and update statistics
VACUUM ANALYZE player_progress;

-- Full vacuum (requires exclusive lock)
VACUUM FULL player_progress;
```

### Optimize (SQLite)
```sql
-- Rebuild database file and reclaim space
VACUUM;

-- Analyze and update statistics
ANALYZE;
```

## Caching Strategy

### Cache Frequently Accessed Data
- Player stats (cache for 5 minutes, invalidate on update)
- Leaderboards (cache for 1 hour, regenerate periodically)
- Static game data (cache indefinitely, clear on deployment)

### Example with Game Cache:
```javascript
const gameCache = require('./utils/cache');

async function getPlayerStats(playerId) {
  return await gameCache.getOrSet(
    `player:${playerId}:stats`,
    async () => {
      // Fetch from database
      return db.prepare('SELECT * FROM player_progress WHERE id = ?').get(playerId);
    },
    300000 // 5 minutes
  );
}

// Invalidate cache on update
function updatePlayerStats(playerId, updates) {
  db.prepare('UPDATE player_progress SET ... WHERE id = ?').run(...);
  gameCache.delete(`player:${playerId}:stats`);
}
```

## Performance Checklist

- [ ] All foreign keys have indexes
- [ ] Queries in WHERE clauses have indexes
- [ ] ORDER BY columns have indexes
- [ ] Using prepared statements
- [ ] Using transactions for bulk updates
- [ ] Connection pooling configured (production)
- [ ] Slow query logging enabled
- [ ] Regular VACUUM/ANALYZE scheduled
- [ ] Caching layer implemented
- [ ] Query results limited (LIMIT clause)

## Estimated Performance Gains

With these optimizations:
- **Query speed**: 10-100x faster with indexes
- **API response time**: 50-200ms reduction
- **Concurrent users**: Support 100+ without degradation
- **Database load**: 60-80% reduction with caching
- **Memory usage**: 20-30% reduction with pooling

Run `EXPLAIN ANALYZE` on your slowest queries before and after adding indexes to measure actual improvement.
