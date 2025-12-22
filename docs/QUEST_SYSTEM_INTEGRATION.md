# Quest System Integration Guide

## Overview

The quest system has been refactored to remove the "Available" tab from the Quest Log UI. Players can now only accept quests through:
1. **NPC Dialogue interactions** - using the `NPCDialogue` component
2. **Quest Boards in towns** - using the `QuestBoard` component

## Changes Made

### 1. Quest Log Component (`QuestLog.jsx`)
- ✅ Removed "Available" tab
- ✅ Removed "Accept Quest" button
- ✅ Simplified to show only active quests
- ✅ Updated empty state to guide players to NPCs/Quest Boards

### 2. Game Store (`gameStore.js`)
- ✅ Removed `availableQuests` state
- ✅ Updated `fetchQuests()` to only fetch active quests
- ✅ Kept `acceptQuest()` for NPC/Quest Board use

### 3. Backend Routes (`quests.routes.js`)
- ✅ Updated `/api/quests/accept` to track quest source (`npc` or `quest_board`)
- ✅ Added optional parameters: `source`, `npcId`, `location`
- ✅ Updated `/api/quests/available` to support location and NPC filtering

### 4. New Components

#### NPCDialogue Component (`/components/NPC/NPCDialogue.jsx`)
Handles NPC interactions and quest acceptance.

**Props:**
- `npc` - NPC object with properties:
  - `id` - NPC identifier
  - `name` - NPC display name
  - `icon` - Emoji or icon for NPC
  - `title` - NPC title/role
  - `greeting` - Default greeting message
- `onClose` - Callback function when dialogue is closed

**Usage Example:**
```jsx
import NPCDialogue from './components/NPC/NPCDialogue';

// In your component state
const [showNPCDialogue, setShowNPCDialogue] = useState(false);
const [currentNPC, setCurrentNPC] = useState(null);

// When clicking on an NPC
const handleNPCClick = (npc) => {
  setCurrentNPC({
    id: 'elder_thorne',
    name: 'Elder Thorne',
    icon: '🧙',
    title: 'Village Elder',
    greeting: 'Ah, another soul drawn to our realm...'
  });
  setShowNPCDialogue(true);
};

// In your render
{showNPCDialogue && (
  <NPCDialogue 
    npc={currentNPC} 
    onClose={() => setShowNPCDialogue(false)} 
  />
)}
```

#### QuestBoard Component (`/components/Town/QuestBoard.jsx`)
Displays available quests as a bulletin board in towns.

**Props:**
- `location` - Location/town identifier (e.g., 'town_square', 'highland_village')
- `onClose` - Callback function when quest board is closed

**Usage Example:**
```jsx
import QuestBoard from './components/Town/QuestBoard';

// In your component state
const [showQuestBoard, setShowQuestBoard] = useState(false);
const [currentLocation, setCurrentLocation] = useState(null);

// When clicking on a quest board
const handleQuestBoardClick = () => {
  setCurrentLocation('town_square');
  setShowQuestBoard(true);
};

// In your render
{showQuestBoard && (
  <QuestBoard 
    location={currentLocation} 
    onClose={() => setShowQuestBoard(false)} 
  />
)}
```

## Integration Steps

### Step 1: Add NPC Interaction to Map/Location View

In `MapView.jsx` or your location/town component:

```jsx
import { useState } from 'react';
import NPCDialogue from '../NPC/NPCDialogue';

const MapView = () => {
  const [showNPCDialogue, setShowNPCDialogue] = useState(false);
  const [currentNPC, setCurrentNPC] = useState(null);

  // Example NPC data (should come from backend/data file)
  const npcs = [
    {
      id: 'elder_thorne',
      name: 'Elder Thorne',
      icon: '🧙',
      title: 'Village Elder',
      greeting: 'Ah, another soul drawn to our realm. The woods grow dangerous, stranger.'
    },
    {
      id: 'witch_morgana',
      name: 'Witch Morgana',
      icon: '🧙‍♀️',
      title: 'Swamp Witch',
      greeting: 'You seek knowledge of the curse? Come closer...'
    }
  ];

  const handleNPCClick = (npc) => {
    setCurrentNPC(npc);
    setShowNPCDialogue(true);
  };

  return (
    <div>
      {/* Your map content */}
      
      {/* NPC markers/buttons */}
      {npcs.map(npc => (
        <button 
          key={npc.id}
          onClick={() => handleNPCClick(npc)}
          className="npc-marker"
        >
          {npc.icon} {npc.name}
        </button>
      ))}

      {/* NPC Dialogue Modal */}
      {showNPCDialogue && (
        <NPCDialogue 
          npc={currentNPC} 
          onClose={() => setShowNPCDialogue(false)} 
        />
      )}
    </div>
  );
};
```

### Step 2: Add Quest Board to Town Locations

```jsx
import { useState } from 'react';
import QuestBoard from '../Town/QuestBoard';
import { Scroll } from 'lucide-react';

const TownView = ({ townId }) => {
  const [showQuestBoard, setShowQuestBoard] = useState(false);

  return (
    <div>
      {/* Town content */}
      
      {/* Quest Board Button */}
      <button
        onClick={() => setShowQuestBoard(true)}
        className="btn-primary flex items-center space-x-2"
      >
        <Scroll size={20} />
        <span>View Quest Board</span>
      </button>

      {/* Quest Board Modal */}
      {showQuestBoard && (
        <QuestBoard 
          location={townId}
          onClose={() => setShowQuestBoard(false)} 
        />
      )}
    </div>
  );
};
```

## Backend API Reference

### Accept Quest with Source Tracking

```javascript
POST /api/quests/accept
{
  "questId": "awakening",
  "channel": "default",
  "source": "npc",        // 'npc' or 'quest_board'
  "npcId": "elder_thorne", // Optional: NPC ID if accepted from NPC
  "location": "town_square" // Optional: Location if accepted from quest board
}
```

### Get Available Quests (Filtered)

```javascript
GET /api/quests/available?channel=default&location=town_square&npcId=elder_thorne
```

## Testing Checklist

- [x] Quest Log displays only active quests
- [x] No "Available" tab visible
- [x] NPCDialogue component loads quests
- [x] QuestBoard component loads quests
- [ ] Quest acceptance from NPC works (requires integration)
- [ ] Quest acceptance from Quest Board works (requires integration)
- [ ] Quest source tracking is saved to database
- [ ] Build succeeds without errors

## Future Enhancements

1. **NPC System Integration**
   - Link NPCs to specific quests in quest data
   - Add `offered_by` field to quest definitions
   - Create NPC encounter system in exploration

2. **Quest Board Improvements**
   - Add quest board icons/visuals to town locations
   - Filter quests by town/region in quest data
   - Add quest refresh timers for daily quests

3. **Tutorial Updates**
   - Update tutorial step 8 to guide to NPC/Quest Board
   - Add tooltip/hint system for first-time quest acceptance

## Notes

- The `/api/quests/available` endpoint is kept for NPC/Quest Board use
- Quest source tracking is optional and backward compatible
- Existing active quests are not affected by these changes
- Components use existing game store and API patterns
