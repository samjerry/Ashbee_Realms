# Database Management Scripts

## wipe_database.js

**⚠️ DANGER: This script deletes ALL player data!**

### Purpose
Completely wipes all game data while preserving database structure. Use this when you need a fresh start for testing or after major schema changes.

### Usage

```bash
node scripts/wipe_database.js
```

The script will:
1. Wait 3 seconds before starting (press Ctrl+C to cancel)
2. Delete all data from channel-specific player tables
3. Delete all data from global players table
4. Clear game state
5. Clear sessions
6. Clear audit logs
7. Clear unified schema tables (if they exist)
8. Verify that all tables are empty

### What it deletes
- All character data (from `players_{channel}` tables)
- All user accounts (from `players` table)
- All game state (from `game_state` table)
- All sessions (from `session` table)
- All audit logs (from `operator_audit_log` table)
- Unified schema data if present (`characters`, `account_progress`)

### What it preserves
- Table structures
- Indexes
- Foreign key relationships
- Database schema

### Environment Requirements
- Requires `DATABASE_URL` environment variable
- Requires `CHANNELS` environment variable (comma-separated list)

### Example Output
```
⚠️  WARNING: This will delete ALL player data!
⏳ Starting database wipe in 3 seconds...
   Press Ctrl+C to cancel
📊 Database connected

🗑️  Wiping data for channels: marrowofalbion

  - Wiping players_marrowofalbion...
    ✅ Deleted, 0 rows remaining

  - Wiping players table...
    ✅ Deleted, 0 rows remaining

  - Wiping game_state table...
    ✅ Deleted, 0 rows remaining

  - Wiping session table...
    ✅ Sessions cleared

  - Wiping operator_audit_log...
    ✅ Audit logs cleared

🔍 Verifying wipe...
✅ players_marrowofalbion is clean (0 rows)

✅ Database wipe complete!
📊 All player data has been deleted
🏗️  Table structures preserved
```

## test_character_creation_fix.js

### Purpose
Tests the improved character existence check logic to ensure incomplete character records don't block new character creation.

### Usage

```bash
node scripts/test_character_creation_fix.js
```

### What it tests
- Complete characters block creation (expected behavior)
- Incomplete characters allow creation (the fix)
- Null characters allow creation (expected behavior)

## Manual Character Deletion

If you need to delete a specific character (not a full wipe), use the force delete endpoint:

### Via curl:
```bash
curl -X DELETE http://localhost:3000/api/player/character/force \
  -H "Content-Type: application/json" \
  -d '{"channel":"marrowofalbion"}' \
  --cookie "connect.sid=YOUR_SESSION_ID"
```

### Via JavaScript (in browser console):
```javascript
fetch('/api/player/character/force', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ channel: 'marrowofalbion' })
})
.then(r => r.json())
.then(console.log);
```

This will delete the currently logged-in user's character for the specified channel.
