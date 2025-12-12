const tmi = require('tmi.js');
const fetch = require('node-fetch');
require('dotenv').config();
const TokenManager = require('./TokenManager');
const db = require('./db');

const BOT_USERNAME = process.env.BOT_USERNAME;
const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ENABLE_BOT = process.env.ENABLE_BOT !== 'false'; // Default true, set to 'false' to disable

if (!ENABLE_BOT) {
  console.log('🚫 Twitch bot disabled via ENABLE_BOT=false');
} else if (CHANNELS.length === 0) {
  console.warn('⚠️ No channels configured. Twitch bot will not connect. Set CHANNELS in .env if needed.');
  // Don't exit - allow server to run without bot
} else {
  console.log(`🎮 Bot will connect to channels: ${CHANNELS.join(', ')}`);
}

/**
 * Update user role in database based on Twitch tags
 * @param {string} username - Twitch username
 * @param {string} channelName - Channel name
 * @param {object} tags - Twitch message tags
 */
async function updateUserRoleFromTags(username, channelName, tags) {
  try {
    // Determine role from tags
    const role = db.determineRoleFromTags(username, channelName, tags);
    
    // Get or create player ID
    const playerId = `twitch-${tags['user-id']}`;
    
    // Ensure player exists in database
    await db.query(
      'INSERT INTO players(id, twitch_id, display_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET display_name = $3',
      [playerId, tags['user-id'], username]
    );
    
    // Update user role
    await db.updateUserRole(playerId, channelName, role);
  } catch (error) {
    console.error('Error updating user role:', error);
    // Don't throw - this shouldn't block the bot
  }
}

async function initializeBot() {
  // Skip bot initialization if disabled or no channels
  if (!ENABLE_BOT || CHANNELS.length === 0) {
    console.log('⏭️ Skipping Twitch bot initialization');
    return null;
  }

  const tokenManager = new TokenManager();
  
  // Start automatic token refresh (checks every hour)
  tokenManager.startAutoRefresh();

  // Get current valid token
  const accessToken = await tokenManager.getAccessToken();
  const tokenInfo = tokenManager.getTokenInfo();
  
  console.log(`🔑 Bot OAuth token loaded (expires in ${tokenInfo.expiresIn})`);

  client = new tmi.Client({
    options: { debug: true },
    identity: {
      username: BOT_USERNAME,
      password: `oauth:${accessToken}`
    },
    channels: CHANNELS
  });

  client.connect().catch(err => console.error('tmi connect error', err));

  client.on('message', (channel, tags, message, self) => {
    if (self) return;
    
    try {
      const msg = message.trim().toLowerCase();
      const channelName = channel.replace('#', '').toLowerCase();
      const username = tags.username;

      // Update user role asynchronously (don't wait for it)
      updateUserRoleFromTags(username, channelName, tags).catch(err => {
        console.error('Failed to update user role:', err);
      });

      // Only command: !adventure - all other features through in-game UI
      if (msg === '!adventure') {
        client.say(channel, `🗡️ Join the adventure: ${BASE_URL}/adventure?channel=${channelName}`);
        return;
      }

      // All other game features (raids, voting, stats, inventory, etc.) are accessed through the in-game UI
      // No additional chat commands needed
    } catch (error) {
      console.error('Error in message handler:', error);
      // Don't crash - just log and continue
    }
  });

  client.on('connected', (addr, port) => {
    console.log(`✅ Bot connected to ${addr}:${port}`);
    console.log(`📺 Connected to channels: ${CHANNELS.join(', ')}`);
  });

  client.on('disconnected', (reason) => {
    console.warn('Bot disconnected:', reason);
  });

  return client;
}

/*
 * REMOVED: !raid and !vote commands - all interactions through in-game UI
 * 
 * The game now uses in-game UI buttons for all features including raids and voting.
 * Only !adventure command is active to join the game.
 * 
 * Previous chat commands (!raid, !vote) have been removed in favor of the responsive
 * web interface that works on mobile, tablet, and desktop.
 */

// Initialize the bot
initializeBot().catch(err => {
  console.error('❌ Bot initialization failed:', err.message);
  console.log('⚠️ Server will continue without bot functionality');
  // Don't exit - allow server to run without bot
});

function rawAnnounce(message, channelName = null) {
  // If bot disabled or no channels configured, skip announcement
  if (!ENABLE_BOT || CHANNELS.length === 0) {
    console.log('📢 [Bot disabled] Would announce:', message);
    return Promise.resolve();
  }

  // Wait for client to be initialized
  if (!client) {
    console.warn('⚠️ Client not yet initialized, delaying announce');
    setTimeout(() => rawAnnounce(message, channelName), 1000);
    return Promise.resolve();
  }
  
  // If channelName specified, announce only to that channel
  // Otherwise announce to all channels
  const targets = channelName ? [channelName] : CHANNELS;
  
  const promises = targets.map(ch => {
    const channelWithHash = ch.startsWith('#') ? ch : `#${ch}`;
    return client.say(channelWithHash, message).catch(err => 
      console.error(`Announce error to ${ch}:`, err)
    );
  });
  
  return Promise.all(promises);
}

function announce(message, channelName = null) {
  // thin wrapper for backwards compatibility
  return rawAnnounce(message, channelName);
}

module.exports = { announce, rawAnnounce, client: () => client, CHANNELS };
