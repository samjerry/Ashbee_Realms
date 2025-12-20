const express = require('express');
const router = express.Router();
const db = require('../db');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const rateLimiter = require('../utils/rateLimiter');
const security = require('../middleware/security');
const sanitization = require('../middleware/sanitization');
const { fetchUserRolesFromTwitch } = require('../utils/twitchRoleChecker');

// Game creator usernames
const GAME_CREATOR_USERNAMES = ['marrowofalbion', 'marrowofalb1on'];

/**
 * Helper function to convert player data to frontend format
 */
function convertToFrontendFormat(playerData) {
  return {
    name: playerData.name,
    level: playerData.level,
    xp: playerData.xp,
    hp: playerData.hp,
    maxHp: playerData.max_hp,
    gold: playerData.gold,
    location: playerData.location,
    inventory: playerData.inventory,
    equipped: playerData.equipped,
    nameColor: playerData.nameColor,
    roles: playerData.roles
  };
}

/**
 * GET /progress
 * Get player progress data
 */
router.get('/progress', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const channelName = req.query.channel;
  if (!channelName) return res.status(400).json({ error: 'Channel parameter required' });

  try {
    let progress = await db.loadPlayerProgress(user.id, channelName.toLowerCase());
    
    if (!progress) {
      progress = await db.initializeNewPlayer(user.id, channelName.toLowerCase(), user.displayName, "Town Square", 100);
    }

    progress.channel = channelName;
    res.json({ progress, channel: channelName });
  } catch (err) {
    console.error('Load progress error:', err);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

/**
 * POST /progress
 * Save player progress - WITH SERVER-SIDE VALIDATION
 */
router.post('/progress', 
  rateLimiter.middleware('strict'),
  security.auditLog('save_progress'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const channelName = req.body.channel || req.query.channel;
    if (!channelName) return res.status(400).json({ error: 'Channel parameter required' });

    try {
      const playerData = req.body.progress || req.body;
      
      const currentProgress = await db.loadPlayerProgress(user.id, channelName.toLowerCase());
      
      if (!currentProgress) {
        return res.status(404).json({ error: 'No character found. Please create a character first.' });
      }
      
      // Validate level
      if (playerData.level !== undefined) {
        if (playerData.level < 1 || playerData.level > 100) {
          console.warn(`[SECURITY] Invalid level attempt: ${playerData.level} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid level value' });
        }
        if (playerData.level > currentProgress.level + 1) {
          console.warn(`[SECURITY] Level jump detected for user ${security.sanitizeUserForLog(user)}: ${currentProgress.level} -> ${playerData.level}`);
          return res.status(400).json({ error: 'Invalid level progression' });
        }
      }
      
      // Validate gold changes
      if (playerData.gold !== undefined) {
        if (playerData.gold < 0 || playerData.gold > 100000000) {
          console.warn(`[SECURITY] Invalid gold amount: ${playerData.gold} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid gold amount' });
        }
        const goldChange = playerData.gold - currentProgress.gold;
        if (goldChange > 100000) {
          console.warn(`[SECURITY] Large gold increase detected for user ${security.sanitizeUserForLog(user)}: ${currentProgress.gold} -> ${playerData.gold}`);
          return res.status(400).json({ error: 'Invalid gold increase - suspiciously large' });
        }
        if (goldChange < 0 && playerData.gold < 0) {
          console.warn(`[SECURITY] Negative gold after spending for user ${security.sanitizeUserForLog(user)}: ${playerData.gold}`);
          playerData.gold = 0;
        }
      }
      
      // Validate XP changes
      if (playerData.xp !== undefined) {
        if (playerData.xp < 0 || playerData.xp > 1000000000) {
          console.warn(`[SECURITY] Invalid XP amount: ${playerData.xp} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid XP amount' });
        }
      }
      
      // Validate HP
      if (playerData.hp !== undefined) {
        if (playerData.hp < 0 || playerData.hp > 1000000) {
          console.warn(`[SECURITY] Invalid HP: ${playerData.hp} for user ${security.sanitizeUserForLog(user)}`);
          return res.status(400).json({ error: 'Invalid HP value' });
        }
        const maxHp = playerData.max_hp || currentProgress.max_hp;
        if (playerData.hp > maxHp) {
          console.warn(`[SECURITY] HP > max_hp for user ${security.sanitizeUserForLog(user)}: ${playerData.hp} > ${maxHp}`);
          playerData.hp = maxHp;
        }
      }
      
      // Sanitize string fields
      if (playerData.name) {
        playerData.name = sanitization.sanitizeCharacterName(playerData.name);
      }
      if (playerData.location) {
        playerData.location = sanitization.sanitizeLocationName(playerData.location);
      }
      
      // Sanitize inventory
      if (playerData.inventory) {
        playerData.inventory = sanitization.sanitizeInventory(playerData.inventory);
        if (playerData.inventory.length > 1000) {
          console.warn(`[SECURITY] Inventory size exceeded for user ${security.sanitizeUserForLog(user)}: ${playerData.inventory.length}`);
          playerData.inventory = playerData.inventory.slice(0, 1000);
        }
      }
      
      // Sanitize equipment
      if (playerData.equipped) {
        playerData.equipped = sanitization.sanitizeEquipment(playerData.equipped);
      }
      
      const mergedData = {
        ...currentProgress,
        ...playerData
      };
      
      await db.savePlayerProgress(user.id, channelName.toLowerCase(), mergedData);
      
      if (mergedData.name) {
        socketHandler.emitPlayerUpdate(mergedData.name, channelName.toLowerCase(), convertToFrontendFormat(mergedData));
      }
      
      res.json({ status: 'ok', message: 'Progress saved' });
    } catch (err) {
      console.error('Save progress error:', err);
      res.status(500).json({ error: 'Failed to save progress' });
    }
  });

/**
 * GET /channel
 * Get the default channel for character creation
 */
router.get('/channel', (req, res) => {
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
  const channel = CHANNELS[0] || 'default';
  res.json({ channel });
});

/**
 * GET /
 * Get basic player information including theme, name color, and selected role badge
 */
router.get('/', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
  const channelName = CHANNELS[0] || 'default';
  
  try {
    const playerData = await db.loadPlayerProgress(user.id, channelName);
    if (!playerData) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      name: playerData.name,
      nameColor: playerData.nameColor,
      selectedRoleBadge: playerData.selectedRoleBadge,
      theme: playerData.theme || 'crimson-knight',
      roles: playerData.roles
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

/**
 * GET /roles
 * Get user's Twitch roles for display and color selection
 */
router.get('/roles', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
  const channel = CHANNELS[0] || 'default';
  const displayName = user.displayName || user.display_name || 'Adventurer';
  
  try {
    const playerData = await db.loadPlayerProgress(user.id, channel);
    let roles = playerData?.roles || ['viewer'];
    let rolesUpdated = false;
    
    if (displayName.toLowerCase() === 'marrowofalbion' || displayName.toLowerCase() === 'marrowofalb1on') {
      if (!roles.includes('creator')) {
        roles = ['creator', ...roles.filter(r => r !== 'viewer')];
        rolesUpdated = true;
      }
    }
    
    // Check if user is a beta tester using player ID (twitch-{id})
    if (db.isBetaTester(user.id) && !roles.includes('tester')) {
      roles = [...roles, 'tester'];
      rolesUpdated = true;
    }
    
    if (rolesUpdated && playerData) {
      playerData.roles = roles;
      await db.savePlayerProgress(user.id, channel, playerData);
      console.log(`✅ Persisted roles for ${displayName}:`, roles);
      
      if (playerData.name) {
        socketHandler.emitPlayerUpdate(playerData.name, channel, { roles });
      }
    }
    
    const primaryRole = db.ROLE_HIERARCHY.find(r => roles.includes(r)) || 'viewer';
    
    let availableColors;
    if (roles.includes('creator')) {
      availableColors = db.ROLE_HIERARCHY.map(r => ({
        role: r,
        color: db.ROLE_COLORS[r] || db.ROLE_COLORS.viewer,
        name: r.charAt(0).toUpperCase() + r.slice(1)
      }));
    } else {
      availableColors = roles.map(r => ({
        role: r,
        color: db.ROLE_COLORS[r] || db.ROLE_COLORS.viewer,
        name: r.charAt(0).toUpperCase() + r.slice(1)
      }));
    }
    
    console.log(`🎭 Roles API for ${displayName}:`, { roles, primaryRole });
    
    res.json({ 
      primaryRole,
      roles,
      availableColors,
      displayName: displayName
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * Helper function to determine if we should fetch roles from Twitch API
 */
function shouldFetchRolesFromTwitchAPI(existingRoles) {
  // No existing roles - need to fetch
  if (!existingRoles || existingRoles.length === 0) {
    return true;
  }
  
  // Only has 'viewer' role - may have higher roles to fetch
  if (existingRoles.length === 1 && existingRoles[0] === 'viewer') {
    return true;
  }
  
  // Has other roles - use existing
  return false;
}

/**
 * POST /create
 * Create a new character for the user in a specific channel
 */
router.post('/create',
  validation.validateCharacterCreate,
  rateLimiter.middleware('strict'),
  security.auditLog('create_character'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { channel, classType, nameColor, selectedRoleBadge } = req.body;
    if (!channel || !classType) {
      return res.status(400).json({ error: 'Channel and classType required' });
    }
    
    const channelName = channel.toLowerCase();
    const rawCharacterName = user.displayName || user.display_name || 'Adventurer';
    const characterName = sanitization.sanitizeCharacterName(rawCharacterName);
    
    // Validate nameColor if provided
    let validatedColor = null;
    if (nameColor) {
      validatedColor = sanitization.sanitizeColorCode(nameColor);
      if (!validatedColor) {
        return res.status(400).json({ error: 'Invalid color code format' });
      }
    }
    
    // Validate selectedRoleBadge if provided
    let validatedRoleBadge = null;
    if (selectedRoleBadge && typeof selectedRoleBadge === 'string') {
      validatedRoleBadge = selectedRoleBadge.toLowerCase();
    }
    
    try {
      // Check if character already exists
      const existing = await db.getCharacter(user.id, channelName);
      if (existing) {
        return res.status(400).json({ error: 'Character already exists for this channel' });
      }
      
      // Check if user has existing roles from previous activity (e.g., Twitch chat)
      const existingProgress = await db.loadPlayerProgress(user.id, channelName);
      let userRoles = existingProgress?.roles || null;
      
      // Try to fetch from Twitch API if we don't have accurate roles and broadcaster is authenticated
      if (shouldFetchRolesFromTwitchAPI(userRoles)) {
        const broadcasterAuth = await db.getBroadcasterAuth(channelName);
        
        if (broadcasterAuth && user.twitchId) {
          console.log(`🔍 Fetching roles from Twitch API for ${characterName}`);
          try {
            const fetchedRoles = await fetchUserRolesFromTwitch(
              broadcasterAuth.accessToken,
              broadcasterAuth.broadcasterId,
              user.twitchId,
              characterName,
              channelName
            );
            
            if (fetchedRoles && fetchedRoles.length > 0) {
              userRoles = fetchedRoles;
              console.log(`✅ Fetched roles from Twitch API:`, userRoles);
            } else {
              userRoles = ['viewer'];
            }
          } catch (error) {
            console.error('Failed to fetch roles from Twitch API:', error);
            // Fall back to existing roles or viewer
            userRoles = userRoles || ['viewer'];
          }
        } else {
          // No broadcaster auth or twitchId - fall back to existing or viewer
          userRoles = userRoles || ['viewer'];
          if (!broadcasterAuth) {
            console.log(`⚠️ Broadcaster not authenticated for channel ${channelName} - using fallback role detection`);
          }
        }
      }
      
      // Ensure userRoles is never null
      userRoles = userRoles || ['viewer'];
      
      // Create new character
      const character = await db.createCharacter(user.id, channelName, characterName, classType);
      
      // Check if this is MarrowOfAlbion (game creator) and set creator role
      if (GAME_CREATOR_USERNAMES.includes(characterName.toLowerCase())) {
        userRoles = ['creator'];
        character.nameColor = validatedColor || '#FFD700'; // Default to gold for creator
        console.log('🎮 Game creator MarrowOfAlbion detected - granting creator role');
      } else {
        // Check if user is a beta tester using player ID (twitch-{id})
        if (db.isBetaTester(user.id) && !userRoles.includes('tester')) {
          userRoles = [...userRoles, 'tester'];
          console.log('🧪 Beta tester detected - granting tester role');
        }
        
        // Set appropriate default name color based on highest role if not provided
        if (!validatedColor) {
          const highestRole = db.ROLE_HIERARCHY.find(r => userRoles.includes(r)) || 'viewer';
          character.nameColor = db.ROLE_COLORS[highestRole];
        } else {
          character.nameColor = validatedColor;
        }
      }
      
      // Apply roles to character
      character.roles = userRoles;
      console.log(`🎭 Assigned roles to ${characterName}:`, userRoles);
      
      // Set selectedRoleBadge - use validated one from frontend if provided and user has that role,
      // otherwise use highest priority role
      if (validatedRoleBadge && userRoles.includes(validatedRoleBadge)) {
        character.selectedRoleBadge = validatedRoleBadge;
        console.log(`🎯 Set selectedRoleBadge from frontend: ${validatedRoleBadge}`);
      } else {
        const primaryRole = db.ROLE_HIERARCHY.find(r => userRoles.includes(r)) || 'viewer';
        character.selectedRoleBadge = primaryRole;
        console.log(`🎯 Set selectedRoleBadge to highest priority role: ${primaryRole}`);
      }
      
      // Save character with roles and color
      await db.saveCharacter(user.id, channelName, character);
      
      // Emit WebSocket update for new character creation
      socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      
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

/**
 * GET /stats
 * Get detailed character stats breakdown and player data
 */
router.get('/stats', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const statsBreakdown = character.getStatsBreakdown();
    const finalStats = character.getFinalStats();
    
    res.json({
      username: character.name,
      class: character.classData?.name || 'Unknown',
      level: character.level,
      xp: character.xp,
      xpToNextLevel: character.xpToNext,
      hp: character.hp,
      maxHp: finalStats.maxHp,
      mana: character.mana || 0,
      maxMana: character.maxMana || 100,
      gold: character.gold,
      nameColor: character.nameColor || '#FFFFFF',
      channel: channelName,
      stats: {
        attack: finalStats.attack,
        defense: finalStats.defense,
        magic: finalStats.magic,
        agility: finalStats.agility,
        strength: finalStats.strength,
        critChance: parseFloat(finalStats.critChance) || 5,
        dodgeChance: parseFloat(finalStats.dodgeChance) || 0,
        blockChance: parseFloat(finalStats.blockChance) || 0
      },
      statsBreakdown: statsBreakdown
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /inventory
 * Get player inventory with item details
 */
router.get('/inventory', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
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
 * GET /equipment
 * Get player equipped items with details
 */
router.get('/equipment', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
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
 * POST /equip
 * Equip an item from inventory - WITH VALIDATION
 */
router.post('/equip',
  validation.validateEquipment,
  rateLimiter.middleware('default'),
  security.auditLog('equip_item'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { channel, itemId } = req.body;
    if (!channel || !itemId) {
      return res.status(400).json({ error: 'Channel and itemId required' });
    }
    
    const channelName = channel.toLowerCase();
    const sanitizedItemId = sanitization.sanitizeInput(itemId, { maxLength: 100 });
    
    try {
      const character = await db.getCharacter(user.id, channelName);
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const result = character.equipItem(sanitizedItemId);
      
      if (result.success) {
        await db.saveCharacter(user.id, channelName, character);
        socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error equipping item:', error);
      res.status(500).json({ error: 'Failed to equip item' });
    }
  });

/**
 * POST /unequip
 * Unequip an item to inventory - WITH VALIDATION
 */
router.post('/unequip',
  validation.validateEquipment,
  rateLimiter.middleware('default'),
  security.auditLog('unequip_item'),
  async (req, res) => {
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
        socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error unequipping item:', error);
      res.status(500).json({ error: 'Failed to unequip item' });
    }
  });

/**
 * POST /role-display
 * Update player's name color and selected role badge (must be from one of their available roles)
 */
router.post('/role-display',
  rateLimiter.middleware('default'),
  security.auditLog('update_role_display'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { nameColor, selectedRoleBadge } = req.body;
    if (!nameColor || !selectedRoleBadge) {
      return res.status(400).json({ error: 'nameColor and selectedRoleBadge required' });
    }
    
    // Validate color format
    const validatedColor = sanitization.sanitizeColorCode(nameColor);
    if (!validatedColor) {
      return res.status(400).json({ error: 'Invalid color code format' });
    }
    
    // Validate role badge is a string
    if (typeof selectedRoleBadge !== 'string') {
      return res.status(400).json({ error: 'Invalid role badge format' });
    }
    
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    const channelName = CHANNELS[0] || 'default';
    
    try {
      // Load player data
      const playerData = await db.loadPlayerProgress(user.id, channelName);
      if (!playerData) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      // Sync roles (add creator/tester if applicable)
      let roles = playerData.roles || ['viewer'];
      const displayName = user.displayName || user.display_name || 'Adventurer';
      let rolesUpdated = false;
      
      // Check if this is MarrowOfAlbion (game creator) - add creator role if not present
      if (GAME_CREATOR_USERNAMES.includes(displayName.toLowerCase())) {
        if (!roles.includes('creator')) {
          roles = ['creator', ...roles.filter(r => r !== 'viewer')];
          rolesUpdated = true;
        }
      }
      
      // Check if user is a beta tester - add tester role if not present
      if (db.isBetaTester(displayName) && !roles.includes('tester')) {
        roles = [...roles, 'tester'];
        rolesUpdated = true;
      }
      
      // Persist role changes
      if (rolesUpdated) {
        playerData.roles = roles;
        console.log(`✅ Synced roles for ${displayName}:`, roles);
      }
      
      // Validate that the color and badge match one of their roles
      const isCreator = roles.includes('creator');
      const validRoles = roles.map(r => r.toLowerCase());
      const validColors = roles.map(r => db.ROLE_COLORS[r]);
      
      // Creators can select any role appearance
      if (!isCreator) {
        if (!validColors.includes(validatedColor)) {
          console.warn(`[SECURITY] Invalid color selection attempt by ${security.sanitizeUserForLog(user)}: ${validatedColor} not in ${validColors}`);
          return res.status(403).json({ error: 'Color not available for your roles' });
        }
        
        if (!validRoles.includes(selectedRoleBadge.toLowerCase())) {
          console.warn(`[SECURITY] Invalid badge selection attempt by ${security.sanitizeUserForLog(user)}: ${selectedRoleBadge} not in ${validRoles}`);
          return res.status(403).json({ error: 'Badge not available for your roles' });
        }
      } else {
        // Validate creator is selecting a valid role that exists in the system
        const allValidRoles = db.ROLE_HIERARCHY.map(r => r.toLowerCase());
        const allValidColors = Object.values(db.ROLE_COLORS);
        
        if (!allValidColors.includes(validatedColor)) {
          console.warn(`[SECURITY] Invalid color selection by creator ${security.sanitizeUserForLog(user)}: ${validatedColor}`);
          return res.status(403).json({ error: 'Invalid color code' });
        }
        
        if (!allValidRoles.includes(selectedRoleBadge.toLowerCase())) {
          console.warn(`[SECURITY] Invalid badge selection by creator ${security.sanitizeUserForLog(user)}: ${selectedRoleBadge}`);
          return res.status(403).json({ error: 'Invalid role badge' });
        }
      }
      
      // Update name color and selected role badge
      playerData.nameColor = validatedColor;
      playerData.selectedRoleBadge = selectedRoleBadge.toLowerCase();
      await db.savePlayerProgress(user.id, channelName, playerData);
      
      // Emit websocket event for live update with complete player data
      const character = await db.getCharacter(user.id, channelName);
      if (character) {
        socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
      }
      
      res.json({ success: true, nameColor: validatedColor, selectedRoleBadge: selectedRoleBadge.toLowerCase() });
    } catch (error) {
      console.error('Error updating role display:', error);
      res.status(500).json({ error: 'Failed to update role display' });
    }
  });

/**
 * POST /theme
 * Update player's theme preference
 */
router.post('/theme',
  rateLimiter.middleware('default'),
  security.auditLog('update_theme'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const { theme } = req.body;
    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Theme required' });
    }
    
    // Validate theme is one of the allowed themes
    const validThemes = ['crimson-knight', 'lovecraftian', 'azure-mage', 'golden-paladin', 'shadow-assassin', 'frost-warden'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    const channelName = CHANNELS[0] || 'default';
    
    try {
      // Load player data
      const playerData = await db.loadPlayerProgress(user.id, channelName);
      if (!playerData) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      // Update theme
      playerData.theme = theme;
      await db.savePlayerProgress(user.id, channelName, playerData);
      
      // Emit WebSocket update for realtime theme change
      if (playerData.name) {
        socketHandler.emitPlayerUpdate(playerData.name, channelName, { theme });
      }
      
      console.log(`✅ Theme updated for ${user.displayName}: ${theme}`);
      res.json({ success: true, theme });
    } catch (error) {
      console.error('Error updating theme:', error);
      res.status(500).json({ error: 'Failed to update theme' });
    }
  });

module.exports = router;
