# Item Tag System Documentation

## Overview

The item tag system provides a flexible way to categorize and track items in the game, similar to the creature tag system. It supports both **global tags** (shared across all players) and **player-specific quest tags** (unique to each player's active quests).

## Features

### Global Tags
- Defined in item data files (e.g., `items.json`, `consumables.json`)
- Shared across all players
- Used for item categorization and filtering
- Examples: `["quest_item", "trophy", "magical", "cursed"]`

### Quest Tags
- Player-specific tags automatically managed by the quest system
- Added when a quest is accepted (if `tag_item_for_quest: true` in quest objective)
- Removed when quest completes, fails, or is abandoned
- Contains metadata: `quest_id`, `player_id`, `tagged_at` timestamp
- Multiple quests can tag the same item

### Backwards Compatibility
- Old inventory format (string arrays) automatically converted to new format
- Seamless migration for existing characters
- No database migration required (JSONB supports both formats)

## Item Data Structure

### Item Instance Format
```javascript
{
  "id": "goblin_ear",
  "name": "Goblin Ear",
  "tags": ["quest_item", "trophy", "common"],  // Global tags from item data
  "quest_tags": [  // Player-specific quest tags
    {
      "quest_id": "goblin_slayer",
      "player_id": "twitch-12345",
      "tagged_at": 1234567890
    }
  ]
}
```

### Item Data Definition
```json
{
  "id": "goblin_ear",
  "name": "Goblin Ear",
  "description": "A trophy from a defeated goblin",
  "rarity": "common",
  "tags": ["quest_item", "trophy", "common"],
  "quest_eligible": true,
  "value": 5,
  "stackable": true,
  "max_stack": 99
}
```

## Quest Integration

### Quest Objective Configuration
```json
{
  "type": "collect_item",
  "target": "goblin_ear",
  "count": 5,
  "tag_item_for_quest": true,
  "description": "Collect 5 Goblin Ears"
}
```

## InventoryManager API

### Query Methods

#### Get Items by Quest Tag
```javascript
const questItems = inventory.getItemsByQuestTag('goblin_bounty');
```

#### Get Items by Global Tag
```javascript
const magicalItems = inventory.getItemsByTag('magical');
```

#### Get All Quest Items
```javascript
const allQuestItems = inventory.getQuestItems();
```

#### Check if Item is Quest Item
```javascript
const isQuest = inventory.isQuestItem('goblin_ear');
```

#### Get Quests for Item
```javascript
const quests = inventory.getQuestsForItem('goblin_ear');
```

## QuestManager API

### Tag Management Methods

#### Tag Items for Quest
```javascript
const result = questManager.tagItemsForQuest(character, questId, playerId);
```

#### Remove Quest Tags
```javascript
const result = questManager.removeQuestTags(character, questId);
```

#### Auto-Tag on Pickup
```javascript
const result = questManager.autoTagItemOnPickup(character, itemId, playerId);
```

## Usage Examples

### Example 1: Basic Quest Flow
```javascript
// Player picks up items
character.inventory.addItem('goblin_ear', 3);

// Player accepts quest and items are auto-tagged
questManager.tagItemsForQuest(character, 'goblin_bounty', 'twitch-12345');

// Check tagged items
const questItems = character.inventory.getItemsByQuestTag('goblin_bounty');

// Complete quest and remove tags
questManager.removeQuestTags(character, 'goblin_bounty');
```

### Example 2: Multiple Quests
```javascript
// Two quests need goblin ears
questManager.tagItemsForQuest(character, 'quest1', playerId);
questManager.tagItemsForQuest(character, 'quest2', playerId);

// Check which quests need item
const quests = character.inventory.getQuestsForItem('goblin_ear');
```

## Best Practices

1. **Use descriptive tags**: Make tags meaningful (e.g., "quest_item" not "q")
2. **Keep tags consistent**: Use the same tag names across similar items
3. **Clean up quest tags**: Always remove quest tags when quests end
4. **Auto-tag on pickup**: Use `autoTagItemOnPickup` for better UX

## Common Global Tags

- **quest_item**: Items used in quests
- **trophy**: Monster drops or achievement items
- **crafting_material**: Items used in crafting
- **consumable**: Usable items
- **magical**: Items with magical properties
- **cursed**: Cursed or dangerous items
- **healing**: Healing items

## Migration Guide

### For Existing Characters
No action required! The system automatically converts old string-based inventories.

### For New Item Definitions
```json
{
  "id": "new_item",
  "name": "New Item",
  "tags": ["category", "type"],
  // ... other properties
}
```

### For Quest Definitions
```json
{
  "type": "collect_item",
  "target": "item_id",
  "count": 5,
  "tag_item_for_quest": true,
  "description": "Collect items"
}
```
