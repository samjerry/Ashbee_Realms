const express = require('express');
const session = require('express-session');
require('dotenv').config();
const { rawAnnounce } = require('./bot');
const path = require('path');
const axios = require('axios');
const db = require('./db');
const Combat = require('./game/Combat');
const { Character, ProgressionManager, ExplorationManager, QuestManager, ConsumableManager, ShopManager, ItemComparator, NPCManager, DialogueManager, DungeonManager } = require('./game');
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

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
  console.log('OAuth callback received:', { hasCode: !!code, hasState: !!state, sessionState: req.session.oauthState });
  
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
    res.redirect('/adventure');
  }catch(err){
    console.error('❌ OAuth callback error:', err.response?.data || err.message);
    console.error('Full error:', err);
    res.status(500).send(`OAuth failed: ${err.response?.data?.message || err.message}`);
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
  
  let { channel } = req.query;
  
  // If no channel specified, use the user's Twitch username as default
  if (!channel) {
    channel = user.login || user.displayName || user.display_name;
  }
  
  // Still no channel? Return error
  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required and no user login found' });
  }
  
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
  
  let { channel } = req.query;
  
  // If no channel specified, use the user's Twitch username as default
  if (!channel) {
    channel = user.login || user.displayName || user.display_name;
  }
  
  // Still no channel? Return error
  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required and no user login found' });
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
  
  // If no channel specified, use the user's Twitch username as default
  if (!channel) {
    channel = user.login || user.displayName || user.display_name;
  }
  
  // Still no channel? Return error
  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required and no user login found' });
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

// ==================== QUEST ENDPOINTS ====================

/**
 * GET /api/quests/available
 * Get all available quests for the character
 */
app.get('/api/quests/available', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel } = req.query;
  
  if (!channel) {
    channel = user.login || user.displayName || user.display_name;
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'Unable to determine channel' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.json({ success: true, quests: [] });
    }

    const activeQuests = character.activeQuests || [];
    const completedQuests = character.completedQuests || [];

    const questMgr = new QuestManager();
    const available = questMgr.getAvailableQuests(character, activeQuests, completedQuests);

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
  
  if (!channel) {
    channel = user.login || user.displayName || user.display_name;
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'Unable to determine channel' });
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
 * GET /api/quests/active
 * Get all active quests
 */
app.get('/api/quests/active', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel } = req.query;
  
  if (!channel) {
    channel = user.login || user.displayName || user.display_name;
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'Unable to determine channel' });
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
    
    // Use authenticated user's channel if not specified
    if (!channel) {
      channel = user.login || user.displayName || user.display_name;
    }
    
    if (!channel) {
      return res.status(400).json({ error: 'Unable to determine channel' });
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

// Serve React frontend (production only)
if (process.env.NODE_ENV === 'production') {
  // Serve static files from public/dist
  app.use(express.static(path.join(__dirname, 'public/dist')));
  
  // Serve index.html for all non-API routes (React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist/index.html'));
  });
} else {
  // Development: serve old test page
  app.get('/adventure', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Serving React frontend from /public/dist');
  }
});

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
