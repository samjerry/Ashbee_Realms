const express = require('express');
const session = require('express-session');
require('dotenv').config();
const { rawAnnounce } = require('./bot');
const path = require('path');
const axios = require('axios');
const db = require('./db');

const app = express();
app.use(express.json());

// Session store configuration
let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
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
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database (PostgreSQL or SQLite)
(async () => {
  try {
    await db.initDB();
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
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

// Twitch OAuth: /auth/twitch -> redirect, /auth/twitch/callback -> handle
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/auth/twitch/callback` : `http://localhost:${process.env.PORT || 3000}/auth/twitch/callback`;

app.get('/auth/twitch', (req, res) => {
  if (!TWITCH_CLIENT_ID) return res.status(500).send('Twitch client id not configured');
  const state = Math.random().toString(36).slice(2);
  // store state in session to verify later
  req.session.oauthState = state;
  const scope = encodeURIComponent('user:read:email');
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;
  res.redirect(url);
});

app.get('/auth/twitch/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || state !== req.session.oauthState) return res.status(400).send('Invalid OAuth callback');
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

    // get user info
    const userResp = await axios.get('https://api.twitch.tv/helix/users', { headers: { Authorization: `Bearer ${access_token}`, 'Client-Id': TWITCH_CLIENT_ID } });
    const user = userResp.data.data && userResp.data.data[0];
    if (!user) return res.status(500).send('Could not fetch user');

    const playerId = `twitch-${user.id}`;
    
    // Insert or update player
    const dbType = db.getType();
    if (dbType === 'sqlite') {
      await db.query(
        'INSERT INTO players(id, twitch_id, display_name, access_token, refresh_token) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET twitch_id=?, display_name=?, access_token=?, refresh_token=?',
        [playerId, user.id, user.display_name, access_token, refresh_token, user.id, user.display_name, access_token, refresh_token]
      );
    } else {
      await db.query(
        'INSERT INTO players(id, twitch_id, display_name, access_token, refresh_token) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET twitch_id=$2, display_name=$3, access_token=$4, refresh_token=$5',
        [playerId, user.id, user.display_name, access_token, refresh_token]
      );
    }

    req.session.user = { id: playerId, displayName: user.display_name, twitchId: user.id };
    res.redirect('/adventure');
  }catch(err){
    console.error('OAuth callback error', err.response ? err.response.data : err.message);
    res.status(500).send('OAuth failed');
  }
});

// Stub login for local testing: /auth/fake?name=Viewer123
app.get('/auth/fake', async (req, res) => {
  const name = req.query.name || 'Guest';
  const id = 'stub-' + name;
  try {
    // Insert or ignore player
    const dbType = db.getType();
    if (dbType === 'sqlite') {
      await db.query(
        'INSERT INTO players(id, display_name) VALUES (?, ?) ON CONFLICT(id) DO NOTHING',
        [id, name]
      );
    } else {
      await db.query(
        'INSERT INTO players(id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [id, name]
      );
    }
    req.session.user = { id, displayName: name };
    res.redirect('/adventure');
  } catch (err) {
    console.error('Stub login error:', err.message);
    res.status(500).send('Login failed');
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: req.session.user });
});

// Get player progress
app.get('/api/player/progress', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    let progress = await db.loadPlayerProgress(user.id);
    
    // If no progress exists, create a new player
    if (!progress) {
      progress = await db.initializeNewPlayer(user.id, user.displayName, "Town Square", 100);
    }

    res.json({ progress });
  } catch (err) {
    console.error('Load progress error:', err);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Save player progress
app.post('/api/player/progress', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const playerData = req.body;
    await db.savePlayerProgress(user.id, playerData);
    res.json({ status: 'ok', message: 'Progress saved' });
  } catch (err) {
    console.error('Save progress error:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Update the existing /api/action endpoint to save after each action
app.post('/api/action', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  const { actionId, playerState } = req.body;

  // Load current progress
  let progress = await db.loadPlayerProgress(user.id);
  if (!progress) {
    progress = await db.initializeNewPlayer(user.id, user.displayName);
  }

  // Handle actions and update progress
  if (actionId === 'fightBoss') {
    const bossName = 'The Nameless One';
    if (canAnnounce(user.id)) {
      rawAnnounce(`${user.displayName} is fighting ${bossName}! 🔥`);
    }
    
    // Update player state (example: reduce HP, add XP, etc.)
    progress.in_combat = true;
    progress.xp += 50;
    progress.hp = Math.max(0, progress.hp - 20);
    
    // Save updated progress
    await db.savePlayerProgress(user.id, progress);
    
    return res.json({ 
      status: 'ok', 
      newState: progress,
      eventsToBroadcast: [{ type: 'BOSS_ENCOUNTER', payload: { bossName } }] 
    });
  }

  res.json({ status: 'ok', message: 'no-op' });
});

app.get('/adventure', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
