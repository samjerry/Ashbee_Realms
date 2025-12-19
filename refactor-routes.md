# Server.js Route Refactoring Plan

## Overview
The current server.js file has **7,462 lines** with **167 API routes**. This needs to be split into logical, maintainable route modules.

## Proposed Route Structure

```
routes/
├── auth.routes.js           # 2 routes - /api/me, /api/csrf-token
├── player.routes.js         # 18 routes - Player CRUD, stats, inventory, equipment, progress, theme, colors
├── abilities.routes.js      # 4 routes - Abilities management (equip, unequip, list, equipped)
├── combat.routes.js         # 6 routes - Combat actions (start, attack, skill, ability, item, flee, state)
├── bestiary.routes.js       # 4 routes - Bestiary tracking (get, encounter, defeat, unlock-status)
├── progression.routes.js    # 7 routes - XP, death, respawn, passives, skills
├── passives.routes.js       # 6 routes - Passive tree, upgrades, respec, currency, bonuses
├── status-effects.routes.js # 6 routes - Status effects management
├── exploration.routes.js    # 6 routes - Biomes, travel, explore
├── quests.routes.js         # 9 routes - Quest system (available, accept, abandon, active, complete, progress, chain, story)
├── shop.routes.js           # 5 routes - Merchants and transactions
├── items.routes.js          # 4 routes - Item operations (use consumable, compare, upgrades)
├── npcs.routes.js           # 6 routes - NPC interactions
├── dialogue.routes.js       # 3 routes - Dialogue system
├── achievements.routes.js   # 8 routes - Achievement tracking and titles
├── dungeons.routes.js       # 11 routes - Dungeon system
├── factions.routes.js       # 8 routes - Faction reputation
├── crafting.routes.js       # 10 routes - Crafting and enchanting
├── raids.routes.js          # 16 routes - Raid system
├── redemptions.routes.js    # 3 routes - Twitch redemptions
├── operator.routes.js       # 5 routes - Admin/operator commands
├── seasons.routes.js        # 10 routes - Seasonal content
├── leaderboards.routes.js   # 6 routes - Leaderboards
└── game-state.routes.js     # 2 routes - Game state management

Total: ~165-170 routes organized into 24 logical modules
```

## Implementation Strategy

### Phase 1: Create Route Modules (Do This Manually)
Since automated extraction is complex, I recommend:

1. **Create empty route files** with proper structure
2. **Copy-paste routes** from server.js to appropriate files
3. **Update imports** - each route file needs:
   - `const express = require('express');`
   - `const router = express.Router();`
   - Relevant dependencies (db, Character, Combat, etc.)
   - Middleware (validation, security, rateLimiter)
   - `module.exports = router;` at end

### Phase 2: Update server.js
Replace all route definitions with:
```javascript
app.use('/api', require('./routes/auth.routes'));
app.use('/api/player', require('./routes/player.routes'));
app.use('/api/abilities', require('./routes/abilities.routes'));
app.use('/api/combat', require('./routes/combat.routes'));
// ... etc
```

### Phase 3: Test
Test each route group to ensure nothing broke

## Quick Start Template

Each route file should look like this:

```javascript
const express = require('express');
const router = express.Router();
const db = require('../db');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const rateLimiter = require('../utils/rateLimiter');

// Import game systems as needed
const { Character } = require('../game');

/**
 * GET /
 * Description
 */
router.get('/', async (req, res) => {
  // Route logic here
});

module.exports = router;
```

## Benefits
- **Maintainability**: Easy to find and modify routes
- **Scalability**: Add new routes without bloating main file  
- **Testing**: Test route groups independently
- **Collaboration**: Multiple developers can work on different routes
- **Organization**: Clear separation of concerns

## Alternative: Semi-Automated Approach

I can create a Node.js script that:
1. Parses server.js  
2. Extracts routes by pattern matching
3. Groups them by URL prefix
4. Generates route files automatically

Would you like me to create this script?
