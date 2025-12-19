const express = require('express');
const router = express.Router();
const db = require('../db');
const CraftingManager = require('../game/CraftingManager');
const socketHandler = require('../websocket/socketHandler');

const craftingMgr = new CraftingManager();

/**
 * GET /recipes
 * Get all crafting recipes
 * Query: category (optional), player, channel (for filtering craftable)
 */
router.get('/recipes', async (req, res) => {
  try {
    const { category, player, channel } = req.query;

    let recipes;
    if (category) {
      recipes = await craftingMgr.getRecipesByCategory(category);
    } else {
      recipes = await craftingMgr.getAllRecipes();
    }

    // If player provided, filter by craftable
    if (player && channel) {
      const userId = await db.getUserId(player, channel);
      if (userId) {
        const character = await db.getCharacter(userId, channel);
        recipes = await craftingMgr.getCraftableRecipes(character);
      }
    }

    res.json({ recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

/**
 * GET /recipe/:recipeId
 * Get specific recipe details
 */
router.get('/recipe/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const recipe = await craftingMgr.getRecipe(recipeId);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ recipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

/**
 * POST /craft
 * Craft an item
 * Body: { player, channel, recipeId }
 */
router.post('/craft', async (req, res) => {
  try {
    const { player, channel, recipeId } = req.body;

    if (!player || !channel || !recipeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await craftingMgr.craftItem(character, recipeId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory/gold changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error crafting item:', error);
    res.status(500).json({ error: 'Failed to craft item' });
  }
});

/**
 * POST /salvage
 * Salvage an item for materials
 * Body: { player, channel, itemId }
 */
router.post('/salvage', async (req, res) => {
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
    const result = await craftingMgr.salvageItem(character, itemId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time inventory changes
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
      socketHandler.emitInventoryUpdate(character.name, channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error salvaging item:', error);
    res.status(500).json({ error: 'Failed to salvage item' });
  }
});

/**
 * GET /summary
 * Get crafting summary for character
 * Query: player, channel
 */
router.get('/summary', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const summary = await craftingMgr.getCraftingSummary(character);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching crafting summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * POST /discover
 * Discover a new recipe
 * Body: { player, channel, recipeId }
 */
router.post('/discover', async (req, res) => {
  try {
    const { player, channel, recipeId } = req.body;

    if (!player || !channel || !recipeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const result = await craftingMgr.discoverRecipe(character, recipeId);

    if (result.success) {
      await db.saveCharacter(userId, channel, character);
      
      // Emit WebSocket update for real-time recipe discovery
      socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());
    }

    res.json(result);
  } catch (error) {
    console.error('Error discovering recipe:', error);
    res.status(500).json({ error: 'Failed to discover recipe' });
  }
});

module.exports = router;
