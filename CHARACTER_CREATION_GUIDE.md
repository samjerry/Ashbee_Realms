# Character Creation Dialogue - Implementation Guide

## Overview
Added a complete character creation dialogue system that allows new players to choose their class before meeting Elder Thorne.

## NPC: Mysterious Guide
- **Role**: Guides new players through class selection
- **Personality**: Mystical and welcoming
- **Location**: Triggered at game start for new players

## Dialogue Flow

### 1. Initial Class Selection
Player is greeted and presented with 5 choices:
1. **Choose Warrior** → Immediate confirmation
2. **Choose Mage** → Immediate confirmation  
3. **Choose Rogue** → Immediate confirmation
4. **Choose Ranger** → Immediate confirmation
5. **Tell me more** → Detailed class information

### 2. Detailed Class Information (Optional)
If player asks for more info, they receive:
- **Warrior**: High HP/Defense, Berserker Rage ability
- **Mage**: High Magic, Meteor Strike ability
- **Rogue**: High Agility/Crit, Shadow Strike ability
- **Ranger**: Balanced, Beast Bond ability

Then returns to class selection choices.

### 3. Class Confirmation
Once a class is chosen, the player receives:

#### Warrior
- Iron Sword
- Leather Armor
- 50 Gold
- 3 Health Potions

#### Mage
- Wooden Staff
- Cloth Robes
- 50 Gold
- 3 Health Potions
- 3 Mana Potions

#### Rogue
- Iron Dagger
- Light Leather Armor
- 50 Gold
- 3 Health Potions
- 2 Smoke Bombs

#### Ranger
- Hunting Bow
- Ranger's Leather Armor
- 50 Gold
- 3 Health Potions
- Wolf Pup Companion

### 4. Redirection to Elder Thorne
After class selection, all players are directed to meet Elder Thorne in the village to begin their adventure.

## Additional Feature: Class Change
A secondary conversation (`confirm_class`) allows players to reset and choose a new class:
- Requires a `respec_token` (special item)
- Resets player to class selection
- Prevents accidental class changes

## Integration Points

### Backend Implementation Needed:
```javascript
// When dialogue choice has "set_class" property:
player.class = choice.set_class;

// Apply starting rewards:
player.inventory.addItem(reward.starting_weapon);
player.inventory.addItem(reward.starting_armor);
player.gold += reward.gold;

// Apply unlocks:
if (choice.unlocks) {
  choice.unlocks.forEach(unlock => {
    if (unlock.startsWith('class_')) {
      player.class = unlock.split('_')[1];
    }
    if (unlock === 'meet_elder_thorne') {
      player.questlog.addQuest('talk_to_elder_thorne');
    }
    if (unlock === 'companion_wolf') {
      player.companion = 'wolf_pup';
    }
  });
}
```

### Trigger Conditions:
- **New Player**: `trigger: "new_player"` - Show on first game launch
- **Class Change**: `trigger: "class_change_request"` - Show when using respec token

## User Experience Flow

1. **New player connects** → Mysterious Guide appears
2. **Player reads class descriptions** → Can ask for details
3. **Player selects class** → Receives starting gear
4. **Player is directed to village** → Meets Elder Thorne
5. **Elder Thorne provides first quest** → Adventure begins!

## Testing Verification

✅ Dialogue file loads successfully  
✅ 4 NPCs available (including Mysterious Guide)  
✅ Character creation has 5 initial choices  
✅ All 4 classes have confirmation nodes  
✅ Detailed information node included  
✅ Class respec dialogue included

## Notes for Implementation

1. **First-Time Player Detection**: Check if player has a class assigned
   - No class → Show character_creation dialogue
   - Has class → Skip to Elder Thorne

2. **Starting Items**: Ensure item IDs match `items.json` and `gear.json`
   - iron_sword, wooden_staff, iron_dagger, hunting_bow
   - leather_armor, cloth_robes, light_leather_armor, ranger_leather_armor

3. **Companion System**: Wolf pup for Rangers needs companion system implementation

4. **Quest Progression**: After class selection, automatically start "talk_to_elder_thorne" quest

5. **Twitch Integration**: Consider announcing new player class selection in chat:
   ```
   "Welcome @PlayerName! They've chosen the path of the [Class]!"
   ```

## Future Enhancements

- **Preview Stats**: Show starting stats before confirming class
- **Class Quiz**: Optional personality-based class recommendation
- **Visual Representation**: Add class-specific imagery/icons
- **Voice Acting**: Record mystical voice lines for Mysterious Guide
- **Skip Option**: For experienced players creating alt characters
