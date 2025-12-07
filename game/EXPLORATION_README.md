# 🗺️ Exploration & Travel System

## Overview

The Exploration System provides strategic, time-consuming travel between biomes with random encounters, environmental challenges, and location-based content. Travel is **NOT instant** - it requires multiple moves and careful planning.

## Core Concepts

### Biomes
Biomes are distinct areas with their own:
- **Danger Level** (1-5): Affects monster strength and travel difficulty
- **Recommended Level Range**: Suggested player levels for safe exploration
- **Environmental Effects**: Movement penalties, ambush chances, weather hazards
- **Sub-Locations**: Explorable areas within each biome
- **Monster Types**: Biome-specific creatures

### Travel Mechanics

#### Multi-Move Travel System
- Travel between biomes requires **3-8+ moves** based on distance
- Distance calculated from danger level difference
- Each move takes **10 minutes** of in-game time
- **Cannot** teleport instantly between locations

#### Travel Distance Formula
```
Base Moves = 3 + |destination_danger - origin_danger|
Total Moves = Base Moves × (1 + movement_penalty)
Time Required = Total Moves × 10 minutes
```

Example:
- Whispering Woods (danger 1) → Twilight Wetlands (danger 2): **5 moves** (50 min)
- Twilight Wetlands (danger 2) → Volcanic Peaks (danger 5): **7+ moves** (70+ min)

#### Random Encounters During Travel
Every move has a chance to trigger encounters:
- **Encounter Chance**: 20% base + 2% per danger level
- **60% Combat**: Monster fights based on biome
- **25% Events**: Environmental events (ambush, treasure, rest)
- **15% Special**: Unique encounters (merchants, NPCs, mysteries)

### Environmental Effects

Biomes can have hazards that affect travel:

**Movement Penalties**
- Reduces travel speed (0-50% slower)
- Examples: Deep snow, thick undergrowth, treacherous terrain

**Ambush Chance**
- Increases surprise attack probability
- Players start combat at disadvantage if ambushed

**Visibility**
- Affects encounter detection
- Low visibility = more dangerous encounters

**Disease/Temperature**
- Environmental damage over time
- Requires preparation (potions, gear)

## API Endpoints

### GET `/api/exploration/biomes`
Get list of all available biomes with player suitability.

**Query Parameters:**
- `player` (required): Player username
- `channel` (required): Twitch channel

**Response:**
```json
{
  "biomes": [
    {
      "id": "whispering_woods",
      "name": "Whispering Woods",
      "description": "An ancient forest where trees whisper secrets",
      "dangerLevel": 1,
      "recommendedLevel": [1, 10],
      "isSuitable": true,
      "tooEasy": false,
      "tooDangerous": false
    }
  ]
}
```

### GET `/api/exploration/current`
Get current location information and travel status.

**Response:**
```json
{
  "location": {
    "id": "whispering_woods",
    "name": "Whispering Woods",
    "description": "...",
    "dangerLevel": 1,
    "environmentalEffects": { "visibility": "low" }
  },
  "travelStatus": {
    "inTravel": true,
    "from": "Whispering Woods",
    "to": "Twilight Wetlands",
    "progress": "60.0%",
    "movesCompleted": 3,
    "movesRemaining": 2
  }
}
```

### GET `/api/exploration/travel-info`
Calculate travel requirements between biomes.

**Query Parameters:**
- `player` (required): Player username
- `channel` (required): Twitch channel
- `destination` (required): Target biome ID

**Response:**
```json
{
  "canTravel": true,
  "movesRequired": 5,
  "timeRequired": 50,
  "encounterChancePerMove": 0.24,
  "dangerLevel": 2,
  "environmentalEffects": {
    "movement_penalty": 0.25,
    "visibility": "low"
  },
  "warnings": [
    "🚶 Difficult terrain - travel will be slow"
  ]
}
```

### POST `/api/exploration/travel/start`
Begin travel to a destination biome.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "destination": "twilight_wetlands"
}
```

**Response:**
```json
{
  "success": true,
  "travelState": {
    "inTravel": true,
    "from": "whispering_woods",
    "to": "twilight_wetlands",
    "movesTotal": 5,
    "movesCompleted": 0,
    "encounterChance": 0.24
  },
  "message": "Started journey to Twilight Wetlands. 5 moves required.",
  "warnings": ["🚶 Difficult terrain - travel will be slow"]
}
```

### POST `/api/exploration/travel/advance`
Advance one move during travel (check for encounters).

**Body:**
```json
{
  "player": "username",
  "channel": "channelname"
}
```

**Response (No Encounter):**
```json
{
  "success": true,
  "movesCompleted": 3,
  "movesRemaining": 2,
  "arrived": false,
  "encounter": null,
  "message": "You continue your journey... (3/5 moves)"
}
```

**Response (Monster Encounter):**
```json
{
  "success": true,
  "movesCompleted": 2,
  "encounter": {
    "type": "combat",
    "subType": "monster",
    "monster": {
      "id": "forest_wolf",
      "name": "Forest Wolf",
      "level_range": [1, 5],
      "stats": [25, 6, 3, 7]
    },
    "isAmbush": false,
    "message": "A wild Forest Wolf appears!"
  },
  "travelInterrupted": true
}
```

**Response (Arrival):**
```json
{
  "success": true,
  "arrived": true,
  "destination": {
    "id": "twilight_wetlands",
    "name": "Twilight Wetlands",
    "description": "..."
  },
  "message": "You have arrived at Twilight Wetlands!"
}
```

### POST `/api/exploration/travel/cancel`
Cancel current travel (lose all progress).

**Body:**
```json
{
  "player": "username",
  "channel": "channelname"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Travel interrupted",
  "progressLost": 3
}
```

### POST `/api/exploration/explore`
Explore current biome for sub-locations and encounters.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname"
}
```

**Response:**
```json
{
  "success": true,
  "subLocation": {
    "id": "dark_thicket",
    "name": "Dark Thicket",
    "description": "Dense undergrowth where shadows move"
  },
  "encounter": {
    "type": "combat",
    "monster": { "id": "goblin_scout", "name": "Goblin Scout" }
  },
  "message": "You explore Dark Thicket: Dense undergrowth where shadows move"
}
```

## Usage Examples

### Basic Travel Flow

**1. Check Travel Requirements**
```bash
GET /api/exploration/travel-info?player=user&channel=chan&destination=twilight_wetlands
# Returns: 5 moves required, 50 min, 24% encounter chance per move
```

**2. Start Travel**
```bash
POST /api/exploration/travel/start
Body: { "player": "user", "channel": "chan", "destination": "twilight_wetlands" }
# Character enters travel state, no longer at starting location
```

**3. Advance Travel (Repeat until arrival)**
```bash
POST /api/exploration/travel/advance
Body: { "player": "user", "channel": "chan" }
# Move 1/5: No encounter, continue
# Move 2/5: Monster encounter! (travel interrupted, enter combat)
# ... (complete combat)
# Move 3/5: No encounter
# Move 4/5: Random event (find treasure)
# Move 5/5: Arrived at destination!
```

**4. Explore Destination**
```bash
POST /api/exploration/explore
Body: { "player": "user", "channel": "chan" }
# Discover sub-location, possible encounter
```

### Twitch Bot Integration Example

```javascript
// !travel command - start journey
if (command === '!travel') {
  const destination = args[0]; // e.g., "twilight_wetlands"
  
  // Get travel info
  const info = await getTravelInfo(username, channel, destination);
  
  client.say(channel, 
    `@${username} Starting journey to ${info.destination}! ` +
    `This will take ${info.movesRequired} moves (~${info.timeRequired} min). ` +
    `Use !advance to continue your journey.`
  );
  
  await startTravel(username, channel, destination);
}

// !advance command - progress one move
if (command === '!advance') {
  const result = await advanceTravel(username, channel);
  
  if (result.encounter) {
    if (result.encounter.type === 'combat') {
      client.say(channel, 
        `⚔️ @${username} ${result.encounter.message} ` +
        `(Move ${result.movesCompleted}/${result.movesTotal})`
      );
      // Initiate combat
    } else if (result.encounter.type === 'event') {
      client.say(channel, `📜 ${result.encounter.message}`);
    }
  } else if (result.arrived) {
    client.say(channel, 
      `🗺️ @${username} You have arrived at ${result.destination.name}!`
    );
  } else {
    client.say(channel, 
      `🚶 @${username} ${result.message} ` +
      `(${result.movesRemaining} moves remaining)`
    );
  }
}

// !explore command - explore current biome
if (command === '!explore') {
  const result = await exploreLocation(username, channel);
  
  client.say(channel, 
    `🔍 @${username} ${result.message}`
  );
  
  if (result.encounter) {
    // Handle encounter
  }
}
```

## Strategic Considerations

### Planning Your Journey
1. **Check Danger Level**: Higher danger = more moves required
2. **Review Environmental Effects**: Movement penalties slow travel
3. **Prepare for Encounters**: 20-30% chance per move
4. **Bring Supplies**: Potions, food for long journeys
5. **Consider Hardcore Mode**: Death during travel deletes character

### Travel Interruption
- **Combat Encounters**: Travel paused until combat resolves
- **Death**: Travel cancelled, respawn at home location
- **Manual Cancel**: Lose all progress, no penalty otherwise

### Encounter Management
- **Ambush Attacks**: Start combat at disadvantage
- **Event Choices**: Can provide buffs/items or penalties
- **Special Encounters**: Merchants, quests, mysteries

### Level Recommendations
- **Too Low**: Dangerous encounters, high death risk
- **Suitable Range**: Balanced challenge, good rewards
- **Too High**: Minimal challenge, reduced XP/loot

## Data Structure

### Travel State (Character Property)
```javascript
{
  inTravel: true,                    // Currently traveling
  from: "whispering_woods",          // Origin biome ID
  to: "twilight_wetlands",           // Destination biome ID
  movesTotal: 5,                     // Total moves required
  movesCompleted: 2,                 // Moves completed so far
  encounterChance: 0.24,             // Chance per move (0-1)
  startedAt: 1234567890              // Unix timestamp
}
```

### Biome Structure
```javascript
{
  id: "whispering_woods",
  name: "Whispering Woods",
  description: "Ancient forest...",
  danger_level: 1,                   // 1-5
  recommended_level: [1, 10],        // [min, max]
  environmental_effects: {
    visibility: "low",               // low/medium/high
    movement_penalty: 0.25,          // 0-0.5 (0-50% slower)
    ambush_chance: 0.15,             // 0-1
    disease_chance: 0.1,             // 0-1
    extreme_cold: true,              // true/false
    extreme_heat: false              // true/false
  },
  sub_locations: [                   // Explorable areas
    {
      id: "dark_thicket",
      name: "Dark Thicket",
      description: "Dense undergrowth...",
      monster_spawn_types: ["common", "uncommon"],
      events: ["ambush", "treasure"],
      guaranteed_encounter: false    // Optional
    }
  ]
}
```

## Implementation Notes

### Database Changes
- Added `travel_state` JSONB column to `player_progress` table
- Stores current travel progress between game sessions
- Null when not traveling

### Character Integration
- `character.travelState` property tracks journey
- Updated via `character.toDatabase()` for persistence
- Restored from database on character load

### Encounter System
- Monster level filtering by biome recommended range
- Event type distribution: 60% combat, 25% event, 15% special
- Ambush chance increases from environmental effects

### Time Simulation
- Each move = 10 minutes in-game time
- Future: Time-based buffs/debuffs, day/night cycle
- Tracked via `startedAt` timestamp

## Testing

Run comprehensive tests:
```bash
node Testing/test_exploration_system.js
```

**Test Coverage:**
- ✅ Biome loading and data access
- ✅ Travel distance calculations
- ✅ Movement penalty effects
- ✅ Travel state management
- ✅ Encounter generation (combat/event/special)
- ✅ Arrival detection
- ✅ Progress tracking
- ✅ Travel cancellation
- ✅ Full travel flow integration

**Test Results:** 19/19 passing ✅

## Future Enhancements

### Phase 1.4 Extensions
- **Mount System**: Reduce travel moves with horses/fast travel
- **Weather Effects**: Dynamic environmental changes
- **Travel Groups**: Party-based travel with safety bonuses
- **Waypoints**: Discovered locations for easier navigation

### Integration with Other Systems
- **Quest System**: Travel-based quest objectives
- **Faction System**: Safe/hostile territory
- **Economic System**: Travel costs (provisions, mounts)
- **Seasonal Effects**: Weather changes affecting travel

### Twitch-Specific Features
- **Channel Points**: Reduce travel time or avoid encounters
- **Viewer Participation**: Viewers vote on choices during encounters
- **Stream Events**: Special encounters during live streams

## Performance Considerations

- Biome/monster data cached in memory (no DB queries per move)
- Travel state stored as JSONB for efficient updates
- Encounter generation uses randomization (no heavy computation)
- Tested with 13 biomes, scales to 50+ biomes easily

## Troubleshooting

**Travel won't start:**
- Check player is not already in travel state
- Verify destination biome ID exists
- Ensure character is alive (HP > 0)

**Encounters not generating:**
- Check `monsters.json` has monsters with appropriate `level_range`
- Verify biome has `recommended_level` property
- Ensure `level_range` overlaps with biome range ±2 levels

**Move counter not incrementing:**
- Verify `advanceTravel()` is being called
- Check travel state is valid (inTravel = true)
- Ensure character.travelState is saved to database

**Arrival not detected:**
- Compare `movesCompleted` vs `movesTotal`
- Check arrival logic in `advanceTravel()` (should arrive when equal)
- Verify travel state updates are persisted

---

**Status:** ✅ Complete and Tested  
**Version:** 1.0  
**Last Updated:** Phase 1.4 Implementation
