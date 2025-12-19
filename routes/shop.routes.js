const express = require('express');
const router = express.Router();
const db = require('../db');
const ShopManager = require('../game/ShopManager');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /merchants
 * Get all merchants with basic info
 */
router.get('/merchants', (req, res) => {
  try {
    const shopMgr = new ShopManager();
    const merchants = shopMgr.getAllMerchants();

    res.json({
      success: true,
      merchants
    });
  } catch (error) {
    console.error('Error getting merchants:', error);
    res.status(500).json({ error: 'Failed to get merchants' });
  }
});

/**
 * GET /merchants/:location
 * Get merchants in a specific location
 */
router.get('/merchants/:location', (req, res) => {
  try {
    const { location } = req.params;
    const shopMgr = new ShopManager();
    const merchants = shopMgr.getMerchantsInLocation(location);

    res.json({
      success: true,
      location,
      merchants: merchants.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        merchant_type: m.merchant_type,
        greeting: m.greeting
      }))
    });
  } catch (error) {
    console.error('Error getting location merchants:', error);
    res.status(500).json({ error: 'Failed to get location merchants' });
  }
});

/**
 * GET /:merchantId
 * Get merchant inventory and details
 */
router.get('/:merchantId', (req, res) => {
  try {
    const { merchantId } = req.params;
    const shopMgr = new ShopManager();
    const merchant = shopMgr.getMerchant(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const inventory = shopMgr.getMerchantInventory(merchantId);
    const greeting = shopMgr.getMerchantGreeting(merchantId);

    res.json({
      success: true,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        description: merchant.description,
        merchant_type: merchant.merchant_type
      },
      greeting,
      inventory
    });
  } catch (error) {
    console.error('Error getting merchant inventory:', error);
    res.status(500).json({ error: 'Failed to get merchant inventory' });
  }
});

/**
 * POST /buy
 * Buy item from merchant
 */
router.post('/buy', async (req, res) => {
  try {
    const { player, channel, merchantId, itemId, quantity = 1 } = req.body;

    if (!player || !channel || !merchantId || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const shopMgr = new ShopManager();

    const result = shopMgr.buyItem(character, merchantId, itemId, quantity);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error buying item:', error);
    res.status(500).json({ error: 'Failed to buy item' });
  }
});

/**
 * POST /sell
 * Sell item to merchant
 */
router.post('/sell', async (req, res) => {
  try {
    const { player, channel, merchantId, itemId, quantity = 1 } = req.body;

    if (!player || !channel || !merchantId || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const shopMgr = new ShopManager();

    const result = shopMgr.sellItem(character, merchantId, itemId, quantity);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error selling item:', error);
    res.status(500).json({ error: 'Failed to sell item' });
  }
});

module.exports = router;
