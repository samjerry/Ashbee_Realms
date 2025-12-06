const tmi = require('tmi.js');
require('dotenv').config();

const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_OAUTH = process.env.BOT_OAUTH_TOKEN; // should be like "oauth:xxxx"
const CHANNEL = process.env.CHANNEL;
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: BOT_USERNAME,
    password: BOT_OAUTH
  },
  channels: [ CHANNEL ]
});

client.connect().catch(err => console.error('tmi connect error', err));

client.on('message', (channel, tags, message, self) => {
  if (self) return;
  if (message.trim().toLowerCase() === '!adventure') {
    client.say(channel, `🗺️ Join the adventure: ${BASE_URL}/adventure`);
  }
});

function rawAnnounce(message) {
  if (!CHANNEL) { console.warn('No CHANNEL set for bot announce'); return; }
  return client.say(CHANNEL, message).catch(err => console.error('announce error', err));
}

function announce(message) {
  // thin wrapper for backwards compatibility
  return rawAnnounce(message);
}

client.on('connected', (addr, port) => {
  console.log(`Bot connected to ${addr}:${port}`);
});

client.on('disconnected', (reason) => {
  console.warn('Bot disconnected:', reason);
});

module.exports = { announce, rawAnnounce, client };
