// WebSocket Server Integration for Ashbee Realms
const socketIo = require('socket.io');

let io;
let isInitialized = false;

// Initialize WebSocket server
function initializeWebSocket(server) {
  if (isInitialized) {
    console.warn('[WebSocket] ⚠️ WebSocket already initialized, skipping...');
    return io;
  }

  console.log('[WebSocket] 🔄 Initializing WebSocket server...');
  
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
      
      if (!player || !channel) {
        console.error('[WebSocket] Invalid join data:', data);
        socket.emit('error', { message: 'Player and channel are required to join' });
        return;
      }
      
      const roomId = `${player}_${channel}`;
      socket.join(roomId);
      
      // Also join channel-wide room for global broadcasts
      socket.join(`channel_${channel}`);
      
      // Get room size for debugging
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      
      console.log(`[WebSocket] ✅ ${player} joined room ${roomId} (${roomSize} total clients)`);
      console.log(`[WebSocket] Also joined channel_${channel}`);
      
      // Send current game state
      socket.emit('connected', { message: 'Connected to Ashbee Realms' });
      
      // Confirm join to client
      socket.emit('joined', { 
        room: roomId, 
        player, 
        channel,
        timestamp: Date.now() 
      });
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

  isInitialized = true;
  console.log('[WebSocket] ✅ WebSocket server initialized successfully');

  return io;
}

// Check if WebSocket is initialized
function getInitializationStatus() {
  return isInitialized;
}

// Helper function to check if WebSocket is ready
function isWebSocketReady(eventName) {
  if (!io || !isInitialized) {
    console.warn(`[WebSocket] ⚠️ Cannot emit ${eventName || 'event'} - WebSocket not initialized`);
    return false;
  }
  return true;
}

// Emit player update to specific player
function emitPlayerUpdate(player, channel, data) {
  if (!isWebSocketReady('player:update')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('player:update', data);
}

// Emit combat update
function emitCombatUpdate(player, channel, data) {
  if (!isWebSocketReady('combat:update')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('combat:update', data);
}

// Emit quest update
function emitQuestUpdate(player, channel) {
  if (!isWebSocketReady('quest:update')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('quest:update');
}

// Emit achievement unlocked
function emitAchievementUnlocked(player, channel, achievement) {
  if (!isWebSocketReady('achievement:unlocked')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('achievement:unlocked', achievement);
}

// Emit inventory update
function emitInventoryUpdate(player, channel) {
  if (!isWebSocketReady('inventory:update')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('inventory:update');
}

// Emit level up notification
function emitLevelUp(player, channel, data) {
  if (!isWebSocketReady('player:levelup')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('player:levelup', data);
}

// Emit notification
function emitNotification(player, channel, notification) {
  if (!isWebSocketReady('notification')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('notification', notification);
}

// Broadcast to all connected clients
function broadcastGlobal(event, data) {
  if (!isWebSocketReady(event)) return;
  io.emit(event, data);
}

// Emit party update to all party members
function emitPartyUpdate(partyMembers, data) {
  if (!isWebSocketReady('party:update') || !Array.isArray(partyMembers)) return;
  partyMembers.forEach(member => {
    const roomId = `${member.player}_${member.channel}`;
    io.to(roomId).emit('party:update', data);
  });
}

// Emit raid update to all raid participants
function emitRaidUpdate(raidParticipants, data) {
  if (!isWebSocketReady('raid:update') || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:update', data);
  });
}

// Emit raid combat action to all raid participants
function emitRaidCombatAction(raidParticipants, action) {
  if (!isWebSocketReady('raid:combat:action') || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:combat:action', action);
  });
}

// Emit raid boss phase change
function emitRaidBossPhase(raidParticipants, phaseData) {
  if (!isWebSocketReady('raid:boss:phase') || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:boss:phase', phaseData);
  });
}

// Emit raid voting started
function emitRaidVotingStarted(raidParticipants, voteData) {
  if (!isWebSocketReady('raid:voting:started') || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:voting:started', voteData);
  });
}

// Emit raid voting result
function emitRaidVotingResult(raidParticipants, result) {
  if (!isWebSocketReady('raid:voting:result') || !Array.isArray(raidParticipants)) return;
  raidParticipants.forEach(participant => {
    const roomId = `${participant.player}_${participant.channel}`;
    io.to(roomId).emit('raid:voting:result', result);
  });
}

// Emit chat message with game event
function emitChatEvent(channel, event) {
  if (!isWebSocketReady('chat:event')) return;
  // Broadcast to all players in that channel
  io.emit('chat:event', { channel, event });
}

// Emit location change
function emitLocationChange(player, channel, location) {
  if (!isWebSocketReady('location:change')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('location:change', location);
}

// Emit dungeon progress
function emitDungeonProgress(player, channel, progress) {
  if (!isWebSocketReady('dungeon:progress')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('dungeon:progress', progress);
}

// Emit shop update (merchant stock changed)
function emitShopUpdate(player, channel, merchantId) {
  if (!isWebSocketReady('shop:update')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('shop:update', { merchantId });
}

// Emit faction reputation change
function emitFactionUpdate(player, channel, factionData) {
  if (!isWebSocketReady('faction:update')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('faction:update', factionData);
}

// Emit status effect applied
function emitStatusEffect(player, channel, effect) {
  if (!isWebSocketReady('status:effect')) return;
  const roomId = `${player}_${channel}`;
  io.to(roomId).emit('status:effect', effect);
}

// Emit seasonal event notification
function emitSeasonalEvent(eventData) {
  if (!isWebSocketReady('season:event')) return;
  io.emit('season:event', eventData);
}

// Get connected clients count
function getConnectedCount() {
  if (!isWebSocketReady()) return 0;
  return io.engine.clientsCount;
}

// Get room participant count
function getRoomCount(player, channel) {
  if (!isWebSocketReady()) return 0;
  const roomId = `${player}_${channel}`;
  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
}

// Emit to all players in a channel
function emitToChannel(channel, event, data) {
  if (!isWebSocketReady(event)) return;
  // Emit to channel-wide room (all players subscribed to this channel)
  io.to(`channel_${channel}`).emit(event, data);
}

module.exports = {
  initializeWebSocket,
  getInitializationStatus,
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
