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
const rateLimiter = require('./utils/rateLimiter');

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

// Attach CSRF token to session
app.use(security.attachCsrfToken);

// Detect suspicious activity (after session, before routes)
app.use(security.detectSuspiciousActivity);

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

    req.session.user = { id: playerId, displayName: user.display_name, twitchId: user.id };
    console.log('✅ User logged in:', playerId);
    
    // Get the channel from session (set during /auth/twitch) or fall back to env
    let channel = req.session.oauthChannel;
    if (!channel) {
      const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
      channel = CHANNELS[0] || 'default';
    }
    console.log('🔍 Checking character for channel:', channel);
    
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
    
    req.session.user = { id: playerId, displayName: broadcasterName, twitchId: broadcasterId };
    req.session.isBroadcaster = true;
    req.session.broadcasterChannel = channelName;
    
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

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: req.session.user });
});

// Get CSRF token for authenticated users
app.get('/api/csrf-token', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ csrfToken: req.session.csrfToken });
});

// Get player progress
app.get('/api/player/progress', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  // Get channel from query parameter (required for multi-channel support)
  const channelName = req.query.channel;
  if (!channelName) return res.status(400).json({ error: 'Channel parameter required' });

  try {
    let progress = await db.loadPlayerProgress(user.id, channelName.toLowerCase());
    
    // If no progress exists, create a new player for this channel
    if (!progress) {
      progress = await db.initializeNewPlayer(user.id, channelName.toLowerCase(), user.displayName, "Town Square", 100);
    }

    res.json({ progress, channel: channelName });
  } catch (err) {
    console.error('Load progress error:', err);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Save player progress - WITH SERVER-SIDE VALIDATION
app.post('/api/player/progress', 
  rateLimiter.middleware('strict'),
  security.auditLog('save_progress'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    // Get channel from body or query parameter
    const channelName = req.body.channel || req.query.channel;
    if (!channelName) return res.status(400).json({ error: 'Channel parameter required' });

    try {
      const playerData = req.body.progress || req.body;
      
      // SERVER-SIDE VALIDATION: Verify current progress from database
      const currentProgress = await db.loadPlayerProgress(user.id, channelName.toLowerCase());
      
      if (!currentProgress) {
        return res.status(404).json({ error: 'No character found. Please create a character first.' });
      }
      
      // Validate critical stats haven't been tampered with
      if (playerData.level !== undefined) {
        // Level can only increase by 1 at a time, and must be within valid range
        if (playerData.level < 1 || playerData.level > 100) {
          console.warn(`[SECURITY] Invalid level attempt: ${playerData.level} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid level value' });
        }
        if (playerData.level > currentProgress.level + 1) {
          console.warn(`[SECURITY] Level jump detected for user ${security.sanitizeUserForLog(user)}: ${currentProgress.level} -> ${playerData.level}`);
          return res.status(400).json({ error: 'Invalid level progression' });
        }
      }
      
      // Validate gold changes
      if (playerData.gold !== undefined) {
        if (playerData.gold < 0 || playerData.gold > 100000000) {
          console.warn(`[SECURITY] Invalid gold amount: ${playerData.gold} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid gold amount' });
        }
        // Allow spending (decrease) but validate large INCREASES
        const goldChange = playerData.gold - currentProgress.gold;
        if (goldChange > 100000) {
          console.warn(`[SECURITY] Large gold increase detected for user ${security.sanitizeUserForLog(user)}: ${currentProgress.gold} -> ${playerData.gold}`);
          return res.status(400).json({ error: 'Invalid gold increase - suspiciously large' });
        }
        // Validate spending doesn't exceed current gold (paranoid check)
        if (goldChange < 0 && playerData.gold < 0) {
          console.warn(`[SECURITY] Negative gold after spending for user ${security.sanitizeUserForLog(user)}: ${playerData.gold}`);
          playerData.gold = 0; // Cap at 0
        }
      }
      
      // Validate XP changes
      if (playerData.xp !== undefined) {
        if (playerData.xp < 0 || playerData.xp > 1000000000) {
          console.warn(`[SECURITY] Invalid XP amount: ${playerData.xp} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid XP amount' });
        }
      }
      
      // Validate HP
      if (playerData.hp !== undefined) {
        if (playerData.hp < 0 || playerData.hp > 1000000) {
          console.warn(`[SECURITY] Invalid HP: ${playerData.hp} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid HP value' });
        }
        // HP can't exceed max_hp
        const maxHp = playerData.max_hp || currentProgress.max_hp;
        if (playerData.hp > maxHp) {
          console.warn(`[SECURITY] HP > max_hp for user ${security.sanitizeUserForLog(user)}: ${playerData.hp} > ${maxHp}`);
          playerData.hp = maxHp; // Cap at max
        }
      }
      
      // Sanitize string fields
      if (playerData.name) {
        playerData.name = sanitization.sanitizeCharacterName(playerData.name);
      }
      if (playerData.location) {
        playerData.location = sanitization.sanitizeLocationName(playerData.location);
      }
      
      // Sanitize inventory
      if (playerData.inventory) {
        playerData.inventory = sanitization.sanitizeInventory(playerData.inventory);
        // Limit inventory size
        if (playerData.inventory.length > 1000) {
          console.warn(`[SECURITY] Inventory size exceeded for user ${security.sanitizeUserForLog(user)}: ${playerData.inventory.length}`);
          playerData.inventory = playerData.inventory.slice(0, 1000);
        }
      }
      
      // Sanitize equipment
      if (playerData.equipped) {
        playerData.equipped = sanitization.sanitizeEquipment(playerData.equipped);
      }
      
      // Merge with current progress to prevent data loss
      const mergedData = {
        ...currentProgress,
        ...playerData
      };
      
      await db.savePlayerProgress(user.id, channelName.toLowerCase(), mergedData);
      
      // Emit update with properly formatted data
      if (mergedData.name) {
        socketHandler.emitPlayerUpdate(mergedData.name, channelName.toLowerCase(), convertToFrontendFormat(mergedData));
      }
      
      res.json({ status: 'ok', message: 'Progress saved' });
    } catch (err) {
      console.error('Save progress error:', err);
      res.status(500).json({ error: 'Failed to save progress' });
  }
});

// ===== CHARACTER SYSTEM API ENDPOINTS =====

/**
 * GET /api/classes
 * Get all available character classes
 */
app.get('/api/classes', (req, res) => {
  try {
    const CharacterInitializer = require('./game/CharacterInitializer');
    const classes = CharacterInitializer.getAvailableClasses();
    res.json({ success: true, classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

/**
 * GET /api/classes/:classType
 * Get detailed info about a specific class
 */
app.get('/api/classes/:classType', (req, res) => {
  try {
    const CharacterInitializer = require('./game/CharacterInitializer');
    const { classType } = req.params;
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json({ success: true, class: classInfo });
  } catch (error) {
    console.error('Error fetching class info:', error);
    res.status(500).json({ error: 'Failed to fetch class info' });
  }
});

/**
 * GET /api/classes/:classType/preview
 * Preview class progression (stats at different levels)
 */
app.get('/api/classes/:classType/preview', (req, res) => {
  try {
    const CharacterInitializer = require('./game/CharacterInitializer');
    const { classType } = req.params;
    const maxLevel = parseInt(req.query.maxLevel) || 10;
    
    const preview = CharacterInitializer.previewClassProgression(classType, maxLevel);
    
    if (!preview) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json({ success: true, preview });
  } catch (error) {
    console.error('Error generating class preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

/**
 * GET /api/player/channel
 * Get the default channel for character creation
 */
app.get('/api/player/channel', (req, res) => {
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
  const channel = CHANNELS[0] || 'default';
  res.json({ channel });
});

/**
 * GET /api/player
 * Get basic player information including theme, name color, and selected role badge
 */
app.get('/api/player', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
  const channelName = CHANNELS[0] || 'default';
  
  try {
    const playerData = await db.loadPlayerProgress(user.id, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      name: playerData.name,
      nameColor: playerData.nameColor,
      selectedRoleBadge: playerData.selectedRoleBadge,
      theme: playerData.theme || 'crimson-knight',
      roles: playerData.roles
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

/**
 * GET /api/player/roles
 * Get user's Twitch roles for display and color selection
 */
app.get('/api/player/roles', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
  const channel = CHANNELS[0] || 'default';
  const displayName = user.displayName || user.display_name || 'Adventurer';
  
  try {
    // Load player data to get their roles array
    const playerData = await db.loadPlayerProgress(user.id, channel);
    let roles = playerData?.roles || ['viewer'];
    let rolesUpdated = false;
    
    // Check if this is MarrowOfAlbion (game creator) - add creator role if not present
    if (displayName.toLowerCase() === 'marrowofalbion' || displayName.toLowerCase() === 'marrowofalb1on') {
      if (!roles.includes('creator')) {
        roles = ['creator', ...roles.filter(r => r !== 'viewer')];
        rolesUpdated = true;
      }
    }
    
    // Check if user is a beta tester - add tester role if not present
    if (db.isBetaTester(displayName) && !roles.includes('tester')) {
      roles = [...roles, 'tester'];
      rolesUpdated = true;
    }
    
    // Persist role changes to database
    if (rolesUpdated && playerData) {
      playerData.roles = roles;
      await db.savePlayerProgress(user.id, channel, playerData);
      console.log(`✅ Persisted roles for ${displayName}:`, roles);
      
      // Emit update
      if (playerData.name) {
        socketHandler.emitPlayerUpdate(playerData.name, channel, { roles });
      }
    }
    
    // Get the highest priority role as primary
    const primaryRole = db.ROLE_HIERARCHY.find(r => roles.includes(r)) || 'viewer';
    
    // Creators can display as any role - give them all options
    let availableColors;
    if (roles.includes('creator')) {
      // Creators get all possible roles to choose from
      availableColors = db.ROLE_HIERARCHY.map(r => ({
        role: r,
        color: db.ROLE_COLORS[r] || db.ROLE_COLORS.viewer,
        name: r.charAt(0).toUpperCase() + r.slice(1)
      }));
    } else {
      // Regular users only get their actual roles
      availableColors = roles.map(r => ({
        role: r,
        color: db.ROLE_COLORS[r] || db.ROLE_COLORS.viewer,
        name: r.charAt(0).toUpperCase() + r.slice(1)
      }));
    }
    
    console.log(`🎭 Roles API for ${displayName}:`, { roles, primaryRole }); // Debug log
    
    res.json({ 
      primaryRole,
      roles,
      availableColors,
      displayName: displayName
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/player/stats
 * Get detailed character stats breakdown and player data
 */
app.get('/api/player/stats', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const statsBreakdown = character.getStatsBreakdown();
    const finalStats = character.getFinalStats();
    
    // Return complete player data for the frontend
    res.json({
      username: character.name,
      class: character.classData?.name || 'Unknown',
      level: character.level,
      xp: character.xp,
      xpToNextLevel: character.xpToNext,
      hp: character.hp,
      maxHp: finalStats.maxHp,
      mana: character.mana || 0,
      maxMana: character.maxMana || 100,
      gold: character.gold,
      nameColor: character.nameColor || '#FFFFFF',
      channel: channelName,
      stats: {
        attack: finalStats.attack,
        defense: finalStats.defense,
        magic: finalStats.magic,
        agility: finalStats.agility,
        strength: finalStats.strength,
        critChance: parseFloat(finalStats.critChance) || 5,
        dodgeChance: parseFloat(finalStats.dodgeChance) || 0,
        blockChance: parseFloat(finalStats.blockChance) || 0
      },
      statsBreakdown: statsBreakdown
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/player/inventory
 * Get player inventory with item details
 */
app.get('/api/player/inventory', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const inventory = character.inventory.getSummary();
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/player/equipment
 * Get player equipped items with details
 */
app.get('/api/player/equipment', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const equipment = character.equipment.getSummary();
    res.json({ success: true, equipment });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

/**
 * POST /api/player/equip
 * Equip an item from inventory - WITH VALIDATION
 */
app.post('/api/player/equip',
  validation.validateEquipment,
  rateLimiter.middleware('default'),
  security.auditLog('equip_item'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { channel, itemId } = req.body;
    if (!channel || !itemId) {
      return res.status(400).json({ error: 'Channel and itemId required' });
    }
    
    const channelName = channel.toLowerCase();
    const sanitizedItemId = sanitization.sanitizeInput(itemId, { maxLength: 100 });
    
    try {
      const character = await db.getCharacter(user.id, channelName);
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const result = character.equipItem(sanitizedItemId);
      
      if (result.success) {
        await db.saveCharacter(user.id, channelName, character);
        
        // Emit websocket event for live update (equipment/stats changes)
        socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error equipping item:', error);
      res.status(500).json({ error: 'Failed to equip item' });
    }
  });

/**
 * POST /api/player/unequip
 * Unequip an item to inventory - WITH VALIDATION
 */
app.post('/api/player/unequip',
  validation.validateEquipment,
  rateLimiter.middleware('default'),
  security.auditLog('unequip_item'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { channel, slot } = req.body;
    if (!channel || !slot) {
      return res.status(400).json({ error: 'Channel and slot required' });
    }
    
    const channelName = channel.toLowerCase();
    
    try {
      const character = await db.getCharacter(user.id, channelName);
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const result = character.unequipItem(slot);
      
      if (result.success) {
        await db.saveCharacter(user.id, channelName, character);
        
        // Emit websocket event for live update (equipment/stats changes)
        socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error unequipping item:', error);
      res.status(500).json({ error: 'Failed to unequip item' });
    }
  });

/**
 * GET /api/abilities
 * Get all abilities for player's class with unlock status
 */
app.get('/api/abilities', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const playerClass = progress.type;
    if (!playerClass || playerClass === 'Unknown') {
      return res.status(400).json({ error: 'Character class not set' });
    }
    
    // Load class abilities from data file
    const classAbilitiesData = require('./data/class_abilities.json');
    const classAbilities = classAbilitiesData.abilities[playerClass.toLowerCase()] || [];
    
    // Determine which abilities are unlocked
    const unlockedAbilities = progress.unlocked_abilities || [];
    const playerLevel = progress.level || 1;
    
    const abilitiesWithStatus = classAbilities.map(ability => {
      let unlocked = unlockedAbilities.includes(ability.id);
      
      // Auto-unlock level-based abilities
      if (ability.unlock_type === 'level' && playerLevel >= ability.unlock_requirement) {
        unlocked = true;
        if (!unlockedAbilities.includes(ability.id)) {
          unlockedAbilities.push(ability.id);
        }
      }
      
      return {
        ...ability,
        unlocked
      };
    });
    
    // Save updated unlocked abilities if any were auto-unlocked
    if (unlockedAbilities.length > (progress.unlocked_abilities || []).length) {
      await db.query(
        `UPDATE ${db.getPlayerTable(channelName)} SET unlocked_abilities = $1 WHERE player_id = $2`,
        [JSON.stringify(unlockedAbilities), user.id]
      );
    }
    
    res.json({ 
      abilities: abilitiesWithStatus,
      equipped: progress.equipped_abilities || []
    });
  } catch (error) {
    console.error('Error fetching abilities:', error);
    res.status(500).json({ error: 'Failed to fetch abilities' });
  }
});

/**
 * GET /api/abilities/equipped
 * Get equipped abilities with full details
 */
app.get('/api/abilities/equipped', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const playerClass = progress.type;
    const equippedIds = progress.equipped_abilities || [];
    
    if (equippedIds.length === 0) {
      return res.json({ abilities: [] });
    }
    
    // Load class abilities
    const classAbilitiesData = require('./data/class_abilities.json');
    const classAbilities = classAbilitiesData.abilities[playerClass.toLowerCase()] || [];
    
    // Filter to only equipped abilities
    const equippedAbilities = classAbilities.filter(ability => equippedIds.includes(ability.id));
    
    res.json({ abilities: equippedAbilities });
  } catch (error) {
    console.error('Error fetching equipped abilities:', error);
    res.status(500).json({ error: 'Failed to fetch equipped abilities' });
  }
});

/**
 * POST /api/abilities/equip
 * Equip an ability (max 3)
 */
app.post('/api/abilities/equip', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { abilityId, channel } = req.body;
  if (!abilityId) {
    return res.status(400).json({ error: 'abilityId required' });
  }
  
  let channelName = channel;
  if (!channelName) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channelName = CHANNELS[0] || 'default';
  }
  channelName = channelName.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if in combat
    if (progress.in_combat) {
      return res.status(400).json({ error: 'Cannot change abilities during combat' });
    }
    
    // Check if ability is unlocked
    const unlockedAbilities = progress.unlocked_abilities || [];
    if (!unlockedAbilities.includes(abilityId)) {
      return res.status(403).json({ error: 'Ability not unlocked' });
    }
    
    let equippedAbilities = progress.equipped_abilities || [];
    
    // Check if already equipped
    if (equippedAbilities.includes(abilityId)) {
      return res.json({ equipped: equippedAbilities });
    }
    
    // Check max equipped (3)
    if (equippedAbilities.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 abilities can be equipped' });
    }
    
    // Equip the ability
    equippedAbilities.push(abilityId);
    
    await db.query(
      `UPDATE ${db.getPlayerTable(channelName)} SET equipped_abilities = $1 WHERE player_id = $2`,
      [JSON.stringify(equippedAbilities), user.id]
    );
    
    res.json({ success: true, equipped: equippedAbilities });
  } catch (error) {
    console.error('Error equipping ability:', error);
    res.status(500).json({ error: 'Failed to equip ability' });
  }
});

/**
 * POST /api/abilities/unequip
 * Unequip an ability
 */
app.post('/api/abilities/unequip', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { abilityId, channel } = req.body;
  if (!abilityId) {
    return res.status(400).json({ error: 'abilityId required' });
  }
  
  let channelName = channel;
  if (!channelName) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channelName = CHANNELS[0] || 'default';
  }
  channelName = channelName.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if in combat
    if (progress.in_combat) {
      return res.status(400).json({ error: 'Cannot change abilities during combat' });
    }
    
    let equippedAbilities = progress.equipped_abilities || [];
    
    // Remove the ability
    equippedAbilities = equippedAbilities.filter(id => id !== abilityId);
    
    await db.query(
      `UPDATE ${db.getPlayerTable(channelName)} SET equipped_abilities = $1 WHERE player_id = $2`,
      [JSON.stringify(equippedAbilities), user.id]
    );
    
    res.json({ success: true, equipped: equippedAbilities });
  } catch (error) {
    console.error('Error unequipping ability:', error);
    res.status(500).json({ error: 'Failed to unequip ability' });
  }
});

/**
 * POST /api/player/create
 * Create a new character with a class - WITH VALIDATION
 */
app.post('/api/player/create',
  validation.validateCharacterCreate,
  rateLimiter.middleware('strict'),
  security.auditLog('create_character'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { channel, classType, nameColor, selectedRoleBadge } = req.body;
    if (!channel || !classType) {
      return res.status(400).json({ error: 'Channel and classType required' });
    }
    
    const channelName = channel.toLowerCase();
    const rawCharacterName = user.displayName || user.display_name || 'Adventurer';
    const characterName = sanitization.sanitizeCharacterName(rawCharacterName);
    
    // Validate nameColor if provided
    let validatedColor = null;
    if (nameColor) {
      validatedColor = sanitization.sanitizeColorCode(nameColor);
      if (!validatedColor) {
        return res.status(400).json({ error: 'Invalid color code format' });
      }
    }
    
    // Validate selectedRoleBadge if provided
    let validatedRoleBadge = null;
    if (selectedRoleBadge && typeof selectedRoleBadge === 'string') {
      validatedRoleBadge = selectedRoleBadge.toLowerCase();
    }
    
    try {
      // Check if character already exists
      const existing = await db.getCharacter(user.id, channelName);
      if (existing) {
        return res.status(400).json({ error: 'Character already exists for this channel' });
      }
      
      // Check if user has existing roles from previous activity (e.g., Twitch chat)
      const existingProgress = await db.loadPlayerProgress(user.id, channelName);
      let userRoles = existingProgress?.roles || null;
      
      // Try to fetch from Twitch API if we don't have accurate roles and broadcaster is authenticated
      if (shouldFetchRolesFromTwitchAPI(userRoles)) {
        const broadcasterAuth = await db.getBroadcasterAuth(channelName);
        
        if (broadcasterAuth && user.twitchId) {
          console.log(`🔍 Fetching roles from Twitch API for ${characterName}`);
          try {
            const fetchedRoles = await fetchUserRolesFromTwitch(
              broadcasterAuth.accessToken,
              broadcasterAuth.broadcasterId,
              user.twitchId,
              characterName,
              channelName
            );
            
            if (fetchedRoles && fetchedRoles.length > 0) {
              userRoles = fetchedRoles;
              console.log(`✅ Fetched roles from Twitch API:`, userRoles);
            } else {
              userRoles = ['viewer'];
            }
          } catch (error) {
            console.error('Failed to fetch roles from Twitch API:', error);
            // Fall back to existing roles or viewer
            userRoles = userRoles || ['viewer'];
          }
        } else {
          // No broadcaster auth or twitchId - fall back to existing or viewer
          userRoles = userRoles || ['viewer'];
          if (!broadcasterAuth) {
            console.log(`⚠️ Broadcaster not authenticated for channel ${channelName} - using fallback role detection`);
          }
        }
      }
      
      // Ensure userRoles is never null
      userRoles = userRoles || ['viewer'];
      
      // Create new character
      const character = await db.createCharacter(user.id, channelName, characterName, classType);
      
      // Check if this is MarrowOfAlbion (game creator) and set creator role
      if (characterName.toLowerCase() === 'marrowofalbion' || characterName.toLowerCase() === 'marrowofalb1on') {
        userRoles = ['creator'];
        character.nameColor = validatedColor || '#FFD700'; // Default to gold for creator
        console.log('🎮 Game creator MarrowOfAlbion detected - granting creator role');
      } else {
        // Check if user is a beta tester - add tester role if not already present
        if (db.isBetaTester(characterName) && !userRoles.includes('tester')) {
          userRoles = [...userRoles, 'tester'];
          console.log('🧪 Beta tester detected - granting tester role');
        }
        
        // Set appropriate default name color based on highest role if not provided
        if (!validatedColor) {
          const highestRole = db.ROLE_HIERARCHY.find(r => userRoles.includes(r)) || 'viewer';
          character.nameColor = db.ROLE_COLORS[highestRole];
        } else {
          character.nameColor = validatedColor;
        }
      }
      
      // Apply roles to character
      character.roles = userRoles;
      console.log(`🎭 Assigned roles to ${characterName}:`, userRoles);
      
      // Set selectedRoleBadge - use validated one from frontend if provided and user has that role,
      // otherwise use highest priority role
      if (validatedRoleBadge && userRoles.includes(validatedRoleBadge)) {
        character.selectedRoleBadge = validatedRoleBadge;
        console.log(`🎯 Set selectedRoleBadge from frontend: ${validatedRoleBadge}`);
      } else {
        const primaryRole = db.ROLE_HIERARCHY.find(r => userRoles.includes(r)) || 'viewer';
        character.selectedRoleBadge = primaryRole;
        console.log(`🎯 Set selectedRoleBadge to highest priority role: ${primaryRole}`);
      }
      
      // Save character with roles and color
      await db.saveCharacter(user.id, channelName, character);
      
      // Emit WebSocket update for new character creation
      socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      
      res.json({ 
        success: true, 
        message: `Created ${classType} character: ${characterName}`,
        character: character.toDatabase()
      });
    } catch (error) {
      console.error('Error creating character:', error);
      res.status(500).json({ error: error.message || 'Failed to create character' });
    }
  });

/**
 * POST /api/player/name-color
 * Update player's name color (must be from one of their available roles) - WITH VALIDATION
 */
app.post('/api/player/name-color',
  validation.validateNameColor,
  rateLimiter.middleware('default'),
  security.auditLog('update_name_color'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { nameColor } = req.body;
    if (!nameColor) {
      return res.status(400).json({ error: 'nameColor required' });
    }
    
    // Validate color format
    const validatedColor = sanitization.sanitizeColorCode(nameColor);
    if (!validatedColor) {
      return res.status(400).json({ error: 'Invalid color code format' });
    }
    
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    const channelName = CHANNELS[0] || 'default';
    
    try {
      // Load player data
      const playerData = await db.loadPlayerProgress(user.id, channelName);
      if (!playerData) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      // Validate that the color matches one of their roles
      const roles = playerData.roles || ['viewer'];
      const validColors = roles.map(r => db.ROLE_COLORS[r]);
      
      if (!validColors.includes(validatedColor)) {
        // Sanitize display name for logging to prevent log injection
        console.warn(`[SECURITY] Invalid color selection attempt by ${security.sanitizeUserForLog(user)}: ${validatedColor} not in ${validColors}`);
        return res.status(403).json({ error: 'Color not available for your roles' });
      }
      
      // Update name color
      playerData.nameColor = validatedColor;
      await db.savePlayerProgress(user.id, channelName, playerData);
      
    res.json({ success: true, nameColor });
  } catch (error) {
    console.error('Error updating name color:', error);
    res.status(500).json({ error: 'Failed to update name color' });
  }
});

/**
 * POST /api/player/role-display
 * Update player's name color and selected role badge (must be from one of their available roles)
 */
app.post('/api/player/role-display',
  rateLimiter.middleware('default'),
  security.auditLog('update_role_display'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { nameColor, selectedRoleBadge } = req.body;
    if (!nameColor || !selectedRoleBadge) {
      return res.status(400).json({ error: 'nameColor and selectedRoleBadge required' });
    }
    
    // Validate color format
    const validatedColor = sanitization.sanitizeColorCode(nameColor);
    if (!validatedColor) {
      return res.status(400).json({ error: 'Invalid color code format' });
    }
    
    // Validate role badge is a string
    if (typeof selectedRoleBadge !== 'string') {
      return res.status(400).json({ error: 'Invalid role badge format' });
    }
    
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    const channelName = CHANNELS[0] || 'default';
    
    try {
      // Load player data
      const playerData = await db.loadPlayerProgress(user.id, channelName);
      if (!playerData) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      // Sync roles (add creator/tester if applicable)
      let roles = playerData.roles || ['viewer'];
      const displayName = user.displayName || user.display_name || 'Adventurer';
      let rolesUpdated = false;
      
      // Check if this is MarrowOfAlbion (game creator) - add creator role if not present
      if (displayName.toLowerCase() === 'marrowofalbion' || displayName.toLowerCase() === 'marrowofalb1on') {
        if (!roles.includes('creator')) {
          roles = ['creator', ...roles.filter(r => r !== 'viewer')];
          rolesUpdated = true;
        }
      }
      
      // Check if user is a beta tester - add tester role if not present
      if (db.isBetaTester(displayName) && !roles.includes('tester')) {
        roles = [...roles, 'tester'];
        rolesUpdated = true;
      }
      
      // Persist role changes
      if (rolesUpdated) {
        playerData.roles = roles;
        console.log(`✅ Synced roles for ${displayName}:`, roles);
      }
      
      // Validate that the color and badge match one of their roles
      const isCreator = roles.includes('creator');
      const validRoles = roles.map(r => r.toLowerCase());
      const validColors = roles.map(r => db.ROLE_COLORS[r]);
      
      // Creators can select any role appearance
      if (!isCreator) {
        if (!validColors.includes(validatedColor)) {
          console.warn(`[SECURITY] Invalid color selection attempt by ${security.sanitizeUserForLog(user)}: ${validatedColor} not in ${validColors}`);
          return res.status(403).json({ error: 'Color not available for your roles' });
        }
        
        if (!validRoles.includes(selectedRoleBadge.toLowerCase())) {
          console.warn(`[SECURITY] Invalid badge selection attempt by ${security.sanitizeUserForLog(user)}: ${selectedRoleBadge} not in ${validRoles}`);
          return res.status(403).json({ error: 'Badge not available for your roles' });
        }
      } else {
        // Validate creator is selecting a valid role that exists in the system
        const allValidRoles = db.ROLE_HIERARCHY.map(r => r.toLowerCase());
        const allValidColors = Object.values(db.ROLE_COLORS);
        
        if (!allValidColors.includes(validatedColor)) {
          console.warn(`[SECURITY] Invalid color selection by creator ${security.sanitizeUserForLog(user)}: ${validatedColor}`);
          return res.status(403).json({ error: 'Invalid color code' });
        }
        
        if (!allValidRoles.includes(selectedRoleBadge.toLowerCase())) {
          console.warn(`[SECURITY] Invalid badge selection by creator ${security.sanitizeUserForLog(user)}: ${selectedRoleBadge}`);
          return res.status(403).json({ error: 'Invalid role badge' });
        }
      }
      
      // Update name color and selected role badge
      playerData.nameColor = validatedColor;
      playerData.selectedRoleBadge = selectedRoleBadge.toLowerCase();
      await db.savePlayerProgress(user.id, channelName, playerData);
      
      // Emit websocket event for live update with complete player data
      const character = await db.getCharacter(user.id, channelName);
      if (character) {
        socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      }
      
      res.json({ success: true, nameColor: validatedColor, selectedRoleBadge: selectedRoleBadge.toLowerCase() });
    } catch (error) {
      console.error('Error updating role display:', error);
      res.status(500).json({ error: 'Failed to update role display' });
    }
  });

/**
 * POST /api/player/theme
 * Update player's theme preference
 */
app.post('/api/player/theme',
  rateLimiter.middleware('default'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { theme } = req.body;
    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Theme required' });
    }
    
    // Validate theme is one of the allowed themes
    const validThemes = ['crimson-knight', 'lovecraftian', 'azure-mage', 'golden-paladin', 'shadow-assassin', 'frost-warden'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    const channelName = CHANNELS[0] || 'default';
    
    try {
      // Load player data
      const playerData = await db.loadPlayerProgress(user.id, channelName);
      if (!playerData) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      // Update theme
      playerData.theme = theme;
      await db.savePlayerProgress(user.id, channelName, playerData);
      
      // Emit update
      if (playerData.name) {
        socketHandler.emitPlayerUpdate(playerData.name, channelName, { theme });
      }
      
      res.json({ success: true, theme });
    } catch (error) {
      console.error('Error updating theme:', error);
      res.status(500).json({ error: 'Failed to update theme' });
    }
  });

// Update the existing /api/action endpoint to save after each action
app.post('/api/action', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  const { actionId, playerState, channel } = req.body;

  // Channel is required for multi-channel support
  if (!channel) return res.status(400).json({ error: 'Channel parameter required' });
  const channelName = channel.toLowerCase();

  // Load current progress for this specific channel
  let progress = await db.loadPlayerProgress(user.id, channelName);
  if (!progress) {
    progress = await db.initializeNewPlayer(user.id, channelName, user.displayName);
  }

  // Handle actions and update progress
  if (actionId === 'fightBoss') {
    const bossName = 'The Nameless One';
    if (canAnnounce(user.id)) {
      // Announce to specific channel
      rawAnnounce(`${user.displayName} is fighting ${bossName}! 🔥`, channelName);
    }
    
    // Update player state (example: reduce HP, add XP, etc.)
    progress.in_combat = true;
    progress.xp += 50;
    progress.hp = Math.max(0, progress.hp - 20);
    
    // Save updated progress for this channel
    await db.savePlayerProgress(user.id, channelName, progress);
    
    // Emit update with properly formatted data
    if (progress.name) {
      socketHandler.emitPlayerUpdate(progress.name, channelName, convertToFrontendFormat(progress));
    }
    
    return res.json({ 
      status: 'ok', 
      newState: progress,
      eventsToBroadcast: [{ type: 'BOSS_ENCOUNTER', payload: { bossName } }] 
    });
  }

  res.json({ status: 'ok', message: 'no-op' });
});

// ==================== COMBAT ENDPOINTS ====================

/**
 * Start combat with a monster
 * POST /api/combat/start
 * Body: { monsterId: string, channelName?: string }
 * WITH VALIDATION
 */
app.post('/api/combat/start',
  validation.validateCombatAction,
  rateLimiter.middleware('default'),
  security.auditLog('start_combat'),
  async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ error: 'Not logged in' });

      const { monsterId, channelName } = req.body;
      if (!monsterId) {
        return res.status(400).json({ error: 'monsterId is required' });
      }

      const sanitizedMonsterId = sanitization.sanitizeInput(monsterId, { maxLength: 100 });
      const channel = channelName || user.channels?.[0] || 'default';

      // Load player progress
      const playerData = await db.getPlayerProgress(user.id, channel);
      if (!playerData) {
        return res.status(404).json({ error: 'Player progress not found. Create a character first.' });
      }

      // Check if already in combat
      if (req.session.combat) {
        return res.status(400).json({ error: 'Already in combat. Finish current combat first.' });
      }

      // Load monster data
      const monstersData = loadData('monsters');
      let monster = null;

      // Search for monster
      for (const rarity of Object.keys(monstersData.monsters)) {
        const found = monstersData.monsters[rarity].find(m => m.id === sanitizedMonsterId);
        if (found) {
          monster = found;
          break;
        }
      }

      if (!monster) {
        return res.status(404).json({ error: 'Monster not found' });
      }

    // Create Character instance
    const character = Character.fromObject(playerData);

    // Start combat
    const combat = new Combat(character, monster);
    
    // Store combat in session
    req.session.combat = {
      combatInstance: combat,
      playerId: user.id,
      channelName: channel,
      monsterId: monsterId
    };

    // Save session
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Emit real-time combat started notification
    socketHandler.emitCombatUpdate(user.login || user.displayName, channel, {
      type: 'combat_started',
      state: combat.getState(),
      monster: {
        name: monster.name,
        level: monster.level,
        hp: monster.hp
      }
    });

    res.json({
      success: true,
      message: `Combat started with ${monster.name}!`,
      state: combat.getState()
    });

  } catch (error) {
    console.error('Combat start error:', error);
    res.status(500).json({ error: 'Failed to start combat', details: error.message });
  }
});

/**
 * Get current combat state
 * GET /api/combat/state
 */
app.get('/api/combat/state', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    if (!req.session.combat) {
      return res.json({ inCombat: false });
    }

    const combat = req.session.combat.combatInstance;
    res.json({
      inCombat: true,
      state: combat.getState()
    });

  } catch (error) {
    console.error('Combat state error:', error);
    res.status(500).json({ error: 'Failed to get combat state' });
  }
});

/**
 * Perform combat action - Attack
 * POST /api/combat/attack
 * WITH VALIDATION
 */
app.post('/api/combat/attack',
  rateLimiter.middleware('default'),
  security.auditLog('combat_attack'),
  async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ error: 'Not logged in' });

      if (!req.session.combat) {
        return res.status(400).json({ error: 'No active combat' });
      }

      const combat = req.session.combat.combatInstance;
      const result = combat.playerAttack();

      // Emit real-time combat action
      const channel = req.session.combat.channelName;
      socketHandler.emitCombatUpdate(user.login || user.displayName, channel, {
        type: 'combat_action',
        action: 'attack',
        result: result
      });

      // If combat ended, save results and clean up
      if (result.victory || result.defeat) {
        await handleCombatEnd(req.session, result);
        
        // Emit combat ended
        socketHandler.emitCombatUpdate(user.login || user.displayName, channel, {
          type: result.victory ? 'combat_victory' : 'combat_defeat',
          result: result
        });
    } else {
      // Save session with updated combat state
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat attack error:', error);
    res.status(500).json({ error: 'Failed to perform attack', details: error.message });
  }
});

/**
 * Perform combat action - Use Skill
 * POST /api/combat/skill
 * Body: { skillId: string }
 */
app.post('/api/combat/skill', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { skillId } = req.body;
    if (!skillId) {
      return res.status(400).json({ error: 'skillId is required' });
    }

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerSkill(skillId);

    // If combat ended, save results and clean up
    if (result.victory || result.defeat) {
      await handleCombatEnd(req.session, result);
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat skill error:', error);
    res.status(500).json({ error: 'Failed to use skill', details: error.message });
  }
});

/**
 * Perform combat action - Use Item
 * POST /api/combat/item
 * Body: { itemId: string }
 */
app.post('/api/combat/item', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerUseItem(itemId);

    if (result.victory || result.defeat) {
      await handleCombatEnd(req.session, result);
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat item error:', error);
    res.status(500).json({ error: 'Failed to use item', details: error.message });
  }
});

/**
 * Perform combat action - Flee
 * POST /api/combat/flee
 */
app.post('/api/combat/flee', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerFlee();

    // Clean up combat session if fled successfully
    if (result.success && result.state === Combat.STATES.FLED) {
      delete req.session.combat;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat flee error:', error);
    res.status(500).json({ error: 'Failed to flee', details: error.message });
  }
});

/**
 * Helper function to handle combat end (victory/defeat)
 * @param {Object} session - Express session
 * @param {Object} result - Combat result
 */
async function handleCombatEnd(session, result) {
  const { playerId, channelName } = session.combat;
  const combat = session.combat.combatInstance;

  if (result.victory) {
    // Award rewards
    const character = combat.character;
    
    // Add gold
    character.gold += result.rewards.gold;

    // Add items to inventory
    for (const item of result.rewards.items) {
      character.inventory.addItem(item.id, item.quantity || 1);
    }

    // Update bestiary - record defeat
    if (result.bestiaryUpdate && result.bestiaryUpdate.monsterId) {
      const BestiaryManager = require('./utils/bestiaryManager');
      const currentBestiary = character.bestiary || {};
      const updatedBestiary = BestiaryManager.recordDefeat(currentBestiary, result.bestiaryUpdate.monsterId);
      character.bestiary = updatedBestiary;
      
      // Unlock bestiary if this is first entry
      if (!character.bestiary_unlocked && BestiaryManager.shouldUnlockBestiary(updatedBestiary)) {
        character.bestiary_unlocked = true;
      }
    }

    // Save updated character
    const playerData = character.toObject();
    await db.savePlayerProgress(playerId, channelName, playerData);
    
    // Emit update for victory using frontend format
    socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
  }

  if (result.defeat) {
    // Handle death (optional: respawn with penalty)
    const character = combat.character;
    character.current_hp = Math.floor(character.max_hp * 0.5); // Respawn with 50% HP
    
    // Optional: gold penalty
    character.gold = Math.max(0, character.gold - Math.floor(character.gold * 0.1));

    const playerData = character.toObject();
    await db.savePlayerProgress(playerId, channelName, playerData);
    
    // Emit update for defeat using frontend format
    socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
  }

  // Clear combat from session
  delete session.combat;
  
  await new Promise((resolve, reject) => {
    session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ==================== BESTIARY ENDPOINTS ====================

/**
 * GET /api/bestiary
 * Get player's bestiary data
 */
app.get('/api/bestiary', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const BestiaryManager = require('./utils/bestiaryManager');
    const bestiaryData = playerData.bestiary || {};
    const entries = BestiaryManager.getBestiaryEntries(bestiaryData);
    const stats = BestiaryManager.getBestiaryStats(bestiaryData);

    res.json({
      unlocked: playerData.bestiary_unlocked || false,
      entries: entries,
      stats: stats
    });

  } catch (error) {
    console.error('Bestiary get error:', error);
    res.status(500).json({ error: 'Failed to get bestiary', details: error.message });
  }
});

/**
 * POST /api/bestiary/encounter
 * Record a monster encounter
 */
app.post('/api/bestiary/encounter', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { monsterId } = req.body;
    if (!monsterId) {
      return res.status(400).json({ error: 'Monster ID required' });
    }

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const BestiaryManager = require('./utils/bestiaryManager');
    const currentBestiary = playerData.bestiary || {};
    const updatedBestiary = BestiaryManager.recordEncounter(currentBestiary, monsterId);
    
    // Check if bestiary should be unlocked
    const shouldUnlock = BestiaryManager.shouldUnlockBestiary(updatedBestiary);

    // Update player data
    await db.updatePlayerField(playerId, channelName, 'bestiary', updatedBestiary);
    if (shouldUnlock && !playerData.bestiary_unlocked) {
      await db.updatePlayerField(playerId, channelName, 'bestiary_unlocked', true);
    }

    res.json({
      success: true,
      unlocked: shouldUnlock,
      entry: updatedBestiary[monsterId]
    });

  } catch (error) {
    console.error('Bestiary encounter error:', error);
    res.status(500).json({ error: 'Failed to record encounter', details: error.message });
  }
});

/**
 * POST /api/bestiary/defeat
 * Record a monster defeat
 */
app.post('/api/bestiary/defeat', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { monsterId } = req.body;
    if (!monsterId) {
      return res.status(400).json({ error: 'Monster ID required' });
    }

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const BestiaryManager = require('./utils/bestiaryManager');
    const currentBestiary = playerData.bestiary || {};
    const updatedBestiary = BestiaryManager.recordDefeat(currentBestiary, monsterId);

    // Update player data
    await db.updatePlayerField(playerId, channelName, 'bestiary', updatedBestiary);

    res.json({
      success: true,
      entry: updatedBestiary[monsterId]
    });

  } catch (error) {
    console.error('Bestiary defeat error:', error);
    res.status(500).json({ error: 'Failed to record defeat', details: error.message });
  }
});

/**
 * GET /api/bestiary/unlock-status
 * Check if bestiary is unlocked for player
 */
app.get('/api/bestiary/unlock-status', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const playerId = user.id;
    const channelName = req.session.channelName;
    if (!channelName) {
      return res.status(400).json({ error: 'No channel selected' });
    }

    const playerData = await db.getPlayerProgress(playerId, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      unlocked: playerData.bestiary_unlocked || false,
      entryCount: Object.keys(playerData.bestiary || {}).length
    });

  } catch (error) {
    console.error('Bestiary unlock status error:', error);
    res.status(500).json({ error: 'Failed to get unlock status', details: error.message });
  }
});

// ==================== PROGRESSION ENDPOINTS ====================

/**
 * GET /api/progression/xp-info
 * Get XP information for current level
 */
app.get('/api/progression/xp-info', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const progressionMgr = new ProgressionManager();
    const nextLevelXP = progressionMgr.calculateXPToNextLevel(character.level);
    const totalXP = progressionMgr.calculateTotalXPToLevel(character.level);

    res.json({
      success: true,
      level: character.level,
      currentXP: character.xp,
      xpToNext: character.xpToNext,
      xpProgress: ((character.xp / character.xpToNext) * 100).toFixed(1) + '%',
      totalXPEarned: totalXP + character.xp
    });
  } catch (error) {
    console.error('Error fetching XP info:', error);
    res.status(500).json({ error: 'Failed to fetch XP information' });
  }
});

/**
 * POST /api/progression/add-xp
 * Add XP to character (admin/testing endpoint) - WITH VALIDATION
 */
app.post('/api/progression/add-xp',
  validation.validateAmount,
  rateLimiter.middleware('strict'),
  security.auditLog('add_xp'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { channel, amount } = req.body;
    if (!channel) return res.status(400).json({ error: 'Channel required' });
    if (!amount || amount < 1) return res.status(400).json({ error: 'Valid XP amount required' });

    // Validate XP amount is reasonable (prevent abuse)
    const sanitizedAmount = sanitization.sanitizeNumber(amount, { min: 1, max: 10000000, integer: true });
    if (!sanitizedAmount) {
      return res.status(400).json({ error: 'Invalid XP amount' });
    }

    try {
      const character = await db.getCharacter(user.id, channel.toLowerCase());
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      const progressionMgr = new ProgressionManager();
      const result = progressionMgr.addXP(character, sanitizedAmount);

    // Save updated character
    await db.saveCharacter(user.id, channel.toLowerCase(), character);
    
    // Emit update
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), {
      level: character.level,
      xp: character.xp,
      xpToNext: character.xpToNext,
      hp: character.hp,
      maxHp: character.maxHp
    });

    res.json({
      success: true,
      ...result,
      character: {
        level: character.level,
        xp: character.xp,
        xpToNext: character.xpToNext,
        hp: character.hp,
        maxHp: character.maxHp,
        skillPoints: character.skillPoints
      }
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    res.status(500).json({ error: 'Failed to add XP' });
  }
});

/**
 * POST /api/progression/death
 * Handle character death
 */
app.post('/api/progression/death', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get game state to determine if hardcore mode is enabled
    const gameState = await db.getGameState(channel.toLowerCase());
    
    // If no game state exists, default to softcore (safer default)
    const isHardcore = gameState ? gameState.game_mode === 'hardcore' : false;
    
    if (!gameState) {
      console.warn(`⚠️ No game state found for channel ${channel}, defaulting to softcore mode`);
    }

    // Get permanent stats from database
    const permanentStats = await db.getPermanentStats(user.id) || {};

    const progressionMgr = new ProgressionManager();
    const deathResult = progressionMgr.handleDeath(character, isHardcore, permanentStats);

    if (deathResult.characterDeleted) {
      // Save permanent stats and delete character
      await db.savePermanentStats(user.id, deathResult.permanentStatsToRetain);
      await db.deleteCharacter(user.id, channel.toLowerCase());
    } else {
      // Save character with penalties
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit WebSocket update for death penalties
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    }

    res.json({
      success: true,
      ...deathResult
    });
  } catch (error) {
    console.error('Error handling death:', error);
    res.status(500).json({ error: 'Failed to handle death' });
  }
});

/**
 * POST /api/progression/respawn
 * Respawn character after death
 */
app.post('/api/progression/respawn', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const progressionMgr = new ProgressionManager();
    const respawnResult = progressionMgr.respawn(character);

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for respawn
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      ...respawnResult
    });
  } catch (error) {
    console.error('Error respawning:', error);
    res.status(500).json({ error: 'Failed to respawn' });
  }
});

/**
 * GET /api/passives/tree
 * Get complete passive tree with current levels and currency
 */
app.get('/api/passives/tree', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const tree = passiveMgr.getPassiveTreeSummary(
      permanentStats.passiveLevels || {},
      permanentStats.souls || 0,
      permanentStats.legacyPoints || 0
    );

    const allPassives = passiveMgr.getAllPassives(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      tree,
      passives: allPassives
    });
  } catch (error) {
    console.error('Error fetching passive tree:', error);
    res.status(500).json({ error: 'Failed to fetch passive tree' });
  }
});

/**
 * GET /api/passives/category/:category
 * Get passives by category
 */
app.get('/api/passives/category/:category', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { category } = req.params;

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const passives = passiveMgr.getPassivesByCategory(
      category,
      permanentStats.passiveLevels || {}
    );

    res.json({
      success: true,
      category,
      passives
    });
  } catch (error) {
    console.error('Error fetching passives by category:', error);
    res.status(500).json({ error: 'Failed to fetch passives' });
  }
});

/**
 * POST /api/passives/upgrade
 * Upgrade a passive by one level
 */
app.post('/api/passives/upgrade', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { passiveId } = req.body;
  if (!passiveId) {
    return res.status(400).json({ error: 'passiveId required' });
  }

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0,
      totalDeaths: 0,
      totalKills: 0,
      totalGoldEarned: 0,
      totalXPEarned: 0,
      highestLevelReached: 1,
      totalCrits: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const upgradeResult = passiveMgr.upgradePassive(passiveId, permanentStats);

    if (!upgradeResult.success) {
      return res.status(400).json({
        success: false,
        error: upgradeResult.message
      });
    }

    // Save to database
    await db.savePermanentStats(user.id, permanentStats);

    const passive = passiveMgr.getPassive(passiveId, permanentStats.passiveLevels || {});

    res.json({
      success: true,
      message: upgradeResult.message,
      passive,
      cost: upgradeResult.cost,
      newLevel: upgradeResult.newLevel,
      currency: {
        souls: permanentStats.souls,
        legacy_points: permanentStats.legacyPoints
      }
    });
  } catch (error) {
    console.error('Error upgrading passive:', error);
    res.status(500).json({ error: 'Failed to upgrade passive' });
  }
});

/**
 * POST /api/passives/respec
 * Reset all passives and refund 50% of souls
 */
app.post('/api/passives/respec', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const respecResult = passiveMgr.respecPassives(permanentStats);

    if (!respecResult.success) {
      return res.status(400).json({
        success: false,
        error: respecResult.message
      });
    }

    // Save to database
    await db.savePermanentStats(user.id, permanentStats);

    res.json({
      success: true,
      message: 'All passives reset!',
      refund: respecResult.refund,
      currency: {
        souls: permanentStats.souls,
        legacy_points: permanentStats.legacyPoints
      }
    });
  } catch (error) {
    console.error('Error respecing passives:', error);
    res.status(500).json({ error: 'Failed to respec passives' });
  }
});

/**
 * GET /api/passives/currency
 * Get current souls and legacy points
 */
app.get('/api/passives/currency', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const soulsSpent = passiveMgr.calculateTotalSoulsSpent(permanentStats.passiveLevels || {});
    const lpSpent = passiveMgr.calculateTotalLegacyPointsSpent(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      currency: {
        souls: permanentStats.souls || 0,
        legacy_points: permanentStats.legacyPoints || 0,
        souls_spent: soulsSpent,
        legacy_points_spent: lpSpent
      }
    });
  } catch (error) {
    console.error('Error fetching currency:', error);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

/**
 * GET /api/passives/bonuses
 * Get current passive bonuses applied
 */
app.get('/api/passives/bonuses', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const bonuses = passiveMgr.calculatePassiveBonuses(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      bonuses
    });
  } catch (error) {
    console.error('Error calculating bonuses:', error);
    res.status(500).json({ error: 'Failed to calculate bonuses' });
  }
});

/**
 * GET /api/progression/passives (LEGACY - redirects to new endpoint)
 * Get all passives with unlock status
 */
app.get('/api/progression/passives', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const { PassiveManager } = require('./game');
    const passiveMgr = new PassiveManager();

    const allPassives = passiveMgr.getAllPassives(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      passives: allPassives,
      currency: {
        souls: permanentStats.souls || 0,
        legacy_points: permanentStats.legacyPoints || 0
      },
      message: 'This endpoint is deprecated. Use /api/passives/tree instead.'
    });
  } catch (error) {
    console.error('Error fetching passives:', error);
    res.status(500).json({ error: 'Failed to fetch passives' });
  }
});

/**
 * POST /api/progression/unlock-passive (LEGACY - redirects to new endpoint)
 * Unlock a permanent passive
 */
app.post('/api/progression/unlock-passive', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  res.status(400).json({
    error: 'This endpoint is deprecated',
    message: 'Use /api/passives/upgrade instead. The passive system now uses incremental upgrades instead of one-time unlocks.'
  });
});

/**
 * GET /api/progression/skills
 * Get character skills and cooldown status
 */
app.get('/api/progression/skills', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const progressionMgr = new ProgressionManager();
    const abilities = progressionMgr.getUnlockedAbilities(character.classType, character.level);

    res.json({
      success: true,
      skillPoints: character.skillPoints || 0,
      skills: character.skills.getAllSkills(),
      abilities
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// ==================== END PROGRESSION ENDPOINTS ====================

// ==================== STATUS EFFECTS ENDPOINTS ====================

/**
 * GET /api/status-effects/all
 * Get all available status effects from data
 */
app.get('/api/status-effects/all', async (req, res) => {
  try {
    const StatusEffectManager = require('./game/StatusEffectManager');
    const effectMgr = new StatusEffectManager();
    
    res.json({
      success: true,
      statusEffects: effectMgr.getAllStatusEffects(),
      combos: effectMgr.getEffectCombos()
    });
  } catch (error) {
    console.error('Error fetching status effects:', error);
    res.status(500).json({ error: 'Failed to fetch status effects' });
  }
});

/**
 * GET /api/status-effects/active
 * Get currently active status effects on character
 */
app.get('/api/status-effects/active', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({
      success: true,
      effects: character.statusEffects.getActiveEffects(),
      auras: character.statusEffects.getActiveAuras(),
      modifiers: character.statusEffects.getModifiers()
    });
  } catch (error) {
    console.error('Error fetching active effects:', error);
    res.status(500).json({ error: 'Failed to fetch active effects' });
  }
});

/**
 * POST /api/status-effects/apply
 * Apply a status effect to character (for testing/admin)
 */
app.post('/api/status-effects/apply', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, effectId, duration, stacks } = req.body;
  if (!channel || !effectId) {
    return res.status(400).json({ error: 'Channel and effectId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.addEffect(effectId, {
      duration: duration,
      initialStacks: stacks
    });

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        reason: result.reason 
      });
    }

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for status effect change
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitStatusEffect(character.name, channel.toLowerCase(), result.effect);

    res.json({
      success: true,
      result,
      activeEffects: character.statusEffects.getActiveEffects()
    });
  } catch (error) {
    console.error('Error applying status effect:', error);
    res.status(500).json({ error: 'Failed to apply status effect' });
  }
});

/**
 * POST /api/status-effects/cleanse
 * Cleanse debuffs from character
 */
app.post('/api/status-effects/cleanse', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, count, specific } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.cleanse({
      count: count || 1,
      specific: specific
    });

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for status effect cleansing
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      removed: result.removed,
      count: result.count,
      remainingEffects: character.statusEffects.getActiveEffects()
    });
  } catch (error) {
    console.error('Error cleansing effects:', error);
    res.status(500).json({ error: 'Failed to cleanse effects' });
  }
});

/**
 * POST /api/status-effects/dispel
 * Dispel buffs from enemy (use in combat)
 */
app.post('/api/status-effects/dispel', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, count } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check if in combat
    if (!character.inCombat || !character.combat) {
      return res.status(400).json({ error: 'Not in combat' });
    }

    // Dispel enemy buffs
    const result = character.combat.monster.statusEffects.dispel({
      count: count || 1
    });

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for combat state change
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitCombatUpdate(character.name, channel.toLowerCase(), {
      enemyEffects: character.combat.monster.statusEffects.getActiveEffects()
    });

    res.json({
      success: true,
      removed: result.removed,
      count: result.count,
      enemyEffects: character.combat.monster.statusEffects.getActiveEffects()
    });
  } catch (error) {
    console.error('Error dispelling effects:', error);
    res.status(500).json({ error: 'Failed to dispel effects' });
  }
});

/**
 * POST /api/status-effects/aura/add
 * Add permanent aura effect
 */
app.post('/api/status-effects/aura/add', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, auraId, auraData } = req.body;
  if (!channel || !auraId || !auraData) {
    return res.status(400).json({ error: 'Channel, auraId, and auraData required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.addAura(auraId, auraData);

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for aura addition
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      auraId: result.auraId,
      activeAuras: character.statusEffects.getActiveAuras()
    });
  } catch (error) {
    console.error('Error adding aura:', error);
    res.status(500).json({ error: 'Failed to add aura' });
  }
});

/**
 * POST /api/status-effects/aura/remove
 * Remove permanent aura effect
 */
app.post('/api/status-effects/aura/remove', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, auraId } = req.body;
  if (!channel || !auraId) {
    return res.status(400).json({ error: 'Channel and auraId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.removeAura(auraId);

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for aura removal
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: result.success,
      auraId: result.auraId,
      activeAuras: character.statusEffects.getActiveAuras()
    });
  } catch (error) {
    console.error('Error removing aura:', error);
    res.status(500).json({ error: 'Failed to remove aura' });
  }
});

// ==================== END STATUS EFFECTS ENDPOINTS ====================

// ==================== EXPLORATION ENDPOINTS ====================

/**
 * GET /api/exploration/biomes
 * Get all available biomes
 */
app.get('/api/exploration/biomes', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const biomes = explorationMgr.getAvailableBiomes(character.level);

    res.json({
      success: true,
      currentLocation: character.location,
      biomes
    });
  } catch (error) {
    console.error('Error fetching biomes:', error);
    res.status(500).json({ error: 'Failed to fetch biomes' });
  }
});

/**
 * GET /api/exploration/current
 * Get current location information
 */
app.get('/api/exploration/current', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const explorationMgr = new ExplorationManager();
    const currentBiome = explorationMgr.getBiome(character.location);

    if (!currentBiome) {
      return res.status(404).json({ error: 'Current location not found' });
    }

    // Get travel summary if traveling
    const travelSummary = character.travelState ? 
      explorationMgr.getTravelSummary(character.travelState) : null;

    res.json({
      success: true,
      location: {
        id: currentBiome.id,
        name: currentBiome.name,
        description: currentBiome.description,
        dangerLevel: currentBiome.danger_level,
        recommendedLevel: currentBiome.recommended_level,
        environmentalEffects: currentBiome.environmental_effects
      },
      travelState: travelSummary,
      canExplore: !character.inCombat && !character.travelState
    });
  } catch (error) {
    console.error('Error fetching current location:', error);
    res.status(500).json({ error: 'Failed to fetch current location' });
  }
});

/**
 * POST /api/exploration/travel/start
 * Start travel to a new biome
 */
app.post('/api/exploration/travel/start', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, destination } = req.body;
  if (!channel || !destination) {
    return res.status(400).json({ error: 'Channel and destination required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Can't travel while in combat
    if (character.inCombat) {
      return res.status(400).json({ error: 'Cannot travel while in combat' });
    }

    // Can't travel if already traveling
    if (character.travelState && character.travelState.inTravel) {
      return res.status(400).json({ error: 'Already traveling' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.startTravel(character, destination);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Save travel state
    character.travelState = result.travelState;
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for real-time travel state change
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      message: result.message,
      warnings: result.warnings,
      travelState: explorationMgr.getTravelSummary(result.travelState)
    });
  } catch (error) {
    console.error('Error starting travel:', error);
    res.status(500).json({ error: 'Failed to start travel' });
  }
});

/**
 * POST /api/exploration/travel/advance
 * Advance one move during travel
 */
app.post('/api/exploration/travel/advance', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (!character.travelState || !character.travelState.inTravel) {
      return res.status(400).json({ error: 'Not currently traveling' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.advanceTravel(character.travelState);

    // Check if arrived
    if (result.arrived) {
      character.location = character.travelState.to;
      character.travelState = null;
      await db.saveCharacter(user.id, channel.toLowerCase(), character);

      // Emit WebSocket update for location change
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
      socketHandler.emitLocationChange(character.name, channel.toLowerCase(), character.location);

      return res.json({
        success: true,
        arrived: true,
        message: result.message,
        newLocation: result.destination
      });
    }

    // Check for encounter
    if (result.encounter) {
      // Save state before encounter
      await db.saveCharacter(user.id, channel.toLowerCase(), character);

      // Emit WebSocket update for travel state change
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

      return res.json({
        success: true,
        arrived: false,
        encounter: result.encounter,
        message: result.message,
        travelState: explorationMgr.getTravelSummary(character.travelState)
      });
    }

    // Continue travel
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for travel progress
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      arrived: false,
      message: result.message,
      travelState: explorationMgr.getTravelSummary(character.travelState)
    });
  } catch (error) {
    console.error('Error advancing travel:', error);
    res.status(500).json({ error: 'Failed to advance travel' });
  }
});

/**
 * POST /api/exploration/travel/cancel
 * Cancel current travel
 */
app.post('/api/exploration/travel/cancel', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (!character.travelState || !character.travelState.inTravel) {
      return res.status(400).json({ error: 'Not currently traveling' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.cancelTravel(character.travelState);

    character.travelState = null;
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for travel cancellation
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      message: result.message,
      progressLost: result.progressLost
    });
  } catch (error) {
    console.error('Error canceling travel:', error);
    res.status(500).json({ error: 'Failed to cancel travel' });
  }
});

/**
 * POST /api/exploration/explore
 * Explore current biome (find sub-locations and encounters)
 */
app.post('/api/exploration/explore', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Can't explore while in combat or traveling
    if (character.inCombat) {
      return res.status(400).json({ error: 'Cannot explore while in combat' });
    }

    if (character.travelState && character.travelState.inTravel) {
      return res.status(400).json({ error: 'Cannot explore while traveling' });
    }

    const explorationMgr = new ExplorationManager();
    const result = explorationMgr.exploreLocation(character.location);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for exploration results
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      message: result.message,
      subLocation: result.subLocation,
      encounter: result.encounter
    });
  } catch (error) {
    console.error('Error exploring:', error);
    res.status(500).json({ error: 'Failed to explore' });
  }
});

/**
 * GET /api/exploration/travel-info
 * Get travel information between two biomes
 */
app.get('/api/exploration/travel-info', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, from, to } = req.query;
  if (!channel || !to) {
    return res.status(400).json({ error: 'Channel and destination required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const fromBiome = from || character.location;
    const explorationMgr = new ExplorationManager();
    const travelInfo = explorationMgr.calculateTravelDistance(fromBiome, to);

    res.json({
      success: true,
      from: fromBiome,
      to: to,
      ...travelInfo
    });
  } catch (error) {
    console.error('Error getting travel info:', error);
    res.status(500).json({ error: 'Failed to get travel info' });
  }
});

// ==================== END EXPLORATION ENDPOINTS ====================

// ==================== QUEST ENDPOINTS ====================

/**
 * GET /api/quests/available
 * Get all available quests for the character
 */
app.get('/api/quests/available', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.json({ success: true, quests: [] });
    }

    const activeQuests = character.activeQuests || [];
    const completedQuests = character.completedQuests || [];

    // Extract quest IDs from quest state objects
    const activeQuestIds = activeQuests.map(q => q.questId);
    const completedQuestIds = completedQuests.map(q => q.questId || q.id);

    const questMgr = new QuestManager();
    const available = questMgr.getAvailableQuests(character, activeQuestIds, completedQuestIds);

    res.json({
      success: true,
      quests: available || []
    });
  } catch (error) {
    console.error('Error getting available quests:', error);
    res.status(500).json({ error: 'Failed to get available quests' });
  }
});

/**
 * POST /api/quests/accept
 * Accept a quest
 */
app.post('/api/quests/accept', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel, questId } = req.body;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  if (!questId) {
    return res.status(400).json({ error: 'Quest ID required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const completedQuests = character.completedQuests || [];

    // Check if already active
    if (activeQuests.some(q => q.questId === questId)) {
      return res.status(400).json({ error: 'Quest already active' });
    }

    const questMgr = new QuestManager();
    const result = questMgr.acceptQuest(questId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Add to active quests
    activeQuests.push(result.questState);
    character.activeQuests = activeQuests;

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit real-time quest update
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitQuestUpdate(user.login || user.displayName, channel.toLowerCase());
    socketHandler.emitNotification(user.login || user.displayName, channel.toLowerCase(), {
      type: 'quest_accepted',
      title: 'Quest Accepted',
      message: `You have accepted: ${result.quest.name}`,
      quest: result.quest
    });

    res.json({
      success: true,
      quest: result.quest,
      dialogue: result.dialogue,
      questState: result.questState
    });
  } catch (error) {
    console.error('Error accepting quest:', error);
    res.status(500).json({ error: 'Failed to accept quest' });
  }
});

/**
 * POST /api/quests/abandon
 * Abandon an active quest
 */
app.post('/api/quests/abandon', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel, questId } = req.body;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  if (!questId) {
    return res.status(400).json({ error: 'Quest ID required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    
    // Find and remove the quest
    const questIndex = activeQuests.findIndex(q => q.questId === questId);
    if (questIndex === -1) {
      return res.status(400).json({ error: 'Quest not active' });
    }
    
    activeQuests.splice(questIndex, 1);
    character.activeQuests = activeQuests;

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit real-time quest update
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitQuestUpdate(user.login || user.displayName, channel.toLowerCase());

    res.json({
      success: true,
      message: 'Quest abandoned'
    });
  } catch (error) {
    console.error('Error abandoning quest:', error);
    res.status(500).json({ error: 'Failed to abandon quest' });
  }
});

/**
 * GET /api/quests/active
 * Get all active quests
 */
app.get('/api/quests/active', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.json({ success: true, quests: [] });
    }

    const activeQuests = character.activeQuests || [];
    const questMgr = new QuestManager();

    const questProgress = activeQuests.map(questState => 
      questMgr.getQuestProgress(questState)
    ).filter(q => q !== null);

    res.json({
      success: true,
      quests: questProgress
    });
  } catch (error) {
    console.error('Error getting active quests:', error);
    res.status(500).json({ error: 'Failed to get active quests' });
  }
});

/**
 * POST /api/quests/complete
 * Complete a quest and receive rewards
 */
app.post('/api/quests/complete', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, questId } = req.body;
  if (!channel || !questId) {
    return res.status(400).json({ error: 'Channel and questId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const questState = activeQuests.find(q => q.questId === questId);

    if (!questState) {
      return res.status(404).json({ error: 'Quest not active' });
    }

    const questMgr = new QuestManager();
    const result = questMgr.completeQuest(character, questState);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Remove from active quests
    character.activeQuests = activeQuests.filter(q => q.questId !== questId);

    // Add to completed quests
    const completedQuests = character.completedQuests || [];
    completedQuests.push(questId);
    character.completedQuests = completedQuests;

    // Apply XP reward
    if (result.rewards.xp > 0) {
      const progressionMgr = new ProgressionManager();
      const xpResult = progressionMgr.addXP(character, result.rewards.xp);
      
      if (xpResult.leveledUp) {
        result.levelUp = {
          newLevel: character.level,
          statsGained: xpResult.statsGained
        };
      }
    }

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit websocket event for live update (quest rewards: gold, xp, etc.)
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      quest: result.quest,
      rewards: result.rewards,
      dialogue: result.dialogue,
      levelUp: result.levelUp || null
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

/**
 * POST /api/quests/abandon
 * Abandon an active quest
 */
app.post('/api/quests/abandon', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, questId } = req.body;
  if (!channel || !questId) {
    return res.status(400).json({ error: 'Channel and questId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const questState = activeQuests.find(q => q.questId === questId);

    if (!questState) {
      return res.status(404).json({ error: 'Quest not active' });
    }

    const questMgr = new QuestManager();
    const result = questMgr.abandonQuest(questState);

    // Remove from active quests
    character.activeQuests = activeQuests.filter(q => q.questId !== questId);

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for quest abandonment
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitQuestUpdate(character.name, channel.toLowerCase());

    res.json({
      success: true,
      quest: result.quest,
      message: result.message
    });
  } catch (error) {
    console.error('Error abandoning quest:', error);
    res.status(500).json({ error: 'Failed to abandon quest' });
  }
});

/**
 * GET /api/quests/progress/:questId
 * Get detailed progress for a specific quest
 */
app.get('/api/quests/progress/:questId', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { questId } = req.params;
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const questState = activeQuests.find(q => q.questId === questId);

    if (!questState) {
      return res.status(404).json({ error: 'Quest not active' });
    }

    const questMgr = new QuestManager();
    const progress = questMgr.getQuestProgress(questState);

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error getting quest progress:', error);
    res.status(500).json({ error: 'Failed to get quest progress' });
  }
});

/**
 * GET /api/quests/chain/:questId
 * Get quest chain information
 */
app.get('/api/quests/chain/:questId', (req, res) => {
  const { questId } = req.params;

  try {
    const questMgr = new QuestManager();
    const chain = questMgr.getQuestChain(questId);

    if (!chain) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    res.json({
      success: true,
      chain
    });
  } catch (error) {
    console.error('Error getting quest chain:', error);
    res.status(500).json({ error: 'Failed to get quest chain' });
  }
});

/**
 * GET /api/quests/story
 * Get main story quest progression
 */
app.get('/api/quests/story', (req, res) => {
  try {
    const questMgr = new QuestManager();
    const story = questMgr.getMainStoryQuests();

    res.json({
      success: true,
      quests: story
    });
  } catch (error) {
    console.error('Error getting story quests:', error);
    res.status(500).json({ error: 'Failed to get story quests' });
  }
});

// ==================== END QUEST ENDPOINTS ====================

// ==================== SHOP & LOOT ENDPOINTS ====================

// Get all merchants
app.get('/api/shop/merchants', (req, res) => {
  try {
    const shopMgr = new ShopManager();
    const merchants = shopMgr.getAllMerchants();

    res.json({
      success: true,
      merchants
    });
  } catch (error) {
    console.error('Error getting merchants:', error);
    res.status(500).json({ error: 'Failed to get merchants' });
  }
});

// Get merchants in a location
app.get('/api/shop/merchants/:location', (req, res) => {
  try {
    const { location } = req.params;
    const shopMgr = new ShopManager();
    const merchants = shopMgr.getMerchantsInLocation(location);

    res.json({
      success: true,
      location,
      merchants: merchants.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        merchant_type: m.merchant_type,
        greeting: m.greeting
      }))
    });
  } catch (error) {
    console.error('Error getting location merchants:', error);
    res.status(500).json({ error: 'Failed to get location merchants' });
  }
});

// Get merchant inventory
app.get('/api/shop/:merchantId', (req, res) => {
  try {
    const { merchantId } = req.params;
    const shopMgr = new ShopManager();
    const merchant = shopMgr.getMerchant(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const inventory = shopMgr.getMerchantInventory(merchantId);
    const greeting = shopMgr.getMerchantGreeting(merchantId);

    res.json({
      success: true,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        description: merchant.description,
        merchant_type: merchant.merchant_type
      },
      greeting,
      inventory
    });
  } catch (error) {
    console.error('Error getting merchant inventory:', error);
    res.status(500).json({ error: 'Failed to get merchant inventory' });
  }
});

// Buy item from merchant
app.post('/api/shop/buy', async (req, res) => {
  try {
    const { player, channel, merchantId, itemId, quantity = 1 } = req.body;

    if (!player || !channel || !merchantId || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const shopMgr = new ShopManager();

    const result = shopMgr.buyItem(character, merchantId, itemId, quantity);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit update with complete player data
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error buying item:', error);
    res.status(500).json({ error: 'Failed to buy item' });
  }
});

// Sell item to merchant
app.post('/api/shop/sell', async (req, res) => {
  try {
    const { player, channel, merchantId, itemId, quantity = 1 } = req.body;

    if (!player || !channel || !merchantId || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const shopMgr = new ShopManager();

    const result = shopMgr.sellItem(character, merchantId, itemId, quantity);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit update with complete player data
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error selling item:', error);
    res.status(500).json({ error: 'Failed to sell item' });
  }
});

// Use consumable item
app.post('/api/consumable/use', async (req, res) => {
  try {
    const { player, channel, itemId, context = {} } = req.body;

    if (!player || !channel || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const consumableMgr = new ConsumableManager();

    const result = consumableMgr.useConsumable(character, itemId, context);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit websocket event for live update (hp/inventory changes)
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error using consumable:', error);
    res.status(500).json({ error: 'Failed to use consumable' });
  }
});

// Compare two items
app.post('/api/items/compare', async (req, res) => {
  try {
    const { player, channel, itemId1, itemId2 } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const comparator = new ItemComparator();

    // If only itemId1 provided, compare with equipped
    if (itemId1 && !itemId2) {
      const result = comparator.compareWithEquipped(character, itemId1);
      return res.json(result);
    }

    // Both items provided - direct comparison
    const item1Data = comparator.getItemData(itemId1);
    const item2Data = comparator.getItemData(itemId2);

    const result = comparator.compareEquipment(item1Data, item2Data);
    res.json(result);
  } catch (error) {
    console.error('Error comparing items:', error);
    res.status(500).json({ error: 'Failed to compare items' });
  }
});

// Get upgrade suggestions
app.get('/api/items/upgrades', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const comparator = new ItemComparator();

    const suggestions = comparator.getUpgradeSuggestions(character);

    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Error getting upgrade suggestions:', error);
    res.status(500).json({ error: 'Failed to get upgrade suggestions' });
  }
});

// ==================== END SHOP & LOOT ENDPOINTS ====================

// ==================== NPC & DIALOGUE ENDPOINTS ====================

/**
 * GET /api/npcs
 * Get all NPCs with basic info
 */
app.get('/api/npcs', (req, res) => {
  try {
    const npcMgr = new NPCManager();
    const npcs = npcMgr.getAllNPCs();

    res.json({
      success: true,
      npcs
    });
  } catch (error) {
    console.error('Error getting NPCs:', error);
    res.status(500).json({ error: 'Failed to get NPCs' });
  }
});

/**
 * GET /api/npcs/location/:location
 * Get NPCs in a specific location
 */
app.get('/api/npcs/location/:location', (req, res) => {
  try {
    const { location } = req.params;
    const npcMgr = new NPCManager();
    const npcs = npcMgr.getNPCsInLocation(location);

    res.json({
      success: true,
      location,
      npcs
    });
  } catch (error) {
    console.error('Error getting location NPCs:', error);
    res.status(500).json({ error: 'Failed to get location NPCs' });
  }
});

/**
 * GET /api/npcs/type/:type
 * Get NPCs by type (merchant, quest_giver, companion, lore_keeper)
 */
app.get('/api/npcs/type/:type', (req, res) => {
  try {
    const { type } = req.params;
    const npcMgr = new NPCManager();
    const npcs = npcMgr.getNPCsByType(type);

    res.json({
      success: true,
      type,
      npcs
    });
  } catch (error) {
    console.error('Error getting NPCs by type:', error);
    res.status(500).json({ error: 'Failed to get NPCs by type' });
  }
});

/**
 * GET /api/npcs/:npcId
 * Get detailed info about a specific NPC
 */
app.get('/api/npcs/:npcId', (req, res) => {
  try {
    const { npcId } = req.params;
    const npcMgr = new NPCManager();
    const npc = npcMgr.getNPC(npcId);

    if (!npc) {
      return res.status(404).json({ error: 'NPC not found' });
    }

    res.json({
      success: true,
      npc
    });
  } catch (error) {
    console.error('Error getting NPC:', error);
    res.status(500).json({ error: 'Failed to get NPC' });
  }
});

/**
 * POST /api/npcs/:npcId/interact
 * Interact with an NPC (get greeting, dialogue, and available actions)
 * Body: { player, channel }
 */
app.post('/api/npcs/:npcId/interact', async (req, res) => {
  try {
    const { npcId } = req.params;
    const { player, channel } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const npcMgr = new NPCManager();

    const interaction = npcMgr.interactWithNPC(npcId, character);

    if (!interaction.success) {
      return res.status(400).json(interaction);
    }

    res.json(interaction);
  } catch (error) {
    console.error('Error interacting with NPC:', error);
    res.status(500).json({ error: 'Failed to interact with NPC' });
  }
});

/**
 * POST /api/npcs/:npcId/spawn-check
 * Check if NPC should spawn (for random encounters)
 * Body: { location }
 */
app.post('/api/npcs/:npcId/spawn-check', (req, res) => {
  try {
    const { npcId } = req.params;
    const { location } = req.body;
    const npcMgr = new NPCManager();

    const spawned = npcMgr.checkNPCSpawn(npcId);
    const npc = npcMgr.getNPC(npcId);

    if (!npc) {
      return res.status(404).json({ error: 'NPC not found' });
    }

    res.json({
      success: true,
      spawned,
      npc: spawned ? {
        id: npc.id,
        name: npc.name,
        description: npc.description,
        greeting: npc.greeting
      } : null
    });
  } catch (error) {
    console.error('Error checking NPC spawn:', error);
    res.status(500).json({ error: 'Failed to check NPC spawn' });
  }
});

/**
 * GET /api/dialogue/:npcId
 * Get available dialogue conversations for an NPC
 * Query params: player, channel
 */
app.get('/api/dialogue/:npcId', async (req, res) => {
  try {
    const { npcId } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const dialogueMgr = new DialogueManager();

    const conversations = dialogueMgr.getAvailableConversations(npcId, character);

    res.json({
      success: true,
      npcId,
      conversations
    });
  } catch (error) {
    console.error('Error getting dialogue:', error);
    res.status(500).json({ error: 'Failed to get dialogue' });
  }
});

/**
 * POST /api/dialogue/start
 * Start a dialogue conversation with an NPC
 * Body: { player, channel, npcId, conversationId }
 */
app.post('/api/dialogue/start', async (req, res) => {
  try {
    const { player, channel, npcId, conversationId } = req.body;

    if (!player || !channel || !npcId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const dialogueMgr = new DialogueManager();

    const result = dialogueMgr.startConversation(npcId, character, conversationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Save dialogue state
    await db.saveCharacter(userId, channel, character);

    // Emit WebSocket update for dialogue state change
    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());

    res.json(result);
  } catch (error) {
    console.error('Error starting dialogue:', error);
    res.status(500).json({ error: 'Failed to start dialogue' });
  }
});

/**
 * POST /api/dialogue/choice
 * Make a choice in a dialogue conversation
 * Body: { player, channel, npcId, conversationId, currentNodeId, choiceIndex }
 */
app.post('/api/dialogue/choice', async (req, res) => {
  try {
    const { player, channel, npcId, conversationId, currentNodeId, choiceIndex } = req.body;

    if (!player || !channel || !npcId || !conversationId || !currentNodeId || choiceIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const dialogueMgr = new DialogueManager();

    const result = dialogueMgr.makeChoice(npcId, conversationId, currentNodeId, choiceIndex, character);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Save dialogue state and any rewards/effects
    await db.saveCharacter(userId, channel, character);

    // Emit WebSocket update for dialogue choice and potential rewards
    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());

    res.json(result);
  } catch (error) {
    console.error('Error making dialogue choice:', error);
    res.status(500).json({ error: 'Failed to make dialogue choice' });
  }
});

// ==================== END NPC & DIALOGUE ENDPOINTS ====================

// ==================== ACHIEVEMENT SYSTEM ENDPOINTS ====================

const { AchievementManager } = require('./game');
const achievementMgr = new AchievementManager();

/**
 * GET /api/achievements
 * Get all achievements with progress for a character
 * Query: player, channel, includeHidden (optional)
 */
app.get('/api/achievements', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  try {
    let { channel, includeHidden } = req.query;
    
    // If no channel specified, use the first channel from CHANNELS environment variable
    if (!channel) {
      const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
      channel = CHANNELS[0] || 'default';
    }
    
    if (!channel) {
      return res.status(400).json({ error: 'No channel configured' });
    }

    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      // Return empty array for new players
      return res.json([]);
    }
    
    const achievements = achievementMgr.getAllAchievements(character, includeHidden === 'true');
    res.json(achievements || []);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/achievements/category/:category
 * Get achievements by category
 * Query: player, channel
 */
app.get('/api/achievements/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const achievements = achievementMgr.getAchievementsByCategory(category, character);

    res.json({ category, achievements });
  } catch (error) {
    console.error('Error fetching achievements by category:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/achievements/:achievementId
 * Get specific achievement details
 * Query: player, channel
 */
app.get('/api/achievements/:achievementId', async (req, res) => {
  try {
    const { achievementId } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const achievement = achievementMgr.getAchievement(achievementId, character);

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    res.json(achievement);
  } catch (error) {
    console.error('Error fetching achievement:', error);
    res.status(500).json({ error: 'Failed to fetch achievement' });
  }
});

/**
 * GET /api/achievements/stats
 * Get achievement statistics for a character
 * Query: player, channel
 */
app.get('/api/achievements/stats', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const stats = achievementMgr.getStatistics(character);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    res.status(500).json({ error: 'Failed to fetch achievement stats' });
  }
});

/**
 * POST /api/achievements/check
 * Check for newly unlocked achievements after an event
 * Body: { player, channel, eventType, eventData }
 */
app.post('/api/achievements/check', async (req, res) => {
  try {
    const { player, channel, eventType, eventData } = req.body;

    if (!player || !channel || !eventType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const newlyUnlocked = achievementMgr.checkAchievements(character, eventType, eventData);

    // Unlock each achievement and grant rewards
    const unlockResults = [];
    for (const achievement of newlyUnlocked) {
      const result = achievementMgr.unlockAchievement(character, achievement.id);
      if (result.success) {
        unlockResults.push(result);
      }
    }

    // Save character with new achievements
    if (unlockResults.length > 0) {
      await db.updateAchievementData(userId, channel, {
        unlockedAchievements: character.unlockedAchievements,
        achievementProgress: character.achievementProgress,
        achievementUnlockDates: character.achievementUnlockDates,
        achievementPoints: character.achievementPoints,
        unlockedTitles: character.unlockedTitles,
        activeTitle: character.activeTitle
      });
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for achievement unlocks
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      unlockResults.forEach(unlock => {
        socketHandler.emitAchievementUnlocked(character.name, channel, unlock);
      });
    }

    res.json({
      unlockedCount: unlockResults.length,
      unlocks: unlockResults
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

/**
 * POST /api/achievements/title/set
 * Set active title for character
 * Body: { player, channel, titleId }
 */
app.post('/api/achievements/title/set', async (req, res) => {
  try {
    const { player, channel, titleId } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);

    // Check if title is unlocked
    if (titleId && !character.unlockedTitles.includes(titleId)) {
      return res.status(403).json({ error: 'Title not unlocked' });
    }

    character.activeTitle = titleId;

    await db.updateAchievementData(userId, channel, {
      unlockedAchievements: character.unlockedAchievements,
      achievementProgress: character.achievementProgress,
      achievementUnlockDates: character.achievementUnlockDates,
      achievementPoints: character.achievementPoints,
      unlockedTitles: character.unlockedTitles,
      activeTitle: character.activeTitle
    });

    res.json({
      success: true,
      activeTitle: titleId
    });
  } catch (error) {
    console.error('Error setting title:', error);
    res.status(500).json({ error: 'Failed to set title' });
  }
});

/**
 * GET /api/achievements/recent
 * Get recently unlocked achievements
 * Query: player, channel, limit (optional, default 5)
 */
app.get('/api/achievements/recent', async (req, res) => {
  try {
    const { player, channel, limit } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const recentLimit = limit ? parseInt(limit) : 5;
    const recent = achievementMgr.getRecentUnlocks(character, recentLimit);

    res.json({ recent });
  } catch (error) {
    console.error('Error fetching recent achievements:', error);
    res.status(500).json({ error: 'Failed to fetch recent achievements' });
  }
});

// ==================== END ACHIEVEMENT ENDPOINTS ====================

// ==================== DUNGEON ENDPOINTS ====================

/**
 * GET /api/dungeons
 * Get all available dungeons with access info
 */
app.get('/api/dungeons', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const dungeons = await dungeonMgr.getAvailableDungeons(character);

    res.json({ dungeons });
  } catch (error) {
    console.error('Error fetching dungeons:', error);
    res.status(500).json({ error: 'Failed to fetch dungeons' });
  }
});

/**
 * GET /api/dungeons/:dungeonId
 * Get detailed information about a specific dungeon
 */
app.get('/api/dungeons/:dungeonId', async (req, res) => {
  try {
    const { dungeonId } = req.params;
    const dungeonMgr = new DungeonManager();
    const dungeon = await dungeonMgr.getDungeon(dungeonId);

    if (!dungeon) {
      return res.status(404).json({ error: 'Dungeon not found' });
    }

    res.json({ dungeon });
  } catch (error) {
    console.error('Error fetching dungeon details:', error);
    res.status(500).json({ error: 'Failed to fetch dungeon details' });
  }
});

/**
 * POST /api/dungeons/start
 * Start a dungeon run
 * Body: { dungeonId: string, modifiers?: string[] }
 */
app.post('/api/dungeons/start', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { dungeonId, modifiers = [] } = req.body;
    if (!dungeonId) {
      return res.status(400).json({ error: 'Dungeon ID required' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = await dungeonMgr.startDungeon(character, dungeonId, modifiers);

    // Save dungeon state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon start
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());
    socketHandler.emitDungeonProgress(character.name, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error starting dungeon:', error);
    res.status(500).json({ error: error.message || 'Failed to start dungeon' });
  }
});

/**
 * POST /api/dungeons/advance
 * Advance to the next room in the dungeon
 */
app.post('/api/dungeons/advance', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (!character.dungeonState) {
      return res.status(400).json({ error: 'Not in a dungeon' });
    }

    const dungeonMgr = new DungeonManager();
    const result = await dungeonMgr.advanceRoom(character);

    // Save updated state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon room advance
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());
    socketHandler.emitDungeonProgress(character.name, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error advancing dungeon room:', error);
    res.status(500).json({ error: error.message || 'Failed to advance room' });
  }
});

/**
 * POST /api/dungeons/complete-room
 * Mark current room as complete (after combat, puzzle, etc.)
 */
app.post('/api/dungeons/complete-room', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = dungeonMgr.completeRoom(character);

    // Save updated state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error completing room:', error);
    res.status(500).json({ error: error.message || 'Failed to complete room' });
  }
});

/**
 * POST /api/dungeons/complete
 * Complete the dungeon (after boss defeated)
 */
app.post('/api/dungeons/complete', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = await dungeonMgr.completeDungeon(character);

    // Save completion and clear state
    if (result.success) {
      await db.addCompletedDungeon(user.id, user.channel, result.leaderboard_entry.dungeon_id);
      await db.updateDungeonState(user.id, user.channel, null);
    }
    
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon completion (rewards, XP, gold)
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());
    if (result.success) {
      socketHandler.emitInventoryUpdate(character.name, user.channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error completing dungeon:', error);
    res.status(500).json({ error: error.message || 'Failed to complete dungeon' });
  }
});

/**
 * POST /api/dungeons/exit
 * Exit/abandon current dungeon
 */
app.post('/api/dungeons/exit', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = dungeonMgr.exitDungeon(character);

    // Clear dungeon state
    await db.updateDungeonState(user.id, user.channel, null);
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon exit
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());

    res.json(result);
  } catch (error) {
    console.error('Error exiting dungeon:', error);
    res.status(500).json({ error: error.message || 'Failed to exit dungeon' });
  }
});

/**
 * GET /api/dungeons/state
 * Get current dungeon state
 */
app.get('/api/dungeons/state', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ 
      in_dungeon: !!character.dungeonState,
      dungeon_state: character.dungeonState || null
    });
  } catch (error) {
    console.error('Error fetching dungeon state:', error);
    res.status(500).json({ error: 'Failed to fetch dungeon state' });
  }
});

/**
 * GET /api/dungeons/leaderboard/:dungeonId
 * Get leaderboard for a dungeon
 */
app.get('/api/dungeons/leaderboard/:dungeonId', async (req, res) => {
  try {
    const { dungeonId } = req.params;
    const { limit = 10 } = req.query;

    const dungeonMgr = new DungeonManager();
    const leaderboard = await dungeonMgr.getLeaderboard(dungeonId, parseInt(limit));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/dungeons/solve-puzzle
 * Attempt to solve a puzzle
 * Body: { answer: string }
 */
app.post('/api/dungeons/solve-puzzle', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { answer } = req.body;
    if (!answer) {
      return res.status(400).json({ error: 'Answer required' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = dungeonMgr.solvePuzzle(character, answer);

    // Save updated state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error solving puzzle:', error);
    res.status(500).json({ error: error.message || 'Failed to solve puzzle' });
  }
});

// ==================== END DUNGEON ENDPOINTS ====================

// ==================== END COMBAT ENDPOINTS ====================

// ==================== FACTION ENDPOINTS ====================

const { FactionManager } = require('./game');
const factionMgr = new FactionManager();

/**
 * GET /api/factions
 * Get all factions with basic info
 */
app.get('/api/factions', async (req, res) => {
  try {
    await factionMgr.loadFactions();
    const factions = Object.values(factionMgr.factions).map(faction => ({
      id: faction.id,
      name: faction.name,
      description: faction.description,
      alignment: faction.alignment,
      leader: faction.leader
    }));

    res.json({ factions });
  } catch (error) {
    console.error('Error fetching factions:', error);
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

/**
 * GET /api/factions/:factionId
 * Get detailed faction information
 */
app.get('/api/factions/:factionId', async (req, res) => {
  try {
    const { factionId } = req.params;
    const faction = await factionMgr.getFaction(factionId);

    if (!faction) {
      return res.status(404).json({ error: 'Faction not found' });
    }

    res.json({ faction });
  } catch (error) {
    console.error('Error fetching faction:', error);
    res.status(500).json({ error: 'Failed to fetch faction' });
  }
});

/**
 * GET /api/factions/standings
 * Get all faction standings for a character
 * Query: player, channel
 */
app.get('/api/factions/standings', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const standings = await factionMgr.getAllStandings(character);

    res.json({ standings });
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

/**
 * GET /api/factions/:factionId/standing
 * Get character's standing with specific faction
 * Query: player, channel
 */
app.get('/api/factions/:factionId/standing', async (req, res) => {
  try {
    const { factionId } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const standing = await factionMgr.getFactionStanding(character, factionId);

    res.json({ standing });
  } catch (error) {
    console.error('Error fetching faction standing:', error);
    res.status(500).json({ error: 'Failed to fetch standing' });
  }
});

/**
 * POST /api/factions/:factionId/reputation
 * Add reputation to a faction (admin/quest rewards)
 * Body: { player, channel, amount, reason }
 */
app.post('/api/factions/:factionId/reputation', async (req, res) => {
  try {
    const { factionId } = req.params;
    const { player, channel, amount, reason } = req.body;

    if (!player || !channel || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await factionMgr.addReputation(character, factionId, amount, reason || 'manual');

    // Save updated reputation
    await db.updateReputation(userId, channel, character.reputation);

    res.json({ result });
  } catch (error) {
    console.error('Error adding reputation:', error);
    res.status(500).json({ error: 'Failed to add reputation' });
  }
});

/**
 * GET /api/factions/abilities
 * Get all unlocked faction abilities for a character
 * Query: player, channel
 */
app.get('/api/factions/abilities', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const abilities = await factionMgr.getFactionAbilities(character);

    res.json({ abilities });
  } catch (error) {
    console.error('Error fetching faction abilities:', error);
    res.status(500).json({ error: 'Failed to fetch abilities' });
  }
});

/**
 * GET /api/factions/mounts
 * Get all unlocked faction mounts for a character
 * Query: player, channel
 */
app.get('/api/factions/mounts', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const mounts = await factionMgr.getFactionMounts(character);

    res.json({ mounts });
  } catch (error) {
    console.error('Error fetching faction mounts:', error);
    res.status(500).json({ error: 'Failed to fetch mounts' });
  }
});

/**
 * GET /api/factions/summary
 * Get faction summary/statistics for a character
 * Query: player, channel
 */
app.get('/api/factions/summary', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const summary = await factionMgr.getFactionSummary(character);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching faction summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ==================== END FACTION ENDPOINTS ====================

// ==================== ENCHANTING & CRAFTING ENDPOINTS ====================

const { EnchantingManager, CraftingManager } = require('./game');
const enchantingMgr = new EnchantingManager();
const craftingMgr = new CraftingManager();

/**
 * GET /api/enchanting/enchantments
 * Get all enchantments available for a slot
 * Query: slot (optional)
 */
app.get('/api/enchanting/enchantments', async (req, res) => {
  try {
    const { slot } = req.query;

    let enchantments;
    if (slot) {
      enchantments = await enchantingMgr.getEnchantmentsForSlot(slot);
    } else {
      await enchantingMgr.loadEnchantments();
      enchantments = [];
      for (const category in enchantingMgr.enchantments) {
        for (const rarity in enchantingMgr.enchantments[category]) {
          enchantments.push(...enchantingMgr.enchantments[category][rarity]);
        }
      }
    }

    res.json({ enchantments });
  } catch (error) {
    console.error('Error fetching enchantments:', error);
    res.status(500).json({ error: 'Failed to fetch enchantments' });
  }
});

/**
 * GET /api/enchanting/enchantment/:enchantmentId
 * Get specific enchantment details
 */
app.get('/api/enchanting/enchantment/:enchantmentId', async (req, res) => {
  try {
    const { enchantmentId } = req.params;
    const enchantment = await enchantingMgr.getEnchantment(enchantmentId);

    if (!enchantment) {
      return res.status(404).json({ error: 'Enchantment not found' });
    }

    res.json({ enchantment });
  } catch (error) {
    console.error('Error fetching enchantment:', error);
    res.status(500).json({ error: 'Failed to fetch enchantment' });
  }
});

/**
 * POST /api/enchanting/enchant
 * Enchant an item
 * Body: { player, channel, itemId, enchantmentId }
 */
app.post('/api/enchanting/enchant', async (req, res) => {
  try {
    const { player, channel, itemId, enchantmentId } = req.body;

    if (!player || !channel || !itemId || !enchantmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await enchantingMgr.enchantItem(character, itemId, enchantmentId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory/gold changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error enchanting item:', error);
    res.status(500).json({ error: 'Failed to enchant item' });
  }
});

/**
 * POST /api/enchanting/remove
 * Remove an enchantment from an item
 * Body: { player, channel, itemId, enchantmentIndex }
 */
app.post('/api/enchanting/remove', async (req, res) => {
  try {
    const { player, channel, itemId, enchantmentIndex } = req.body;

    if (!player || !channel || !itemId || enchantmentIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await enchantingMgr.removeEnchantment(character, itemId, enchantmentIndex);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error removing enchantment:', error);
    res.status(500).json({ error: 'Failed to remove enchantment' });
  }
});

/**
 * POST /api/enchanting/disenchant
 * Disenchant an item to recover materials
 * Body: { player, channel, itemId }
 */
app.post('/api/enchanting/disenchant', async (req, res) => {
  try {
    const { player, channel, itemId } = req.body;

    if (!player || !channel || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await enchantingMgr.disenchantItem(character, itemId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error disenchanting item:', error);
    res.status(500).json({ error: 'Failed to disenchant item' });
  }
});

/**
 * GET /api/crafting/recipes
 * Get all crafting recipes
 * Query: category (optional), player, channel (for filtering craftable)
 */
app.get('/api/crafting/recipes', async (req, res) => {
  try {
    const { category, player, channel } = req.query;

    let recipes;
    if (category) {
      recipes = await craftingMgr.getRecipesByCategory(category);
    } else {
      recipes = await craftingMgr.getAllRecipes();
    }

    // If player provided, filter by craftable
    if (player && channel) {
      const userId = await db.getUserId(player, channel);
      if (userId) {
        const character = await db.getCharacter(userId, channel);
        recipes = await craftingMgr.getCraftableRecipes(character);
      }
    }

    res.json({ recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

/**
 * GET /api/crafting/recipe/:recipeId
 * Get specific recipe details
 */
app.get('/api/crafting/recipe/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const recipe = await craftingMgr.getRecipe(recipeId);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ recipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

/**
 * POST /api/crafting/craft
 * Craft an item
 * Body: { player, channel, recipeId }
 */
app.post('/api/crafting/craft', async (req, res) => {
  try {
    const { player, channel, recipeId } = req.body;

    if (!player || !channel || !recipeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await craftingMgr.craftItem(character, recipeId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory/gold changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error crafting item:', error);
    res.status(500).json({ error: 'Failed to craft item' });
  }
});

/**
 * POST /api/crafting/salvage
 * Salvage an item for materials
 * Body: { player, channel, itemId }
 */
app.post('/api/crafting/salvage', async (req, res) => {
  try {
    const { player, channel, itemId } = req.body;

    if (!player || !channel || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await craftingMgr.salvageItem(character, itemId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error salvaging item:', error);
    res.status(500).json({ error: 'Failed to salvage item' });
  }
});

/**
 * GET /api/crafting/summary
 * Get crafting summary for character
 * Query: player, channel
 */
app.get('/api/crafting/summary', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const summary = await craftingMgr.getCraftingSummary(character);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching crafting summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * POST /api/crafting/discover
 * Discover a new recipe
 * Body: { player, channel, recipeId }
 */
app.post('/api/crafting/discover', async (req, res) => {
  try {
    const { player, channel, recipeId } = req.body;

    if (!player || !channel || !recipeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await craftingMgr.discoverRecipe(character, recipeId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time recipe discovery
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error discovering recipe:', error);
    res.status(500).json({ error: 'Failed to discover recipe' });
  }
});

// ==================== END ENCHANTING & CRAFTING ENDPOINTS ====================

// ==================== RAID SYSTEM ENDPOINTS ====================

const { RaidManager } = require('./game');
const raidMgr = new RaidManager();

/**
 * GET /api/raids
 * Get all available raids with filters
 * Query params: ?difficulty=normal&minPlayers=5
 */
app.get('/api/raids', async (req, res) => {
  try {
    const filters = {
      difficulty: req.query.difficulty,
      minPlayers: req.query.minPlayers ? parseInt(req.query.minPlayers) : undefined,
      maxPlayers: req.query.maxPlayers ? parseInt(req.query.maxPlayers) : undefined
    };

    const raids = raidMgr.getAvailableRaids(filters);
    res.json({ raids, count: raids.length });
  } catch (error) {
    console.error('Error fetching raids:', error);
    res.status(500).json({ error: 'Failed to fetch raids' });
  }
});

/**
 * GET /api/raids/:raidId
 * Get specific raid details
 */
app.get('/api/raids/:raidId', async (req, res) => {
  try {
    const { raidId } = req.params;
    const raid = raidMgr.getRaidDetails(raidId);
    res.json(raid);
  } catch (error) {
    console.error('Error fetching raid details:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/raids/location/:location
 * Get raids available at a specific location
 */
app.get('/api/raids/location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const raids = raidMgr.getRaidsAtLocation(location);
    res.json({ location, raids, count: raids.length });
  } catch (error) {
    console.error('Error fetching raids at location:', error);
    res.status(500).json({ error: 'Failed to fetch raids at location' });
  }
});

/**
 * GET /api/raids/available-here
 * Get raids available at player's current location
 * Query: { player, channel }
 */
app.get('/api/raids/available-here', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel parameter' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const playerLocation = character.location || 'town_square';
    
    const raids = raidMgr.getRaidsAtLocation(playerLocation);
    res.json({ 
      player: character.name,
      location: playerLocation, 
      raids, 
      count: raids.length,
      message: raids.length > 0 ? `${raids.length} raid(s) available here` : 'No raids available at this location'
    });
  } catch (error) {
    console.error('Error fetching available raids:', error);
    res.status(500).json({ error: 'Failed to fetch available raids' });
  }
});

/**
 * GET /api/raids/lobbies/active
 * Get all active lobbies
 */
app.get('/api/raids/lobbies/active', async (req, res) => {
  try {
    const lobbies = raidMgr.getActiveLobbies();
    res.json({ lobbies, count: lobbies.length });
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

/**
 * POST /api/raids/lobby/create
 * Create a new raid lobby (requires player to be at raid entrance)
 * Body: { player, channel, raidId, difficulty, requireRoles, allowViewerVoting }
 */
app.post('/api/raids/lobby/create', async (req, res) => {
  try {
    const { player, channel, raidId, difficulty, requireRoles, allowViewerVoting } = req.body;

    if (!player || !channel || !raidId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    
    // Get player's current location
    const playerLocation = character.location || 'town_square';
    
    const leader = {
      id: userId,
      name: character.name,
      level: character.level,
      classType: character.classType,
      maxHp: character.stats.hp,
      maxMana: character.stats.mana || 100
    };

    const lobby = raidMgr.createLobby(raidId, leader, playerLocation, {
      difficulty,
      requireRoles,
      allowViewerVoting
    });

    res.json(lobby);
  } catch (error) {
    console.error('Error creating lobby:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/raids/lobby/join
 * Join an existing raid lobby
 * Body: { player, channel, lobbyId, role }
 */
app.post('/api/raids/lobby/join', async (req, res) => {
  try {
    const { player, channel, lobbyId, role } = req.body;

    if (!player || !channel || !lobbyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const playerData = {
      id: userId,
      name: character.name,
      level: character.level,
      classType: character.classType,
      maxHp: character.stats.hp,
      maxMana: character.stats.mana || 100
    };

    const result = raidMgr.joinLobby(lobbyId, playerData, role || 'dps');
    res.json(result);
  } catch (error) {
    console.error('Error joining lobby:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/raids/lobby/leave
 * Leave a raid lobby
 * Body: { player, channel, lobbyId }
 */
app.post('/api/raids/lobby/leave', async (req, res) => {
  try {
    const { player, channel, lobbyId } = req.body;

    if (!player || !channel || !lobbyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = raidMgr.leaveLobby(lobbyId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error leaving lobby:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/raids/lobby/change-role
 * Change player role in lobby
 * Body: { player, channel, lobbyId, newRole }
 */
app.post('/api/raids/lobby/change-role', async (req, res) => {
  try {
    const { player, channel, lobbyId, newRole } = req.body;

    if (!player || !channel || !lobbyId || !newRole) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = raidMgr.changeRole(lobbyId, userId, newRole);
    res.json(result);
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/raids/start
 * Start raid from lobby
 * Body: { player, channel, lobbyId }
 */
app.post('/api/raids/start', async (req, res) => {
  try {
    const { player, channel, lobbyId } = req.body;

    if (!player || !channel || !lobbyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const instance = raidMgr.startRaid(lobbyId);
    
    // Announce raid start
    if (canAnnounce(userId)) {
      rawAnnounce(channel, `🎯 Raid started: ${instance.raidName} with ${instance.players.length} players!`);
    }

    res.json(instance);
  } catch (error) {
    console.error('Error starting raid:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/raids/instance/:instanceId
 * Get raid instance state
 */
app.get('/api/raids/instance/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const state = raidMgr.getRaidState(instanceId);
    res.json(state);
  } catch (error) {
    console.error('Error fetching raid state:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/raids/action
 * Perform action in raid
 * Body: { player, channel, instanceId, action: { type, target, ability } }
 */
app.post('/api/raids/action', async (req, res) => {
  try {
    const { player, channel, instanceId, action } = req.body;

    if (!player || !channel || !instanceId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = await raidMgr.performAction(instanceId, userId, action);

    // Handle completion or wipe
    if (result.status === 'completed') {
      // Announce completion
      if (canAnnounce(userId)) {
        rawAnnounce(channel, `🏆 Raid completed! Time: ${Math.floor(result.stats.completionTime / 60000)}m`);
      }

      // Award rewards to all players
      // (In full implementation, would save to each player's database)
    } else if (result.status === 'wiped') {
      if (canAnnounce(userId)) {
        rawAnnounce(channel, `💀 Raid wiped! Better luck next time.`);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error performing raid action:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/raids/viewer/vote
 * Submit viewer vote for raid event (subscriber votes count 2x)
 * Body: { instanceId, vote: { option, viewer, weight } }
 */
app.post('/api/raids/viewer/vote', async (req, res) => {
  try {
    const { instanceId, vote } = req.body;

    if (!instanceId || !vote) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = raidMgr.submitViewerVote(instanceId, vote);
    res.json(result);
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/raids/buffs
 * Get available legacy points buffs
 */
app.get('/api/raids/buffs', async (req, res) => {
  try {
    const buffs = raidMgr.getLegacyPointsBuffs();
    res.json({ buffs });
  } catch (error) {
    console.error('Error fetching buffs:', error);
    res.status(500).json({ error: 'Failed to fetch buffs' });
  }
});

/**
 * POST /api/raids/buff/purchase
 * Purchase raid buff with legacy points
 * Body: { player, channel, instanceId, buffType }
 */
app.post('/api/raids/buff/purchase', async (req, res) => {
  try {
    const { player, channel, instanceId, buffType } = req.body;

    if (!player || !channel || !instanceId || !buffType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get player's character to check legacy points
    const character = await db.getCharacter(userId, channel);
    const legacyPoints = character.legacyPoints || 0;

    // Get buff cost
    const buffs = raidMgr.getLegacyPointsBuffs();
    const buff = buffs[buffType];
    
    if (!buff) {
      return res.status(400).json({ error: 'Invalid buff type' });
    }

    if (legacyPoints < buff.cost) {
      return res.status(400).json({ 
        error: 'Insufficient legacy points',
        required: buff.cost,
        available: legacyPoints
      });
    }

    // Deduct legacy points
    character.legacyPoints = legacyPoints - buff.cost;
    await db.saveCharacter(userId, channel, character);

    // Emit WebSocket update for legacy points change
    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());

    // Apply buff to raid
    const result = raidMgr.purchaseRaidBuff(instanceId, userId, {
      type: buffType,
      cost: buff.cost
    });

    res.json({
      ...result,
      legacyPointsRemaining: character.legacyPoints
    });
  } catch (error) {
    console.error('Error purchasing buff:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/raids/leaderboard/:raidId
 * Get raid leaderboard
 * Query params: ?category=fastest_clear&limit=10
 */
app.get('/api/raids/leaderboard/:raidId', async (req, res) => {
  try {
    const { raidId } = req.params;
    const category = req.query.category || 'fastest_clear';
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const leaderboard = raidMgr.getLeaderboard(raidId, category, limit);
    res.json({ raidId, category, leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ==================== END RAID SYSTEM ENDPOINTS ====================

// ==================== CHANNEL POINT REDEMPTIONS FOR SOLO GAMEPLAY ====================

/**
 * POST /api/redemptions/item
 * Give random item to player (Channel Points: Random Item)
 * Body: { player, channel, rarity }
 */
app.post('/api/redemptions/item', async (req, res) => {
  try {
    const { player, channel, rarity } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const LootGenerator = require('./game/LootGenerator');
    const lootGen = new LootGenerator();

    // Generate item with specified rarity or based on level
    const itemRarity = rarity || (character.level > 20 ? 'rare' : character.level > 10 ? 'uncommon' : 'common');
    const loot = lootGen.generateLoot({
      name: 'Channel Points Reward',
      level: character.level,
      rarity: 'common',
      loot_table: {
        equipment: { chance: 0.8, count: 1, rarity: itemRarity },
        consumables: { chance: 0.2, count: 1 }
      }
    });

    // Add to inventory
    if (loot.items && loot.items.length > 0) {
      const item = loot.items[0];
      character.inventory = character.inventory || [];
      character.inventory.push(item);
      await db.saveCharacter(userId, channel, character);

      // Emit WebSocket update for inventory change
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);

      // Announce in chat
      rawAnnounce(`🎁 ${player} redeemed Random Item and received ${item.name} (${item.rarity})!`, channel);

      res.json({
        player,
        item,
        message: `Received ${item.name} (${item.rarity})`
      });
    } else {
      res.status(500).json({ error: 'Failed to generate item' });
    }
  } catch (error) {
    console.error('Error processing item redemption:', error);
    res.status(500).json({ error: 'Failed to process item redemption' });
  }
});

/**
 * POST /api/redemptions/teleport
 * Teleport player to location (Channel Points: Instant Travel)
 * Body: { player, channel, destination }
 */
app.post('/api/redemptions/teleport', async (req, res) => {
  try {
    const { player, channel, destination } = req.body;

    if (!player || !channel || !destination) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    
    // Verify destination exists
    const explorationMgr = new ExplorationManager();
    const biomes = explorationMgr.getBiomes();
    const targetBiome = biomes.find(b => b.id === destination || b.name.toLowerCase() === destination.toLowerCase());
    
    if (!targetBiome) {
      return res.status(400).json({ error: 'Invalid destination' });
    }

    // Cancel any active travel
    if (character.travelState) {
      character.travelState = null;
    }

    // Set new location
    character.location = targetBiome.name;
    await db.saveCharacter(userId, channel, character);

    // Emit WebSocket update for location change
    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    socketHandler.emitLocationChange(character.name, channel, character.location);

    // Announce in chat
    rawAnnounce(`🌀 ${player} redeemed Instant Travel and teleported to ${targetBiome.name}!`, channel);

    res.json({
      player,
      destination: targetBiome.name,
      message: `Teleported to ${targetBiome.name}`
    });
  } catch (error) {
    console.error('Error processing teleport redemption:', error);
    res.status(500).json({ error: 'Failed to process teleport redemption' });
  }
});

/**
 * GET /api/redemptions/available
 * Get list of available channel point redemptions
 */
app.get('/api/redemptions/available', (req, res) => {
  const redemptions = [
    {
      id: 'buff_haste',
      name: 'Haste',
      description: 'Gain +50% speed for 10 turns',
      cost: 1000,
      endpoint: '/api/redemptions/buff',
      params: { buffType: 'haste' }
    },
    {
      id: 'item_common',
      name: 'Random Item (Common)',
      description: 'Receive a random common item',
      cost: 2000,
      endpoint: '/api/redemptions/item',
      params: { rarity: 'common' }
    },
    {
      id: 'item_uncommon',
      name: 'Random Item (Uncommon)',
      description: 'Receive a random uncommon item',
      cost: 5000,
      endpoint: '/api/redemptions/item',
      params: { rarity: 'uncommon' }
    },
    {
      id: 'item_rare',
      name: 'Random Item (Rare)',
      description: 'Receive a random rare item',
      cost: 10000,
      endpoint: '/api/redemptions/item',
      params: { rarity: 'rare' }
    },
    {
      id: 'teleport',
      name: 'Instant Travel',
      description: 'Teleport to any unlocked location',
      cost: 3000,
      endpoint: '/api/redemptions/teleport'
    }
  ];

  res.json({ redemptions, count: redemptions.length });
});

// ==================== END CHANNEL POINT REDEMPTIONS ====================

// ==================== OPERATOR MENU ENDPOINTS ====================

// Initialize OperatorManager
const operatorMgr = new OperatorManager();

// Rate limiting for operator commands
const operatorRateLimits = new Map(); // userId -> { count, resetTime }
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 commands per minute

/**
 * Check rate limit for operator commands
 */
function checkOperatorRateLimit(userId) {
  const now = Date.now();
  const userLimit = operatorRateLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    operatorRateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

/**
 * Middleware to check operator permissions
 */
async function checkOperatorAccess(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  // Get channel from either body (POST) or query (GET)
  const channel = req.body?.channel || req.query?.channel;
  if (!channel) {
    console.error('[OPERATOR] No channel provided. Body:', req.body, 'Query:', req.query);
    return res.status(400).json({ error: 'Channel parameter required' });
  }

  try {
    // Get user's role from database
    const userRole = await db.getUserRole(user.id, channel.toLowerCase());
    
    // Get permission level
    const permissionLevel = operatorMgr.getPermissionLevel(
      user.displayName,
      channel.toLowerCase(),
      userRole
    );

    // Check if user has any operator permissions
    if (permissionLevel === operatorMgr.PERMISSION_LEVELS.NONE) {
      return res.status(403).json({ error: 'Access denied: Operator permissions required' });
    }

    // Attach permission info to request
    req.operatorLevel = permissionLevel;
    req.operatorRole = userRole;
    req.channelName = channel.toLowerCase();
    
    next();
  } catch (error) {
    console.error('Operator access check error:', error);
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
}

/**
 * GET /api/operator/status
 * Check if user has operator access and get their permission level
 */
app.get('/api/operator/status', async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.json({ hasAccess: false, level: 'NONE' });
  }

  const { channel } = req.query;
  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required' });
  }

  try {
    const userRole = await db.getUserRole(user.id, channel.toLowerCase());
    const permissionLevel = operatorMgr.getPermissionLevel(
      user.displayName,
      channel.toLowerCase(),
      userRole
    );

    const hasAccess = permissionLevel > operatorMgr.PERMISSION_LEVELS.NONE;
    const availableCommands = operatorMgr.getAvailableCommands(permissionLevel);
    
    let levelName = 'NONE';
    if (permissionLevel === operatorMgr.PERMISSION_LEVELS.CREATOR) levelName = 'CREATOR';
    else if (permissionLevel === operatorMgr.PERMISSION_LEVELS.STREAMER) levelName = 'STREAMER';
    else if (permissionLevel === operatorMgr.PERMISSION_LEVELS.MODERATOR) levelName = 'MODERATOR';

    console.log(`[OPERATOR STATUS] User: ${user.displayName}, Role: ${userRole}, Level: ${levelName} (${permissionLevel}), Commands: ${availableCommands.length}`);

    res.json({
      hasAccess,
      level: levelName,
      role: userRole,
      availableCommands,
      username: user.displayName
    });
  } catch (error) {
    console.error('Operator status check error:', error);
    res.status(500).json({ error: 'Failed to check operator status' });
  }
});

/**
 * GET /api/operator/commands
 * Get available operator commands with metadata
 */
app.get('/api/operator/commands', checkOperatorAccess, (req, res) => {
  try {
    const metadata = operatorMgr.getCommandMetadata();
    const availableCommands = operatorMgr.getAvailableCommands(req.operatorLevel);
    
    console.log(`[OPERATOR] Commands requested by level ${req.operatorLevel}, role: ${req.operatorRole}`);
    console.log(`[OPERATOR] Available commands:`, availableCommands);
    
    // Filter metadata to only include available commands
    const filtered = {};
    for (const cmd of availableCommands) {
      if (metadata[cmd]) {
        filtered[cmd] = metadata[cmd];
      }
    }

    console.log(`[OPERATOR] Filtered commands:`, Object.keys(filtered));
    res.json({ commands: filtered, level: req.operatorLevel });
  } catch (error) {
    console.error('Error fetching commands:', error);
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

/**
 * POST /api/operator/execute
 * Execute an operator command
 * Body: { channel, command, params }
 * WITH ENHANCED VALIDATION
 */
app.post('/api/operator/execute',
  checkOperatorAccess,
  validation.validateOperatorCommand,
  security.auditLog('operator_execute'),
  async (req, res) => {
    try {
      const { command, params } = req.body;

      console.log(`[OPERATOR EXECUTE] User: ${req.session.user.displayName}, Command: ${command}, Params:`, params);

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      // Sanitize command name
      const sanitizedCommand = sanitization.sanitizeInput(command, { maxLength: 50 });

      // Check rate limit
      if (!checkOperatorRateLimit(req.session.user.id)) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please wait before executing more commands.',
          retryAfter: 60 
        });
      }

      // Check if user can execute this command
      if (!operatorMgr.canExecuteCommand(sanitizedCommand, req.operatorLevel)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions for this command',
          required: 'Higher operator level required'
        });
      }

      // Sanitize params
      const sanitizedParams = params ? sanitization.sanitizeObject(params, { maxDepth: 3 }) : {};

      // Execute the command
      let result;
      switch (sanitizedCommand) {
        case 'giveItem':
          result = await operatorMgr.giveItem(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.itemId, { maxLength: 100 }),
            sanitization.sanitizeNumber(sanitizedParams.quantity || 1, { min: 1, max: 1000, integer: true }),
            db
          );
          break;

        case 'giveGold':
          result = await operatorMgr.giveGold(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeNumber(sanitizedParams.amount, { min: -1000000, max: 1000000, integer: true }),
            db
          );
          break;

        case 'giveExp':
          result = await operatorMgr.giveExp(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeNumber(sanitizedParams.amount, { min: 1, max: 10000000, integer: true }),
            db
          );
          break;

        case 'healPlayer':
          result = await operatorMgr.healPlayer(
            sanitizedParams.playerId,
            req.channelName,
            db
          );
          break;

        case 'removeItem':
          result = await operatorMgr.removeItem(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.itemId, { maxLength: 100 }),
            sanitization.sanitizeNumber(sanitizedParams.quantity || 1, { min: 1, max: 1000, integer: true }),
            db
          );
          break;

        case 'removeGold':
          result = await operatorMgr.removeGold(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeNumber(sanitizedParams.amount, { min: 1, max: 1000000, integer: true }),
            db
          );
          break;

        case 'removeLevel':
          result = await operatorMgr.removeLevel(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeNumber(sanitizedParams.levels, { min: 1, max: 100, integer: true }),
            db
          );
          break;

        case 'setPlayerLevel':
          result = await operatorMgr.setPlayerLevel(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeNumber(sanitizedParams.level, { min: 1, max: 100, integer: true }),
            db
          );
          break;

        case 'teleportPlayer':
          result = await operatorMgr.teleportPlayer(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeLocationName(sanitizedParams.location),
            db
          );
          break;

        case 'clearInventory':
          result = await operatorMgr.clearInventory(
            sanitizedParams.playerId,
            req.channelName,
            db
          );
          break;

        case 'changeWeather':
          result = await operatorMgr.changeWeather(
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.weather, { maxLength: 50 }),
            db
          );
          break;

        case 'changeTime':
          result = await operatorMgr.changeTime(
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.time, { maxLength: 50 }),
            db
          );
          break;

        case 'changeSeason':
          result = await operatorMgr.changeSeason(
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.season, { maxLength: 50 }),
            db
          );
          break;

        case 'spawnEncounter':
          result = await operatorMgr.spawnEncounter(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.encounterId, { maxLength: 100 }),
            db
          );
          break;

        case 'resetQuest':
          result = await operatorMgr.resetQuest(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.questId, { maxLength: 100 }),
            db
          );
          break;

        case 'forceEvent':
          result = await operatorMgr.forceEvent(
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.eventId, { maxLength: 100 }),
            db
          );
          break;

        case 'setPlayerStats':
          result = await operatorMgr.setPlayerStats(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizePlayerStats(sanitizedParams.stats),
            db
          );
          break;

        case 'giveAllItems':
          result = await operatorMgr.giveAllItems(
            sanitizedParams.playerId,
            req.channelName,
            db
          );
          break;

        case 'unlockAchievement':
          result = await operatorMgr.unlockAchievement(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.achievementId, { maxLength: 100 }),
            db
          );
          break;

        // CREATOR level commands
        case 'deleteCharacter':
          if (req.operatorLevel < operatorMgr.PERMISSION_LEVELS.CREATOR) {
            return res.status(403).json({ error: 'Creator permissions required' });
          }
          if (sanitizedParams.confirm !== 'DELETE') {
            return res.status(400).json({ error: 'Confirmation required: type DELETE to confirm' });
          }
          result = await operatorMgr.deleteCharacter(
            sanitizedParams.playerId,
            req.channelName,
            db
          );
          break;

        case 'wipeProgress':
          if (req.operatorLevel < operatorMgr.PERMISSION_LEVELS.CREATOR) {
            return res.status(403).json({ error: 'Creator permissions required' });
          }
          if (sanitizedParams.confirm !== 'WIPE') {
            return res.status(400).json({ error: 'Confirmation required: type WIPE to confirm' });
          }
          result = await operatorMgr.wipeProgress(
            sanitizedParams.playerId,
            req.channelName,
            db
          );
          break;

        case 'grantOperator':
          if (req.operatorLevel < operatorMgr.PERMISSION_LEVELS.CREATOR) {
            return res.status(403).json({ error: 'Creator permissions required' });
          }
          result = await operatorMgr.grantOperator(
            sanitizedParams.playerId,
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.level, { maxLength: 20 }),
            db
          );
          break;

        case 'revokeOperator':
          if (req.operatorLevel < operatorMgr.PERMISSION_LEVELS.CREATOR) {
            return res.status(403).json({ error: 'Creator permissions required' });
          }
          result = await operatorMgr.revokeOperator(
            sanitizedParams.playerId,
            req.channelName,
            db
          );
          break;

        case 'systemBroadcast':
          if (req.operatorLevel < operatorMgr.PERMISSION_LEVELS.CREATOR) {
            return res.status(403).json({ error: 'Creator permissions required' });
          }
          result = await operatorMgr.systemBroadcast(
            req.channelName,
            sanitization.sanitizeInput(sanitizedParams.message, { maxLength: 500 }),
            db
          );
          break;

        case 'maintenanceMode':
          if (req.operatorLevel < operatorMgr.PERMISSION_LEVELS.CREATOR) {
            return res.status(403).json({ error: 'Creator permissions required' });
          }
          result = await operatorMgr.maintenanceMode(
            req.channelName,
            sanitizedParams.enabled === 'true',
            db
          );
          break;

        default:
          return res.status(400).json({ error: `Unknown command: ${sanitizedCommand}` });
      }

      // Log the action to audit log
      await db.logOperatorAction(
        req.session.user.id,
        req.session.user.displayName,
        req.channelName,
        sanitizedCommand,
        sanitizedParams,
        true,
        null
      );

      console.log(`[OPERATOR] ${req.session.user.displayName} executed ${sanitizedCommand} in ${req.channelName}`);

      // Emit websocket update for player-affecting commands
      const playerCommands = [
        'giveItem', 'giveGold', 'giveExp', 'healPlayer', 'removeItem', 
        'removeGold', 'removeLevel', 'setPlayerLevel', 'teleportPlayer',
        'clearInventory', 'resetQuest', 'setPlayerStats', 'giveAllItems',
        'unlockAchievement', 'wipeProgress', 'grantOperator', 'revokeOperator'
      ];

      if (playerCommands.includes(sanitizedCommand) && sanitizedParams.playerId) {
        try {
          // Resolve player name to ID if needed
          const targetPlayerId = sanitizedParams.playerId.startsWith('twitch-') 
            ? sanitizedParams.playerId 
            : await operatorMgr.getPlayerIdFromName(sanitizedParams.playerId, req.channelName, db);
          
          // Load fresh player data using getCharacter to get proper camelCase fields
          const character = await db.getCharacter(targetPlayerId, req.channelName);
          if (character) {
            // Use character name as room identifier (matches frontend socket join)
            const roomIdentifier = character.name;
            
            // Emit properly formatted player data to the affected player's room
            socketHandler.emitPlayerUpdate(roomIdentifier, req.channelName, character.toFrontend());
            console.log(`[OPERATOR] Emitted update to room ${roomIdentifier}_${req.channelName} after ${sanitizedCommand}`);
          }
        } catch (err) {
          console.error('[OPERATOR] Failed to emit player update:', err);
        }
      }

      // Emit global state updates for world commands
      const worldCommands = ['changeWeather', 'changeTime', 'changeSeason', 'forceEvent', 'systemBroadcast', 'maintenanceMode'];
      if (worldCommands.includes(sanitizedCommand)) {
        try {
          // Load game state and broadcast to all players in channel
          const gameStateResult = await db.query(
            'SELECT * FROM game_state WHERE channel_name = $1',
            [req.channelName.toLowerCase()]
          );
          
          if (gameStateResult.rows.length > 0) {
            const gameState = gameStateResult.rows[0];
            socketHandler.emitToChannel(req.channelName, 'gameState:update', {
              weather: gameState.weather,
              timeOfDay: gameState.time_of_day,
              season: gameState.season,
              activeEvent: gameState.active_event,
              lastBroadcast: gameState.last_broadcast,
              maintenanceMode: gameState.maintenance_mode
            });
            console.log(`[OPERATOR] Emitted game state update for ${sanitizedCommand}`);
          }
        } catch (err) {
          console.error('[OPERATOR] Failed to emit game state update:', err);
        }
      }

      res.json(result);
    } catch (error) {
      console.error('[OPERATOR EXECUTE ERROR]', error);
      console.error('Error stack:', error.stack);
      
      // Log failed action to audit log
      const channelName = req.channelName || req.body?.channel || 'unknown';
      const userId = req.session?.user?.id || 'unknown';
      const userName = req.session?.user?.displayName || 'unknown';
      
      await db.logOperatorAction(
        userId,
        userName,
        channelName,
        req.body?.command || 'unknown',
        req.body?.params || {},
        false,
        error.message
    ).catch(err => console.error('Failed to log error:', err));

    console.error('Operator command execution error:', error);
    res.status(500).json({ error: error.message || 'Command execution failed' });
  }
});

/**
 * GET /api/operator/players
 * Get list of players in a channel for operator commands
 */
app.get('/api/operator/players', checkOperatorAccess, async (req, res) => {
  try {
    const table = db.getPlayerTable(req.channelName);
    const result = await db.query(
      `SELECT 
        player_id, 
        name, 
        level, 
        gold, 
        location, 
        hp, 
        max_hp,
        roles,
        name_color as "nameColor",
        selected_role_badge as "selectedRoleBadge"
       FROM ${table}
       ORDER BY level DESC, name ASC 
       LIMIT 100`
    );

    res.json({ players: result.rows });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * GET /api/operator/audit-log
 * Get operator audit log for a channel
 */
app.get('/api/operator/audit-log', checkOperatorAccess, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await db.getOperatorAuditLog(req.channelName, limit);
    
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ==================== END OPERATOR MENU ENDPOINTS ====================

// ==================== SEASON & LEADERBOARD SYSTEM ENDPOINTS ====================

const { SeasonManager, LeaderboardManager } = require('./game');
const seasonMgr = new SeasonManager();
const leaderboardMgr = new LeaderboardManager();

/**
 * GET /api/seasons
 * Get all seasons
 */
app.get('/api/seasons', (req, res) => {
  try {
    const seasons = seasonMgr.getAllSeasons();
    res.json({ seasons, count: seasons.length });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

/**
 * GET /api/seasons/active
 * Get currently active season
 */
app.get('/api/seasons/active', (req, res) => {
  try {
    const activeSeason = seasonMgr.getActiveSeason();
    res.json(activeSeason || { message: 'No active season' });
  } catch (error) {
    console.error('Error fetching active season:', error);
    res.status(500).json({ error: 'Failed to fetch active season' });
  }
});

/**
 * GET /api/seasons/:seasonId
 * Get season details
 */
app.get('/api/seasons/:seasonId', (req, res) => {
  try {
    const { seasonId } = req.params;
    const season = seasonMgr.getSeason(seasonId);
    
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

/**
 * GET /api/seasons/progress/:player/:channel
 * Get player's season progress
 */
app.get('/api/seasons/progress/:player/:channel', async (req, res) => {
  try {
    const { player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const progress = seasonMgr.getSeasonProgress(character);
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching season progress:', error);
    res.status(500).json({ error: 'Failed to fetch season progress' });
  }
});

/**
 * POST /api/seasons/xp/add
 * Add season XP to player
 * Body: { player, channel, xp, source }
 */
app.post('/api/seasons/xp/add', async (req, res) => {
  try {
    const { player, channel, xp, source } = req.body;
    
    if (!player || !channel || !xp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = seasonMgr.addSeasonXP(character, xp, source);
    
    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for season XP change
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      
      // Update season level leaderboard
      const progress = character.seasonProgress[seasonMgr.getActiveSeason()?.id];
      if (progress) {
        leaderboardMgr.updateSeasonLevelLeaderboard(character, progress.seasonLevel);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error adding season XP:', error);
    res.status(500).json({ error: 'Failed to add season XP' });
  }
});

/**
 * POST /api/seasons/currency/add
 * Add seasonal currency
 * Body: { player, channel, amount, source }
 */
app.post('/api/seasons/currency/add', async (req, res) => {
  try {
    const { player, channel, amount, source } = req.body;
    
    if (!player || !channel || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = seasonMgr.addSeasonCurrency(character, amount, source);
    
    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for season currency change
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      
      // Update currency leaderboard
      const progress = character.seasonProgress[seasonMgr.getActiveSeason()?.id];
      if (progress) {
        leaderboardMgr.updateSeasonCurrencyLeaderboard(character, progress.seasonCurrency);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error adding seasonal currency:', error);
    res.status(500).json({ error: 'Failed to add seasonal currency' });
  }
});

/**
 * GET /api/seasons/challenges/:player/:channel
 * Get seasonal challenges for player
 */
app.get('/api/seasons/challenges/:player/:channel', async (req, res) => {
  try {
    const { player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const challenges = seasonMgr.getSeasonalChallenges(character);
    
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * POST /api/seasons/challenges/complete
 * Complete a seasonal challenge
 * Body: { player, channel, challengeName, type }
 */
app.post('/api/seasons/challenges/complete', async (req, res) => {
  try {
    const { player, channel, challengeName, type } = req.body;
    
    if (!player || !channel || !challengeName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = seasonMgr.completeChallenge(character, challengeName, type);
    
    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for challenge completion
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error completing challenge:', error);
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
});

/**
 * GET /api/seasons/events
 * Get all seasonal events
 */
app.get('/api/seasons/events', (req, res) => {
  try {
    const events = seasonMgr.getSeasonalEvents();
    res.json({ events, count: events.length });
  } catch (error) {
    console.error('Error fetching seasonal events:', error);
    res.status(500).json({ error: 'Failed to fetch seasonal events' });
  }
});

/**
 * GET /api/seasons/events/:eventId
 * Get seasonal event details
 */
app.get('/api/seasons/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const event = seasonMgr.getSeasonalEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * GET /api/seasons/stats/:player/:channel
 * Get season statistics for player
 */
app.get('/api/seasons/stats/:player/:channel', async (req, res) => {
  try {
    const { player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const stats = seasonMgr.getSeasonStatistics(character);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching season stats:', error);
    res.status(500).json({ error: 'Failed to fetch season stats' });
  }
});

// ==================== LEADERBOARD ENDPOINTS ====================

/**
 * GET /api/leaderboards
 * Get all available leaderboard types
 */
app.get('/api/leaderboards', (req, res) => {
  try {
    const leaderboards = leaderboardMgr.getAvailableLeaderboards();
    res.json({ leaderboards, count: leaderboards.length });
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

/**
 * GET /api/leaderboards/:type
 * Get leaderboard rankings
 * Query params: ?limit=100&offset=0
 */
app.get('/api/leaderboards/:type', (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const leaderboard = leaderboardMgr.getLeaderboard(type, limit, offset);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboards/:type/player/:player/:channel
 * Get player's rank in leaderboard
 */
app.get('/api/leaderboards/:type/player/:player/:channel', async (req, res) => {
  try {
    const { type, player, channel } = req.params;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const rank = leaderboardMgr.getPlayerRank(type, `${userId}_${channel}`);
    res.json(rank);
  } catch (error) {
    console.error('Error fetching player rank:', error);
    res.status(500).json({ error: 'Failed to fetch player rank' });
  }
});

/**
 * GET /api/leaderboards/:type/top/:count
 * Get top N players
 */
app.get('/api/leaderboards/:type/top/:count', (req, res) => {
  try {
    const { type, count } = req.params;
    const topPlayers = leaderboardMgr.getTopPlayers(type, parseInt(count) || 10);
    res.json(topPlayers);
  } catch (error) {
    console.error('Error fetching top players:', error);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

/**
 * GET /api/leaderboards/:type/nearby/:player/:channel
 * Get nearby players on leaderboard
 * Query params: ?range=5
 */
app.get('/api/leaderboards/:type/nearby/:player/:channel', async (req, res) => {
  try {
    const { type, player, channel } = req.params;
    const range = parseInt(req.query.range) || 5;
    const userId = await db.getUserId(player, channel);
    
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const nearby = leaderboardMgr.getNearbyPlayers(type, `${userId}_${channel}`, range);
    res.json(nearby);
  } catch (error) {
    console.error('Error fetching nearby players:', error);
    res.status(500).json({ error: 'Failed to fetch nearby players' });
  }
});

/**
 * GET /api/leaderboards/:type/stats
 * Get leaderboard statistics
 */
app.get('/api/leaderboards/:type/stats', (req, res) => {
  try {
    const { type } = req.params;
    const stats = leaderboardMgr.getLeaderboardStats(type);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard stats' });
  }
});

// ==================== END SEASON & LEADERBOARD ENDPOINTS ====================

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

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces for Docker/Railway
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Serving React frontend from /public/dist');
  }
});

// Initialize WebSocket server
const io = socketHandler.initializeWebSocket(server);
console.log('🔌 WebSocket server initialized');

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
  server.close(() => {
    console.log('✅ HTTP server closed');
    db.close().then(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
});
