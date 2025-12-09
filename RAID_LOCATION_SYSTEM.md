# Location-Based Raid System

## Overview

Raids now require players to physically travel to raid entrance locations before they can start them. This adds immersion and strategic gameplay to the raid system.

## Changes Summary

### 1. Raid Entrance Locations

Each raid now has a specific entrance location in the game world:

| Raid | Entrance Location | Biome |
|------|------------------|-------|
| Goblin Siege | `whispering_woods` | Whispering Woods (Level 1-10) |
| Dragon Assault | `volcanic_peaks` | Volcanic Peaks (Level 25-35) |
| Void Incursion | `shadowmere_abyss` | Shadowmere Abyss (Level 35-45) |
| Trial of Legends | `celestial_sanctum` | Celestial Sanctum (Level 45+) |

### 2. Lobby Creation Requirements

**Before:**
- Players could create raid lobbies from anywhere using `!raid create <raidId>`

**Now:**
- Players must be physically at the raid entrance location
- Only the **lobby leader** needs to be at the entrance
- Other players can join from anywhere
- Raid lobbies are created via **in-game UI button** at the entrance (not chat command)

### 3. API Changes

#### New Endpoints

```javascript
// Get raids available at a specific location
GET /api/raids/location/:location
Response: { location, raids: [...], count }

// Get raids available at player's current location
GET /api/raids/available-here?player=username&channel=channelname
Response: { player, location, raids: [...], count, message }
```

#### Updated Endpoint

```javascript
// Create lobby (now validates location)
POST /api/raids/lobby/create
Body: { player, channel, raidId, difficulty, requireRoles, allowViewerVoting }

// Now checks:
// 1. Does player exist?
// 2. Is player at the correct entrance location?
// 3. If not, returns error: "You must be at {location} to start this raid"
```

### 4. Bot Command Changes

**Removed:**
- `!raid create <raidId>` - No longer available

**Added:**
- `!raid here` - Check which raids are available at your current location

**Updated:**
- `!raid info <raidId>` - Now shows entrance location in output
- `!raid list` - Updated message to mention traveling to entrance

### 5. Frontend Implementation Guide

To implement this in your frontend, you'll need:

#### Display Raid Entrance Button

When a player is at a raid entrance location, show a "Create Raid" button:

```javascript
// Check if player is at a raid entrance
async function checkRaidAvailability(player, channel) {
  const response = await fetch(
    `/api/raids/available-here?player=${player}&channel=${channel}`
  );
  const data = await response.json();
  
  if (data.count > 0) {
    // Show UI with available raids
    displayRaidOptions(data.raids);
  } else {
    // Hide raid UI or show "No raids here"
    hideRaidOptions();
  }
}

// Display raid creation UI
function displayRaidOptions(raids) {
  raids.forEach(raid => {
    // Show button for each raid
    // Example: "Start Goblin Siege (Normal)"
    createRaidButton(raid);
  });
}

// Create lobby when button clicked
async function createRaidLobby(raidId, difficulty) {
  const response = await fetch('/api/raids/lobby/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player: playerName,
      channel: channelName,
      raidId: raidId,
      difficulty: difficulty || 'normal',
      requireRoles: true,
      allowViewerVoting: true
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Success! Show lobby UI
    displayLobby(data);
  } else {
    // Show error (likely wrong location)
    showError(data.error);
  }
}
```

#### Example UI Flow

1. **Player travels to Volcanic Peaks**
   - Frontend calls `/api/raids/available-here`
   - Response shows "Dragon Assault" is available
   - UI displays: **"Start Dragon Assault"** button

2. **Player clicks button**
   - Frontend calls `/api/raids/lobby/create` with `raidId: "dragon_assault"`
   - Server validates player is at `volcanic_peaks`
   - Server creates lobby and returns lobby data
   - UI transitions to lobby screen

3. **Player tries to create from wrong location**
   - Player at Town Square clicks cached raid button
   - Server responds with error: "You must be at volcanic_peaks to start this raid. Current location: town_square"
   - UI shows error message with travel instructions

### 6. Database Schema

No database changes needed! The system uses existing `character.location` field.

### 7. Testing

```bash
# Test location validation
# 1. Create character at town_square
POST /api/character/create { ... }

# 2. Try to create dragon raid (should fail)
POST /api/raids/lobby/create { raidId: "dragon_assault", ... }
# Expected: Error "You must be at volcanic_peaks"

# 3. Travel to volcanic_peaks
POST /api/exploration/travel/start { destination: "volcanic_peaks" }
POST /api/exploration/travel/advance (repeat until arrival)

# 4. Check available raids
GET /api/raids/available-here?player=testuser&channel=testchannel
# Expected: Shows Dragon Assault

# 5. Create dragon raid (should succeed)
POST /api/raids/lobby/create { raidId: "dragon_assault", ... }
# Expected: Success! Lobby created
```

### 8. Benefits

- **Immersion**: Players feel like they're actually traveling to epic raid locations
- **Strategic Gameplay**: High-level raids require traveling through dangerous zones
- **Social Gameplay**: Players meet at raid entrances, creating social hubs
- **Exploration Incentive**: Encourages players to explore the world
- **Level Gating**: Low-level players can't accidentally start high-level raids from town

### 9. Migration Notes

If you have existing lobbies in production:
- Existing lobbies will continue to work (no breaking changes)
- Only new lobby creation requires location validation
- Old `!raid create` commands will no longer work (users see new help text)

---

## Quick Reference

### Files Changed
- ✅ `data/raids.json` - Added `entrance_location` to all raids
- ✅ `game/RaidManager.js` - Added location validation and `getRaidsAtLocation()`
- ✅ `bot.js` - Removed `!raid create`, added `!raid here`
- ✅ `server.js` - Updated lobby creation, added 2 new endpoints
- ✅ `game/RAID_README.md` - Updated documentation

### New API Endpoints
- `GET /api/raids/location/:location`
- `GET /api/raids/available-here`

### Updated API Endpoints
- `POST /api/raids/lobby/create` (now validates location)

### Updated Bot Commands
- `!raid here` - NEW
- `!raid info <raidId>` - Shows entrance location
- `!raid create` - REMOVED
