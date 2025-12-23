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
    const equipmentSummary = character.equipment.getSummary();
    res.json({ 
      items: inventorySummary.items,
      equipment: equipmentSummary.equipped  // Use the full equipped items with stats
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * POST /discard
 * Discard an item from inventory
 */
router.post('/discard', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { itemId, channel } = req.body;
  
  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'Channel is required' });
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const character = await db.getCharacter(user.id, channelName);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Find the item in inventory
    const itemIndex = character.inventory.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }
    
    const item = character.inventory.items[itemIndex];
    
    // Remove the item from inventory
    character.inventory.items.splice(itemIndex, 1);
    
    // Save the character
    await db.saveCharacter(user.id, channelName, character);
    
    res.json({ 
      success: true, 
      message: `${item.name} has been discarded`,
      itemName: item.name 
    });
  } catch (error) {
    console.error('Error discarding item:', error);
    res.status(500).json({ error: 'Failed to discard item' });
  }
});

module.exports = router;
