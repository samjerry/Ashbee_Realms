const express = require('express');
const router = express.Router();
const db = require('../db');
const Combat = require('../game/Combat');
const { Character } = require('../game');
const { loadData } = require('../data/data_loader');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const rateLimiter = require('../utils/rateLimiter');

/**
 * POST /start
 * Start combat with a monster
 */
router.post('/start',
  validation.validateCombatAction,
  rateLimiter.middleware('default'),
  security.auditLog('start_combat'),
  async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ error: 'Not logged in' });

      const { monsterId, channelName } = req.body;
      if (!monsterId) {
        return res.status(400).json({ error: 'monsterId is required' });
      }

      const sanitization = require('../middleware/sanitization');
      const sanitizedMonsterId = sanitization.sanitizeInput(monsterId, { maxLength: 100 });
      const channel = channelName || user.channels?.[0] || 'default';

      // Load player progress
      const playerData = await db.getPlayerProgress(user.id, channel);
      if (!playerData) {
        return res.status(404).json({ error: 'Player progress not found. Create a character first.' });
      }

      // Check if already in combat
      if (req.session.combat) {
        return res.status(400).json({ error: 'Already in combat. Finish current combat first.' });
      }

      // Load monster data
      const monstersData = loadData('monsters');
      let monster = null;

      // Search for monster
      for (const rarity of Object.keys(monstersData.monsters)) {
        const found = monstersData.monsters[rarity].find(m => m.id === sanitizedMonsterId);
        if (found) {
          monster = found;
          break;
        }
      }

      if (!monster) {
        return res.status(404).json({ error: 'Monster not found' });
      }

      // Create Character instance
      const character = Character.fromObject(playerData);

      // Start combat
      const combat = new Combat(character, monster);
      
      // Store combat in session
      req.session.combat = {
        combatInstance: combat,
        playerId: user.id,
        channelName: channel,
        monsterId: monsterId
      };

      // Save session
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Emit real-time combat started notification
      socketHandler.emitCombatUpdate(user.login || user.displayName, channel, {
        type: 'combat_started',
        state: combat.getState(),
        monster: {
          name: monster.name,
          level: monster.level,
          hp: monster.hp
        }
      });

      res.json({
        success: true,
        message: `Combat started with ${monster.name}!`,
        state: combat.getState()
      });

    } catch (error) {
      console.error('Combat start error:', error);
      res.status(500).json({ error: 'Failed to start combat', details: error.message });
    }
});

/**
 * GET /state
 * Get current combat state
 */
router.get('/state', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    if (!req.session.combat) {
      return res.json({ inCombat: false });
    }

    const combat = req.session.combat.combatInstance;
    res.json({
      inCombat: true,
      state: combat.getState()
    });

  } catch (error) {
    console.error('Combat state error:', error);
    res.status(500).json({ error: 'Failed to get combat state' });
  }
});

/**
 * POST /attack
 * Perform basic attack
 */
router.post('/attack',
  rateLimiter.middleware('default'),
  security.auditLog('combat_attack'),
  async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ error: 'Not logged in' });

      if (!req.session.combat) {
        return res.status(400).json({ error: 'No active combat' });
      }

      const combat = req.session.combat.combatInstance;
      const result = combat.playerAttack();

      // Emit real-time combat action
      const channel = req.session.combat.channelName;
      socketHandler.emitCombatUpdate(user.login || user.displayName, channel, {
        type: 'combat_action',
        action: 'attack',
        result: result
      });

      // If combat ended, save results and clean up
      if (result.victory || result.defeat) {
        await handleCombatEnd(req.session, result);
        
        // Emit combat ended
        socketHandler.emitCombatUpdate(user.login || user.displayName, channel, {
          type: result.victory ? 'combat_victory' : 'combat_defeat',
          result: result
        });
      } else {
        // Save session with updated combat state
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json(result);

    } catch (error) {
      console.error('Combat attack error:', error);
      res.status(500).json({ error: 'Failed to perform attack', details: error.message });
    }
});

/**
 * POST /skill
 * Use a skill in combat
 */
router.post('/skill', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { skillId } = req.body;
    if (!skillId) {
      return res.status(400).json({ error: 'skillId is required' });
    }

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerSkill(skillId);

    // If combat ended, save results and clean up
    if (result.victory || result.defeat) {
      await handleCombatEnd(req.session, result);
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat skill error:', error);
    res.status(500).json({ error: 'Failed to use skill', details: error.message });
  }
});

/**
 * POST /ability
 * Use an ability in combat
 */
router.post('/ability', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { abilityId } = req.body;
    if (!abilityId) {
      return res.status(400).json({ error: 'abilityId is required' });
    }

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerUseAbility(abilityId);

    // If combat ended, save results and clean up
    if (result.victory || result.defeat) {
      await handleCombatEnd(req.session, result);
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat ability error:', error);
    res.status(500).json({ error: 'Failed to use ability', details: error.message });
  }
});

/**
 * POST /item
 * Use an item in combat
 */
router.post('/item', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerUseItem(itemId);

    if (result.victory || result.defeat) {
      await handleCombatEnd(req.session, result);
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat item error:', error);
    res.status(500).json({ error: 'Failed to use item', details: error.message });
  }
});

/**
 * POST /flee
 * Attempt to flee from combat
 */
router.post('/flee', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    if (!req.session.combat) {
      return res.status(400).json({ error: 'No active combat' });
    }

    const combat = req.session.combat.combatInstance;
    const result = combat.playerFlee();

    // Clean up combat session if fled successfully
    if (result.success && result.state === Combat.STATES.FLED) {
      delete req.session.combat;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Combat flee error:', error);
    res.status(500).json({ error: 'Failed to flee', details: error.message });
  }
});

/**
 * Helper function to handle combat end (victory/defeat)
 * @param {Object} session - Express session
 * @param {Object} result - Combat result
 */
async function handleCombatEnd(session, result) {
  const { playerId, channelName } = session.combat;
  const combat = session.combat.combatInstance;

  if (result.victory) {
    // Award rewards
    const character = combat.character;
    
    // Add gold
    character.gold += result.rewards.gold;

    // Add items to inventory
    for (const item of result.rewards.items) {
      character.inventory.addItem(item.id, item.quantity || 1);
    }

    // Update bestiary - record defeat
    if (result.bestiaryUpdate && result.bestiaryUpdate.monsterId) {
      const BestiaryManager = require('../utils/bestiaryManager');
      const currentBestiary = character.bestiary || {};
      const updatedBestiary = BestiaryManager.recordDefeat(currentBestiary, result.bestiaryUpdate.monsterId);
      character.bestiary = updatedBestiary;
      
      // Unlock bestiary if this is first entry
      if (!character.bestiary_unlocked && BestiaryManager.shouldUnlockBestiary(updatedBestiary)) {
        character.bestiary_unlocked = true;
      }
    }

    // Save updated character
    const playerData = character.toObject();
    await db.savePlayerProgress(playerId, channelName, playerData);
    
    // Emit update for victory using frontend format
    socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
  }

  if (result.defeat) {
    // Handle death (optional: respawn with penalty)
    const character = combat.character;
    character.current_hp = Math.floor(character.max_hp * 0.5); // Respawn with 50% HP
    
    // Optional: gold penalty
    character.gold = Math.max(0, character.gold - Math.floor(character.gold * 0.1));

    const playerData = character.toObject();
    await db.savePlayerProgress(playerId, channelName, playerData);
    
    // Emit update for defeat using frontend format
    socketHandler.emitPlayerUpdate(character.name, channelName, character.toFrontend());
  }

  // Clear combat from session
  delete session.combat;
  
  await new Promise((resolve, reject) => {
    session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = router;
