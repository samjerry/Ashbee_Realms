const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /
 * Get all abilities for player's class with unlock status
 */
router.get('/', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const playerClass = progress.type;
    if (!playerClass || playerClass === 'Unknown') {
      return res.status(400).json({ error: 'Character class not set' });
    }
    
    // Load class abilities from data file
    const classAbilitiesData = require('../data/class_abilities.json');
    const classAbilities = classAbilitiesData.abilities[playerClass.toLowerCase()] || [];
    
    // Determine which abilities are unlocked
    const unlockedAbilities = progress.unlocked_abilities || [];
    const playerLevel = progress.level || 1;
    
    const abilitiesWithStatus = classAbilities.map(ability => {
      let unlocked = unlockedAbilities.includes(ability.id);
      
      // Auto-unlock level-based abilities
      if (ability.unlock_type === 'level' && playerLevel >= ability.unlock_requirement) {
        unlocked = true;
        if (!unlockedAbilities.includes(ability.id)) {
          unlockedAbilities.push(ability.id);
        }
      }
      
      return {
        ...ability,
        unlocked
      };
    });
    
    // Save updated unlocked abilities if any were auto-unlocked
    if (unlockedAbilities.length > (progress.unlocked_abilities || []).length) {
      progress.unlocked_abilities = unlockedAbilities;
      await db.savePlayerProgress(user.id, channelName, progress);
    }
    
    res.json({ 
      abilities: abilitiesWithStatus,
      equipped: progress.equipped_abilities || []
    });
  } catch (error) {
    console.error('Error fetching abilities:', error);
    res.status(500).json({ error: 'Failed to fetch abilities' });
  }
});

/**
 * GET /equipped
 * Get equipped abilities with full details
 */
router.get('/equipped', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  let { channel } = req.query;
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  const channelName = channel.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const playerClass = progress.type;
    const equippedIds = progress.equipped_abilities || [];
    
    if (equippedIds.length === 0) {
      return res.json({ abilities: [] });
    }
    
    // Load class abilities
    const classAbilitiesData = require('../data/class_abilities.json');
    const classAbilities = classAbilitiesData.abilities[playerClass.toLowerCase()] || [];
    
    // Filter to only equipped abilities
    const equippedAbilities = classAbilities.filter(ability => equippedIds.includes(ability.id));
    
    res.json({ abilities: equippedAbilities });
  } catch (error) {
    console.error('Error fetching equipped abilities:', error);
    res.status(500).json({ error: 'Failed to fetch equipped abilities' });
  }
});

/**
 * POST /equip
 * Equip an ability (max 3)
 */
router.post('/equip', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { abilityId, channel } = req.body;
  if (!abilityId) {
    return res.status(400).json({ error: 'abilityId required' });
  }
  
  let channelName = channel;
  if (!channelName) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channelName = CHANNELS[0] || 'default';
  }
  channelName = channelName.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if in combat
    if (progress.in_combat) {
      return res.status(400).json({ error: 'Cannot change abilities during combat' });
    }
    
    // Validate player class
    if (!progress.type) {
      return res.status(400).json({ error: 'Character class not set' });
    }
    
    // Load class abilities to check unlock requirements
    const classAbilitiesData = require('../data/class_abilities.json');
    const playerClass = progress.type.toLowerCase();
    const classAbilities = classAbilitiesData.abilities[playerClass] || [];
    const ability = classAbilities.find(a => a.id === abilityId);
    
    if (!ability) {
      return res.status(404).json({ error: 'Ability not found for your class' });
    }
    
    // Check if ability is unlocked
    let unlockedAbilities = progress.unlocked_abilities || [];
    const playerLevel = progress.level || 1;
    
    // Auto-unlock level-based abilities
    if (ability.unlock_type === 'level' && playerLevel >= ability.unlock_requirement) {
      if (!unlockedAbilities.includes(abilityId)) {
        unlockedAbilities.push(abilityId);
        // Update progress object
        progress.unlocked_abilities = unlockedAbilities;
      }
    } else if (!unlockedAbilities.includes(abilityId)) {
      return res.status(403).json({ error: 'Ability not unlocked' });
    }
    
    let equippedAbilities = progress.equipped_abilities || [];
    
    // Check if already equipped
    if (equippedAbilities.includes(abilityId)) {
      return res.json({ equipped: equippedAbilities });
    }
    
    // Check max equipped (3)
    if (equippedAbilities.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 abilities can be equipped' });
    }
    
    // Equip the ability
    equippedAbilities.push(abilityId);
    progress.equipped_abilities = equippedAbilities;
    
    // Save updated progress
    await db.savePlayerProgress(user.id, channelName, progress);
    
    res.json({ success: true, equipped: equippedAbilities });
  } catch (error) {
    console.error('Error equipping ability:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to equip ability', details: error.message });
  }
});

/**
 * POST /unequip
 * Unequip an ability
 */
router.post('/unequip', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const { abilityId, channel } = req.body;
  if (!abilityId) {
    return res.status(400).json({ error: 'abilityId required' });
  }
  
  let channelName = channel;
  if (!channelName) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channelName = CHANNELS[0] || 'default';
  }
  channelName = channelName.toLowerCase();
  
  try {
    const progress = await db.loadPlayerProgress(user.id, channelName);
    if (!progress) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if in combat
    if (progress.in_combat) {
      return res.status(400).json({ error: 'Cannot change abilities during combat' });
    }
    
    let equippedAbilities = progress.equipped_abilities || [];
    
    // Remove the ability
    equippedAbilities = equippedAbilities.filter(id => id !== abilityId);
    
    progress.equipped_abilities = equippedAbilities;
    await db.savePlayerProgress(user.id, channelName, progress);
    
    res.json({ success: true, equipped: equippedAbilities });
  } catch (error) {
    console.error('Error unequipping ability:', error);
    res.status(500).json({ error: 'Failed to unequip ability' });
  }
});

module.exports = router;
