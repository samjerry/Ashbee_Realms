# Ashbee Realms - Frontend UI Documentation

## Overview

Complete frontend overhaul built with React, Tailwind CSS, and WebSocket for real-time updates. Features modern UI with dark theme, animated transitions, and full game interface.

## Tech Stack

- **React 18** - Component-based UI framework
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time WebSocket communication
- **Zustand** - Lightweight state management
- **Lucide React** - Beautiful icon library

## Project Structure

```
public/
├── src/
│   ├── main.jsx                      # App entry point
│   ├── App.jsx                       # Root component
│   ├── index.css                     # Global styles + Tailwind
│   ├── store/
│   │   └── gameStore.js              # Zustand state management
│   └── components/
│       ├── Layout/
│       │   ├── Sidebar.jsx           # Navigation sidebar
│       │   ├── Header.jsx            # Player stats header
│       │   └── LoadingScreen.jsx     # Loading indicator
│       ├── Character/
│       │   └── CharacterSheet.jsx    # Character stats & equipment
│       ├── Inventory/
│       │   └── Inventory.jsx         # Item management
│       ├── Combat/
│       │   └── CombatView.jsx        # Combat interface (modal)
│       ├── Quests/
│       │   └── QuestLog.jsx          # Quest tracking
│       ├── Map/
│       │   └── MapView.jsx           # World exploration
│       ├── Dialogue/
│       │   └── DialogueModal.jsx     # NPC conversations
│       ├── Achievements/
│       │   └── AchievementTracker.jsx # Achievement display
│       └── Settings/
│           └── SettingsModal.jsx     # Game settings
├── package.json                      # Dependencies
├── vite.config.js                    # Vite configuration
├── tailwind.config.js                # Tailwind theme
├── postcss.config.js                 # PostCSS config
└── index.html                        # HTML template

websocket/
└── socketHandler.js                  # WebSocket server integration
```

## Installation & Setup

### 1. Install Frontend Dependencies

```powershell
cd public
npm install
```

### 2. Install WebSocket Dependency (Backend)

```powershell
cd ..  # Back to root
npm install socket.io
```

### 3. Update server.js for WebSocket

Add to `server.js`:

```javascript
const socketHandler = require('./websocket/socketHandler');

// After creating HTTP server
const io = socketHandler.initializeWebSocket(server);

// In your game logic, emit updates
socketHandler.emitPlayerUpdate(player, channel, { hp: newHp, xp: newXp });
socketHandler.emitCombatUpdate(player, channel, { log: combatMessages });
socketHandler.emitQuestUpdate(player, channel);
socketHandler.emitAchievementUnlocked(player, channel, achievement);
```

### 4. Run Development Servers

Terminal 1 (Backend):
```powershell
npm start  # Runs on port 3000
```

Terminal 2 (Frontend):
```powershell
cd public
npm run dev  # Runs on port 3001
```

Access the game at: `http://localhost:3001`

## Features Implemented

### ✅ Character Sheet UI
- Player stats display (Attack, Defense, Magic, Agility, HP, Crit)
- Equipment slots (Weapon, Armor, Helmet, Accessory)
- Active effects display
- Level & XP tracking
- Playtime & death statistics

### ✅ Inventory & Equipment Interface
- Grid-based item display
- Rarity color coding (Common → Mythic)
- Item filtering by type
- Detailed item stats view
- Equip/Use/Sell/Destroy actions
- Item quantity tracking

### ✅ Combat UI
- Full-screen modal combat interface
- Real-time HP bars for player & monster
- Combat log with timestamps
- Action buttons (Attack, Defend, Ability, Item)
- Combat animations
- Hit effects

### ✅ Quest Log Interface
- Active/Available quest tabs
- Quest progress tracking
- Objective completion indicators
- Quest rewards display
- Quest filtering by type (Main, Side, Daily)
- Accept/Complete quest actions

### ✅ Map/Exploration View
- All biomes displayed with danger levels
- Location details (Sub-locations, Environmental effects)
- Travel system integration
- Current location indicator
- Level-based access control
- Visual danger rating (1-5 bars)

### ✅ Dialogue UI
- Modal NPC conversation interface
- Choice-based dialogue trees
- NPC information display
- Dialogue history tracking
- Requirement indicators

### ✅ Achievement Tracker
- Category-based organization
- Progress tracking
- Unlocked/Locked states
- Hidden achievements
- Rarity display
- Achievement points system
- Overall progress bar

### ✅ Settings/Help Page
- Audio controls (Music, SFX volume)
- Notification settings
- Visual options (Animations, Damage numbers)
- Gameplay preferences (Auto-loot)
- About section

## Component Details

### State Management (Zustand)

The `gameStore.js` manages all game state:

```javascript
// Access state
const { player, activeTab, combat } = useGameStore();

// Call actions
const { fetchPlayer, startCombat, acceptQuest } = useGameStore();

// Update state directly
useGameStore.setState({ activeTab: 'inventory' });
```

### WebSocket Integration

Automatic real-time updates:
- Player stats changes (HP, XP, gold)
- Combat log updates
- Quest progress
- Achievement unlocks
- Inventory changes
- Level up notifications

### Styling System

Tailwind utility classes with custom theme:

```javascript
// Buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-success">Success</button>
<button className="btn-danger">Danger</button>

// Cards
<div className="card p-6">Content</div>

// Stat bars
<div className="hp-bar">
  <div className="hp-fill" style={{ width: '70%' }} />
</div>

// Rarity colors
<span className="rarity-legendary">Legendary Item</span>
```

## API Integration

All API endpoints are accessed via fetch:

```javascript
// GET request
const response = await fetch('/api/player/stats');
const data = await response.json();

// POST request
await fetch('/api/quests/accept', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ questId: 'the_awakening' })
});
```

## Animations & Effects

- **Combat Hit**: Shake animation on damage
- **Level Up**: Scale + glow animation
- **Hover Effects**: Scale + color transitions
- **Progress Bars**: Smooth width transitions
- **Modal Entrance**: Fade + backdrop blur
- **Loading**: Pulse animation

## Responsive Design

- Mobile-first approach
- Grid layouts adapt to screen size
- Sidebar collapses on mobile
- Touch-friendly buttons
- Responsive font sizes

## Development Commands

```powershell
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Format code (if added)
npm run format
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Performance Optimizations

- Lazy loading components
- Memoized calculations
- Debounced API calls
- WebSocket connection pooling
- Asset optimization via Vite
- Tree-shaking unused code

## Future Enhancements

### Phase 5.2 - Real-time Updates (Planned)
- Live raid party updates
- Real-time leaderboard changes
- Chat integration
- Streaming viewer count
- Live combat spectating

### Phase 5.3 - Tutorial (Planned)
- Interactive tutorial quest
- Tooltips for first-time users
- Onboarding flow
- Help documentation

## Troubleshooting

### Frontend won't start
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### WebSocket connection fails
- Verify backend is running on port 3000
- Check CORS settings in `socketHandler.js`
- Ensure socket.io is installed in root

### Styles not loading
```powershell
# Rebuild Tailwind
npm run dev
```

### Port 3001 already in use
```powershell
# Kill process on port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

## Testing the UI

1. **Start both servers** (backend + frontend)
2. **Open browser** to `http://localhost:3001`
3. **Test each tab**:
   - Character: View stats & equipment
   - Inventory: Browse items, equip gear
   - Quests: Accept & track quests
   - Map: Travel to different locations
   - Achievements: View progress
4. **Test combat**:
   - Start encounter via API or bot
   - Combat modal should appear
   - Perform actions, watch HP bars
5. **Test real-time updates**:
   - Trigger XP gain
   - Watch header update automatically
   - Check console for WebSocket events

## Production Deployment

### Build frontend
```powershell
cd public
npm run build
```

### Serve static files
Add to `server.js`:
```javascript
app.use(express.static('public/dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dist/index.html'));
});
```

### Environment Variables
```
CLIENT_URL=https://yourdomain.com
PORT=3000
```

## Contributing

Frontend structure is modular - add new components in `src/components/` and import in `App.jsx`.

---

**Phase 5.1 Frontend Overhaul: ✅ COMPLETE**

All 8 tasks implemented:
- ✅ Character sheet UI
- ✅ Inventory/equipment interface
- ✅ Combat UI (HP bars, actions, enemy info)
- ✅ Quest log interface
- ✅ Map/exploration view
- ✅ Dialogue UI
- ✅ Achievement tracker
- ✅ Settings/help pages

**Next Steps**: Run `cd public && npm install && npm run dev` to start the frontend!
