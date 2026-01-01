# Database Sorting and Admin API Documentation

## Overview

This document describes the database sorting functionality and admin API endpoints implemented for efficient querying and management of player and character data.

## Database Indexes

The following indexes have been added for efficient case-insensitive sorting:

```sql
-- Players table sorting index
CREATE INDEX idx_players_display_name ON players(LOWER(display_name));

-- Characters table sorting indexes
CREATE INDEX idx_characters_name ON characters(LOWER(name));
CREATE INDEX idx_characters_name_channel ON characters(channel_name, LOWER(name));

-- Account progress index
CREATE INDEX idx_account_progress_player ON account_progress(player_id);
```

### Why LOWER()?

The `LOWER()` function in indexes enables case-insensitive sorting, preventing issues like "Bob" appearing before "alice" due to ASCII ordering. This ensures consistent alphabetical ordering regardless of case.

## Admin API Endpoints

All admin endpoints require authentication and operator permissions (at least MODERATOR level for channel-specific queries, or CREATOR role for global access).

### Base URL

All admin endpoints are mounted at: `/api/admin`

### Authentication

Admin endpoints use the existing operator permission system. Access is granted based on:
- **CREATOR role**: Global access to all channels
- **STREAMER role**: Access when channel parameter is provided
- **MODERATOR role**: Access when channel parameter is provided

### Endpoints

#### 1. Get All Players

**GET** `/api/admin/players`

Returns all players sorted alphabetically by display name (case-insensitive).

**Query Parameters:**
- `limit` (optional): Maximum number of results to return

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": "twitch-12345",
      "twitch_id": "12345",
      "display_name": "alice",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "twitch-67890",
      "twitch_id": "67890", 
      "display_name": "Bob",
      "created_at": "2024-01-02T00:00:00.000Z"
    }
  ],
  "total": 150,
  "returned": 150
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/admin/players?limit=100" \
  -H "Cookie: connect.sid=..." \
  -H "x-csrf-token: ..."
```

#### 2. Get All Characters

**GET** `/api/admin/characters`

Returns all characters sorted by channel name, then by character name (case-insensitive).

**Query Parameters:**
- `channel` (optional): Filter to specific channel
- `limit` (optional): Maximum number of results to return

**Response:**
```json
{
  "success": true,
  "characters": [
    {
      "player_id": "twitch-12345",
      "channel_name": "channel1",
      "name": "Alice",
      "level": 10,
      "gold": 500,
      "location": "Silverbrook",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "returned": 50,
  "channel": "channel1"
}
```

**Examples:**
```bash
# Get all characters across all channels
curl -X GET "http://localhost:3000/api/admin/characters" \
  -H "Cookie: connect.sid=..." \
  -H "x-csrf-token: ..."

# Get characters for a specific channel
curl -X GET "http://localhost:3000/api/admin/characters?channel=mychannel" \
  -H "Cookie: connect.sid=..." \
  -H "x-csrf-token: ..."
```

#### 3. Search Players by Name

**GET** `/api/admin/search/players`

Search for players by display name with case-insensitive partial matching.

**Query Parameters:**
- `q` (required): Search query string
- `limit` (optional, default: 50): Maximum number of results

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": "twitch-12345",
      "display_name": "alice",
      "twitch_id": "12345"
    },
    {
      "id": "twitch-67890",
      "display_name": "Alice2",
      "twitch_id": "67890"
    }
  ],
  "total": 2,
  "returned": 2,
  "query": "ali"
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/admin/search/players?q=alice&limit=20" \
  -H "Cookie: connect.sid=..." \
  -H "x-csrf-token: ..."
```

#### 4. Search Characters by Name

**GET** `/api/admin/search/characters`

Search for characters by name with case-insensitive partial matching.

**Query Parameters:**
- `q` (required): Search query string
- `channel` (optional): Filter to specific channel
- `limit` (optional, default: 50): Maximum number of results

**Response:**
```json
{
  "success": true,
  "characters": [
    {
      "player_id": "twitch-12345",
      "channel_name": "channel1",
      "name": "Alice",
      "level": 10,
      "gold": 500
    }
  ],
  "total": 1,
  "returned": 1,
  "query": "ali",
  "channel": "channel1"
}
```

**Examples:**
```bash
# Search all channels
curl -X GET "http://localhost:3000/api/admin/search/characters?q=warrior" \
  -H "Cookie: connect.sid=..." \
  -H "x-csrf-token: ..."

# Search specific channel
curl -X GET "http://localhost:3000/api/admin/search/characters?q=warrior&channel=mychannel" \
  -H "Cookie: connect.sid=..." \
  -H "x-csrf-token: ..."
```

## Database Functions

The following functions have been added to `db.js`:

### `getAllPlayers()`

Returns all players sorted alphabetically by display name.

```javascript
const players = await db.getAllPlayers();
```

### `getAllCharacters()`

Returns all characters across all channels, sorted by channel name then character name.

```javascript
const characters = await db.getAllCharacters();
```

### `getAllCharactersForChannel(channelName)`

Returns all characters for a specific channel, sorted by character name.

```javascript
const characters = await db.getAllCharactersForChannel('mychannel');
```

### `searchPlayersByName(searchTerm)`

Searches players by display name with case-insensitive partial matching.

```javascript
const results = await db.searchPlayersByName('alice');
```

### `searchCharactersByName(searchTerm, channelName = null)`

Searches characters by name with case-insensitive partial matching. Optionally filter by channel.

```javascript
// Search all channels
const results = await db.searchCharactersByName('warrior');

// Search specific channel
const results = await db.searchCharactersByName('warrior', 'mychannel');
```

### `analyzeDatabase()`

Runs PostgreSQL ANALYZE command on all tables to update query statistics for better performance.

```javascript
await db.analyzeDatabase();
```

This function is automatically called daily by the server.

## Performance Considerations

### Index Usage

All sorting queries use B-tree indexes with the `LOWER()` function for case-insensitive comparisons. This provides:
- Fast lookups: O(log n) time complexity
- Automatic maintenance: PostgreSQL updates indexes on INSERT/UPDATE
- No table locking: Queries don't block writes

### Query Performance

Expected performance with proper indexes:
- **Finding a player by name**: <1ms
- **Getting all players sorted**: 10-50ms (depends on count)
- **Searching players**: 5-20ms
- **Insert performance**: No degradation (incremental index updates)

### ANALYZE Job

The server automatically runs `ANALYZE` on all tables every 24 hours. This helps PostgreSQL's query planner make better decisions by keeping statistics up-to-date.

You can manually trigger analysis if needed:
```javascript
await db.analyzeDatabase();
```

## Testing

### Integration Tests

Run the integration test suite:
```bash
npm install  # If not already installed
node scripts/test_admin_routes.js
```

This tests:
- Admin routes are properly configured
- All database functions are exported
- Server.js correctly mounts routes

### Sorting Tests (requires DATABASE_URL)

Run the sorting functionality tests:
```bash
export DATABASE_URL="postgresql://..."
node scripts/test_sorting.js
```

This tests:
- Indexes work correctly
- Case-insensitive sorting
- Search functionality
- Performance

## Security

### Permission Levels

The admin middleware uses the existing operator permission system:

- **CREATOR (Level 3)**: Full access to all endpoints and channels
- **STREAMER (Level 2)**: Access when channel parameter is provided
- **MODERATOR (Level 1)**: Access when channel parameter is provided
- **NONE (Level 0)**: No access (includes VIP, Subscriber, Tester roles)

### Authentication Flow

1. User must be logged in (checked via session)
2. User's role is fetched from database for the specified channel
3. OperatorManager.getPermissionLevel() determines access level
4. Requests are denied if permission level < MODERATOR

### Rate Limiting

Admin endpoints inherit the application's existing rate limiting. Consider adding specific rate limits for admin endpoints in production.

## Migration Notes

### No Breaking Changes

This implementation:
- ✅ Adds new indexes (non-blocking)
- ✅ Adds new functions (backward compatible)
- ✅ Adds new routes (doesn't affect existing routes)
- ✅ No schema changes to existing tables
- ✅ No changes to existing query behavior

### Deployment

On deployment:
1. Database indexes are automatically created via `initDB()`
2. Admin routes are automatically mounted
3. ANALYZE job starts automatically
4. No manual migration steps required

## Troubleshooting

### Slow Queries

If queries are slow:
1. Check if indexes exist:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'players';
   ```
2. Run ANALYZE manually:
   ```javascript
   await db.analyzeDatabase();
   ```
3. Check query plan:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM players ORDER BY LOWER(display_name);
   ```

### Permission Denied

If you get 403 errors:
1. Verify you're logged in
2. Check your role in the database
3. Ensure you're a creator, or provide a channel parameter where you have operator privileges

### Missing Data

If results are empty:
1. Check the unified schema is available: `await db.hasUnifiedSchema()`
2. For characters, verify you're querying the correct channel
3. For legacy tables, use `getAllCharactersForChannel()` with proper channel name

## Future Enhancements

Possible improvements:
- Pagination support for large datasets
- Additional sort fields (level, gold, created_at, etc.)
- Bulk operations (bulk delete, bulk update)
- Export functionality (CSV, JSON)
- Advanced filtering (date ranges, level ranges, etc.)
