const express = require('express');
const router = express.Router();
const db = require('../db');
const DungeonManager = require('../game/DungeonManager');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /
 * Get all available dungeons with access info
 */
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const dungeons = await dungeonMgr.getAvailableDungeons(character);

    res.json({ dungeons });
  } catch (error) {
    console.error('Error fetching dungeons:', error);
    res.status(500).json({ error: 'Failed to fetch dungeons' });
  }
});

/**
 * GET /:dungeonId
 * Get detailed information about a specific dungeon
 */
router.get('/:dungeonId', async (req, res) => {
  try {
    const { dungeonId } = req.params;
    const dungeonMgr = new DungeonManager();
    const dungeon = await dungeonMgr.getDungeon(dungeonId);

    if (!dungeon) {
      return res.status(404).json({ error: 'Dungeon not found' });
    }

    res.json({ dungeon });
  } catch (error) {
    console.error('Error fetching dungeon details:', error);
    res.status(500).json({ error: 'Failed to fetch dungeon details' });
  }
});

/**
 * POST /start
 * Start a dungeon run
 * Body: { dungeonId: string, modifiers?: string[] }
 */
router.post('/start', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { dungeonId, modifiers = [] } = req.body;
    if (!dungeonId) {
      return res.status(400).json({ error: 'Dungeon ID required' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = await dungeonMgr.startDungeon(character, dungeonId, modifiers);

    // Save dungeon state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon start
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());
    socketHandler.emitDungeonProgress(character.name, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error starting dungeon:', error);
    res.status(500).json({ error: error.message || 'Failed to start dungeon' });
  }
});

/**
 * POST /advance
 * Advance to the next room in the dungeon
 */
router.post('/advance', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (!character.dungeonState) {
      return res.status(400).json({ error: 'Not in a dungeon' });
    }

    const dungeonMgr = new DungeonManager();
    const result = await dungeonMgr.advanceRoom(character);

    // Save updated state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon room advance
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());
    socketHandler.emitDungeonProgress(character.name, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error advancing dungeon room:', error);
    res.status(500).json({ error: error.message || 'Failed to advance room' });
  }
});

/**
 * POST /complete-room
 * Mark current room as complete (after combat, puzzle, etc.)
 */
router.post('/complete-room', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = dungeonMgr.completeRoom(character);

    // Save updated state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error completing room:', error);
    res.status(500).json({ error: error.message || 'Failed to complete room' });
  }
});

/**
 * POST /complete
 * Complete the dungeon (after boss defeated)
 */
router.post('/complete', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = await dungeonMgr.completeDungeon(character);

    // Save completion and clear state
    if (result.success) {
      await db.addCompletedDungeon(user.id, user.channel, result.leaderboard_entry.dungeon_id);
      await db.updateDungeonState(user.id, user.channel, null);
    }
    
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon completion (rewards, XP, gold)
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());
    if (result.success) {
      socketHandler.emitInventoryUpdate(character.name, user.channel);
    }

    res.json(result);
  } catch (error) {
    console.error('Error completing dungeon:', error);
    res.status(500).json({ error: error.message || 'Failed to complete dungeon' });
  }
});

/**
 * POST /exit
 * Exit/abandon current dungeon
 */
router.post('/exit', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = dungeonMgr.exitDungeon(character);

    // Clear dungeon state
    await db.updateDungeonState(user.id, user.channel, null);
    await db.saveCharacter(user.id, user.channel, character);

    // Emit WebSocket update for dungeon exit
    socketHandler.emitPlayerUpdate(character.name, user.channel, character.toFrontend());

    res.json(result);
  } catch (error) {
    console.error('Error exiting dungeon:', error);
    res.status(500).json({ error: error.message || 'Failed to exit dungeon' });
  }
});

/**
 * GET /state
 * Get current dungeon state
 */
router.get('/state', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ 
      in_dungeon: !!character.dungeonState,
      dungeon_state: character.dungeonState || null
    });
  } catch (error) {
    console.error('Error fetching dungeon state:', error);
    res.status(500).json({ error: 'Failed to fetch dungeon state' });
  }
});

/**
 * GET /leaderboard/:dungeonId
 * Get leaderboard for a dungeon
 */
router.get('/leaderboard/:dungeonId', async (req, res) => {
  try {
    const { dungeonId } = req.params;
    const { limit = 10 } = req.query;

    const dungeonMgr = new DungeonManager();
    const leaderboard = await dungeonMgr.getLeaderboard(dungeonId, parseInt(limit));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /solve-puzzle
 * Attempt to solve a puzzle
 * Body: { answer: string }
 */
router.post('/solve-puzzle', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const { answer } = req.body;
    if (!answer) {
      return res.status(400).json({ error: 'Answer required' });
    }

    const character = await db.getCharacter(user.id, user.channel);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const dungeonMgr = new DungeonManager();
    const result = dungeonMgr.solvePuzzle(character, answer);

    // Save updated state
    await db.updateDungeonState(user.id, user.channel, character.dungeonState);

    res.json(result);
  } catch (error) {
    console.error('Error solving puzzle:', error);
    res.status(500).json({ error: error.message || 'Failed to solve puzzle' });
  }
});

module.exports = router;
