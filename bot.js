const tmi = require('tmi.js');
const fetch = require('node-fetch');
require('dotenv').config();
const TokenManager = require('./TokenManager');

const BOT_USERNAME = process.env.BOT_USERNAME;
const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

if (CHANNELS.length === 0) {
  console.warn('⚠️ No channels configured. Twitch bot will not connect. Set CHANNELS in .env if needed.');
  // Don't exit - allow server to run without bot
} else {
  console.log(`🎮 Bot will connect to channels: ${CHANNELS.join(', ')}`);
}

async function initializeBot() {
  // Skip bot initialization if no channels configured
  if (CHANNELS.length === 0) {
    console.log('⏭️ Skipping Twitch bot initialization (no channels configured)');
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
    
    const msg = message.trim().toLowerCase();
    const args = message.trim().split(' ');
    const command = args[0].toLowerCase();
    const channelName = channel.replace('#', '').toLowerCase();
    const username = tags.username;

    // Basic adventure command
    if (msg === '!adventure') {
      client.say(channel, `🗡️ Join the adventure: ${BASE_URL}/adventure?channel=${channelName}`);
      return;
    }

    // Raid commands
    if (command === '!raid') {
      handleRaidCommand(channel, channelName, username, args.slice(1), client);
      return;
    }

    if (command === '!vote') {
      handleVoteCommand(channel, channelName, username, args.slice(1), tags, client);
      return;
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

/**
 * Handle !raid command
 * !raid - Show available raids
 * !raid list - List active lobbies
 * !raid join <lobbyId> [role] - Join a raid lobby
 * !raid leave - Leave current lobby
 * !raid role <role> - Change role in lobby
 * !raid info <raidId> - Get raid details
 * !raid here - Check raids available at current location
 */
async function handleRaidCommand(channel, channelName, username, args, client) {
  const subcommand = args[0] || 'help';

  try {
    if (subcommand === 'help' || !args.length) {
      client.say(channel, `🏰 Raid Commands: !raid list | !raid here | !raid join <lobbyId> [role] | !raid leave | !raid role <role> | !raid info <raidId>`);
      return;
    }

    if (subcommand === 'list') {
      const response = await fetch(`${BASE_URL}/api/raids/lobbies/active`);
      const data = await response.json();
      
      if (data.count === 0) {
        client.say(channel, `🏰 No active raid lobbies. Travel to a raid entrance to create one!`);
      } else {
        const lobbies = data.lobbies.slice(0, 3).map(l => `${l.lobbyId}: ${l.raidName} (${l.playerCount}/${l.maxPlayers})`).join(' | ');
        client.say(channel, `🏰 Active Lobbies: ${lobbies}`);
      }
      return;
    }

    if (subcommand === 'here') {
      const response = await fetch(`${BASE_URL}/api/raids/available-here?player=${username}&channel=${channelName}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.count === 0) {
          client.say(channel, `📍 No raids available at ${data.location}. Travel to a raid entrance to start one!`);
        } else {
          const raidList = data.raids.map(r => `${r.name} (${r.difficulty})`).join(', ');
          client.say(channel, `📍 Raids available at ${data.location}: ${raidList}. Use the in-game UI to create a lobby!`);
        }
      } else {
        client.say(channel, `❌ ${data.error || 'Failed to check location'}`);
      }
      return;
    }

    if (subcommand === 'join') {
      const lobbyId = args[1];
      const role = args[2] || 'dps';
      
      if (!lobbyId) {
        client.say(channel, `❌ Usage: !raid join <lobbyId> [role]. Roles: tank, healer, dps`);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/raids/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: username,
          channel: channelName,
          lobbyId,
          role
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        client.say(channel, `✅ ${username} joined ${data.raidName} lobby as ${role}! (${data.playerCount}/${data.maxPlayers})`);
      } else {
        client.say(channel, `❌ ${data.error || 'Failed to join lobby'}`);
      }
      return;
    }

    if (subcommand === 'leave') {
      const response = await fetch(`${BASE_URL}/api/raids/lobby/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: username,
          channel: channelName
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        client.say(channel, `👋 ${username} left the raid lobby.`);
      } else {
        client.say(channel, `❌ ${data.error || 'Failed to leave lobby'}`);
      }
      return;
    }

    if (subcommand === 'role') {
      const role = args[1];
      
      if (!role || !['tank', 'healer', 'dps'].includes(role)) {
        client.say(channel, `❌ Usage: !raid role <tank|healer|dps>`);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/raids/lobby/change-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: username,
          channel: channelName,
          role
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        client.say(channel, `✅ ${username} changed role to ${role}!`);
      } else {
        client.say(channel, `❌ ${data.error || 'Failed to change role'}`);
      }
      return;
    }

    if (subcommand === 'info') {
      const raidId = args[1];
      
      if (!raidId) {
        client.say(channel, `❌ Usage: !raid info <raidId>`);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/raids/${raidId}`);
      const data = await response.json();
      
      if (response.ok) {
        client.say(channel, `🏰 ${data.name} (${data.difficulty}): ${data.description}. Players: ${data.min_players}-${data.max_players}. Duration: ${data.duration_minutes}min. Entrance: ${data.entrance_location}`);
      } else {
        client.say(channel, `❌ Raid not found: ${raidId}`);
      }
      return;
    }

  } catch (error) {
    console.error('Raid command error:', error);
    client.say(channel, `❌ Command failed. Try again later.`);
  }
}

/**
 * Handle !vote command for raids
 * !vote <option> - Vote on current raid event (subscriber votes count 2x)
 */
async function handleVoteCommand(channel, channelName, username, args, tags, client) {
  const option = args[0];
  
  if (!option) {
    client.say(channel, `❌ Usage: !vote <option>. Options will be shown during raid events.`);
    return;
  }

  try {
    // Check if user is a subscriber (badges include 'subscriber' or 'founder')
    const isSubscriber = tags.subscriber || (tags.badges && (tags.badges.subscriber || tags.badges.founder));
    const weight = isSubscriber ? 2 : 1;
    
    const response = await fetch(`${BASE_URL}/api/raids/viewer/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewer: username,
        channel: channelName,
        option,
        weight
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      const weightMsg = isSubscriber ? ' (subscriber 2x weight)' : '';
      client.say(channel, `✅ ${username} voted for ${option}${weightMsg}!`);
    } else {
      // Silently fail if no active voting
      if (!data.error.includes('No active voting')) {
        client.say(channel, `❌ ${data.error}`);
      }
    }
  } catch (error) {
    console.error('Vote command error:', error);
  }
}

// Initialize the bot
initializeBot().catch(err => {
  console.error('❌ Bot initialization failed:', err.message);
  process.exit(1);
});

function rawAnnounce(message, channelName = null) {
  // If no channels configured, skip announcement
  if (CHANNELS.length === 0) {
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
