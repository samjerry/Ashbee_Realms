const express = require('express');
const router = express.Router();
const db = require('../db');
const DialogueManager = require('../game/DialogueManager');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /:npcId
 * Get available dialogue conversations for an NPC
 */
router.get('/:npcId', async (req, res) => {
  try {
    const { npcId } = req.params;
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player/channel' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const dialogueMgr = new DialogueManager();

    const conversations = dialogueMgr.getAvailableConversations(npcId, character);

    res.json({
      success: true,
      npcId,
      conversations
    });
  } catch (error) {
    console.error('Error getting dialogue:', error);
    res.status(500).json({ error: 'Failed to get dialogue' });
  }
});

/**
 * POST /start
 * Start a dialogue conversation with an NPC
 */
router.post('/start', async (req, res) => {
  try {
    const { player, channel, npcId, conversationId } = req.body;

    if (!player || !channel || !npcId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const dialogueMgr = new DialogueManager();
    
    // Fetch custom world name for this channel
    const worldName = await db.getWorldName(channel);

    const result = dialogueMgr.startConversation(npcId, character, conversationId, worldName);

    if (!result.success) {
      return res.status(400).json(result);
    }

    await db.saveCharacter(userId, channel, character);
    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());

    res.json(result);
  } catch (error) {
    console.error('Error starting dialogue:', error);
    res.status(500).json({ error: 'Failed to start dialogue' });
  }
});

/**
 * POST /choice
 * Make a choice in a dialogue conversation
 */
router.post('/choice', async (req, res) => {
  try {
    const { player, channel, npcId, conversationId, currentNodeId, choiceIndex } = req.body;

    if (!player || !channel || !npcId || !conversationId || !currentNodeId || choiceIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const dialogueMgr = new DialogueManager();
    
    // Fetch custom world name for this channel
    const worldName = await db.getWorldName(channel);

    const result = dialogueMgr.makeChoice(npcId, conversationId, currentNodeId, choiceIndex, character, worldName);

    if (!result.success) {
      return res.status(400).json(result);
    }

    await db.saveCharacter(userId, channel, character);
    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());

    res.json(result);
  } catch (error) {
    console.error('Error making dialogue choice:', error);
    res.status(500).json({ error: 'Failed to make dialogue choice' });
  }
});

module.exports = router;
