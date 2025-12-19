# Server.js Refactoring Guide
## Step-by-Step Manual Route Extraction

This guide shows you exactly how to refactor server.js into modular route files.

---

## Step 1: Understand the Pattern

Every route file follows this structure:

```javascript
// 1. Imports
const express = require('express');
const router = express.Router();
const db = require('../db');
// ... other imports

// 2. Route definitions (change app. to router.)
router.get('/endpoint', async (req, res) => {
  // ... route logic
});

// 3. Export
module.exports = router;
```

---

## Step 2: Example - Combat Routes

### Original (in server.js lines ~1952-2363):
```javascript
app.post('/api/combat/start', async (req, res) => {
  // ... combat start logic
});

app.get('/api/combat/state', async (req, res) => {
  // ... combat state logic
});

app.post('/api/combat/attack', async (req, res) => {
  // ... attack logic
});

app.post('/api/combat/ability', async (req, res) => {
  // ... ability logic
});

app.post('/api/combat/flee', async (req, res) => {
  // ... flee logic
});
```

### New File: routes/combat.routes.js
```javascript
const express = require('express');
const router = express.Router();
const db = require('../db');
const Combat = require('../game/Combat');
const { Character } = require('../game');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const rateLimiter = require('../utils/rateLimiter');

/**
 * POST /start
 * Start combat with a monster
 */
router.post('/start', async (req, res) => {
  // ... COPY PASTE the entire route logic from server.js
});

/**
 * GET /state  
 * Get current combat state
 */
router.get('/state', async (req, res) => {
  // ... COPY PASTE the entire route logic
});

/**
 * POST /attack
 * Perform basic attack
 */
router.post('/attack', async (req, res) => {
  // ... COPY PASTE the entire route logic
});

/**
 * POST /ability
 * Use a class ability in combat
 */
router.post('/ability', async (req, res) => {
  // ... COPY PASTE the entire route logic
});

/**
 * POST /flee
 * Attempt to flee from combat
 */
router.post('/flee', async (req, res) => {
  // ... COPY PASTE the entire route logic
});

module.exports = router;
```

### Update server.js:
```javascript
// BEFORE (delete all combat routes)
app.post('/api/combat/start', ...);
app.get('/api/combat/state', ...);
app.post('/api/combat/attack', ...);
app.post('/api/combat/ability', ...);
app.post('/api/combat/flee', ...);

// AFTER (add single line)
app.use('/api/combat', require('./routes/combat.routes'));
```

---

## Step 3: Route Path Adjustments

**IMPORTANT:** When routes are in a file that gets mounted with `app.use('/api/combat', ...)`, you must remove `/api/combat` from the route paths:

### ❌ WRONG:
```javascript
// routes/combat.routes.js
router.post('/api/combat/attack', ...);  // Don't include /api/combat!
```

### ✅ CORRECT:
```javascript
// routes/combat.routes.js
router.post('/attack', ...);  // Just /attack, mounting handles /api/combat
```

---

## Step 4: Complete Route Mapping

Here's where each route group should be mounted in server.js:

```javascript
// Authentication & Session
app.use('/api', require('./routes/auth.routes'));  // /api/me, /api/csrf-token

// Player Management  
app.use('/api/player', require('./routes/player.routes'));  // /api/player/*

// Game Systems
app.use('/api/abilities', require('./routes/abilities.routes'));
app.use('/api/combat', require('./routes/combat.routes'));
app.use('/api/quests', require('./routes/quests.routes'));
app.use('/api/exploration', require('./routes/exploration.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));

// Progression
app.use('/api/progression', require('./routes/progression.routes'));
app.use('/api/passives', require('./routes/passives.routes'));
app.use('/api/achievements', require('./routes/achievements.routes'));

// Content Systems
app.use('/api/dungeons', require('./routes/dungeons.routes'));
app.use('/api/raids', require('./routes/raids.routes'));
app.use('/api/shop', require('./routes/shop.routes'));
app.use('/api/npcs', require('./routes/npcs.routes'));
app.use('/api/dialogue', require('./routes/dialogue.routes'));

// Advanced Systems
app.use('/api/bestiary', require('./routes/bestiary.routes'));
app.use('/api/factions', require('./routes/factions.routes'));
app.use('/api/crafting', require('./routes/crafting.routes'));
app.use('/api/enchanting', require('./routes/enchanting.routes'));
app.use('/api/status-effects', require('./routes/status-effects.routes'));

// Meta Systems
app.use('/api/seasons', require('./routes/seasons.routes'));
app.use('/api/leaderboards', require('./routes/leaderboards.routes'));
app.use('/api/redemptions', require('./routes/redemptions.routes'));

// Classes (special case - stays at /api/classes)
app.use('/api/classes', require('./routes/classes.routes'));

// Admin
app.use('/api/operator', require('./routes/operator.routes'));

// Game State
app.use('/api/game-state', require('./routes/game-state.routes'));
```

---

## Step 5: Recommended Order

Refactor in this order (easiest to hardest):

1. **auth.routes.js** - Only 2 routes, great practice
2. **abilities.routes.js** - 4 routes, well-contained
3. **bestiary.routes.js** - 4 routes, straightforward
4. **combat.routes.js** - 6 routes, core system
5. **quests.routes.js** - 9 routes, medium complexity
6. **exploration.routes.js** - 6 routes
7. **achievements.routes.js** - 8 routes
8. **player.routes.js** - 18 routes, most complex
9. ... continue with remaining route files

---

## Step 6: Testing Checklist

After creating each route file:

1. ✅ Server starts without errors
2. ✅ Routes respond correctly (test in browser/Postman)
3. ✅ No TypeErrors about undefined functions
4. ✅ WebSocket events still emit correctly
5. ✅ Database operations work

---

## Step 7: Common Pitfalls

### Pitfall 1: Missing Imports
```javascript
// ❌ ERROR: Combat is not defined
router.post('/attack', async (req, res) => {
  const combat = new Combat(...);  // Combat not imported!
});

// ✅ FIX: Add import at top
const Combat = require('../game/Combat');
```

### Pitfall 2: Wrong Route Paths
```javascript
// ❌ WRONG: Results in /api/combat/api/combat/attack
router.post('/api/combat/attack', ...);

// ✅ CORRECT: Results in /api/combat/attack  
router.post('/attack', ...);
```

### Pitfall 3: Circular Dependencies
If routes/player.routes.js needs Combat, and routes/combat.routes.js needs Character, make sure both are imported from their source, not from each other.

---

## Step 8: Validation

After refactoring all routes, your server.js should be reduced from **7,462 lines** to approximately **300-500 lines** (just setup, middleware, and route mounting).

The routes directory should contain **20-25 files**, each **50-400 lines**.

---

## Quick Reference: File Locations

| Route File | Server.js Lines (approx) | Route Count |
|------------|--------------------------|-------------|
| auth.routes.js | 697-703 | 2 |
| player.routes.js | 709-1900 | 18 |
| abilities.routes.js | 1302-1540 | 4 |
| combat.routes.js | 1952-2363 | 6 |
| bestiary.routes.js | 2363-2529 | 4 |
| progression.routes.js | 2529-3044 | 7 |
| passives.routes.js | 2715-2994 | 6 |
| status-effects.routes.js | 3044-3310 | 6 |
| exploration.routes.js | 3310-3651 | 6 |
| quests.routes.js | 3651-4025 | 9 |
| shop.routes.js | 4025-4162 | 5 |
| items.routes.js | 4162-4267 | 4 |
| npcs.routes.js | 4267-4422 | 6 |
| dialogue.routes.js | 4422-4544 | 3 |
| achievements.routes.js | 4544-4807 | 8 |
| dungeons.routes.js | 4807-5123 | 11 |
| factions.routes.js | 5123-5347 | 8 |
| crafting.routes.js | 5347-5698 | 10 |
| raids.routes.js | 5698-6139 | 16 |
| redemptions.routes.js | 6139-6383 | 3 |
| operator.routes.js | 6383-6941 | 5 |
| seasons.routes.js | 6941-7211 | 10 |
| leaderboards.routes.js | 7211-7320 | 6 |

---

## Need Help?

If you get stuck on any route file, let me know which one and I'll create it for you as an example!
