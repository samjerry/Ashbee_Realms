const express = require('express');
const session = require('express-session');
require('dotenv').config();
const { rawAnnounce } = require('./bot');
const path = require('path');
const axios = require('axios');
const db = require('./db');
const Combat = require('./game/Combat');
const { Character, ProgressionManager, ExplorationManager } = require('./game');
const { loadData } = require('./data/data_loader');

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

// Save player progress
app.post('/api/player/progress', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  // Get channel from body or query parameter
  const channelName = req.body.channel || req.query.channel;
  if (!channelName) return res.status(400).json({ error: 'Channel parameter required' });

  try {
    const playerData = req.body.progress || req.body;
    await db.savePlayerProgress(user.id, channelName.toLowerCase(), playerData);
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
 * GET /api/player/stats
 * Get detailed character stats breakdown
 */
app.get('/api/player/stats', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel parameter required' });
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const stats = character.getStatsBreakdown();
    res.json({ success: true, stats });
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
  
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel parameter required' });
  
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
  
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel parameter required' });
  
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
 * Equip an item from inventory
 */
app.post('/api/player/equip', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { channel, itemId } = req.body;
  if (!channel || !itemId) {
    return res.status(400).json({ error: 'Channel and itemId required' });
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const result = character.equipItem(itemId);
    
    if (result.success) {
      await db.saveCharacter(user.id, channelName, character);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error equipping item:', error);
    res.status(500).json({ error: 'Failed to equip item' });
  }
});

/**
 * POST /api/player/unequip
 * Unequip an item to inventory
 */
app.post('/api/player/unequip', async (req, res) => {
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
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error unequipping item:', error);
    res.status(500).json({ error: 'Failed to unequip item' });
  }
});

/**
 * POST /api/player/create
 * Create a new character with a class
 */
app.post('/api/player/create', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { channel, classType, name } = req.body;
  if (!channel || !classType) {
    return res.status(400).json({ error: 'Channel and classType required' });
  }
  
  const channelName = channel.toLowerCase();
  const characterName = name || user.displayName;
  
  try {
    // Check if character already exists
    const existing = await db.getCharacter(user.id, channelName);
    if (existing) {
      return res.status(400).json({ error: 'Character already exists for this channel' });
    }
    
    // Create new character
    const character = await db.createCharacter(user.id, channelName, characterName, classType);
    
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
 */
app.post('/api/combat/start', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { monsterId, channelName } = req.body;
    if (!monsterId) {
      return res.status(400).json({ error: 'monsterId is required' });
    }

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
      const found = monstersData.monsters[rarity].find(m => m.id === monsterId);
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
 */
app.post('/api/combat/attack', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerAttack();

    // If combat ended, save results and clean up
    if (result.victory || result.defeat) {
      await handleCombatEnd(req.session, result);
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

    // Save updated character
    const playerData = character.toObject();
    await db.savePlayerProgress(playerId, channelName, playerData);
  }

  if (result.defeat) {
    // Handle death (optional: respawn with penalty)
    const character = combat.character;
    character.current_hp = Math.floor(character.max_hp * 0.5); // Respawn with 50% HP
    
    // Optional: gold penalty
    character.gold = Math.max(0, character.gold - Math.floor(character.gold * 0.1));

    const playerData = character.toObject();
    await db.savePlayerProgress(playerId, channelName, playerData);
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
 * Add XP to character (admin/testing endpoint)
 */
app.post('/api/progression/add-xp', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, amount } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });
  if (!amount || amount < 1) return res.status(400).json({ error: 'Valid XP amount required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const progressionMgr = new ProgressionManager();
    const result = progressionMgr.addXP(character, amount);

    // Save updated character
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

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

  const { channel, isHardcore } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get permanent stats from database
    const permanentStats = await db.getPermanentStats(user.id) || {};

    const progressionMgr = new ProgressionManager();
    const deathResult = progressionMgr.handleDeath(character, isHardcore || false, permanentStats);

    if (deathResult.characterDeleted) {
      // Save permanent stats and delete character
      await db.savePermanentStats(user.id, deathResult.permanentStatsToRetain);
      await db.deleteCharacter(user.id, channel.toLowerCase());
    } else {
      // Save character with penalties
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
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
 * GET /api/progression/passives
 * Get all passives with unlock status
 */
app.get('/api/progression/passives', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const permanentStats = await db.getPermanentStats(user.id) || {};
    const unlockedPassives = permanentStats.unlockedPassives || [];
    const accountStats = permanentStats.accountStats || {};

    const progressionMgr = new ProgressionManager();
    const passives = progressionMgr.getAvailablePassives(character, accountStats, unlockedPassives);

    res.json({
      success: true,
      passives,
      accountStats
    });
  } catch (error) {
    console.error('Error fetching passives:', error);
    res.status(500).json({ error: 'Failed to fetch passives' });
  }
});

/**
 * POST /api/progression/unlock-passive
 * Unlock a permanent passive
 */
app.post('/api/progression/unlock-passive', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, passiveId } = req.body;
  if (!channel || !passiveId) {
    return res.status(400).json({ error: 'Channel and passiveId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const permanentStats = await db.getPermanentStats(user.id) || {};
    const unlockedPassives = permanentStats.unlockedPassives || [];
    const accountStats = permanentStats.accountStats || {};

    // Check if already unlocked
    if (unlockedPassives.includes(passiveId)) {
      return res.status(400).json({ error: 'Passive already unlocked' });
    }

    const progressionMgr = new ProgressionManager();
    const allPassives = [
      ...(progressionMgr.passives.combat_passives || []),
      ...(progressionMgr.passives.survival_passives || []),
      ...(progressionMgr.passives.progression_passives || []),
      ...(progressionMgr.passives.resource_passives || [])
    ];

    const passive = allPassives.find(p => p.id === passiveId);
    if (!passive) {
      return res.status(404).json({ error: 'Passive not found' });
    }

    // Check unlock requirements
    const unlockStatus = progressionMgr.canUnlockPassive(passive, character, accountStats);
    if (!unlockStatus.canUnlock) {
      return res.status(400).json({ 
        error: 'Cannot unlock passive',
        message: unlockStatus.message
      });
    }

    // Unlock passive
    unlockedPassives.push(passiveId);
    permanentStats.unlockedPassives = unlockedPassives;

    await db.savePermanentStats(user.id, permanentStats);

    res.json({
      success: true,
      message: `Unlocked ${passive.name}!`,
      passive,
      unlockedPassives
    });
  } catch (error) {
    console.error('Error unlocking passive:', error);
    res.status(500).json({ error: 'Failed to unlock passive' });
  }
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

// ==================== END COMBAT ENDPOINTS ====================

app.get('/adventure', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));

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
