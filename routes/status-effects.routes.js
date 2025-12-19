const express = require('express');
const router = express.Router();
const db = require('../db');
const socketHandler = require('../websocket/socketHandler');

/**
 * GET /all
 * Get all available status effects from data
 */
router.get('/all', async (req, res) => {
  try {
    const StatusEffectManager = require('../game/StatusEffectManager');
    const effectMgr = new StatusEffectManager();
    
    res.json({
      success: true,
      statusEffects: effectMgr.getAllStatusEffects(),
      combos: effectMgr.getEffectCombos()
    });
  } catch (error) {
    console.error('Error fetching status effects:', error);
    res.status(500).json({ error: 'Failed to fetch status effects' });
  }
});

/**
 * GET /active
 * Get currently active status effects on character
 */
router.get('/active', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({
      success: true,
      effects: character.statusEffects.getActiveEffects(),
      auras: character.statusEffects.getActiveAuras(),
      modifiers: character.statusEffects.getModifiers()
    });
  } catch (error) {
    console.error('Error fetching active effects:', error);
    res.status(500).json({ error: 'Failed to fetch active effects' });
  }
});

/**
 * POST /apply
 * Apply a status effect to character (for testing/admin)
 */
router.post('/apply', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, effectId, duration, stacks } = req.body;
  if (!channel || !effectId) {
    return res.status(400).json({ error: 'Channel and effectId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.addEffect(effectId, {
      duration: duration,
      initialStacks: stacks
    });

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        reason: result.reason 
      });
    }

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for status effect change
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitStatusEffect(character.name, channel.toLowerCase(), result.effect);

    res.json({
      success: true,
      result,
      activeEffects: character.statusEffects.getActiveEffects()
    });
  } catch (error) {
    console.error('Error applying status effect:', error);
    res.status(500).json({ error: 'Failed to apply status effect' });
  }
});

/**
 * POST /cleanse
 * Cleanse debuffs from character
 */
router.post('/cleanse', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, count, specific } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.cleanse({
      count: count || 1,
      specific: specific
    });

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for status effect cleansing
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      removed: result.removed,
      count: result.count,
      remainingEffects: character.statusEffects.getActiveEffects()
    });
  } catch (error) {
    console.error('Error cleansing effects:', error);
    res.status(500).json({ error: 'Failed to cleanse effects' });
  }
});

/**
 * POST /dispel
 * Dispel buffs from enemy (use in combat)
 */
router.post('/dispel', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, count } = req.body;
  if (!channel) return res.status(400).json({ error: 'Channel required' });

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Check if in combat
    if (!character.inCombat || !character.combat) {
      return res.status(400).json({ error: 'Not in combat' });
    }

    // Dispel enemy buffs
    const result = character.combat.monster.statusEffects.dispel({
      count: count || 1
    });

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for combat state change
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
    socketHandler.emitCombatUpdate(character.name, channel.toLowerCase(), {
      enemyEffects: character.combat.monster.statusEffects.getActiveEffects()
    });

    res.json({
      success: true,
      removed: result.removed,
      count: result.count,
      enemyEffects: character.combat.monster.statusEffects.getActiveEffects()
    });
  } catch (error) {
    console.error('Error dispelling effects:', error);
    res.status(500).json({ error: 'Failed to dispel effects' });
  }
});

/**
 * POST /aura/add
 * Add permanent aura effect
 */
router.post('/aura/add', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, auraId, auraData } = req.body;
  if (!channel || !auraId || !auraData) {
    return res.status(400).json({ error: 'Channel, auraId, and auraData required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.addAura(auraId, auraData);

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for aura addition
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: true,
      auraId: result.auraId,
      activeAuras: character.statusEffects.getActiveAuras()
    });
  } catch (error) {
    console.error('Error adding aura:', error);
    res.status(500).json({ error: 'Failed to add aura' });
  }
});

/**
 * POST /aura/remove
 * Remove permanent aura effect
 */
router.post('/aura/remove', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { channel, auraId } = req.body;
  if (!channel || !auraId) {
    return res.status(400).json({ error: 'Channel and auraId required' });
  }

  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const result = character.statusEffects.removeAura(auraId);

    // Save character state
    await db.saveCharacter(user.id, channel.toLowerCase(), character);

    // Emit WebSocket update for aura removal
    socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());

    res.json({
      success: result.success,
      auraId: result.auraId,
      activeAuras: character.statusEffects.getActiveAuras()
    });
  } catch (error) {
    console.error('Error removing aura:', error);
    res.status(500).json({ error: 'Failed to remove aura' });
  }
});

module.exports = router;
