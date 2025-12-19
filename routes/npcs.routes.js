const express = require('express');
const router = express.Router();
const db = require('../db');
const NPCManager = require('../game/NPCManager');
const DialogueManager = require('../game/DialogueManager');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /
 * Get all NPCs with basic info
 */
router.get('/', (req, res) => {
  try {
    const npcMgr = new NPCManager();
    const npcs = npcMgr.getAllNPCs();

    res.json({
      success: true,
      npcs
    });
  } catch (error) {
    console.error('Error getting NPCs:', error);
    res.status(500).json({ error: 'Failed to get NPCs' });
  }
});

/**
 * GET /location/:location
 * Get NPCs in a specific location
 */
router.get('/location/:location', (req, res) => {
  try {
    const { location } = req.params;
    const npcMgr = new NPCManager();
    const npcs = npcMgr.getNPCsInLocation(location);

    res.json({
      success: true,
      location,
      npcs
    });
  } catch (error) {
    console.error('Error getting location NPCs:', error);
    res.status(500).json({ error: 'Failed to get location NPCs' });
  }
});

/**
 * GET /type/:type
 * Get NPCs by type (merchant, quest_giver, companion, lore_keeper)
 */
router.get('/type/:type', (req, res) => {
  try {
    const { type } = req.params;
    const npcMgr = new NPCManager();
    const npcs = npcMgr.getNPCsByType(type);

    res.json({
      success: true,
      type,
      npcs
    });
  } catch (error) {
    console.error('Error getting NPCs by type:', error);
    res.status(500).json({ error: 'Failed to get NPCs by type' });
  }
});

/**
 * GET /:npcId
 * Get detailed info about a specific NPC
 */
router.get('/:npcId', (req, res) => {
  try {
    const { npcId } = req.params;
    const npcMgr = new NPCManager();
    const npc = npcMgr.getNPC(npcId);

    if (!npc) {
      return res.status(404).json({ error: 'NPC not found' });
    }

    res.json({
      success: true,
      npc
    });
  } catch (error) {
    console.error('Error getting NPC:', error);
    res.status(500).json({ error: 'Failed to get NPC' });
  }
});

/**
 * POST /:npcId/interact
 * Interact with an NPC (get greeting, dialogue, and available actions)
 */
router.post('/:npcId/interact', async (req, res) => {
  try {
    const { npcId } = req.params;
    const { player, channel } = req.body;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const npcMgr = new NPCManager();

    const interaction = npcMgr.interactWithNPC(npcId, character);

    if (!interaction.success) {
      return res.status(400).json(interaction);
    }

    res.json(interaction);
  } catch (error) {
    console.error('Error interacting with NPC:', error);
    res.status(500).json({ error: 'Failed to interact with NPC' });
  }
});

/**
 * POST /:npcId/spawn-check
 * Check if NPC should spawn (for random encounters)
 */
router.post('/:npcId/spawn-check', (req, res) => {
  try {
    const { npcId } = req.params;
    const npcMgr = new NPCManager();

    const spawned = npcMgr.checkNPCSpawn(npcId);
    const npc = npcMgr.getNPC(npcId);

    if (!npc) {
      return res.status(404).json({ error: 'NPC not found' });
    }

    res.json({
      success: true,
      spawned,
      npc: spawned ? {
        id: npc.id,
        name: npc.name,
        description: npc.description,
        greeting: npc.greeting
      } : null
    });
  } catch (error) {
    console.error('Error checking NPC spawn:', error);
    res.status(500).json({ error: 'Failed to check NPC spawn' });
  }
});

module.exports = router;
