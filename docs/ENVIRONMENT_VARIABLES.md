# Environment Variables Documentation

## Required Variables

### Database
- `DATABASE_URL` - PostgreSQL connection string (required)
  - Format: `postgresql://user:password@host:port/database`
  - Railway provides this automatically

### Twitch OAuth
- `TWITCH_CLIENT_ID` - Twitch application client ID
- `TWITCH_CLIENT_SECRET` - Twitch application client secret
- `CHANNELS` - Comma-separated list of Twitch channels to monitor
  - Format: `channel1,channel2,channel3`

### Server
- `PORT` - Server port (default: 3000)
- `BASE_URL` - Base URL for OAuth callbacks
  - Production: `https://your-app.railway.app`
  - Development: `http://localhost:3000`

## Optional Variables

### Session Management (NEW)
- `SESSION_SECRET` - Secret key for session encryption (default: 'dev-secret')
- `SESSION_TTL` - Session timeout in seconds (default: 86400 = 24 hours)
- `WIPE_SESSIONS_ON_DEPLOY` - Clear all sessions on deployment (default: true)
  - Set to `false` to preserve sessions across deployments
  - Note: Users will need to re-login if set to true

### Rate Limiting
- `GLOBAL_COOLDOWN_MS` - Global cooldown in milliseconds (default: 2000)
- `USER_COOLDOWN_MS` - Per-user cooldown in milliseconds (default: 3000)

### Environment
- `NODE_ENV` - Environment mode (`production` or `development`)
- `COOKIE_DOMAIN` - Cookie domain for session cookies (optional)

### Bot Configuration
- `TESTERS` - Comma-separated list of Twitch user IDs for beta testers
  - Format: `12345678,87654321`
  - Users in this list get the 'tester' role

## Redis Integration (Optional - Future Enhancement)

When Redis is implemented, these variables will be available:

- `REDIS_URL` - Redis connection string (optional)
  - Format: `redis://host:port` or `rediss://host:port` for TLS
  - If not set, falls back to PostgreSQL session storage
- `REDIS_PASSWORD` - Redis password (if required)
- `REDIS_TLS` - Enable TLS for Redis connection (default: false)

## Database Migration

### Migration Commands

Run migration in dry-run mode (shows what would be migrated):
```bash
node scripts/migrate_to_unified_schema.js --dry-run
```

Run migration for all channels:
```bash
node scripts/migrate_to_unified_schema.js
```

Run migration for a specific channel:
```bash
node scripts/migrate_to_unified_schema.js --channel=channelname
```

Force migration (overwrites existing data in unified schema):
```bash
node scripts/migrate_to_unified_schema.js --force
```

### Verification

After migration, run the verification script:
```bash
node scripts/verify_migration.js
```

## Example Configuration

### Development (.env)
```env
DATABASE_URL=postgresql://localhost/ashbee_realms
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
CHANNELS=testchannel
BASE_URL=http://localhost:3000
SESSION_SECRET=dev-secret-change-in-production
NODE_ENV=development
WIPE_SESSIONS_ON_DEPLOY=true
SESSION_TTL=86400
```

### Production (Railway)
```env
DATABASE_URL=postgresql://... (auto-provided by Railway)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
CHANNELS=channel1,channel2,channel3
BASE_URL=https://your-app.railway.app
SESSION_SECRET=generate-a-strong-random-secret
NODE_ENV=production
WIPE_SESSIONS_ON_DEPLOY=false
SESSION_TTL=86400
TESTERS=12345678,87654321
```

## Security Notes

1. **SESSION_SECRET** - Use a strong, random secret in production
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **WIPE_SESSIONS_ON_DEPLOY** - Consider the trade-offs:
   - `true` (default): Fresh start on each deployment, all users re-login
   - `false`: Preserves sessions, but may have stale data

3. **SESSION_TTL** - Balance between user convenience and security:
   - Shorter TTL (1 hour = 3600): More secure, frequent re-logins
   - Longer TTL (7 days = 604800): More convenient, less secure

4. **Database Credentials** - Never commit DATABASE_URL or secrets to git
   - Use Railway's environment variables or .env file (add to .gitignore)
