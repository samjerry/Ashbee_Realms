const express = require('express');
const router = express.Router();
const db = require('../db');
const security = require('../middleware/security');

// Create OperatorManager instance once for reuse
const OperatorManager = require('../game/OperatorManager');
const operatorMgr = new OperatorManager();

/**
 * Middleware to check if user is admin/operator
 * Uses the OperatorManager permission system to check for admin access
 */
async function requireAdmin(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get user's role from session or use 'viewer' as default
  const userRole = req.session.userRole || 'viewer';
  const username = user.displayName || user.login;
  
  // We need a channel context - use the first available channel or require it in query
  const channel = req.query.channel || req.body?.channel;
  
  // For admin endpoints that don't require a specific channel, we check if user is creator
  // Creator role has global access across all channels
  if (userRole.toLowerCase() === 'creator') {
    req.isAdmin = true;
    req.adminLevel = 'CREATOR';
    return next();
  }
  
  // If channel is provided, check permissions for that channel
  if (channel) {
    try {
      const channelRole = await db.getUserRole(user.id, channel.toLowerCase());
      const permissionLevel = operatorMgr.getPermissionLevel(
        username,
        channel.toLowerCase(),
        channelRole
      );
      
      // Allow MODERATOR level and above for admin endpoints
      if (permissionLevel >= operatorMgr.PERMISSION_LEVELS.MODERATOR) {
        req.isAdmin = true;
        req.adminLevel = permissionLevel >= operatorMgr.PERMISSION_LEVELS.CREATOR ? 'CREATOR' :
                        permissionLevel >= operatorMgr.PERMISSION_LEVELS.STREAMER ? 'STREAMER' : 'MODERATOR';
        return next();
      }
      
      return res.status(403).json({ error: 'Admin access required' });
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      return res.status(500).json({ error: 'Failed to verify permissions' });
    }
  } else {
    // No channel provided and user is not creator - deny access
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You must be a creator or provide a channel parameter with appropriate permissions'
    });
  }
}

/**
 * GET /api/admin/players
 * Get all players sorted by name
 * Optional query params: ?limit=100
 */
router.get('/players', requireAdmin, async (req, res) => {
  try {
    const players = await db.getAllPlayers();
    
    // Apply limit if specified
    const limit = parseInt(req.query.limit) || players.length;
    const limitedPlayers = players.slice(0, limit);
    
    res.json({ 
      success: true, 
      players: limitedPlayers,
      total: players.length,
      returned: limitedPlayers.length
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * GET /api/admin/characters
 * Get all characters sorted by channel and name
 * Optional query params: ?channel=channelname&limit=100
 */
router.get('/characters', requireAdmin, async (req, res) => {
  try {
    const { channel, limit } = req.query;
    
    let characters;
    if (channel) {
      characters = await db.getAllCharactersForChannel(channel.toLowerCase());
    } else {
      characters = await db.getAllCharacters();
    }
    
    // Apply limit if specified
    const maxResults = parseInt(limit) || characters.length;
    const limitedCharacters = characters.slice(0, maxResults);
    
    res.json({ 
      success: true, 
      characters: limitedCharacters,
      total: characters.length,
      returned: limitedCharacters.length,
      channel: channel || 'all'
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

/**
 * GET /api/admin/search/players
 * Search players by name
 * Query params: ?q=searchterm&limit=50
 */
router.get('/search/players', requireAdmin, async (req, res) => {
  try {
    const { q, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const players = await db.searchPlayersByName(q);
    
    // Apply limit if specified
    const maxResults = parseInt(limit) || 50;
    const limitedPlayers = players.slice(0, maxResults);
    
    res.json({ 
      success: true, 
      players: limitedPlayers,
      total: players.length,
      returned: limitedPlayers.length,
      query: q
    });
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

/**
 * GET /api/admin/search/characters
 * Search characters by name
 * Query params: ?q=searchterm&channel=channelname&limit=50
 */
router.get('/search/characters', requireAdmin, async (req, res) => {
  try {
    const { q, channel, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const characters = await db.searchCharactersByName(q, channel ? channel.toLowerCase() : null);
    
    // Apply limit if specified
    const maxResults = parseInt(limit) || 50;
    const limitedCharacters = characters.slice(0, maxResults);
    
    res.json({ 
      success: true, 
      characters: limitedCharacters,
      total: characters.length,
      returned: limitedCharacters.length,
      query: q,
      channel: channel || 'all'
    });
  } catch (error) {
    console.error('Error searching characters:', error);
    res.status(500).json({ error: 'Failed to search characters' });
  }
});

module.exports = router;
