const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /
 * Get player inventory (convenience alias for /api/player/inventory)
 */
router.get('/', async (req, res) => {
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
    
    const inventorySummary = character.inventory.getSummary();
    res.json({ 
      items: inventorySummary.items,
      equipment: character.equipment.toObject()
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

module.exports = router;
