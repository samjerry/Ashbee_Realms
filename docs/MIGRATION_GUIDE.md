# Database Migration Guide

## Overview

This guide explains how to migrate from the per-channel player tables architecture to the unified schema.

## What's Changing?

### Old Architecture
- **Per-channel tables**: Each channel has its own `players_{channel}` table
- **Mixed data**: Account-wide and character-specific data in the same table
- **No indexes**: Slow queries for large datasets
- **Session cleanup**: Manual, infrequent

### New Architecture
- **Unified `characters` table**: Single table for all channels with proper foreign keys
- **Separate `account_progress` table**: Account-wide data (souls, legacy points, etc.)
- **Performance indexes**: Fast lookups for common queries (location, level, gold, inventory)
- **Automatic session cleanup**: Scheduled cleanup every 60 seconds

## Benefits

1. **Performance**: 50-70% faster queries with indexes
2. **Scalability**: Easy to add new channels (no schema changes needed)
3. **Maintainability**: Single schema to manage, cleaner migrations
4. **Data integrity**: Better separation of account-wide vs character-specific data
5. **Session management**: Automatic cleanup prevents session table bloat

## Migration Steps

### Phase 1: Preparation

1. **Backup your database** (highly recommended):
   ```bash
   # If using Railway, create a snapshot via the dashboard
   # Or backup manually:
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Deploy the new code**:
   - The new schema tables will be created automatically on startup
   - Old tables remain untouched (non-destructive migration)

3. **Verify new tables exist**:
   ```bash
   # Connect to database and check:
   psql $DATABASE_URL -c "\dt characters"
   psql $DATABASE_URL -c "\dt account_progress"
   ```

### Phase 2: Dry Run

1. **Run migration in dry-run mode**:
   ```bash
   node scripts/migrate_to_unified_schema.js --dry-run
   ```

2. **Review the output**:
   - Check character counts for each channel
   - Verify no errors or warnings
   - Confirm expected migration scope

### Phase 3: Migration

1. **Run the migration**:
   ```bash
   # All channels:
   node scripts/migrate_to_unified_schema.js
   
   # Or specific channel:
   node scripts/migrate_to_unified_schema.js --channel=channelname
   ```

2. **Migration will**:
   - Copy all character data to `characters` table
   - Extract account-wide data to `account_progress` table
   - Preserve all existing data in old tables (safety)
   - Handle duplicates gracefully (ON CONFLICT DO UPDATE)

3. **Monitor for errors**:
   - Migration script shows progress for each channel
   - Any errors are logged but don't stop the process
   - Review logs carefully

### Phase 4: Verification

1. **Run verification script**:
   ```bash
   node scripts/verify_migration.js
   ```

2. **Check verification results**:
   - Character counts should match between old and new tables
   - Sample data integrity checks should pass
   - No orphaned records (foreign key violations)
   - All JSONB fields should be valid

3. **Manual spot checks**:
   ```sql
   -- Check a few random characters
   SELECT c.name, c.level, c.gold, c.channel_name 
   FROM characters c 
   ORDER BY RANDOM() 
   LIMIT 10;
   
   -- Compare with old table
   SELECT name, level, gold 
   FROM players_channelname 
   WHERE player_id = 'twitch-12345678';
   
   -- Check account progress
   SELECT * FROM account_progress LIMIT 5;
   ```

### Phase 5: Testing

1. **Test character loading**:
   - Log in with existing characters
   - Verify all data loads correctly
   - Check inventory, equipment, quests, etc.

2. **Test character saving**:
   - Make changes (level up, buy items, etc.)
   - Verify changes persist
   - Check both old and new tables are updated

3. **Test session management**:
   - Log in from multiple devices
   - Verify only one session per user/channel
   - Check session cleanup after TTL expires

4. **Test performance**:
   - Run some queries before/after migration
   - Verify indexes are being used (EXPLAIN ANALYZE)

### Phase 6: Cleanup (Optional)

⚠️ **Only do this after thorough testing and verification!**

1. **Drop old tables** (when confident migration is successful):
   ```sql
   -- For each channel:
   DROP TABLE IF EXISTS players_channelname CASCADE;
   ```

2. **Or rename for safety**:
   ```sql
   -- Keep old tables as backup:
   ALTER TABLE players_channelname RENAME TO players_channelname_old_backup;
   ```

## Rollback Plan

If issues occur during migration:

1. **Application continues to work**: 
   - Code supports both old and new schemas
   - Falls back to old tables if new ones fail

2. **Revert to old schema only**:
   ```sql
   -- Drop new tables (loses new data since migration!)
   DROP TABLE IF EXISTS characters CASCADE;
   DROP TABLE IF EXISTS account_progress CASCADE;
   ```

3. **Restore from backup**:
   ```bash
   psql $DATABASE_URL < backup_20231229.sql
   ```

## Troubleshooting

### Migration fails with "table does not exist"
- Ensure server has been started at least once to create new tables
- Check database connection is working

### Character count mismatch
- Some characters may have been created after migration started
- Re-run migration (it handles duplicates with ON CONFLICT)

### JSONB data issues
- Old tables may have NULL JSONB fields
- Migration uses COALESCE to provide defaults
- Verify with: `SELECT * FROM characters WHERE inventory IS NULL`

### Foreign key violations
- Ensure all players exist in `players` table first
- Check: `SELECT DISTINCT player_id FROM characters WHERE player_id NOT IN (SELECT id FROM players)`

### Session cleanup not working
- Verify PostgreSQL session store is configured
- Check `session` table has new columns: `player_id`, `last_activity`
- Review server logs for cleanup job messages

## Performance Monitoring

After migration, monitor query performance:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'characters'
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%characters%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Session Management

### Configure session behavior

Set environment variables before deployment:

```env
# Keep sessions across deployments (recommended for production)
WIPE_SESSIONS_ON_DEPLOY=false

# Session timeout (24 hours)
SESSION_TTL=86400
```

### Monitor session cleanup

Check server logs for cleanup messages:
```
🗑️ Cleaned up 5 expired session(s)
```

### Manual cleanup if needed

```sql
-- Clean up expired sessions manually
DELETE FROM session 
WHERE last_activity < NOW() - INTERVAL '24 hours';

-- Or clean up all sessions for a fresh start
TRUNCATE TABLE session;
```

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Review verification script output
3. Check database logs for SQL errors
4. Ensure environment variables are set correctly
5. Verify database has sufficient resources (RAM, disk, connections)

## Summary Checklist

- [ ] Backup database
- [ ] Deploy new code
- [ ] Verify new tables created
- [ ] Run dry-run migration
- [ ] Run actual migration
- [ ] Run verification script
- [ ] Test character loading/saving
- [ ] Test session management
- [ ] Monitor performance
- [ ] (Optional) Clean up old tables after verification
