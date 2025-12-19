const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /
 * Get all available character classes
 */
router.get('/', (req, res) => {
  try {
    const CharacterInitializer = require('../game/CharacterInitializer');
    const classes = CharacterInitializer.getAvailableClasses();
    res.json({ success: true, classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

/**
 * GET /:classType
 * Get detailed info about a specific class
 */
router.get('/:classType', (req, res) => {
  try {
    const CharacterInitializer = require('../game/CharacterInitializer');
    const { classType } = req.params;
    const classInfo = CharacterInitializer.getClassInfo(classType);
    
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json({ success: true, class: classInfo });
  } catch (error) {
    console.error('Error fetching class info:', error);
    res.status(500).json({ error: 'Failed to fetch class info' });
  }
});

/**
 * GET /:classType/preview
 * Preview class progression (stats at different levels)
 */
router.get('/:classType/preview', (req, res) => {
  try {
    const CharacterInitializer = require('../game/CharacterInitializer');
    const { classType } = req.params;
    const maxLevel = parseInt(req.query.maxLevel) || 10;
    
    const preview = CharacterInitializer.previewClassProgression(classType, maxLevel);
    
    if (!preview) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json({ success: true, preview });
  } catch (error) {
    console.error('Error generating class preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

module.exports = router;
