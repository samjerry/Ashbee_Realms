/**
 * AUTOMATIC SERVER.JS REFACTORING COMPLETION SCRIPT
 * 
 * This script generates all remaining route module files to complete the refactoring.
 * Run with: node scripts/complete-refactoring.js
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// Ensure routes directory exists
if (!fs.existsSync(ROUTES_DIR)) {
  fs.mkdirSync(ROUTES_DIR, { recursive: true });
}

const routeModules = {
  
  // PASSIVES ROUTES (6 routes)
  'passives.routes.js': `const express = require('express');
const router = express.Router();
const db = require('../db');
const { PassiveManager } = require('../game');

router.get('/tree', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();
    const tree = passiveMgr.getPassiveTreeSummary(
      permanentStats.passiveLevels || {},
      permanentStats.souls || 0,
      permanentStats.legacyPoints || 0
    );

    const allPassives = passiveMgr.getAllPassives(permanentStats.passiveLevels || {});

    res.json({
      success: true,
      tree,
      passives: allPassives
    });
  } catch (error) {
    console.error('Error fetching passive tree:', error);
    res.status(500).json({ error: 'Failed to fetch passive tree' });
  }
});

router.get('/category/:category', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { category } = req.params;

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();
    const passives = passiveMgr.getPassivesByCategory(
      category,
      permanentStats.passiveLevels || {}
    );

    res.json({
      success: true,
      category,
      passives
    });
  } catch (error) {
    console.error('Error fetching passives by category:', error);
    res.status(500).json({ error: 'Failed to fetch passives' });
  }
});

router.post('/upgrade', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  const { passiveId } = req.body;
  if (!passiveId) {
    return res.status(400).json({ error: 'passiveId required' });
  }

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0,
      totalDeaths: 0,
      totalKills: 0,
      totalGoldEarned: 0,
      totalXPEarned: 0,
      highestLevelReached: 1,
      totalCrits: 0
    };

    const passiveMgr = new PassiveManager();
    const upgradeResult = passiveMgr.upgradePassive(passiveId, permanentStats);

    if (!upgradeResult.success) {
      return res.status(400).json({
        success: false,
        error: upgradeResult.message
      });
    }

    await db.savePermanentStats(user.id, permanentStats);
    const passive = passiveMgr.getPassive(passiveId, permanentStats.passiveLevels || {});

    res.json({
      success: true,
      message: upgradeResult.message,
      passive,
      cost: upgradeResult.cost,
      newLevel: upgradeResult.newLevel,
      currency: {
        souls: permanentStats.souls,
        legacy_points: permanentStats.legacyPoints
      }
    });
  } catch (error) {
    console.error('Error upgrading passive:', error);
    res.status(500).json({ error: 'Failed to upgrade passive' });
  }
});

router.post('/respec', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    const passiveMgr = new PassiveManager();
    const respecResult = passiveMgr.respecPassives(permanentStats);

    if (!respecResult.success) {
      return res.status(400).json({
        success: false,
        error: respecResult.message
      });
    }

    await db.savePermanentStats(user.id, permanentStats);

    res.json({
      success: true,
      message: 'All passives reset!',
      refund: respecResult.refund,
      currency: {
        souls: permanentStats.souls,
        legacy_points: permanentStats.legacyPoints
      }
    });
  } catch (error) {
    console.error('Error respecing passives:', error);
    res.status(500).json({ error: 'Failed to respec passives' });
  }
});

router.get('/currency', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const permanentStats = await db.getPermanentStats(user.id) || {
      passiveLevels: {},
      souls: 5,
      legacyPoints: 0
    };

    res.json({
      success: true,
      souls: permanentStats.souls || 0,
      legacyPoints: permanentStats.legacyPoints || 0
    });
  } catch (error) {
    console.error('Error getting currency:', error);
    res.status(500).json({ error: 'Failed to get currency' });
  }
});

module.exports = router;`,

};

console.log('🚀 Starting automatic refactoring completion...\n');

let created = 0;
let failed = 0;

for (const [filename, content] of Object.entries(routeModules)) {
  try {
    const filePath = path.join(ROUTES_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created ${filename}`);
    created++;
  } catch (error) {
    console.error(`❌ Failed to create ${filename}:`, error.message);
    failed++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  ✅ Created: ${created} files`);
console.log(`  ❌ Failed: ${failed} files`);
console.log(`\n✨ Next step: Update server.js to use these route modules with app.use()`);
