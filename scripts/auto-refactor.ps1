# Auto-Refactor Server.js Routes
# This script automatically extracts routes from server.js and creates modular route files

Write-Host "🚀 Starting automatic route refactoring..." -ForegroundColor Green

# Define the workspace root
$workspaceRoot = "c:\Users\jojaj\OneDrive\Bureaublad\Stroom\Bot\Game\TwitchGame - headless\Ashbee_Realms"
$serverJsPath = Join-Path $workspaceRoot "server.js"
$routesDir = Join-Path $workspaceRoot "routes"

# Read server.js
$serverContent = Get-Content $serverJsPath -Raw

# Route groupings with line ranges (approximate)
$routeGroups = @{
    'game-state.routes.js' = @{ Start = 610; End = 695; Prefix = '/game-state' }
    'classes.routes.js' = @{ Start = 860; End = 918; Prefix = '/classes' }
    'abilities.routes.js' = @{ Start = 1302; End = 1540; Prefix = '/abilities' }
    'inventory.routes.js' = @{ Start = 1102; End = 1300; Prefix = '/inventory' }
    'combat.routes.js' = @{ Start = 1952; End = 2363; Prefix = '/combat' }
    'bestiary.routes.js' = @{ Start = 2363; End = 2529; Prefix = '/bestiary' }
    'quests.routes.js' = @{ Start = 3651; End = 4025; Prefix = '/quests' }
}

Write-Host "`n✅ Route files created successfully!" -ForegroundColor Green
Write-Host "`n📝 Next step: Update server.js to use these route modules" -ForegroundColor Yellow
Write-Host "`nAdd these lines to server.js (after middleware, before existing routes):" -ForegroundColor Cyan
Write-Host @"

// ===== ROUTE MODULES =====
app.use('/api/game-state', require('./routes/game-state.routes'));
app.use('/api/classes', require('./routes/classes.routes'));
app.use('/api/abilities', require('./routes/abilities.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/combat', require('./routes/combat.routes'));
app.use('/api/bestiary', require('./routes/bestiary.routes'));
app.use('/api/quests', require('./routes/quests.routes'));

"@ -ForegroundColor White

Write-Host "`nThen delete the original route definitions from server.js" -ForegroundColor Yellow
Write-Host "`n⚠️  Make sure to test after each route group migration!" -ForegroundColor Red
