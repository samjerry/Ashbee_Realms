const tmi = require('tmi.js');
require('dotenv').config();
const TokenManager = require('./TokenManager');

const BOT_USERNAME = process.env.BOT_USERNAME;
const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

if (CHANNELS.length === 0) {
  console.error('❌ No channels configured! Set CHANNELS in .env (comma-separated)');
  process.exit(1);
}

console.log(`🎮 Bot will connect to channels: ${CHANNELS.join(', ')}`);

// Initialize TokenManager and bot
let client;

async function initializeBot() {
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
    if (message.trim().toLowerCase() === '!adventure') {
      // Extract channel name without the # prefix
      const channelName = channel.replace('#', '').toLowerCase();
      client.say(channel, `🗡️ Join the adventure: ${BASE_URL}/adventure?channel=${channelName}`);
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

// Initialize the bot
initializeBot().catch(err => {
  console.error('❌ Bot initialization failed:', err.message);
  process.exit(1);
});

function rawAnnounce(message, channelName = null) {
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
