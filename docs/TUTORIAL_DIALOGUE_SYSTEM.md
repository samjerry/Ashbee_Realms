# Tutorial Dialogue System

This document describes the NPC-guided conversational tutorial system implemented for Ashbee Realms.

## Overview

The tutorial system has been enhanced with an NPC-guided dialogue experience featuring Eldrin the Guide, a veteran adventurer who teaches new players through immersive conversations instead of simple UI checklists.

## Key Features

### 1. **NPC Mentor - Eldrin the Guide**
- Warm, experienced mentor personality
- Located in Town Square
- Always available during tutorial
- Teaches through natural conversation

### 2. **Branching Dialogue Tree**
- 12+ unique dialogue nodes
- Multiple choice responses
- Contextual guidance based on player progress
- Skippable for experienced players

### 3. **Tutorial Integration**
- 11 tutorial steps guided by dialogue
- Seamless integration with quest system
- Automatic step progression
- Reward distribution

### 4. **Interactive UI Features**
- Typewriter text effect (toggleable)
- Full-screen dialogue modal
- Keyboard shortcuts (Enter to advance, Esc to close)
- Mobile-responsive design
- Action triggers (open bestiary, character sheet, etc.)

## File Structure

```
data/
├── npcs/
│   └── tutorial_mentor.json          # Eldrin NPC data
├── dialogue/
│   └── tutorial_mentor_dialogue.json # Dialogue tree
└── tutorial_quest.json                # Updated tutorial quest

game/
└── TutorialManager.js                 # Enhanced with dialogue methods

routes/
└── tutorial.routes.js                 # New dialogue endpoints

public/src/components/Tutorial/
├── TutorialDialogue.jsx               # Dialogue modal component
└── GameplayTips.jsx                   # Updated with dialogue trigger
```

## API Endpoints

### `GET /api/tutorial/dialogue/:npcId/:nodeId`
Fetches a specific dialogue node with choices and rewards.

**Response:**
```json
{
  "success": true,
  "node": {
    "id": "tutorial_start",
    "text": "Welcome...",
    "choices": [...],
    "reward": {...},
    "action": "open_bestiary"
  }
}
```

### `POST /api/tutorial/dialogue/advance`
Advances dialogue to the next node and processes actions.

**Request Body:**
```json
{
  "npcId": "tutorial_mentor",
  "currentNodeId": "tutorial_start",
  "choiceIndex": 0,
  "nextNodeId": "world_lore"
}
```

### `GET /api/tutorial/npc/:npcId`
Fetches NPC data for display.

## Dialogue Flow

1. **Tutorial Start** → Player meets Eldrin
2. **World Lore** → Learn about the realm
3. **Monster Explanation** → Bestiary introduction
4. **Survival Basics** → Stats and equipment
5. **First Hunt** → Combat quest assignment
6. **Victory Celebration** → Post-combat rewards
7. **Level Up Talk** → Progression explanation
8. **Quest Introduction** → Quest system overview
9. **Merchant Advice** → Trading tips
10. **Graduation** → Tutorial completion

## Actions and Triggers

The dialogue system supports several action types:

- `open_bestiary` - Opens bestiary with specific monster
- `open_character_sheet` - Opens character stats
- `open_quest_log` - Opens quest interface
- `assign_quest_step` - Advances tutorial step
- `skip_tutorial` - Allows skipping
- `complete_tutorial` - Marks tutorial as complete

## Rewards

Dialogue nodes can grant:
- Experience points (XP)
- Gold
- Items
- Titles (e.g., "Novice Adventurer")

## Usage

### For Players
1. New players automatically see Eldrin upon starting
2. Click "Talk to Eldrin" button in tutorial progress widget
3. Read dialogue and select responses
4. Complete tutorial steps through conversation
5. Receive rewards as dialogue progresses

### For Developers

#### Adding New Dialogue Nodes
Edit `data/dialogue/tutorial_mentor_dialogue.json`:

```json
{
  "id": "new_node",
  "text": "Dialogue text with {player_name} variable",
  "choices": [
    {
      "text": "Response option",
      "next": "next_node_id",
      "action": "optional_action"
    }
  ],
  "reward": {
    "xp": 10,
    "gold": 5
  }
}
```

#### Adding New Tutorial Steps
Edit `data/tutorial_quest.json`:

```json
{
  "id": "step_new",
  "order": 12,
  "title": "Step Title",
  "instruction": "What to do",
  "type": "dialogue",
  "target": "tutorial_mentor",
  "dialogue_node": "node_id",
  "reward": {...}
}
```

## Variables

Dialogue text supports these variables:
- `{player_name}` - Character name
- `{player_level}` - Current level
- `{player_class}` - Character class

## Conditions

Dialogue nodes can have conditions:
```json
{
  "condition": "level >= 2"
}
```

## Frontend Components

### TutorialDialogue Component
Located in `public/src/components/Tutorial/TutorialDialogue.jsx`

**Props:**
- `npcId` - NPC identifier
- `dialogueNodeId` - Starting dialogue node
- `character` - Player character data
- `onClose` - Close handler
- `onAction` - Action trigger handler
- `onComplete` - Tutorial completion handler

### TutorialProgress Component
Updated in `public/src/components/Tutorial/GameplayTips.jsx`

**New Props:**
- `onOpenDialogue` - Handler to open dialogue modal

## Testing

The system has been validated with:
1. Backend data loading tests
2. Frontend build verification
3. Dialogue node navigation
4. Reward distribution
5. Step progression

## Future Enhancements

Potential improvements:
- Additional dialogue branches for different character classes
- Voice acting support
- Dialogue replay system
- More NPCs with unique dialogue trees
- Conditional dialogue based on player choices
- Achievement tracking for dialogue completion

## Accessibility

- Keyboard navigation (Enter, Esc)
- Screen reader compatible text
- High contrast UI
- Adjustable text speed
- Skip option for all dialogue

## Mobile Support

- Touch-friendly buttons
- Responsive layout
- Optimized text size
- Swipe gestures (planned)

---

**Implemented:** December 2024
**Version:** 1.0.0
