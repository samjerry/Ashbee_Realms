/**
 * Automated Route Extractor
 * This script parses server.js and automatically creates route files
 * 
 * Usage: node scripts/extract-routes.js
 */

const fs = require('fs');
const path = require('path');

// Route groupings based on URL patterns
const ROUTE_GROUPS = {
  'auth.routes.js': ['/api/me', '/api/csrf-token'],
  'game-state.routes.js': ['/api/game-state'],
  'player.routes.js': ['/api/player/progress', '/api/player/stats', '/api/player/inventory', '/api/player/equipment', '/api/player/equip', '/api/player/unequip', '/api/player', '/api/player/roles', '/api/player/create', '/api/player/name-color', '/api/player/role-display', '/api/player/theme', '/api/player/channel'],
  'classes.routes.js': ['/api/classes'],
  'abilities.routes.js': ['/api/abilities'],
  'inventory.routes.js': ['/api/inventory'],
  'combat.routes.js': ['/api/combat', '/api/action'],
  'bestiary.routes.js': ['/api/bestiary'],
  'progression.routes.js': ['/api/progression'],
  'passives.routes.js': ['/api/passives'],
  'status-effects.routes.js': ['/api/status-effects'],
  'exploration.routes.js': ['/api/exploration'],
  'quests.routes.js': ['/api/quests'],
  'shop.routes.js': ['/api/shop', '/api/consumable'],
  'items.routes.js': ['/api/items'],
  'npcs.routes.js': ['/api/npcs'],
  'dialogue.routes.js': ['/api/dialogue'],
  'achievements.routes.js': ['/api/achievements'],
  'dungeons.routes.js': ['/api/dungeons'],
  'factions.routes.js': ['/api/factions'],
  'crafting.routes.js': ['/api/crafting', '/api/enchanting'],
  'raids.routes.js': ['/api/raids'],
  'redemptions.routes.js': ['/api/redemptions'],
  'operator.routes.js': ['/api/operator'],
  'seasons.routes.js': ['/api/seasons'],
  'leaderboards.routes.js': ['/api/leaderboards']
};

// Common imports for each route file
const ROUTE_TEMPLATE_HEADER = `const express = require('express');
const router = express.Router();
const db = require('../db');
const { Character, ProgressionManager, ExplorationManager, QuestManager, ConsumableManager, ShopManager, ItemComparator, NPCManager, DialogueManager, DungeonManager, OperatorManager } = require('../game');
const Combat = require('../game/Combat');
const { loadData } = require('../data/data_loader');
const socketHandler = require('../websocket/socketHandler');
const validation = require('../middleware/validation');
const security = require('../middleware/security');
const sanitization = require('../middleware/sanitization');
const rateLimiter = require('../utils/rateLimiter');
const { fetchUserRolesFromTwitch } = require('../utils/twitchRoleChecker');

`;

const ROUTE_TEMPLATE_FOOTER = `\nmodule.exports = router;\n`;

function getRouteGroup(routePath) {
  for (const [filename, patterns] of Object.entries(ROUTE_GROUPS)) {
    for (const pattern of patterns) {
      if (routePath.startsWith(pattern)) {
        return filename;
      }
    }
  }
  return null;
}

function extractRoutes() {
  const serverJsPath = path.join(__dirname, '..', 'server.js');
  const serverContent = fs.readFileSync(serverJsPath, 'utf8');
  
  // Find where routes start (after middleware setup)
  const routesStartMarker = 'app.get(\'/api/';
  const routesStartIndex = serverContent.indexOf(routesStartMarker);
  
  if (routesStartIndex === -1) {
    console.error('Could not find route start marker');
    return;
  }
  
  // Extract everything from first route to end of file
  const routesSection = serverContent.substring(routesStartIndex);
  
  // Regular expression to match route definitions
  // Matches: app.get/post/put/delete('/api/...',
  const routeRegex = /app\.(get|post|put|delete)\('(\/api\/[^']+)',\s*/g;
  
  const routes = {};
  let match;
  
  while ((match = routeRegex.exec(routesSection)) !== null) {
    const method = match[1];
    const routePath = match[2];
    const startIndex = match.index;
    
    // Find the end of this route handler (next route or end of file)
    const nextMatch = routeRegex.exec(routesSection);
    if (nextMatch) {
      routeRegex.lastIndex = nextMatch.index; // Reset for next iteration
    }
    
    const endIndex = nextMatch ? nextMatch.index : routesSection.length;
    const routeCode = routesSection.substring(startIndex, endIndex);
    
    // Determine which route file this belongs to
    const routeFile = getRouteGroup(routePath);
    
    if (routeFile) {
      if (!routes[routeFile]) {
        routes[routeFile] = [];
      }
      
      // Convert app.METHOD to router.METHOD
      const convertedCode = routeCode
        .replace(/app\.(get|post|put|delete)/, 'router.$1')
        .replace(new RegExp(routePath.split('/api/')[1], 'g'), function(match) {
          // Adjust route paths to be relative to router base
          return match;
        });
      
      routes[routeFile].push(convertedCode.trim());
    }
  }
  
  return routes;
}

function createRouteFiles(routes) {
  const routesDir = path.join(__dirname, '..', 'routes');
  
  // Create routes directory if it doesn't exist
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }
  
  for (const [filename, routeCode] of Object.entries(routes)) {
    const filePath = path.join(routesDir, filename);
    const fileContent = ROUTE_TEMPLATE_HEADER + routeCode.join('\n\n') + ROUTE_TEMPLATE_FOOTER;
    
    fs.writeFileSync(filePath, fileContent);
    console.log(`✅ Created ${filename} with ${routeCode.length} routes`);
  }
}

function generateServerJsUpdates(routes) {
  const routeImports = Object.keys(routes)
    .sort()
    .map(filename => {
      const routeName = filename.replace('.routes.js', '');
      return `app.use('/api', require('./routes/${filename}'));`;
    })
    .join('\n');
  
  console.log('\n📝 Add these lines to server.js (replace existing routes):\n');
  console.log(routeImports);
  console.log('\n');
}

// Main execution
console.log('🚀 Starting route extraction...\n');

const routes = extractRoutes();

if (!routes) {
  console.error('❌ Failed to extract routes');
  process.exit(1);
}

console.log(`📊 Found ${Object.keys(routes).length} route groups:\n`);
for (const [filename, routeCode] of Object.entries(routes)) {
  console.log(`  - ${filename}: ${routeCode.length} routes`);
}

console.log('\n❓ Create route files? (yes/no)');

// For automated execution, uncomment the following:
// createRouteFiles(routes);
// generateServerJsUpdates(routes);

// Export for manual use
module.exports = { extractRoutes, createRouteFiles, generateServerJsUpdates };
