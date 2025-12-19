const express = require('express');
const router = express.Router();
const db = require('../db');
const RaidManager = require('../game/RaidManager');
const socketHandler = require('../websocket/socketHandler');
const { rawAnnounce } = require('../bot');

const raidMgr = new RaidManager();

// Helper function (simplified, would check actual permissions in production)
function canAnnounce(userId) {
  return true; // Placeholder
}

/**
 * GET /
 * Get all available raids with filters
 * Query params: ?difficulty=normal&minPlayers=5
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      difficulty: req.query.difficulty,
      minPlayers: req.query.minPlayers ? parseInt(req.query.minPlayers) : undefined,
      maxPlayers: req.query.maxPlayers ? parseInt(req.query.maxPlayers) : undefined
    };

    const raids = raidMgr.getAvailableRaids(filters);
    res.json({ raids, count: raids.length });
  } catch (error) {
    console.error('Error fetching raids:', error);
    res.status(500).json({ error: 'Failed to fetch raids' });
  }
});

/**
 * GET /:raidId
 * Get specific raid details
 */
router.get('/:raidId', async (req, res) => {
  try {
    const { raidId } = req.params;
    const raid = raidMgr.getRaidDetails(raidId);
    res.json(raid);
  } catch (error) {
    console.error('Error fetching raid details:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /location/:location
 * Get raids available at a specific location
 */
router.get('/location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const raids = raidMgr.getRaidsAtLocation(location);
    res.json({ location, raids, count: raids.length });
  } catch (error) {
    console.error('Error fetching raids at location:', error);
    res.status(500).json({ error: 'Failed to fetch raids at location' });
  }
});

/**
 * GET /available-here
 * Get raids available at player's current location
 * Query: { player, channel }
 */
router.get('/available-here', async (req, res) => {
  try {
    const { player, channel } = req.query;

    if (!player || !channel) {
      return res.status(400).json({ error: 'Missing player or channel parameter' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const playerLocation = character.location || 'town_square';
    
    const raids = raidMgr.getRaidsAtLocation(playerLocation);
    res.json({ 
      player: character.name,
      location: playerLocation, 
      raids, 
      count: raids.length,
      message: raids.length > 0 ? `${raids.length} raid(s) available here` : 'No raids available at this location'
    });
  } catch (error) {
    console.error('Error fetching available raids:', error);
    res.status(500).json({ error: 'Failed to fetch available raids' });
  }
});

/**
 * GET /lobbies/active
 * Get all active lobbies
 */
router.get('/lobbies/active', async (req, res) => {
  try {
    const lobbies = raidMgr.getActiveLobbies();
    res.json({ lobbies, count: lobbies.length });
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

/**
 * POST /lobby/create
 * Create a new raid lobby (requires player to be at raid entrance)
 * Body: { player, channel, raidId, difficulty, requireRoles, allowViewerVoting }
 */
router.post('/lobby/create', async (req, res) => {
  try {
    const { player, channel, raidId, difficulty, requireRoles, allowViewerVoting } = req.body;

    if (!player || !channel || !raidId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const playerLocation = character.location || 'town_square';
    
    const leader = {
      id: userId,
      name: character.name,
      level: character.level,
      classType: character.classType,
      maxHp: character.stats.hp,
      maxMana: character.stats.mana || 100
    };

    const lobby = raidMgr.createLobby(raidId, leader, playerLocation, {
      difficulty,
      requireRoles,
      allowViewerVoting
    });

    res.json(lobby);
  } catch (error) {
    console.error('Error creating lobby:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /lobby/join
 * Join an existing raid lobby
 * Body: { player, channel, lobbyId, role }
 */
router.post('/lobby/join', async (req, res) => {
  try {
    const { player, channel, lobbyId, role } = req.body;

    if (!player || !channel || !lobbyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const playerData = {
      id: userId,
      name: character.name,
      level: character.level,
      classType: character.classType,
      maxHp: character.stats.hp,
      maxMana: character.stats.mana || 100
    };

    const result = raidMgr.joinLobby(lobbyId, playerData, role || 'dps');
    res.json(result);
  } catch (error) {
    console.error('Error joining lobby:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /lobby/leave
 * Leave a raid lobby
 * Body: { player, channel, lobbyId }
 */
router.post('/lobby/leave', async (req, res) => {
  try {
    const { player, channel, lobbyId } = req.body;

    if (!player || !channel || !lobbyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = raidMgr.leaveLobby(lobbyId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error leaving lobby:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /lobby/change-role
 * Change player role in lobby
 * Body: { player, channel, lobbyId, newRole }
 */
router.post('/lobby/change-role', async (req, res) => {
  try {
    const { player, channel, lobbyId, newRole } = req.body;

    if (!player || !channel || !lobbyId || !newRole) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = raidMgr.changeRole(lobbyId, userId, newRole);
    res.json(result);
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /start
 * Start raid from lobby
 * Body: { player, channel, lobbyId }
 */
router.post('/start', async (req, res) => {
  try {
    const { player, channel, lobbyId } = req.body;

    if (!player || !channel || !lobbyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const instance = raidMgr.startRaid(lobbyId);
    
    // Announce raid start
    if (canAnnounce(userId)) {
      rawAnnounce(channel, `🎯 Raid started: ${instance.raidName} with ${instance.players.length} players!`);
    }

    res.json(instance);
  } catch (error) {
    console.error('Error starting raid:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /instance/:instanceId
 * Get raid instance state
 */
router.get('/instance/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const state = raidMgr.getRaidState(instanceId);
    res.json(state);
  } catch (error) {
    console.error('Error fetching raid state:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /action
 * Perform action in raid
 * Body: { player, channel, instanceId, action: { type, target, ability } }
 */
router.post('/action', async (req, res) => {
  try {
    const { player, channel, instanceId, action } = req.body;

    if (!player || !channel || !instanceId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = await raidMgr.performAction(instanceId, userId, action);

    // Handle completion or wipe
    if (result.status === 'completed') {
      if (canAnnounce(userId)) {
        rawAnnounce(channel, `🏆 Raid completed! Time: ${Math.floor(result.stats.completionTime / 60000)}m`);
      }
    } else if (result.status === 'wiped') {
      if (canAnnounce(userId)) {
        rawAnnounce(channel, `💀 Raid wiped! Better luck next time.`);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error performing raid action:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /viewer/vote
 * Submit viewer vote for raid event (subscriber votes count 2x)
 * Body: { instanceId, vote: { option, viewer, weight } }
 */
router.post('/viewer/vote', async (req, res) => {
  try {
    const { instanceId, vote } = req.body;

    if (!instanceId || !vote) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = raidMgr.submitViewerVote(instanceId, vote);
    res.json(result);
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /buffs
 * Get available legacy points buffs
 */
router.get('/buffs', async (req, res) => {
  try {
    const buffs = raidMgr.getLegacyPointsBuffs();
    res.json({ buffs });
  } catch (error) {
    console.error('Error fetching buffs:', error);
    res.status(500).json({ error: 'Failed to fetch buffs' });
  }
});

/**
 * POST /buff/purchase
 * Purchase raid buff with legacy points
 * Body: { player, channel, instanceId, buffType }
 */
router.post('/buff/purchase', async (req, res) => {
  try {
    const { player, channel, instanceId, buffType } = req.body;

    if (!player || !channel || !instanceId || !buffType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await db.getUserId(player, channel);
    if (!userId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const character = await db.getCharacter(userId, channel);
    const legacyPoints = character.legacyPoints || 0;

    const buffs = raidMgr.getLegacyPointsBuffs();
    const buff = buffs[buffType];
    
    if (!buff) {
      return res.status(400).json({ error: 'Invalid buff type' });
    }

    if (legacyPoints < buff.cost) {
      return res.status(400).json({ 
        error: 'Insufficient legacy points',
        required: buff.cost,
        available: legacyPoints
      });
    }

    character.legacyPoints = legacyPoints - buff.cost;
    await db.saveCharacter(userId, channel, character);

    socketHandler.emitPlayerUpdate(character.name, channel, character.toFrontend());

    const result = raidMgr.purchaseRaidBuff(instanceId, userId, {
      type: buffType,
      cost: buff.cost
    });

    res.json({
      ...result,
      legacyPointsRemaining: character.legacyPoints
    });
  } catch (error) {
    console.error('Error purchasing buff:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /leaderboard/:raidId
 * Get raid leaderboard
 * Query params: ?category=fastest_clear&limit=10
 */
router.get('/leaderboard/:raidId', async (req, res) => {
  try {
    const { raidId } = req.params;
    const category = req.query.category || 'fastest_clear';
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const leaderboard = raidMgr.getLeaderboard(raidId, category, limit);
    res.json({ raidId, category, leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
