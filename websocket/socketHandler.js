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
      console.log(`[WebSocket] ${player} joined room ${roomId}`);
      
      // Send current game state
      socket.emit('connected', { message: 'Connected to Ashbee Realms' });
    });
    
    // Leave player room
    socket.on('leave', (data) => {
      const { player, channel } = data;
      const roomId = `${player}_${channel}`;
      socket.leave(roomId);
      console.log(`[WebSocket] ${player} left room ${roomId}`);
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

module.exports = {
  initializeWebSocket,
  emitPlayerUpdate,
  emitCombatUpdate,
  emitQuestUpdate,
  emitAchievementUnlocked,
  emitInventoryUpdate,
  emitLevelUp,
  emitNotification,
  broadcastGlobal
};
