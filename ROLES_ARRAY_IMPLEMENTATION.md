# Roles Array System Implementation

## Overview
Implemented a comprehensive roles array system that allows players to have multiple Twitch roles simultaneously (e.g., subscriber + VIP + moderator), with dynamic role-based name color selection in settings.

## Key Changes

### 1. Database Schema
**File: `db.js`**

- **Changed**: `role TEXT` → `roles JSONB DEFAULT '["viewer"]'`
- **Migration**: Automatically converts existing `role` column to `roles` array
- **Migration**: Drops old CHECK constraint and `role` column after migration

```javascript
// Old Schema
role TEXT NOT NULL DEFAULT 'viewer',
CHECK (role IN ('viewer', 'subscriber', 'vip', 'moderator', 'streamer', 'creator'))

// New Schema
roles JSONB DEFAULT '["viewer"]',
```

### 2. Role Detection (bot.js)
**File: `bot.js`**

- **Updated**: `determineRoleFromTags()` now returns an **array** of all current roles
- **Logic**: Checks all Twitch badges and builds array (e.g., `['subscriber', 'vip']`)
- **Auto-update**: When Twitch roles change, the array is updated dynamically
- **Name Color Reset**: If a user loses a role and their name color matched that role, it auto-resets to their highest remaining role's color

```javascript
// Example: User who is subscriber + VIP
determineRoleFromTags() → ['subscriber', 'vip']

// If they lose VIP and nameColor was '#FF1493' (VIP pink)
// Auto-resets to '#6441A5' (subscriber purple)
```

### 3. Character Class
**File: `game/Character.js`**

- **Property**: `this.roles` array instead of `this.role` string
- **Database Export**: `toDatabase()` exports `roles` array

### 4. API Endpoints
**File: `server.js`**

#### GET `/api/player/roles`
- Returns full `roles` array: `['creator', 'subscriber']`
- Returns `primaryRole` (highest in hierarchy)
- Returns `availableColors` array with all colors user can choose from

```json
{
  "roles": ["creator", "subscriber"],
  "primaryRole": "creator",
  "availableColors": [
    { "role": "creator", "color": "#FFD700", "name": "Creator" },
    { "role": "subscriber", "color": "#6441A5", "name": "Subscriber" }
  ],
  "displayName": "MarrowOfAlbion"
}
```

#### POST `/api/player/name-color`
- Allows users to select which role color to use for their name
- Validates that selected color matches one of their roles
- Updates `nameColor` in database

### 5. Settings Modal
**File: `public/src/components/Settings/SettingsModal.jsx`**

- **New Section**: "Name Color" (only visible if user has multiple roles)
- **Color Picker**: Shows all available colors based on user's roles
- **Icons**: Displays role icon (Crown, Shield, Gem, Star, etc.) next to each color option
- **Live Update**: Saves selection to server immediately on click

### 6. Character Creation
**File: `public/src/components/Common/CharacterCreation.jsx`**

- **Updated**: `getRoleBadges()` displays all role badges user has
- **Logic**: Excludes "viewer" badge if user has higher roles
- **Example**: User with `['subscriber', 'vip']` sees both Star and Gem icons

## Role Hierarchy
```
creator     (Level 3) - #FFD700 (Gold) - 💻 Code icon - Full operator access
streamer    (Level 2) - #9146FF (Purple) - 👑 Crown icon - Advanced operator commands
moderator   (Level 1) - #00FF00 (Green) - 🛡️ Shield icon - Basic operator commands
vip         (Cosmetic) - #FF1493 (Pink) - 💎 Gem icon - In-game bonuses, NO permissions
subscriber  (Cosmetic) - #6441A5 (Purple) - ⭐ Star icon - In-game bonuses, NO permissions
tester      (Cosmetic) - #00FFFF (Cyan) - 🧪 Beaker icon - Recognition badge only
viewer      (Level 0) - #FFFFFF (White) - 👤 User icon - No permissions
```

### Permission Levels Explained

**Operator Permissions (Command Access):**
- **Creator** (Level 3): Full system access - all commands including dangerous/system ones
- **Streamer** (Level 2): Advanced operator commands - player management, events, stats manipulation
- **Moderator** (Level 1): Basic operator commands - give items, heal players, change weather, teleport

**Cosmetic Roles (In-Game Bonuses ONLY - NO Operator Permissions):**
- **VIP**: Badge and name color customization, potential in-game bonuses (e.g., bonus XP, gold multipliers)
- **Subscriber**: Badge and name color customization, potential in-game bonuses (e.g., bonus XP, gold multipliers)
- **Tester**: Badge and name color for beta testers listed in `Testers.txt` - recognition and appreciation only

**Important**: VIP, Subscriber, and Tester roles grant **ZERO operator permissions**. They cannot execute any operator commands. These roles are purely cosmetic or provide in-game bonuses only.

## Migration Process

### Automatic Migration on Server Start
1. Checks if old `role` column exists
2. Creates new `roles` JSONB column
3. Migrates data: `UPDATE SET roles = jsonb_build_array(role)`
4. Drops old CHECK constraint
5. Drops old `role` column

### Example Migration
```sql
-- Before: players_marrowofalbion
role: 'subscriber'

-- After: players_marrowofalbion
roles: ["subscriber"]
```

## User Experience

### Multi-Role User (e.g., Subscriber + VIP)
1. User subscribes → `roles: ['subscriber']`
2. Streamer gives VIP → `roles: ['subscriber', 'vip']` (auto-updated by bot)
3. User opens Settings → sees "Name Color" section
4. User can choose: Subscriber Purple OR VIP Pink
5. Selection saved to `nameColor` in database

### Single-Role User (e.g., Viewer only)
- Settings modal does NOT show "Name Color" section
- Name color defaults to viewer white (#FFFFFF)

### Role Downgrade (e.g., VIP removed)
- Bot detects VIP badge removed
- Updates `roles: ['subscriber', 'vip']` → `roles: ['subscriber']`
- IF `nameColor === '#FF1493'` (VIP pink), auto-resets to `'#6441A5'` (subscriber purple)
- IF `nameColor === '#6441A5'` (subscriber purple), no change

## Testing Checklist

### Database Migration
- [ ] Restart server
- [ ] Check logs for migration success
- [ ] Verify `roles` JSONB column exists in `players_<channel>` table
- [ ] Verify old `role` column is dropped
- [ ] Verify existing characters have roles array (e.g., `["viewer"]`)

### MarrowOfAlbion Creator Role
- [ ] Log in as MarrowOfAlbion
- [ ] Create character
- [ ] Verify `roles: ['creator']` in database
- [ ] Verify gold name color (#FFD700) appears
- [ ] Verify creator badge (Code icon) displays

### Multi-Role Scenario
- [ ] User with subscriber + VIP roles
- [ ] Open Settings
- [ ] Verify "Name Color" section appears
- [ ] Verify 2 color options shown (subscriber purple + VIP pink)
- [ ] Click a color → verify it saves
- [ ] Reload page → verify selected color persists

### Role Updates (Twitch Badge Changes)
- [ ] User types in chat
- [ ] Bot updates roles based on badges
- [ ] Verify `roles` array updates in database
- [ ] If role lost, verify name color resets correctly

## Files Modified

### Backend
1. **db.js** - Database schema, migration, savePlayerProgress, loadPlayerProgress, getUserRole, updateUserRole, determineRoleFromTags
2. **bot.js** - updateUserRoleFromTags (roles array handling)
3. **server.js** - /api/player/roles, /api/player/create, NEW /api/player/name-color
4. **game/Character.js** - Constructor and toDatabase() for roles array

### Frontend
1. **public/src/components/Settings/SettingsModal.jsx** - Name color picker section
2. **public/src/components/Common/CharacterCreation.jsx** - Multi-role badge display

## Technical Details

### Database Data Types
- **Old**: `role TEXT` with CHECK constraint
- **New**: `roles JSONB` (PostgreSQL JSON array)
- **Querying**: `typeof row.roles === 'string' ? JSON.parse(row.roles) : row.roles`

### Role Priority Logic
```javascript
const roleHierarchy = ['creator', 'streamer', 'moderator', 'vip', 'subscriber', 'viewer'];
const primaryRole = roleHierarchy.find(r => roles.includes(r)) || 'viewer';
```

### Name Color Validation
```javascript
// Only allow colors from roles user actually has
const validColors = roles.map(r => roleColors[r]);
if (!validColors.includes(requestedColor)) {
  return error('Color not available for your roles');
}
```

## Benefits

1. **Flexibility**: Users can have multiple roles simultaneously
2. **Customization**: Multi-role users choose their preferred name color
3. **Automatic Updates**: Roles sync with Twitch badges in real-time
4. **Smart Resets**: Name color auto-adjusts when roles are removed
5. **Beta Tester Recognition**: Special "Tester" role for beta testers from `Testers.txt`
6. **Future-Proof**: Easy to add new roles or role-based features

## Testers.txt Configuration

The `Testers.txt` file allows you to grant the cosmetic "Tester" role to users who helped beta test the game:

1. Create/edit `Testers.txt` in the root directory
2. Add one Twitch username per line (case-insensitive)
3. Lines starting with `#` are comments
4. Users listed will automatically receive:
   - 🧪 Tester role badge (Beaker icon)
   - #00FFFF (Cyan) name color option
   - No extra permissions (cosmetic only)

**Example Testers.txt:**
```
# Beta Testers
TestUser123
BetaTesterName
AnotherHelper
```

## Next Steps

1. Restart server to run migrations
2. Test character creation with MarrowOfAlbion account
3. Test multi-role scenarios (subscriber + VIP)
4. Verify name color picker works in settings
5. Deploy to Railway

---

Made with ❤️ by MarrowOfAlbion
