# NPC & Dialogue System Documentation

## Overview

The NPC & Dialogue System enables rich player-NPC interactions through a comprehensive dialogue tree system with branching conversations, triggers, requirements, and rewards. Players can interact with 16+ merchants, quest givers, companions, and lore keepers throughout the world.

## Features

- **NPCManager**: Load, manage, and handle NPC interactions
- **DialogueManager**: Branching dialogue trees with choices and consequences
- **Dialogue Triggers**: first_encounter, new_player, quest completion, level requirements
- **Requirements**: Gold, items, special tokens
- **Choice Effects**: Reputation, gold, XP, class changes, unlocks
- **Dialogue History**: Track conversations and visited nodes
- **Reputation System**: Multiple faction reputations

---

## NPCManager

### Purpose
Manages all NPCs in the game including merchants, quest givers, companions, and lore keepers.

### Key Methods

#### `getNPC(npcId)`
Get NPC data by ID.
```javascript
const npcMgr = new NPCManager();
const merchant = npcMgr.getNPC('wandering_merchant');
```

#### `getAllNPCs()`
Get all NPCs with basic information.
```javascript
const allNPCs = npcMgr.getAllNPCs();
// Returns: [{ id, name, description, type }, ...]
```

#### `getNPCsInLocation(location)`
Get NPCs that can spawn in a specific location.
```javascript
const npcs = npcMgr.getNPCsInLocation('whispering_woods');
```

#### `getNPCsByType(type)`
Get NPCs by classification: `merchant`, `quest_giver`, `companion`, `lore_keeper`.
```javascript
const merchants = npcMgr.getNPCsByType('merchant'); // Returns 16+ merchants
const questGivers = npcMgr.getNPCsByType('quest_giver');
```

#### `checkNPCSpawn(npcId)`
Check if NPC should spawn based on spawn_chance (5-15%).
```javascript
const spawned = npcMgr.checkNPCSpawn('wandering_merchant');
// Returns: true/false based on probability
```

#### `interactWithNPC(npcId, character)`
Main interaction handler - returns greeting, dialogue, and available actions.
```javascript
const interaction = npcMgr.interactWithNPC('wandering_merchant', character);
// Returns: {
//   success: true,
//   npc: { id, name, description, type },
//   greeting: "Ah, a customer!...",
//   dialogue: "These roads are dangerous...",
//   actions: [
//     { id: 'view_shop', name: 'View Shop', description: '...' },
//     { id: 'talk', name: 'Talk', description: '...' }
//   ]
// }
```

#### `isNPCAvailable(npcId, character)`
Check if NPC is available based on level/reputation requirements.
```javascript
const availability = npcMgr.isNPCAvailable('elder_thorne', character);
// Returns: { available: true/false, reason: null/string }
```

#### `spawnNPCsInLocation(location)`
Spawn NPCs in a location with probability filtering.
```javascript
const spawnedNPCs = npcMgr.spawnNPCsInLocation('whispering_woods');
// Returns: ['wandering_merchant', 'herbalist', ...]
```

---

## DialogueManager

### Purpose
Handles dialogue trees with branching conversations, choices, triggers, requirements, and rewards.

### Key Methods

#### `getDialogue(npcId)`
Get all dialogue data for an NPC.
```javascript
const dialogueMgr = new DialogueManager();
const dialogue = dialogueMgr.getDialogue('elder_thorne');
```

#### `getConversation(npcId, conversationId)`
Get specific conversation by ID.
```javascript
const conversation = dialogueMgr.getConversation('elder_thorne', 'first_meeting');
```

#### `startConversation(npcId, character, conversationId)`
Start a dialogue conversation with an NPC.
```javascript
const result = dialogueMgr.startConversation('elder_thorne', character, 'first_meeting');
// Returns: {
//   success: true,
//   npc: { id, name, personality },
//   conversation: { id, currentNode },
//   node: { id, text, choices, reward, unlocks }
// }
```

#### `makeChoice(npcId, conversationId, currentNodeId, choiceIndex, character)`
Make a choice in a dialogue conversation.
```javascript
const result = dialogueMgr.makeChoice('elder_thorne', 'first_meeting', 'start', 0, character);
// Returns next node or conversation end
```

#### `getAvailableConversations(npcId, character)`
Get conversations available based on triggers.
```javascript
const conversations = dialogueMgr.getAvailableConversations('elder_thorne', character);
// Returns: [{ id: 'first_meeting', trigger: 'first_encounter' }, ...]
```

---

## Dialogue Triggers

Triggers determine when a conversation becomes available.

### Trigger Types

#### `first_encounter`
Available on first interaction with NPC.
```json
{
  "trigger": "first_encounter"
}
```

#### `new_player`
Available only to new players (level 1, no quests).
```json
{
  "trigger": "new_player"
}
```

#### `quest:quest_id`
Available after completing a specific quest.
```json
{
  "trigger": "quest:intro_quest"
}
```

#### `level:X`
Available after reaching level X.
```json
{
  "trigger": "level:10"
}
```

---

## Choice Requirements

Requirements must be met to select a dialogue choice.

### Requirement Syntax

#### Gold Requirement
```json
{
  "text": "I'll pay the toll (50 gold)",
  "requires": "gold:50",
  "next": "paid_toll"
}
```

#### Item Requirement
```json
{
  "text": "Give the healing potion",
  "requires": "item:healing_potion",
  "next": "gave_potion"
}
```

#### Token Requirement
```json
{
  "text": "Show the ancient key",
  "requires": "ancient_key",
  "next": "showed_key"
}
```

---

## Choice Effects

Effects are applied when making a choice.

### Effect Types

#### Reputation Change
```json
{
  "text": "I'll help protect the realm",
  "reputation": 10,
  "next": "protector"
}
```

#### Gold Change
```json
{
  "text": "Pay the merchant (50 gold)",
  "gold": -50,
  "next": "paid"
}
```

#### XP Grant
```json
{
  "text": "Complete the training",
  "xp": 100,
  "next": "training_complete"
}
```

#### Set Class (Character Creation)
```json
{
  "text": "I am a Warrior",
  "set_class": "warrior",
  "next": "warrior_chosen"
}
```

#### Unlock Features
```json
{
  "text": "Accept the quest",
  "unlocks": ["quest_dragon_hunt", "access_dragon_lair"],
  "next": "quest_accepted"
}
```

---

## Node Rewards

Rewards granted when reaching a dialogue node.

```json
{
  "id": "quest_complete",
  "text": "Well done! You've saved the village!",
  "reward": {
    "xp": 500,
    "gold": 200,
    "items": [
      { "id": "legendary_sword", "quantity": 1 }
    ],
    "reputation": 50
  },
  "choices": [
    { "text": "Thank you!", "next": "end" }
  ]
}
```

---

## Variable Replacement

Dynamic text replacement in dialogue nodes.

### Available Variables

- `{player_name}` - Character name
- `{player_level}` - Character level
- `{player_class}` - Character class

### Example
```json
{
  "text": "Greetings, {player_name}! A level {player_level} {player_class}, impressive!"
}
```
Result: "Greetings, TestHero! A level 5 warrior, impressive!"

---

## Dialogue History

Track conversation progress and nodes visited.

### Structure
```javascript
character.dialogueHistory = {
  "elder_thorne": {
    "conversations": {
      "first_meeting": {
        "nodes": [
          { "nodeId": "start", "timestamp": 1672531200000 },
          { "nodeId": "protector", "timestamp": 1672531210000 }
        ],
        "completed": false
      }
    },
    "lastInteraction": 1672531210000
  }
}
```

---

## API Endpoints

### NPC Endpoints

#### GET `/api/npcs`
List all NPCs with basic info.
```javascript
fetch('/api/npcs')
  .then(res => res.json())
  .then(data => {
    // data.npcs: [{ id, name, description, type }, ...]
  });
```

#### GET `/api/npcs/location/:location`
Get NPCs in a specific location.
```javascript
fetch('/api/npcs/location/whispering_woods')
  .then(res => res.json())
  .then(data => {
    // data.npcs: [...NPCs in whispering woods...]
  });
```

#### GET `/api/npcs/type/:type`
Get NPCs by type (merchant, quest_giver, companion, lore_keeper).
```javascript
fetch('/api/npcs/type/merchant')
  .then(res => res.json())
  .then(data => {
    // data.npcs: [...all merchants...]
  });
```

#### GET `/api/npcs/:npcId`
Get detailed NPC information.
```javascript
fetch('/api/npcs/wandering_merchant')
  .then(res => res.json())
  .then(data => {
    // data.npc: { id, name, description, ...full data }
  });
```

#### POST `/api/npcs/:npcId/interact`
Interact with an NPC.
```javascript
fetch('/api/npcs/wandering_merchant/interact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player: 'PlayerName',
    channel: 'channel_name'
  })
})
  .then(res => res.json())
  .then(data => {
    // data: { success, npc, greeting, dialogue, actions }
  });
```

#### POST `/api/npcs/:npcId/spawn-check`
Check if NPC should spawn (random encounters).
```javascript
fetch('/api/npcs/wandering_merchant/spawn-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'whispering_woods'
  })
})
  .then(res => res.json())
  .then(data => {
    // data: { success, spawned: true/false, npc: {...} }
  });
```

### Dialogue Endpoints

#### GET `/api/dialogue/:npcId`
Get available conversations for an NPC.
```javascript
fetch('/api/dialogue/elder_thorne?player=PlayerName&channel=channel_name')
  .then(res => res.json())
  .then(data => {
    // data.conversations: [{ id, trigger }, ...]
  });
```

#### POST `/api/dialogue/start`
Start a dialogue conversation.
```javascript
fetch('/api/dialogue/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player: 'PlayerName',
    channel: 'channel_name',
    npcId: 'elder_thorne',
    conversationId: 'first_meeting'
  })
})
  .then(res => res.json())
  .then(data => {
    // data: { success, npc, conversation, node }
  });
```

#### POST `/api/dialogue/choice`
Make a choice in a dialogue conversation.
```javascript
fetch('/api/dialogue/choice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player: 'PlayerName',
    channel: 'channel_name',
    npcId: 'elder_thorne',
    conversationId: 'first_meeting',
    currentNodeId: 'start',
    choiceIndex: 0
  })
})
  .then(res => res.json())
  .then(data => {
    // data: { success, nextNode, effects, conversationEnded }
  });
```

---

## Database Schema

### Columns Added to `player_progress`

#### `dialogue_history` (JSONB)
Stores conversation history and progress.
```sql
dialogue_history JSONB DEFAULT '{}'
```

#### `reputation` (JSONB)
Stores faction reputation.
```sql
reputation JSONB DEFAULT '{"general":0}'
```

---

## Integration with Other Systems

### With QuestManager
- Dialogue can unlock quests via `unlocks` property
- Quest completion can trigger new conversations via `quest:quest_id` trigger

### With ShopManager
- Merchant NPCs have both shop and talk actions
- Dialogue can affect merchant prices via reputation

### With Character System
- Dialogue history persists in character data
- Reputation affects NPC availability
- Level requirements gate advanced conversations

---

## Usage Examples

### Twitch Bot Integration

#### `!talk <npc_name>` Command
```javascript
// In bot.js
client.on('message', async (channel, tags, message, self) => {
  if (message.startsWith('!talk')) {
    const npcName = message.split(' ')[1];
    
    // Find NPC by name
    const npcMgr = new NPCManager();
    const allNPCs = npcMgr.getAllNPCs();
    const npc = allNPCs.find(n => n.name.toLowerCase().includes(npcName.toLowerCase()));
    
    if (!npc) {
      return client.say(channel, `NPC "${npcName}" not found.`);
    }
    
    // Interact with NPC
    const character = await getCharacter(tags.username, channel);
    const interaction = npcMgr.interactWithNPC(npc.id, character);
    
    client.say(channel, `${interaction.npc.name}: ${interaction.greeting}`);
    client.say(channel, `💬 ${interaction.dialogue}`);
    
    // Show available actions
    const actions = interaction.actions.map(a => a.name).join(', ');
    client.say(channel, `Actions: ${actions}`);
  }
});
```

#### `!dialogue <npc_name>` Command
```javascript
client.on('message', async (channel, tags, message, self) => {
  if (message.startsWith('!dialogue')) {
    const npcName = message.split(' ')[1];
    
    // Find NPC and start conversation
    const character = await getCharacter(tags.username, channel);
    const dialogueMgr = new DialogueManager();
    
    const result = dialogueMgr.startConversation(npcId, character);
    
    if (!result.success) {
      return client.say(channel, `Cannot start conversation: ${result.message}`);
    }
    
    client.say(channel, `${result.npc.name}: ${result.node.text}`);
    
    // Show choices
    result.node.choices.forEach((choice, i) => {
      client.say(channel, `[${i + 1}] ${choice.text}`);
    });
    
    client.say(channel, `Use !choose <number> to make your choice`);
  }
});
```

#### `!choose <number>` Command
```javascript
client.on('message', async (channel, tags, message, self) => {
  if (message.startsWith('!choose')) {
    const choiceIndex = parseInt(message.split(' ')[1]) - 1;
    
    // Get current dialogue state from session/cache
    const currentDialogue = getDialogueSession(tags.username);
    
    const character = await getCharacter(tags.username, channel);
    const dialogueMgr = new DialogueManager();
    
    const result = dialogueMgr.makeChoice(
      currentDialogue.npcId,
      currentDialogue.conversationId,
      currentDialogue.currentNodeId,
      choiceIndex,
      character
    );
    
    if (!result.success) {
      return client.say(channel, `Error: ${result.message}`);
    }
    
    if (result.conversationEnded) {
      client.say(channel, `Conversation with ${currentDialogue.npcId} ended.`);
      clearDialogueSession(tags.username);
      return;
    }
    
    // Show next node
    client.say(channel, result.nextNode.text);
    
    result.nextNode.choices.forEach((choice, i) => {
      client.say(channel, `[${i + 1}] ${choice.text}`);
    });
  }
});
```

---

## Testing

All 38 tests passing:
- ✅ 15 NPCManager tests
- ✅ 19 DialogueManager tests  
- ✅ 4 Integration tests

Run tests:
```bash
node Testing/test_npc_dialogue.js
```

---

## Files Created

### Core System Files
- `game/NPCManager.js` (345 lines) - NPC management system
- `game/DialogueManager.js` (504 lines) - Dialogue tree system

### Integration Files
- Modified `game/Character.js` - Added dialogueHistory and reputation properties
- Modified `db.js` - Added dialogue_history and reputation columns
- Modified `game/index.js` - Exported NPCManager and DialogueManager
- Modified `server.js` - Added 8 API endpoints

### Test Files
- `Testing/test_npc_dialogue.js` (471 lines) - 38 comprehensive tests

### Documentation
- `game/NPC_DIALOGUE_README.md` (this file)

---

## Future Enhancements

- **Conditional Text**: Show different text based on character state
- **Timed Dialogue**: Conversations available at specific times
- **Group Conversations**: Multiple NPCs in one dialogue
- **Voice Acting**: Audio files for dialogue lines
- **Animated Portraits**: NPC expressions during dialogue
- **Relationship System**: Track individual NPC relationships beyond faction reputation
- **Dynamic Dialogue**: Generate dialogue based on recent events
- **Dialogue Interruptions**: NPCs can interject based on player actions

---

## Support

For issues or questions about the NPC & Dialogue System:
1. Check test file for usage examples
2. Review API endpoint documentation above
3. Examine data/npcs.json and data/dialogues.json for data structure examples
4. Run tests to validate system functionality

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Status**: ✅ Production Ready - All Tests Passing
