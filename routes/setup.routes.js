const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Middleware: Require broadcaster authentication
 */
function requireBroadcaster(req, res, next) {
  if (!req.session.user || !req.session.isBroadcaster) {
    return res.status(403).json({ 
      error: 'Only broadcasters can access setup' 
    });
  }
  next();
}

/**
 * GET /api/setup/settings
 * Get current game settings for broadcaster's channel
 */
router.get('/settings', requireBroadcaster, async (req, res) => {
  try {
    const channel = req.session.broadcasterChannel;
    if (!channel) {
      return res.status(400).json({ error: 'No channel associated with session' });
    }
    
    const gameState = await db.getGameState(channel);
    
    res.json({
      success: true,
      settings: {
        worldName: gameState.world_name || 'Ashbee Realms',
        gameMode: gameState.game_mode || 'softcore',
        weather: gameState.weather || 'Clear',
        timeOfDay: gameState.time_of_day || 'Day',
        season: gameState.season || 'Spring',
        maintenanceMode: gameState.maintenance_mode || false,
        activeEvent: gameState.active_event || null
      },
      channel,
      isExistingSetup: !!gameState.last_updated // True if settings were previously saved
    });
  } catch (error) {
    console.error('Error fetching setup settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * POST /api/setup/settings
 * Update game settings for broadcaster's channel
 */
router.post('/settings', requireBroadcaster, async (req, res) => {
  try {
    const channel = req.session.broadcasterChannel;
    if (!channel) {
      return res.status(400).json({ error: 'No channel associated with session' });
    }
    
    const {
      worldName,
      gameMode,
      weather,
      timeOfDay,
      season,
      maintenanceMode,
      activeEvent
    } = req.body;
    
    // Validation
    const validGameModes = ['softcore', 'hardcore', 'ironman'];
    const validWeather = ['Clear', 'Rain', 'Snow', 'Storm', 'Fog'];
    const validTimeOfDay = ['Day', 'Night', 'Dawn', 'Dusk'];
    const validSeasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    
    if (gameMode && !validGameModes.includes(gameMode)) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }
    
    if (weather && !validWeather.includes(weather)) {
      return res.status(400).json({ error: 'Invalid weather' });
    }
    
    if (timeOfDay && !validTimeOfDay.includes(timeOfDay)) {
      return res.status(400).json({ error: 'Invalid time of day' });
    }
    
    if (season && !validSeasons.includes(season)) {
      return res.status(400).json({ error: 'Invalid season' });
    }
    
    // Sanitize world name - remove potentially harmful characters
    let sanitizedWorldName = 'Ashbee Realms';
    if (worldName) {
      // Allow only alphanumeric, spaces, hyphens, apostrophes, and basic punctuation
      sanitizedWorldName = worldName
        .replace(/[^a-zA-Z0-9\s\-',.!]/g, '')
        .trim()
        .substring(0, 50);
      
      // If nothing left after sanitization, use default
      if (!sanitizedWorldName) {
        sanitizedWorldName = 'Ashbee Realms';
      }
    }
    
    // Update game state
    const updatedState = await db.setGameState(channel, {
      world_name: sanitizedWorldName,
      game_mode: gameMode || 'softcore',
      weather: weather || 'Clear',
      time_of_day: timeOfDay || 'Day',
      season: season || 'Spring',
      maintenance_mode: maintenanceMode || false,
      active_event: activeEvent || null
    });
    
    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        worldName: updatedState.world_name,
        gameMode: updatedState.game_mode,
        weather: updatedState.weather,
        timeOfDay: updatedState.time_of_day,
        season: updatedState.season,
        maintenanceMode: updatedState.maintenance_mode,
        activeEvent: updatedState.active_event
      }
    });
  } catch (error) {
    console.error('Error saving setup settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
