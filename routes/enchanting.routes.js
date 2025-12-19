const express = require('express');
const router = express.Router();
const db = require('../db');
const EnchantingManager = require('../game/EnchantingManager');
const socketHandler = require('../websocket/socketHandler');

const enchantingMgr = new EnchantingManager();

/**
 * GET /enchantments
 * Get all enchantments available for a slot
 * Query: slot (optional)
 */
router.get('/enchantments', async (req, res) => {
  try {
    const { slot } = req.query;

    let enchantments;
    if (slot) {
      enchantments = await enchantingMgr.getEnchantmentsForSlot(slot);
    } else {
      await enchantingMgr.loadEnchantments();
      enchantments = [];
      for (const category in enchantingMgr.enchantments) {
        for (const rarity in enchantingMgr.enchantments[category]) {
          enchantments.push(...enchantingMgr.enchantments[category][rarity]);
        }
      }
    }

    res.json({ enchantments });
  } catch (error) {
    console.error('Error fetching enchantments:', error);
    res.status(500).json({ error: 'Failed to fetch enchantments' });
  }
});

/**
 * GET /enchantment/:enchantmentId
 * Get specific enchantment details
 */
router.get('/enchantment/:enchantmentId', async (req, res) => {
  try {
    const { enchantmentId } = req.params;
    const enchantment = await enchantingMgr.getEnchantment(enchantmentId);

    if (!enchantment) {
      return res.status(404).json({ error: 'Enchantment not found' });
    }

    res.json({ enchantment });
  } catch (error) {
    console.error('Error fetching enchantment:', error);
    res.status(500).json({ error: 'Failed to fetch enchantment' });
  }
});

/**
 * POST /enchant
 * Enchant an item
 * Body: { player, channel, itemId, enchantmentId }
 */
router.post('/enchant', async (req, res) => {
  try {
    const { player, channel, itemId, enchantmentId } = req.body;

    if (!player || !channel || !itemId || !enchantmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await enchantingMgr.enchantItem(character, itemId, enchantmentId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory/gold changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error enchanting item:', error);
    res.status(500).json({ error: 'Failed to enchant item' });
  }
});

/**
 * POST /remove
 * Remove an enchantment from an item
 * Body: { player, channel, itemId, enchantmentIndex }
 */
router.post('/remove', async (req, res) => {
  try {
    const { player, channel, itemId, enchantmentIndex } = req.body;

    if (!player || !channel || !itemId || enchantmentIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await enchantingMgr.removeEnchantment(character, itemId, enchantmentIndex);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error removing enchantment:', error);
    res.status(500).json({ error: 'Failed to remove enchantment' });
  }
});

/**
 * POST /disenchant
 * Disenchant an item to recover materials
 * Body: { player, channel, itemId }
 */
router.post('/disenchant', async (req, res) => {
  try {
    const { player, channel, itemId } = req.body;

    if (!player || !channel || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await enchantingMgr.disenchantItem(character, itemId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error disenchanting item:', error);
    res.status(500).json({ error: 'Failed to disenchant item' });
  }
});

module.exports = router;
