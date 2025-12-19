const express = require('express');
const router = express.Router();
const db = require('../db');
const ConsumableManager = require('../game/ConsumableManager');
const ItemComparator = require('../game/ItemComparator');
const socketHandler = require('../websocket/socketHandler');

/**
 * POST /consumable/use
 * Use a consumable item
 */
router.post('/consumable/use', async (req, res) => {
  try {
    const { player, channel, itemId, context = {} } = req.body;

    if (!player || !channel || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const consumableMgr = new ConsumableManager();

    const result = consumableMgr.useConsumable(character, itemId, context);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error using consumable:', error);
    res.status(500).json({ error: 'Failed to use consumable' });
  }
});

/**
 * POST /compare
 * Compare two items
 */
router.post('/compare', async (req, res) => {
  try {
    const { player, channel, itemId1, itemId2 } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const comparator = new ItemComparator();

    // If only itemId1 provided, compare with equipped
    if (itemId1 && !itemId2) {
      const result = comparator.compareWithEquipped(character, itemId1);
      return res.json(result);
    }

    // Both items provided - direct comparison
    const item1Data = comparator.getItemData(itemId1);
    const item2Data = comparator.getItemData(itemId2);

    const result = comparator.compareEquipment(item1Data, item2Data);
    res.json(result);
  } catch (error) {
    console.error('Error comparing items:', error);
    res.status(500).json({ error: 'Failed to compare items' });
  }
});

/**
 * GET /upgrades
 * Get upgrade suggestions for player
 */
router.get('/upgrades', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const comparator = new ItemComparator();

    const suggestions = comparator.getUpgradeSuggestions(character);

    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Error getting upgrade suggestions:', error);
    res.status(500).json({ error: 'Failed to get upgrade suggestions' });
  }
});

module.exports = router;
