const express = require('express');
const router = express.Router();
const db = require('../db');
const QuestManager = require('../game/QuestManager');
const ProgressionManager = require('../game/ProgressionManager');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /available
 * Get available quests for character
 */
router.get('/available', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel, location, npcId } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.json({ success: true, quests: [] });
    }

    const activeQuests = character.activeQuests || [];
    const completedQuests = character.completedQuests || [];

    // Extract quest IDs from quest state objects
    const activeQuestIds = activeQuests.map(q => q.questId);
    const completedQuestIds = completedQuests.map(q => q.questId || q.id);

    const questMgr = new QuestManager();
    let available = questMgr.getAvailableQuests(character, activeQuestIds, completedQuestIds);

    // Filter by location if specified
    if (location) {
      available = available.filter(quest => {
        // For now, we don't have location data in quests, so we'll return all
        // In the future, you can add quest.location or quest.available_at fields
        return true;
      });
    }

    // Filter by NPC if specified
    if (npcId) {
      available = available.filter(quest => {
        // For now, we don't have NPC data in quests, so we'll return all
        // In the future, you can add quest.npc_id or quest.offered_by fields
        return true;
      });
    }

    res.json({
      success: true,
      quests: available || [],
      location: location || null,
      npcId: npcId || null
    });
  } catch (error) {
    console.error('Error getting available quests:', error);
    res.status(500).json({ error: 'Failed to get available quests' });
  }
});

/**
 * POST /accept
 * Accept a quest
 */
router.post('/accept', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel, questId, source, npcId, location } = req.body;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  if (!questId) {
    return res.status(400).json({ error: 'Quest ID required' });
  }

  // Validate source if provided
  if (source && !['npc', 'quest_board'].includes(source)) {
    return res.status(400).json({ error: 'Invalid quest source. Must be "npc" or "quest_board"' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const completedQuests = character.completedQuests || [];

    // Check if already active
    if (activeQuests.some(q => q.questId === questId)) {
      return res.status(400).json({ error: 'Quest already active' });
    }

    const questMgr = new QuestManager();
    const result = questMgr.acceptQuest(questId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Track source in quest state
    if (source) {
      result.questState.acceptedFrom = source;
      if (npcId) result.questState.acceptedFromNpcId = npcId;
      if (location) result.questState.acceptedFromLocation = location;
    }

    // Add to active quests
    activeQuests.push(result.questState);
    character.activeQuests = activeQuests;

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit real-time quest update
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitQuestUpdate(user.login || user.displayName, channel.toLowerCase());
    socketHandler.emitNotification(user.login || user.displayName, channel.toLowerCase(), {
      type: 'quest_accepted',
      title: 'Quest Accepted',
      message: `You have accepted: ${result.quest.name}`,
      quest: result.quest
    });

    res.json({
      success: true,
      quest: result.quest,
      dialogue: result.dialogue,
      questState: result.questState
    });
  } catch (error) {
    console.error('Error accepting quest:', error);
    res.status(500).json({ error: 'Failed to accept quest' });
  }
});

/**
 * POST /abandon
 * Abandon an active quest
 */
router.post('/abandon', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel, questId } = req.body;
  
  // Log the request for debugging
  console.log('[Quest Abandon] Request:', { userId: user.id, channel, questId, body: req.body });
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    console.log('[Quest Abandon] Error: No channel configured');
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  if (!questId) {
    console.log('[Quest Abandon] Error: Quest ID required');
    return res.status(400).json({ error: 'Quest ID required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      console.log('[Quest Abandon] Error: Character not found');
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    
    // Find and remove the quest
    const questIndex = activeQuests.findIndex(q => q.questId === questId);
    if (questIndex === -1) {
      console.log('[Quest Abandon] Error: Quest not active. Active quests:', activeQuests.map(q => q.questId));
      return res.status(400).json({ error: 'Quest not active' });
    }
    
    activeQuests.splice(questIndex, 1);
    character.activeQuests = activeQuests;

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    console.log('[Quest Abandon] Success: Quest abandoned', questId);

    // Emit real-time quest update
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitQuestUpdate(user.login || user.displayName, channel.toLowerCase());

    res.json({
      success: true,
      message: 'Quest abandoned'
    });
  } catch (error) {
    console.error('[Quest Abandon] Error:', error);
    res.status(500).json({ error: 'Failed to abandon quest' });
  }
});

/**
 * GET /active
 * Get all active quests
 */
router.get('/active', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let { channel } = req.query;
  
  // If no channel specified, use the first channel from CHANNELS environment variable
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.json({ success: true, quests: [] });
    }

    const activeQuests = character.activeQuests || [];
    const questMgr = new QuestManager();

    const questProgress = activeQuests.map(questState => 
      questMgr.getQuestProgress(questState)
    ).filter(q => q !== null);

    res.json({
      success: true,
      quests: questProgress
    });
  } catch (error) {
    console.error('Error getting active quests:', error);
    res.status(500).json({ error: 'Failed to get active quests' });
  }
});

/**
 * POST /complete
 * Complete a quest and receive rewards
 */
router.post('/complete', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, questId } = req.body;
  if (!channel || !questId) {
    return res.status(400).json({ error: 'Channel and questId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const questState = activeQuests.find(q => q.questId === questId);

    if (!questState) {
      return res.status(404).json({ error: 'Quest not active' });
    }

    const questMgr = new QuestManager();
    const result = questMgr.completeQuest(character, questState);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Remove from active quests
    character.activeQuests = activeQuests.filter(q => q.questId !== questId);

    // Add to completed quests
    const completedQuests = character.completedQuests || [];
    completedQuests.push(questId);
    character.completedQuests = completedQuests;

    // Apply XP reward
    if (result.rewards.xp > 0) {
      const progressionMgr = new ProgressionManager();
      const xpResult = progressionMgr.addXP(character, result.rewards.xp);
      
      if (xpResult.leveledUp) {
        result.levelUp = {
          newLevel: character.level,
          statsGained: xpResult.statsGained
        };
      }
    }

    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit websocket event for live update (quest rewards: gold, xp, etc.)
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      quest: result.quest,
      rewards: result.rewards,
      dialogue: result.dialogue,
      levelUp: result.levelUp || null
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

/**
 * GET /progress/:questId
 * Get detailed progress for a specific quest
 */
router.get('/progress/:questId', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { questId } = req.params;
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const activeQuests = character.activeQuests || [];
    const questState = activeQuests.find(q => q.questId === questId);

    if (!questState) {
      return res.status(404).json({ error: 'Quest not active' });
    }

    const questMgr = new QuestManager();
    const progress = questMgr.getQuestProgress(questState);

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error getting quest progress:', error);
    res.status(500).json({ error: 'Failed to get quest progress' });
  }
});

/**
 * GET /chain/:questId
 * Get quest chain information
 */
router.get('/chain/:questId', (req, res) => {
  const { questId } = req.params;

  try {
    const questMgr = new QuestManager();
    const chain = questMgr.getQuestChain(questId);

    if (!chain) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    res.json({
      success: true,
      chain
    });
  } catch (error) {
    console.error('Error getting quest chain:', error);
    res.status(500).json({ error: 'Failed to get quest chain' });
  }
});

/**
 * GET /story
 * Get main story quest progression
 */
router.get('/story', (req, res) => {
  try {
    const questMgr = new QuestManager();
    const story = questMgr.getMainStoryQuests();

    res.json({
      success: true,
      quests: story
    });
  } catch (error) {
    console.error('Error getting story quests:', error);
    res.status(500).json({ error: 'Failed to get story quests' });
  }
});

module.exports = router;
