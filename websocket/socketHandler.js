// WebSocket Server Integration for Ashbee Realms
const socketIo = require('socket.io');

let io;

// Initialize WebSocket server
function initializeWebSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3001',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);
    
    // Join player room
    socket.on('join', (data) => {
      const { player, channel } = data;
      const roomId = `${player}_${channel}`;
      socket.join(roomId);
      
      // Also join channel-wide room for global broadcasts
      socket.join(`channel_${channel}`);
      
      console.log(`[WebSocket] ${player} joined room ${roomId} and channel_${channel}`);
      
      // Send current game state
      socket.emit('connected', { message: 'Connected to Ashbee Realms' });
    });
    
    // Leave player room
    socket.on('leave', (data) => {
      const { player, channel } = data;
      const roomId = `${player}_${channel}`;
      socket.leave(roomId);
      socket.leave(`channel_${channel}`);
      console.log(`[WebSocket] ${player} left room ${roomId} and channel_${channel}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Emit player update to specific player
function emitPlayerUpdate(player, channel, data) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('player:update', data);
}

// Emit combat update
function emitCombatUpdate(player, channel, data) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('combat:update', data);
}

// Emit quest update
function emitQuestUpdate(player, channel) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('quest:update');
}

// Emit achievement unlocked
function emitAchievementUnlocked(player, channel, achievement) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('achievement:unlocked', achievement);
}

// Emit inventory update
function emitInventoryUpdate(player, channel) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('inventory:update');
}

// Emit level up notification
function emitLevelUp(player, channel, data) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('player:levelup', data);
}

// Emit notification
function emitNotification(player, channel, notification) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('notification', notification);
}

// Broadcast to all connected clients
function broadcastGlobal(event, data) {
  if (!io) return;
  io.emit(event, data);
}

// Emit party update to all party members
function emitPartyUpdate(partyMembers, data) {
  if (!io || !Array.isArray(partyMembers)) return;
  partyMembers.forEach(member => {
    const roomId = `${member.player}_${member.channel}`;
    io.to(roomId).emit('party:update', data);
  });
}

// Emit raid update to all raid participants
function emitRaidUpdate(raidParticipants, data) {
  if (!io || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:update', data);
  });
}

// Emit raid combat action to all raid participants
function emitRaidCombatAction(raidParticipants, action) {
  if (!io || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:combat:action', action);
  });
}

// Emit raid boss phase change
function emitRaidBossPhase(raidParticipants, phaseData) {
  if (!io || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:boss:phase', phaseData);
  });
}

// Emit raid voting started
function emitRaidVotingStarted(raidParticipants, voteData) {
  if (!io || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:voting:started', voteData);
  });
}

// Emit raid voting result
function emitRaidVotingResult(raidParticipants, result) {
  if (!io || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:voting:result', result);
  });
}

// Emit chat message with game event
function emitChatEvent(channel, event) {
  if (!io) return;
  // Broadcast to all players in that channel
  io.emit('chat:event', { channel, event });
}

// Emit location change
function emitLocationChange(player, channel, location) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('location:change', location);
}

// Emit dungeon progress
function emitDungeonProgress(player, channel, progress) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('dungeon:progress', progress);
}

// Emit shop update (merchant stock changed)
function emitShopUpdate(player, channel, merchantId) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('shop:update', { merchantId });
}

// Emit faction reputation change
function emitFactionUpdate(player, channel, factionData) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('faction:update', factionData);
}

// Emit status effect applied
function emitStatusEffect(player, channel, effect) {
  if (!io) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('status:effect', effect);
}

// Emit seasonal event notification
function emitSeasonalEvent(eventData) {
  if (!io) return;
  io.emit('season:event', eventData);
}

// Get connected clients count
function getConnectedCount() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

// Get room participant count
function getRoomCount(player, channel) {
  if (!io) return 0;
  const roomId = `${player}_${channel}`;
  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
}

// Emit to all players in a channel
function emitToChannel(channel, event, data) {
  if (!io) return;
  // Emit to channel-wide room (all players subscribed to this channel)
  io.to(`channel_${channel}`).emit(event, data);
}

module.exports = {
  initializeWebSocket,
  emitPlayerUpdate,
  emitCombatUpdate,
  emitQuestUpdate,
  emitAchievementUnlocked,
  emitInventoryUpdate,
  emitLevelUp,
  emitNotification,
  broadcastGlobal,
  emitPartyUpdate,
  emitRaidUpdate,
  emitRaidCombatAction,
  emitRaidBossPhase,
  emitRaidVotingStarted,
  emitRaidVotingResult,
  emitChatEvent,
  emitLocationChange,
  emitDungeonProgress,
  emitShopUpdate,
  emitFactionUpdate,
  emitStatusEffect,
  emitSeasonalEvent,
  emitToChannel,
  getConnectedCount,
  getRoomCount
};
