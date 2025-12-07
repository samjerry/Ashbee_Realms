const tmi = require('tmi.js');
require('dotenv').config();

const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_OAUTH = process.env.BOT_OAUTH_TOKEN; // should be like "oauth:xxxx"
const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

if (CHANNELS.length === 0) {
  console.error('❌ No channels configured! Set CHANNELS in .env (comma-separated)');
  process.exit(1);
}

console.log(`🎮 Bot will connect to channels: ${CHANNELS.join(', ')}`);

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: BOT_USERNAME,
    password: BOT_OAUTH
  },
  channels: CHANNELS
});

client.connect().catch(err => console.error('tmi connect error', err));

client.on('message', (channel, tags, message, self) => {
  if (self) return;
  if (message.trim().toLowerCase() === '!adventure') {
    // Extract channel name without the # prefix
    const channelName = channel.replace('#', '').toLowerCase();
    client.say(channel, `🗺️ Join the adventure: ${BASE_URL}/adventure?channel=${channelName}`);
  }
});

function rawAnnounce(message, channelName = null) {
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

client.on('connected', (addr, port) => {
  console.log(`✅ Bot connected to ${addr}:${port}`);
  console.log(`📺 Connected to channels: ${CHANNELS.join(', ')}`);
});

client.on('disconnected', (reason) => {
  console.warn('Bot disconnected:', reason);
});

module.exports = { announce, rawAnnounce, client, CHANNELS };
