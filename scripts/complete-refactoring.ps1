# Auto-complete Server.js Refactoring Script
# This script creates all remaining route files to complete the refactoring

Write-Host "🚀 Starting server.js refactoring completion..." -ForegroundColor Cyan
Write-Host ""

$routesDir = "c:\Users\jojaj\OneDrive\Bureaublad\Stroom\Bot\Game\TwitchGame - headless\Ashbee_Realms\routes"

# Ensure routes directory exists
if (!(Test-Path $routesDir)) {
    New-Item -ItemType Directory -Path $routesDir | Out-Null
    Write-Host "✅ Created routes directory" -ForegroundColor Green
}

Write-Host "📋 Creating remaining route files..." -ForegroundColor Yellow
Write-Host ""

# Track completion
$completed = @()
$failed = @()

# Helper function
function Write-RouteFile {
    param(
        [string]$FileName,
        [string]$Content
    )
    
    $FilePath = Join-Path $routesDir $FileName
    
    try {
        $Content | Out-File -FilePath $FilePath -Encoding UTF8 -Force
        Write-Host "  ✅ Created $FileName" -ForegroundColor Green
        $script:completed += $FileName
    } catch {
        Write-Host "  ❌ Failed to create $FileName : $_" -ForegroundColor Red
        $script:failed += $FileName
    }
}

Write-Host "Creating route module files..." -ForegroundColor Cyan

# Already created: auth, classes, abilities, combat, bestiary, quests, progression

# CREATE PASSIVES ROUTES
$passivesContent = @'
const express = require('express');
const router = express.Router();
const db = require('../db');
const { PassiveManager } = require('../game');

/**
 * GET /tree
 * Get complete passive tree with current levels and currency
 */
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

/**
 * GET /category/:category
 * Get passives by category
 */
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

/**
 * POST /upgrade
 * Upgrade a passive by one level
 */
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

    // Save to database
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

/**
 * POST /respec
 * Reset all passives and refund 50% of souls
 */
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

    // Save to database
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

/**
 * GET /currency
 * Get current souls and legacy points
 */
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

module.exports = router;
'@

Write-RouteFile -FileName "passives.routes.js" -Content $passivesContent

Write-Host ""
Write-Host "📊 Refactoring Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Route files created: $($completed.Count)" -ForegroundColor Green
Write-Host "  ❌ Failed: $($failed.Count)" -ForegroundColor Red
Write-Host ""

if ($completed.Count -gt 0) {
    Write-Host "Successfully created:" -ForegroundColor Green
    $completed | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
}

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed to create:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
}

Write-Host ""
Write-Host "✨ Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create remaining route files manually or continue with Copilot" -ForegroundColor White
Write-Host "  2. Update server.js to use app.use() for each route module" -ForegroundColor White
Write-Host "  3. Test all endpoints" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Script completed!" -ForegroundColor Cyan
'@