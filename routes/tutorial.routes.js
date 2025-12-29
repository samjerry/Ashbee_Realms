const express = require('express');
const router = express.Router();
const db = require('../db');
const TutorialManager = require('../game/TutorialManager');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const rateLimiter = require('../utils/rateLimiter');
const security = require('../middleware/security');
const sanitization = require('../middleware/sanitization');

// Initialize tutorial manager singleton
const tutorialManager = new TutorialManager();

/**
 * Helper function to get channel from request
 * @param {Object} req - Express request object
 * @returns {string} Channel name
 */
function getChannel(req) {
  let channel = req.body?.channel || req.query?.channel;
  
  if (!channel) {
    const CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : [];
    channel = CHANNELS[0] || 'default';
  }
  
  return channel;
}

/**
 * GET /tooltip/:id
 * Get tooltip information by ID
 */
router.get('/tooltip/:id', async (req, res) => {
  try {
    const tooltipId = sanitization.sanitizeInput(req.params.id, { maxLength: 100 });
    const tooltip = tutorialManager.getTooltip(tooltipId);
    
    if (!tooltip) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tooltip not found' 
      });
    }
    
    res.json({
      success: true,
      tooltip: {
        id: tooltip.id,
        title: tooltip.title,
        description: tooltip.description,
        hotkey: tooltip.hotkey || null,
        relatedTips: tooltip.relatedTips || []
      }
    });
  } catch (error) {
    console.error('Error fetching tooltip:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tooltip' 
    });
  }
});

/**
 * GET /progress
 * Get current tutorial progress for logged-in user
 */
router.get('/progress', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const channel = getChannel(req);
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const progress = tutorialManager.getTutorialProgress(character);
    const currentStep = progress.currentStep;
    
    res.json({
      success: true,
      progress: {
        isActive: progress.isActive,
        currentStepIndex: progress.currentStepIndex,
        totalSteps: progress.totalSteps,
        completedSteps: progress.completedSteps,
        progressPercentage: progress.progressPercentage
      },
      currentStep: currentStep ? {
        title: currentStep.title,
        instruction: currentStep.instruction,
        reward: currentStep.reward,
        tip: currentStep.tip || null
      } : null
    });
  } catch (error) {
    console.error('Error fetching tutorial progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tutorial progress' 
    });
  }
});

/**
 * POST /complete-step
 * Mark a tutorial step as complete
 */
router.post('/complete-step',
  rateLimiter.middleware('default'),
  security.auditLog('complete_tutorial_step'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const channel = getChannel(req);
    const { stepId } = req.body;
    
    if (!channel) {
      return res.status(400).json({ error: 'No channel configured' });
    }
    
    if (!stepId) {
      return res.status(400).json({ error: 'Step ID required' });
    }
    
    const sanitizedStepId = sanitization.sanitizeInput(stepId, { maxLength: 100 });
    
    try {
      const character = await db.getCharacter(user.id, channel.toLowerCase());
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const result = tutorialManager.completeStep(character, sanitizedStepId);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: result.error 
        });
      }
      
      // Apply rewards
      if (result.rewards.xp > 0) {
        character.xp += result.rewards.xp;
      }
      if (result.rewards.gold > 0) {
        character.gold += result.rewards.gold;
      }
      if (result.rewards.items && result.rewards.items.length > 0) {
        result.rewards.items.forEach(item => {
          character.inventory.addItem(item.id, item.quantity || 1);
        });
      }
      if (result.rewards.title) {
        character.titles = character.titles || [];
        if (!character.titles.includes(result.rewards.title)) {
          character.titles.push(result.rewards.title);
        }
      }
      
      // Save character
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit socket update
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
      
      res.json({
        success: true,
        nextStep: result.nextStep ? {
          id: result.nextStep.id,
          title: result.nextStep.title,
          instruction: result.nextStep.instruction,
          reward: result.nextStep.reward,
          tip: result.nextStep.tip || null
        } : null,
        rewards: result.rewards,
        tutorialComplete: result.tutorialComplete,
        completionMessage: result.completionMessage || null
      });
    } catch (error) {
      console.error('Error completing tutorial step:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to complete tutorial step' 
      });
    }
  });

/**
 * GET /tips
 * Get all gameplay tips (with optional context filter)
 */
router.get('/tips', async (req, res) => {
  try {
    const context = req.query.context ? sanitization.sanitizeInput(req.query.context, { maxLength: 50 }) : null;
    
    let tips;
    if (context) {
      tips = tutorialManager.getTipsByContext(context);
    } else {
      tips = tutorialManager.gameplayTips;
    }
    
    res.json({
      success: true,
      tips: tips || []
    });
  } catch (error) {
    console.error('Error fetching tips:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tips' 
    });
  }
});

/**
 * GET /current-step
 * Get details about the current tutorial step
 */
router.get('/current-step', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  
  const channel = getChannel(req);
  
  if (!channel) {
    return res.status(400).json({ error: 'No channel configured' });
  }
  
  try {
    const character = await db.getCharacter(user.id, channel.toLowerCase());
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const currentStep = tutorialManager.getCurrentStep(character);
    
    if (!currentStep) {
      return res.json({
        success: true,
        step: null,
        message: 'No active tutorial step'
      });
    }
    
    res.json({
      success: true,
      step: {
        id: currentStep.id,
        title: currentStep.title,
        instruction: currentStep.instruction,
        reward: currentStep.reward,
        tip: currentStep.tip || null
      }
    });
  } catch (error) {
    console.error('Error fetching current step:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch current step' 
    });
  }
});

/**
 * POST /start
 * Start the tutorial for a new player
 */
router.post('/start',
  rateLimiter.middleware('default'),
  security.auditLog('start_tutorial'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const channel = getChannel(req);
    
    if (!channel) {
      return res.status(400).json({ error: 'No channel configured' });
    }
    
    try {
      const character = await db.getCharacter(user.id, channel.toLowerCase());
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      // Initialize tutorial
      tutorialManager.initializeTutorial(character);
      
      // Get first step
      const firstStep = tutorialManager.getCurrentStep(character);
      
      // Save character
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit socket update
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
      
      res.json({
        success: true,
        firstStep: firstStep ? {
          id: firstStep.id,
          title: firstStep.title,
          instruction: firstStep.instruction,
          reward: firstStep.reward,
          tip: firstStep.tip || null
        } : null
      });
    } catch (error) {
      console.error('Error starting tutorial:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to start tutorial' 
      });
    }
  });

/**
 * POST /skip
 * Skip/dismiss the tutorial
 */
router.post('/skip',
  rateLimiter.middleware('default'),
  security.auditLog('skip_tutorial'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const channel = getChannel(req);
    
    if (!channel) {
      return res.status(400).json({ error: 'No channel configured' });
    }
    
    try {
      const character = await db.getCharacter(user.id, channel.toLowerCase());
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const result = tutorialManager.skipTutorial(character);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: result.error 
        });
      }
      
      // Save character
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit socket update
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error skipping tutorial:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to skip tutorial' 
      });
    }
  });

/**
 * GET /dialogue/:npcId/:nodeId
 * Get specific dialogue node with response options
 */
router.get('/dialogue/:npcId/:nodeId', async (req, res) => {
  try {
    const npcId = sanitization.sanitizeInput(req.params.npcId, { maxLength: 100 });
    const nodeId = sanitization.sanitizeInput(req.params.nodeId, { maxLength: 100 });
    
    const node = tutorialManager.getDialogueNode(npcId, nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Dialogue node not found'
      });
    }
    
    res.json({
      success: true,
      node: {
        id: node.id,
        text: node.text,
        choices: node.choices || [],
        reward: node.reward || null,
        action: node.action || null,
        action_target: node.action_target || null,
        condition: node.condition || null
      }
    });
  } catch (error) {
    console.error('Error fetching dialogue node:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dialogue node'
    });
  }
});

/**
 * POST /dialogue/advance
 * Advance to next dialogue node and trigger actions
 */
router.post('/dialogue/advance',
  rateLimiter.middleware('default'),
  security.auditLog('advance_dialogue'),
  async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    
    const channel = getChannel(req);
    const { npcId, currentNodeId, choiceIndex, nextNodeId } = req.body;
    
    if (!channel) {
      return res.status(400).json({ error: 'No channel configured' });
    }
    
    if (!npcId || !currentNodeId || typeof choiceIndex !== 'number') {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
      const character = await db.getCharacter(user.id, channel.toLowerCase());
      
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      const result = tutorialManager.advanceDialogue(
        character, 
        sanitization.sanitizeInput(npcId, { maxLength: 100 }),
        sanitization.sanitizeInput(currentNodeId, { maxLength: 100 }),
        choiceIndex
      );
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      // Trigger any actions
      if (result.action) {
        const actionResult = tutorialManager.triggerDialogueAction(
          result.action,
          character,
          result.actionTarget
        );
        
        if (actionResult.tutorialComplete) {
          // Mark tutorial as complete
          character.tutorialProgress.isActive = false;
          character.tutorialProgress.completedAt = Date.now();
        }
      }
      
      // Check if this dialogue advance completes a tutorial step
      const stepCompletion = tutorialManager.checkStepTrigger(character, 'dialogue', {
        npcId: sanitization.sanitizeInput(npcId, { maxLength: 100 }),
        nodeId: currentNodeId
      });
      
      if (stepCompletion && stepCompletion.success) {
        // Apply step rewards
        if (stepCompletion.rewards.xp > 0) {
          character.xp += stepCompletion.rewards.xp;
        }
        if (stepCompletion.rewards.gold > 0) {
          character.gold += stepCompletion.rewards.gold;
        }
        if (stepCompletion.rewards.items && Array.isArray(stepCompletion.rewards.items)) {
          stepCompletion.rewards.items.forEach(item => {
            if (character.inventory && character.inventory.addItem) {
              character.inventory.addItem(item.id, item.quantity || 1);
            }
          });
        }
        if (stepCompletion.rewards.title) {
          character.titles = character.titles || [];
          if (!character.titles.includes(stepCompletion.rewards.title)) {
            character.titles.push(stepCompletion.rewards.title);
          }
        }
      }
      
      // Save character with dialogue history
      await db.saveCharacter(user.id, channel.toLowerCase(), character);
      
      // Emit socket update
      socketHandler.emitPlayerUpdate(character.name, channel.toLowerCase(), character.toFrontend());
      
      res.json({
        success: true,
        nextNodeId: result.nextNodeId,
        action: result.action,
        actionTarget: result.actionTarget
      });
    } catch (error) {
      console.error('Error advancing dialogue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to advance dialogue'
      });
    }
  });

/**
 * GET /npc/:npcId
 * Get tutorial NPC data
 */
router.get('/npc/:npcId', async (req, res) => {
  try {
    const npcId = sanitization.sanitizeInput(req.params.npcId, { maxLength: 100 });
    const npc = tutorialManager.getNPC(npcId);
    
    if (!npc) {
      return res.status(404).json({
        success: false,
        error: 'NPC not found'
      });
    }
    
    res.json({
      success: true,
      npc: {
        id: npc.id,
        name: npc.name,
        title: npc.title,
        description: npc.description,
        icon: npc.icon,
        greeting: npc.greeting,
        personality: npc.personality
      }
    });
  } catch (error) {
    console.error('Error fetching NPC data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch NPC data'
    });
  }
});

module.exports = router;
