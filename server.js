const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { rawAnnounce } = require('./bot');
const path = require('path');
const axios = require('axios');
const db = require('./db');
const Combat = require('./game/Combat');
const { Character, ProgressionManager, ExplorationManager, QuestManager, ConsumableManager, ShopManager, ItemComparator, NPCManager, DialogueManager, DungeonManager, OperatorManager } = require('./game');
const { loadData } = require('./data/data_loader');
const socketHandler = require('./websocket/socketHandler');
const { fetchUserRolesFromTwitch } = require('./utils/twitchRoleChecker');

// Security middleware
const security = require('./middleware/security');
const validation = require('./middleware/validation');
const sanitization = require('./middleware/sanitization');
const sessionMiddleware = require('./middleware/session');
const rateLimiter = require('./utils/rateLimiter');

// Import route modules
const authRoutes = require('./routes/auth.routes');
const classesRoutes = require('./routes/classes.routes');
const abilitiesRoutes = require('./routes/abilities.routes');
const combatRoutes = require('./routes/combat.routes');
const bestiaryRoutes = require('./routes/bestiary.routes');
const questsRoutes = require('./routes/quests.routes');
const progressionRoutes = require('./routes/progression.routes');
const passivesRoutes = require('./routes/passives.routes');
const playerRoutes = require('./routes/player.routes');
const shopRoutes = require('./routes/shop.routes');
const itemsRoutes = require('./routes/items.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const explorationRoutes = require('./routes/exploration.routes');
const npcsRoutes = require('./routes/npcs.routes');
const dialogueRoutes = require('./routes/dialogue.routes');
const achievementsRoutes = require('./routes/achievements.routes');
const dungeonsRoutes = require('./routes/dungeons.routes');
const factionsRoutes = require('./routes/factions.routes');
const statusEffectsRoutes = require('./routes/status-effects.routes');
const craftingRoutes = require('./routes/crafting.routes');
const enchantingRoutes = require('./routes/enchanting.routes');
const raidsRoutes = require('./routes/raids.routes');
const seasonsRoutes = require('./routes/seasons.routes');
const operatorRoutes = require('./routes/operator.routes');
const leaderboardsRoutes = require('./routes/leaderboards.routes');
const tutorialRoutes = require('./routes/tutorial.routes');
const mapRoutes = require('./routes/map.routes');
const adminRoutes = require('./routes/admin.routes');

// Store interval IDs for cleanup on shutdown
const intervals = [];

// Default game state values
const DEFAULT_GAME_STATE = {
  weather: 'Clear',
  time_of_day: 'Day',
  season: 'Spring',
  game_mode: 'softcore'
};

/**
 * Helper function to convert raw database data to frontend format (camelCase)
 * @param {Object} rawData - Raw database data with snake_case fields
 * @returns {Object} Frontend-formatted data with camelCase fields
 */
function convertToFrontendFormat(rawData) {
  if (!rawData) return null;
  
  return {
    name: rawData.name,
    classType: rawData.type || rawData.classType,
    level: rawData.level,
    xp: rawData.xp,
    xpToNext: rawData.xp_to_next || rawData.xpToNext,
    hp: rawData.hp,
    maxHp: rawData.max_hp || rawData.maxHp,
    gold: rawData.gold,
    location: rawData.location,
    skillPoints: rawData.skill_points || rawData.skillPoints,
    legacyPoints: rawData.legacy_points || rawData.legacyPoints,
    achievementPoints: rawData.achievement_points || rawData.achievementPoints,
    inCombat: rawData.in_combat || rawData.inCombat,
    theme: rawData.theme,
    roles: rawData.roles,
    nameColor: rawData.nameColor || rawData.name_color,
    selectedRoleBadge: rawData.selectedRoleBadge || rawData.selected_role_badge,
    activeQuests: rawData.active_quests || rawData.activeQuests,
    completedQuests: rawData.completed_quests || rawData.completedQuests,
    unlockedAchievements: rawData.unlocked_achievements || rawData.unlockedAchievements,
    activeTitle: rawData.active_title || rawData.activeTitle,
    reputation: rawData.reputation,
    craftingXP: rawData.crafting_xp || rawData.craftingXP
  };
}

const app = express();

// Security headers with helmet
// CSP configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';
const cspScriptSrc = isProduction 
  ? ["'self'"] // Production: No unsafe-inline or unsafe-eval
  : ["'self'", "'unsafe-inline'", "'unsafe-eval'"]; // Development only

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: cspScriptSrc,
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Request size limits to prevent payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Session store configuration with security hardening
let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevents JavaScript access to cookies
    sameSite: 'lax', // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    domain: process.env.COOKIE_DOMAIN || undefined, // Allow subdomain cookies if needed
    path: '/' // Ensure cookie is sent for all paths
  },
  name: 'sessionId', // Don't use default 'connect.sid' - obscurity
  rolling: true, // Reset expiration on activity
  proxy: process.env.NODE_ENV === 'production' // Trust Railway's proxy
};

// Use PostgreSQL session store in production
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  const pgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new pgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  });
  console.log('📦 Using PostgreSQL session store');
} else {
  console.warn('⚠️ Using MemoryStore for sessions (development only)');
}

app.use(session(sessionConfig));

/**
 * Helper function to clean up old sessions for a user/channel combination
 * Deletes all sessions for the same twitch_id and channel except the current one
 * @param {string} twitchId - User's Twitch ID
 * @param {string} channel - Channel name
 * @param {string} currentSessionId - Current session ID to preserve
 */
async function cleanupOldSessions(twitchId, channel, currentSessionId) {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
    return; // Only for PostgreSQL
  }
  
  try {
    await db.query(
      'DELETE FROM session WHERE twitch_id = $1 AND channel = $2 AND sid != $3',
      [twitchId, channel, currentSessionId]
    );
    console.log(`🗑️ Cleaned up old sessions for user ${twitchId} on channel ${channel}`);
  } catch (err) {
    console.error('⚠️ Failed to cleanup old sessions:', err.message);
    // Don't throw - session cleanup failure shouldn't break login
  }
}

// Attach CSRF token to session
app.use(security.attachCsrfToken);

// Detect suspicious activity (after session, before routes)
app.use(security.detectSuspiciousActivity);

// Update session activity tracking for authenticated users
app.use(sessionMiddleware.updateSessionActivity);

// Ensure session metadata is set
app.use(sessionMiddleware.ensureSessionMetadata);

// Track initialization state
let isReady = false;
let dbError = null;
let initStartTime = Date.now();

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  const elapsed = ((Date.now() - initStartTime) / 1000).toFixed(1);
  
  if (!isReady) {
    console.log(`⏳ Health check: Still initializing... (${elapsed}s elapsed)`);
    return res.status(503).json({ 
      status: 'initializing', 
      message: 'Database is still initializing',
      elapsedSeconds: parseFloat(elapsed),
      timestamp: new Date().toISOString() 
    });
  }
  if (dbError) {
    console.log(`❌ Health check: Failed - ${dbError.message}`);
    return res.status(503).json({ 
      status: 'error', 
      message: 'Database initialization failed',
      error: dbError.message,
      elapsedSeconds: parseFloat(elapsed),
      timestamp: new Date().toISOString() 
    });
  }
  
  console.log(`✅ Health check: OK (${elapsed}s since start)`);
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database (PostgreSQL or SQLite)
(async () => {
  // Set a hard timeout for initialization
  const INIT_TIMEOUT_MS = 60000; // 60 seconds max
  const initTimeout = setTimeout(() => {
    console.error('💥 Database initialization timeout after 60 seconds!');
    console.error('This usually means:');
    console.error('  1. DATABASE_URL is incorrect or database is unreachable');
    console.error('  2. Database is not provisioned in Railway');
    console.error('  3. Network/firewall blocking connection');
    dbError = new Error('Database initialization timeout');
    isReady = false;
  }, INIT_TIMEOUT_MS);

  try {
    console.log('🔄 Starting database initialization...');
    console.log('📊 DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.log('📊 DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    
    const dbInitStart = Date.now();
    await db.initDB();
    const dbInitTime = ((Date.now() - dbInitStart) / 1000).toFixed(2);
    
    clearTimeout(initTimeout); // Clear timeout on success
    console.log(`✅ Database initialized successfully in ${dbInitTime}s`);
    
    // Session management enhancements (PostgreSQL only)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      try {
        // 1. Extend session table schema with custom columns
        console.log('🔧 Extending session table schema...');
        
        // Add columns separately for better error handling
        await db.query('ALTER TABLE session ADD COLUMN IF NOT EXISTS twitch_id VARCHAR(255)');
        await db.query('ALTER TABLE session ADD COLUMN IF NOT EXISTS channel VARCHAR(255)');
        await db.query('ALTER TABLE session ADD COLUMN IF NOT EXISTS player_id VARCHAR(255)');
        await db.query('ALTER TABLE session ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW()');
        await db.query('CREATE INDEX IF NOT EXISTS idx_session_twitch_channel ON session(twitch_id, channel)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_session_player_channel ON session(player_id, channel)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_session_last_activity ON session(last_activity)');
        
        console.log('✅ Session table schema extended');
        
        // 2. Wipe all sessions on deployment (optional via env var)
        // Default is true for backward compatibility (fresh sessions on deployment)
        const wipeSessionsOnDeploy = process.env.WIPE_SESSIONS_ON_DEPLOY !== 'false';
        
        if (wipeSessionsOnDeploy) {
          console.log('🗑️ Wiping session table on deployment...');
          await db.query('TRUNCATE TABLE session');
          console.log('✅ Session table wiped - fresh sessions on deployment (all users will need to re-login)');
        } else {
          console.log('ℹ️ Session wipe skipped (WIPE_SESSIONS_ON_DEPLOY=false)');
        }
        
        // 3. Start scheduled session cleanup job
        // Remove expired sessions every 60 seconds
        const SESSION_TTL = parseInt(process.env.SESSION_TTL || '86400', 10); // Default: 24 hours
        setInterval(async () => {
          try {
            const expiryTime = new Date(Date.now() - SESSION_TTL * 1000);
            const result = await db.query(
              'DELETE FROM session WHERE last_activity < $1 OR (last_activity IS NULL AND expire < NOW())',
              [expiryTime]
            );
            if (result.rowCount > 0) {
              console.log(`🗑️ Cleaned up ${result.rowCount} expired session(s)`);
            }
          } catch (err) {
            console.error('⚠️ Session cleanup error:', err.message);
          }
        }, 60000); // Run every 60 seconds
        
        console.log(`✅ Session cleanup job started (TTL: ${SESSION_TTL}s, interval: 60s)`);
      } catch (sessionErr) {
        console.error('⚠️ Session setup warning:', sessionErr.message);
        // Don't fail deployment if session setup has issues
      }
    }
    
    // Start database ANALYZE job (runs daily for query optimization)
    const analyzeInterval = setInterval(async () => {
      try {
        await db.analyzeDatabase();
      } catch (error) {
        console.error('⚠️ Database ANALYZE job error:', error.message);
      }
    }, 86400000); // Run every 24 hours (86400000ms)
    intervals.push(analyzeInterval);
    console.log('✅ Database ANALYZE job started (runs daily)');
    
    isReady = true;
  } catch (err) {
    clearTimeout(initTimeout); // Clear timeout on error
    console.error('❌ Database initialization failed:', err.message);
    console.error('Stack:', err.stack);
    dbError = err;
    // Don't exit immediately - give Railway time to see the health check failure
    console.log('⏳ Will exit in 5 seconds...');
    setTimeout(() => {
      console.log('💀 Exiting due to database failure');
      process.exit(1);
    }, 5000);
  }
})();

// Simple announcement cooldowns
const LAST_GLOBAL = { ts: 0 };
const LAST_USER = {}; // userId -> ts
const GLOBAL_MIN_MS = parseInt(process.env.GLOBAL_COOLDOWN_MS || '2000', 10); // 2s
const USER_MIN_MS = parseInt(process.env.USER_COOLDOWN_MS || '3000', 10); // 3s

function canAnnounce(userId){
  const now = Date.now();
  if (now - LAST_GLOBAL.ts < GLOBAL_MIN_MS) return false;
  const lastUser = LAST_USER[userId] || 0;
  if (now - lastUser < USER_MIN_MS) return false;
  // update
  LAST_GLOBAL.ts = now;
  LAST_USER[userId] = now;
  return true;
}

/**
 * Helper: Determine if we should fetch user roles from Twitch API
 * @param {Array<string>|null} existingRoles - Existing roles from database
 * @returns {boolean} True if we should fetch from Twitch API
 */
function shouldFetchRolesFromTwitchAPI(existingRoles) {
  // No existing roles - need to fetch
  if (!existingRoles || existingRoles.length === 0) {
    return true;
  }
  
  // Only has 'viewer' role - may have higher roles to fetch
  if (existingRoles.length === 1 && existingRoles[0] === 'viewer') {
    return true;
  }
  
  // Has other roles - use existing
  return false;
}

// Twitch OAuth: /auth/twitch -> redirect, /auth/twitch/callback -> handle
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/auth/twitch/callback` : `http://localhost:${process.env.PORT || 3000}/auth/twitch/callback`;

app.get('/auth/twitch', (req, res) => {
  if (!TWITCH_CLIENT_ID) return res.status(500).send('Twitch client id not configured');
  const state = Math.random().toString(36).slice(2);
  // store state in session to verify later
  req.session.oauthState = state;
  // Store channel if provided in query parameter
  if (req.query.channel) {
    req.session.oauthChannel = req.query.channel;
  }
  
  // Save session before redirect to ensure state is persisted
  req.session.save((err) => {
    if (err) {
      console.error('❌ Session save error:', err);
      return res.status(500).send('Session error');
    }
    
    const scope = encodeURIComponent('user:read:email');
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;
    res.redirect(url);
  });
});

app.get('/auth/twitch/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  console.log('🎮 PLAYER OAuth callback received (not broadcaster!):', { 
    hasCode: !!code, 
    hasState: !!state, 
    hasError: !!error,
    error: error,
    error_description: error_description,
    sessionState: req.session.oauthState,
    fullQuery: req.query
  });
  
  // Check if Twitch sent an error
  if (error) {
    console.error('❌ Twitch OAuth error in player callback:', error, error_description);
    return res.status(400).send(`Authorization failed: ${error_description || error}`);
  }
  
  if (!code || !state || state !== req.session.oauthState) {
    console.error('OAuth validation failed:', { code: !!code, state: !!state, match: state === req.session.oauthState });
    return res.status(400).send('Invalid OAuth callback');
  }
  
  try{
    // exchange code for token
    const tokenResp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      }
    });

    const access_token = tokenResp.data.access_token;
    const refresh_token = tokenResp.data.refresh_token;
    console.log('✅ Token exchange successful');

    // get user info
    const userResp = await axios.get('https://api.twitch.tv/helix/users', { headers: { Authorization: `Bearer ${access_token}`, 'Client-Id': TWITCH_CLIENT_ID } });
    const user = userResp.data.data && userResp.data.data[0];
    if (!user) return res.status(500).send('Could not fetch user');
    console.log('✅ User info retrieved:', user.display_name);

    const playerId = `twitch-${user.id}`;
    
    // Insert or update player (PostgreSQL only)
    await db.query(
      'INSERT INTO players(id, twitch_id, display_name, access_token, refresh_token) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET twitch_id=$2, display_name=$3, access_token=$4, refresh_token=$5',
      [playerId, user.id, user.display_name, access_token, refresh_token]
    );

    // Get the channel from session (set during /auth/twitch) or fall back to env
    let channel = req.session.oauthChannel;
    if (!channel) {
      const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
      channel = CHANNELS[0] || 'default';
    }
    console.log('🔍 Checking character for channel:', channel);
    
    // Store session data
    // Note: Both user.twitchId and session.twitch_id are needed:
    // - user.twitchId: Used by application logic (existing)
    // - twitch_id: Used by session table for cleanup queries (new)
    // - player_id: Used by session table for player-specific cleanup (new)
    req.session.user = { id: playerId, displayName: user.display_name, twitchId: user.id };
    req.session.twitch_id = user.id;
    req.session.player_id = playerId;
    req.session.channel = channel;
    console.log('✅ User logged in:', playerId);
    
    // Update session table with twitch_id, player_id, channel, and last_activity (PostgreSQL only)
    // Do this BEFORE cleanup to ensure the new session exists in the database
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      try {
        await db.query(
          'UPDATE session SET twitch_id = $1, player_id = $2, channel = $3, last_activity = NOW() WHERE sid = $4',
          [user.id, playerId, channel, req.sessionID]
        );
        
        // Clean up old sessions for this user/channel combination
        // Done after session metadata is updated to avoid race conditions
        await cleanupOldSessions(user.id, channel, req.sessionID);
      } catch (err) {
        console.error('⚠️ Failed to update session metadata or cleanup:', err.message);
      }
    }
    
    // Clear the oauthChannel from session now that we've used it
    delete req.session.oauthChannel;
    
    // Check if player has a character in this channel
    try {
      const existingCharacter = await db.loadPlayerProgress(playerId, channel);
      
      // Character needs creation if: no record exists, no type/class set, or type is 'Unknown'
      const needsCharacterCreation = !existingCharacter || !existingCharacter.type || existingCharacter.type === 'Unknown';
      
      if (needsCharacterCreation) {
        // No character exists or incomplete - redirect to tutorial/character creation
        console.log(`📝 New player ${user.display_name} (type: ${existingCharacter?.type || 'none'}) - redirecting to character creation`);
        return res.redirect(`/adventure?tutorial=true&channel=${encodeURIComponent(channel)}`);
      } else {
        // Character exists and is complete - redirect to main game
        console.log(`🎮 Existing player ${user.display_name} (${existingCharacter.type}) - redirecting to game`);
        return res.redirect(`/adventure?channel=${encodeURIComponent(channel)}`);
      }
    } catch (err) {
      console.error('Error checking character:', err);
      // On error, redirect to character creation to be safe
      return res.redirect(`/adventure?tutorial=true&channel=${encodeURIComponent(channel)}`);
    }
  }catch(err){
    console.error('❌ OAuth callback error:', err.response?.data || err.message);
    console.error('Full error:', err);
    res.status(500).send(`OAuth failed: ${err.response?.data?.message || err.message}`);
  }
});

// Broadcaster OAuth: Enhanced authentication with expanded scopes for role detection
const BROADCASTER_REDIRECT_URI = process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/auth/broadcaster/callback` : `http://localhost:${process.env.PORT || 3000}/auth/broadcaster/callback`;

app.get('/auth/broadcaster', (req, res) => {
  if (!TWITCH_CLIENT_ID) return res.status(500).send('Twitch client id not configured');
  
  // Store the target channel in session if provided
  const targetChannel = req.query.channel;
  const state = Math.random().toString(36).slice(2);
  
  // Encode channel in state parameter as backup (format: state|channel)
  const stateWithChannel = targetChannel ? `${state}|${targetChannel.toLowerCase()}` : state;
  
  if (targetChannel) {
    req.session.targetChannel = targetChannel.toLowerCase();
  }
  
  // Extended scopes for broadcaster to check VIP, subscriber, and moderator status of users
  const scopes = [
    'user:read:email',
    'channel:read:vips',
    'channel:read:subscriptions',
    'moderation:read'
  ];
  
  req.session.broadcasterOauthState = state;
  
  console.log('🔐 Broadcaster OAuth initiated:', { targetChannel, state, sessionID: req.sessionID });
  
  // Save session before redirect to ensure state is persisted
  req.session.save((err) => {
    if (err) {
      console.error('❌ Session save error:', err);
      return res.status(500).send('Session error');
    }
    
    const scope = encodeURIComponent(scopes.join(' '));
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(BROADCASTER_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${encodeURIComponent(stateWithChannel)}`;
    
    console.log('✅ Session saved, redirecting to Twitch with URI:', BROADCASTER_REDIRECT_URI);
    console.log('🔗 Full OAuth URL:', url);
    res.redirect(url);
  });
});

app.get('/auth/broadcaster/callback', 
  rateLimiter.middleware('strict'),
  async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  console.log('� BROADCASTER OAuth callback received:', { 
    hasCode: !!code, 
    hasState: !!state,
    hasError: !!error,
    error: error,
    error_description: error_description,
    sessionState: req.session.broadcasterOauthState,
    sessionID: req.sessionID,
    targetChannel: req.session.targetChannel,
    cookies: Object.keys(req.cookies),
    hasSessionCookie: !!req.cookies.sessionId
  });
  
  // Check if user denied authorization
  if (error) {
    console.error('❌ Twitch OAuth error:', error, error_description);
    return res.status(400).send(`Authorization failed: ${error_description || error}`);
  }
  
  if (!code || !state || state !== req.session.broadcasterOauthState) {
    // Try parsing state as state|channel format if session is lost
    let stateValid = false;
    let actualState = state;
    if (state && state.includes('|')) {
      actualState = state.split('|')[0];
      stateValid = actualState === req.session.broadcasterOauthState;
      console.log('📦 Attempting state recovery from parameter');
    }
    
    if (!stateValid) {
      console.error('❌ OAuth validation failed:', { 
        code: !!code, 
        state: !!state, 
        match: state === req.session.broadcasterOauthState,
        receivedState: state,
        sessionState: req.session.broadcasterOauthState
      });
      return res.status(400).send('Invalid OAuth callback - session expired or state mismatch. Please try the !setup command again.');
    }
  }
  
  try {
    // Exchange code for token
    const tokenResp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: BROADCASTER_REDIRECT_URI
      }
    });

    const access_token = tokenResp.data.access_token;
    const refresh_token = tokenResp.data.refresh_token;
    const scopes = tokenResp.data.scope || [];
    
    console.log('✅ Broadcaster token exchange successful');
    console.log('📋 Granted scopes:', scopes);

    // Get broadcaster info
    const userResp = await axios.get('https://api.twitch.tv/helix/users', { 
      headers: { 
        Authorization: `Bearer ${access_token}`, 
        'Client-Id': TWITCH_CLIENT_ID 
      } 
    });
    
    const user = userResp.data.data && userResp.data.data[0];
    if (!user) return res.status(500).send('Could not fetch broadcaster info');
    
    const channelName = user.login.toLowerCase();
    const broadcasterId = user.id;
    const broadcasterName = user.display_name;
    
    console.log(`✅ Broadcaster authenticated: ${broadcasterName} (${channelName})`);
    
    // Check if this matches the target channel (if specified)
    const targetChannel = req.session.targetChannel;
    if (targetChannel && targetChannel !== channelName) {
      // User is not the broadcaster of the target channel
      console.log(`⚠️ User ${channelName} tried to authenticate for channel ${targetChannel}`);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Not Authorized</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 15px;
              max-width: 500px;
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            p { font-size: 1.2em; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚫 Not Authorized</h1>
            <p>You are not the streamer of the channel <strong>${targetChannel}</strong>.</p>
            <p>Only the broadcaster can set up their channel's game settings.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Save broadcaster credentials
    await db.saveBroadcasterAuth(channelName, broadcasterId, broadcasterName, access_token, refresh_token, scopes);
    
    // Also log in the broadcaster as a regular user
    const playerId = `twitch-${broadcasterId}`;
    await db.query(
      'INSERT INTO players(id, twitch_id, display_name, access_token, refresh_token) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET twitch_id=$2, display_name=$3, access_token=$4, refresh_token=$5',
      [playerId, broadcasterId, broadcasterName, access_token, refresh_token]
    );
    
    // Store session data
    // Note: Some fields appear duplicated but serve different purposes:
    // - user.twitchId: Used by application logic (existing field)
    // - twitch_id: Used by session table for cleanup queries (new field)
    // - player_id: Used by session table for player-specific cleanup (new field)
    // - broadcasterChannel: Indicates this is a broadcaster session (existing)
    // - channel: Used by session table for cleanup queries (new field)
    req.session.user = { id: playerId, displayName: broadcasterName, twitchId: broadcasterId };
    req.session.isBroadcaster = true;
    req.session.broadcasterChannel = channelName;
    req.session.twitch_id = broadcasterId;
    req.session.player_id = playerId;
    req.session.channel = channelName;
    
    // Update session table with twitch_id, player_id, channel, and last_activity (PostgreSQL only)
    // Do this BEFORE cleanup to ensure the new session exists in the database
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      try {
        await db.query(
          'UPDATE session SET twitch_id = $1, player_id = $2, channel = $3, last_activity = NOW() WHERE sid = $4',
          [broadcasterId, playerId, channelName, req.sessionID]
        );
        
        // Clean up old sessions for this broadcaster/channel combination
        // Done after session metadata is updated to avoid race conditions
        await cleanupOldSessions(broadcasterId, channelName, req.sessionID);
      } catch (err) {
        console.error('⚠️ Failed to update session metadata or cleanup:', err.message);
      }
    }
    
    // Check if game state has already been set up
    const gameState = await db.getGameState(channelName);
    
    // If game state exists, go to adventure; otherwise go to setup
    if (gameState) {
      console.log(`✅ Game state already configured for ${channelName}, redirecting to adventure`);
      res.redirect('/adventure?broadcaster=authenticated');
    } else {
      console.log(`📝 No game state found for ${channelName}, redirecting to setup`);
      res.redirect('/setup');
    }
  } catch (err) {
    console.error('❌ Broadcaster OAuth callback error:', err.response?.data || err.message);
    res.status(500).send(`Broadcaster authentication failed: ${err.response?.data?.message || err.message}`);
  }
});

// Stub login for local testing: /auth/fake?name=Viewer123
app.get('/auth/fake', async (req, res) => {
  const rawName = req.query.name || 'Guest';
  const name = sanitization.sanitizeCharacterName(rawName);
  
  if (!name) {
    return res.status(400).send('Invalid username');
  }
  
  const id = 'stub-' + name;
  try {
    // Insert or ignore player
    await db.query(
      'INSERT INTO players(id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [id, name]
    );
    req.session.user = { id, displayName: name };
    res.redirect('/adventure');
  } catch (err) {
    console.error('Stub login error:', err.message);
    res.status(500).send('Login failed');
  }
});

// Logout route
app.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

/**
 * GET /api/game-state
 * Get game state for a channel (weather, time_of_day, season, game_mode)
 */
app.get('/api/game-state', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const channelName = req.query.channel;
  if (!channelName) return res.status(400).json({ error: 'Channel parameter required' });

  try {
    let gameState = await db.getGameState(channelName.toLowerCase());
    
    // If no game state exists, return defaults
    if (!gameState) {
      gameState = {
        channel_name: channelName.toLowerCase(),
        ...DEFAULT_GAME_STATE
      };
    }
    
    res.json({ gameState });
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

/**
 * POST /api/game-state
 * Set game state for a channel (broadcaster only)
 */
app.post('/api/game-state',
  rateLimiter.middleware('strict'),
  async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  // Check if user is broadcaster
  if (!req.session.isBroadcaster) {
    return res.status(403).json({ error: 'Only the broadcaster can modify game state' });
  }

  const { channel, weather, time_of_day, season, game_mode } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel parameter required' });

  // Validate game_mode
  if (game_mode && !['softcore', 'hardcore'].includes(game_mode)) {
    return res.status(400).json({ error: 'game_mode must be either "softcore" or "hardcore"' });
  }

  // Validate other fields
  const validWeather = ['Clear', 'Rain', 'Snow', 'Fog', 'Storm'];
  const validTimeOfDay = ['Dawn', 'Day', 'Dusk', 'Night'];
  const validSeason = ['Spring', 'Summer', 'Autumn', 'Winter'];

  if (weather && !validWeather.includes(weather)) {
    return res.status(400).json({ error: `Invalid weather. Must be one of: ${validWeather.join(', ')}` });
  }
  
  if (time_of_day && !validTimeOfDay.includes(time_of_day)) {
    return res.status(400).json({ error: `Invalid time_of_day. Must be one of: ${validTimeOfDay.join(', ')}` });
  }
  
  if (season && !validSeason.includes(season)) {
    return res.status(400).json({ error: `Invalid season. Must be one of: ${validSeason.join(', ')}` });
  }

  try {
    // Get current game state or use defaults
    let currentState = await db.getGameState(channel.toLowerCase()) || DEFAULT_GAME_STATE;

    // Update only provided fields
    const updatedState = {
      weather: weather !== undefined ? weather : currentState.weather,
      time_of_day: time_of_day !== undefined ? time_of_day : currentState.time_of_day,
      season: season !== undefined ? season : currentState.season,
      game_mode: game_mode !== undefined ? game_mode : currentState.game_mode
    };

    const gameState = await db.setGameState(channel.toLowerCase(), updatedState);
    
    console.log(`✅ Game state updated for ${channel}:`, updatedState);
    res.json({ success: true, gameState });
  } catch (error) {
    console.error('Error setting game state:', error);
    res.status(500).json({ error: 'Failed to set game state' });
  }
});

/**
 * GET /api/setup/world-name
 * Get world name for a channel
 */
app.get('/api/setup/world-name', async (req, res) => {
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });
  
  try {
    const worldName = await db.getWorldName(channel.toLowerCase());
    res.json({ 
      success: true, 
      worldName: worldName
    });
  } catch (error) {
    console.error('Error getting world name:', error);
    res.status(500).json({ error: 'Failed to get world name' });
  }
});

/**
 * POST /api/setup/world-name
 * Set world name for a channel (broadcaster only)
 */
app.post('/api/setup/world-name',
  rateLimiter.middleware('strict'),
  async (req, res) => {
  const user = req.session.user;
  if (!user || !req.session.isBroadcaster) {
    return res.status(403).json({ error: 'Only broadcasters can set world name' });
  }
  
  const { worldName } = req.body;
  const channel = req.session.broadcasterChannel;
  
  if (!worldName || worldName.trim().length === 0) {
    return res.status(400).json({ error: 'World name cannot be empty' });
  }
  
  // Validate world name (alphanumeric, spaces, basic punctuation)
  const sanitizedWorldName = worldName.trim().substring(0, 50); // Max 50 chars
  
  try {
    await db.setWorldName(channel, sanitizedWorldName);
    res.json({ success: true, worldName: sanitizedWorldName });
  } catch (error) {
    console.error('Error setting world name:', error);
    res.status(500).json({ error: 'Failed to set world name' });
  }
});

// ==================== API ROUTES (Pre-WebSocket) ====================
// Mount auth routes early (before WebSocket) since they don't emit events
app.use('/api/auth', authRoutes);

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: req.session.user });
});

// ==================== ROOT ROUTES ====================

// Root route - landing page
app.get('/', (req, res) => {
  // Store channel parameter in session if provided
  if (req.query.channel) {
    req.session.oauthChannel = req.query.channel;
  }
  
  if (req.session.user) {
    return res.redirect('/adventure');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Setup route - broadcaster game setup (requires broadcaster auth)
app.get('/setup', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  
  // Only broadcasters can access setup
  if (!req.session.isBroadcaster) {
    return res.redirect('/adventure');
  }
  
  // Serve the setup page (same React app, will show setup component based on route)
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'public/dist/index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Adventure route - main game (requires auth)
app.get('/adventure', async (req, res) => {
  if (!req.session.user) {
    // Store channel parameter before redirecting to login
    if (req.query.channel) {
      req.session.oauthChannel = req.query.channel;
    }
    return res.redirect('/');
  }
  
  // Get the channel from query parameter or session
  let channel = req.query.channel || req.session.oauthChannel;
  if (!channel) {
    // Fall back to CHANNELS env
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  try {
    const character = await db.loadPlayerProgress(req.session.user.id, channel);
    
    // Character needs creation if: no record exists, no type/class set, or type is 'Unknown'
    const needsCharacterCreation = !character || !character.type || character.type === 'Unknown';
    
    // If character doesn't exist or is incomplete and URL doesn't already have tutorial parameter, redirect with it
    if (needsCharacterCreation && req.query.tutorial !== 'true') {
      return res.redirect(`/adventure?tutorial=true&channel=${encodeURIComponent(channel)}`);
    }
  } catch (error) {
    console.error('Error checking character:', error);
    // On error, let the frontend handle it
  }
  
  // Serve the appropriate index based on environment
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'public/dist/index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ==================== START HTTP SERVER ====================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces for Docker/Railway
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Serving React frontend from /public/dist');
  }
});

// ==================== INITIALIZE WEBSOCKET ====================
// CRITICAL: Initialize WebSocket BEFORE mounting route modules
// This ensures all route handlers can successfully emit events
const io = socketHandler.initializeWebSocket(server);
console.log('🔌 WebSocket server initialized and ready for route handlers');

// ==================== MOUNT ROUTE MODULES ====================
// Modularized routes for better maintainability and organization
// NOW MOUNTED AFTER WebSocket initialization to ensure emit functions work
app.use('/api/classes', classesRoutes);
app.use('/api/abilities', abilitiesRoutes);
app.use('/api/combat', combatRoutes);
app.use('/api/bestiary', bestiaryRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/passives', passivesRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/exploration', explorationRoutes);
app.use('/api/npcs', npcsRoutes);
app.use('/api/dialogue', dialogueRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/dungeons', dungeonsRoutes);
app.use('/api/factions', factionsRoutes);
app.use('/api/status-effects', statusEffectsRoutes);
app.use('/api/crafting', craftingRoutes);
app.use('/api/enchanting', enchantingRoutes);
app.use('/api/raids', raidsRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/leaderboards', leaderboardsRoutes);
app.use('/api/tutorial', tutorialRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/admin', adminRoutes);
console.log('✅ Route modules mounted and ready (WebSocket initialized)');
// ==================== END ROUTE MODULES ====================

// Serve static assets ONLY for authenticated routes
// This middleware only serves assets (JS/CSS) not HTML files
if (process.env.NODE_ENV === 'production') {
  app.use('/assets', (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).send('Unauthorized');
    }
    next();
  }, express.static(path.join(__dirname, 'public/dist/assets')));
} else {
  // Development: serve src and node_modules for HMR
  app.use('/src', (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).send('Unauthorized');
    }
    next();
  }, express.static(path.join(__dirname, 'public/src')));
  
  app.use('/node_modules', (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).send('Unauthorized');
    }
    next();
  }, express.static(path.join(__dirname, 'public/node_modules')));
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM signal received: closing HTTP server');
  
  // Clear all intervals
  intervals.forEach(intervalId => clearInterval(intervalId));
  console.log('✅ Cleared all intervals');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    db.close().then(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT signal received: closing HTTP server');
  
  // Clear all intervals
  intervals.forEach(intervalId => clearInterval(intervalId));
  console.log('✅ Cleared all intervals');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    db.close().then(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
});
