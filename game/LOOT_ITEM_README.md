# 🛒 Loot & Item System

## Overview

The Loot & Item System provides comprehensive item management, including consumable usage, vendor trading, and item comparison tools. Players can use potions/food, buy/sell items from merchants, and compare gear to make informed decisions.

## Core Components

### 1. Consumable Manager
Handles usage of potions, food, scrolls, and other consumable items.

### 2. Shop Manager
Manages merchant NPCs, their inventories, and buy/sell transactions.

### 3. Item Comparator
Compares equipment items to help players identify upgrades.

### 4. Loot Generator (Enhanced)
Generates loot drops from monsters with rarity-based equipment rolls.

---

## Consumable System

### Consumable Types

**Health Potions**
- Instant HP restoration
- Common → Legendary rarities
- 30-second cooldown
- Example: Health Potion (150 HP, 75 gold)

**Buff Potions**
- Temporary stat increases
- Duration: 5-30 minutes
- Examples: Strength Elixir (+25% damage, 10 min)

**Food**
- Immediate heal + buffs
- Longer duration, lower immediate impact
- Examples: Roasted Boar (+30 HP, +10% defense, 15 min)

**Scrolls**
- One-time spell casts
- Teleportation, summons, damage
- Examples: Scroll of Teleportation (town_square)

**Utility Potions**
- Special effects
- Invisibility, fortune, luck
- Examples: Potion of Invisibility (60 sec)

**Survival Items**
- Death prevention
- Revive effects
- Examples: Phoenix Down (auto-revive, 50% HP)

### Usage Mechanics

**Cooldowns**
- Each consumable type has independent cooldown
- Prevents spam and maintains balance
- Tracked per character in `consumableCooldowns`

**Consumption**
- Items removed from inventory on use
- Quantity decreases by 1
- Auto-removed when quantity reaches 0

**Effects**
- Immediate effects (HP/mana restore)
- Status effects (buffs, applied to character)
- Utility effects (teleport, invisibility)

### API - Consumable Usage

#### POST `/api/consumable/use`
Use a consumable item.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "itemId": "health_potion",
  "context": {}
}
```

**Response (Success):**
```json
{
  "success": true,
  "effect": "Restore 150 HP instantly",
  "message": "Restored 145 HP!",
  "healAmount": 145,
  "statusEffect": null
}
```

**Response (Buff Potion):**
```json
{
  "success": true,
  "effect": "Increase damage by 25% for 10 minutes",
  "message": "Elixir of Strength activated!",
  "statusEffect": {
    "id": "strength",
    "name": "Elixir of Strength",
    "duration": 600,
    "type": "buff",
    "effect": "Increase damage by 25% for 10 minutes"
  }
}
```

**Response (Cooldown):**
```json
{
  "success": false,
  "message": "Health Potion is on cooldown (25s remaining)"
}
```

### Usage Examples

**Using Health Potion in Combat**
```javascript
// Player takes damage in combat
character.hp = 25; // Low HP

// Use health potion
const consumableMgr = new ConsumableManager();
const result = consumableMgr.useConsumable(character, 'health_potion');

if (result.success) {
  console.log(`Healed ${result.healAmount} HP!`);
  // character.hp is now higher
}
```

**Using Buff Potion Before Boss**
```javascript
// Prepare for boss fight
const result = consumableMgr.useConsumable(character, 'strength_elixir');

if (result.success && result.statusEffect) {
  // Apply status effect to character
  character.statusEffects = character.statusEffects || [];
  character.statusEffects.push(result.statusEffect);
  
  console.log('Strength increased for 10 minutes!');
}
```

**Checking Cooldowns**
```javascript
const onCooldown = consumableMgr.isOnCooldown(character, 'health_potion');
if (onCooldown) {
  const remaining = consumableMgr.getCooldownRemaining(character, 'health_potion');
  console.log(`Wait ${Math.ceil(remaining)} seconds`);
}
```

---

## Shop System

### Merchant Types

**General Merchants** (Garen the Wanderer)
- Theme: General supplies and survival gear
- Items: Basic consumables, food, tools, maps, torches, rope
- Spawn: Common areas (woods, wetlands, reaches)
- Best for: Starting players, restocking basics

**Potion Masters** (Elara the Alchemist)
- Theme: Alchemy and consumables
- Items: Health/mana potions, elixirs, buffs, rare alchemical items
- Spawn: Dangerous areas (swamps, ruins)
- Best for: Combat preparation, healing supplies

**Weapon Dealers** (Thorgrim Ironhand)
- Theme: Weapons only (swords, axes, bows, staves)
- Items: Common to legendary weapons, no armor
- Spawn: Combat-heavy areas (tunnels, ruins, peaks)
- Best for: Upgrading damage output

**Armor Merchants** (Seraphina Steelweave)
- Theme: Armor and defense (armor, helmets, shields, robes)
- Items: Defensive equipment for all classes
- Spawn: Safe areas and ruins
- Best for: Survivability upgrades

**Jewelers** (Mira Gemheart)
- Theme: Accessories and jewelry (rings, amulets, belts)
- Items: Stat-boosting accessories, magical trinkets
- Spawn: Towns and peaceful areas
- Best for: Min-maxing stats with accessories

**Food Vendors** (Brock the Baker)
- Theme: Food and provisions
- Items: Bread, cheese, meat, travel rations, drinks
- Spawn: Towns and common areas
- Best for: Cheap healing, long journeys

**Scroll Merchants** (Archmage Aldric)
- Theme: Magical scrolls and tomes
- Items: Spell scrolls, magical books, one-use magic
- Spawn: Libraries, ruins, towns
- Best for: Emergency magic, rare spells

**Curiosity Collectors** (Jasper Oddsworth)
- Theme: Random oddities and strange items
- Items: Keys, music boxes, cursed items, weird trinkets
- Spawn: Strange locations (wetlands, swamps, woods)
- Best for: Unique items, collection, mysteries

**Mysterious Traders** (The Hooded Figure)
- Theme: Rare, illegal, and exotic items
- Items: Phoenix downs, dragon blood, soul gems, forbidden items
- Spawn: Dangerous/dark areas (5% chance only)
- Best for: Extremely rare items, high-end consumables

**Enchanters** (Zephyr the Enchanter)
- Theme: Magical enhancements and enchantments
- Items: Enchantment scrolls, weapon oils, soul stones, runes
- Spawn: Magical areas (libraries, ruins, towns)
- Best for: Gear upgrades, min-maxing stats

**Herbalists** (Sage Willow)
- Theme: Natural herbs and remedies
- Items: Healing herbs, rare mushrooms, vitality flowers, nature items
- Spawn: Natural areas (woods, wetlands, reaches)
- Best for: Natural alternatives, crafting materials

**Pet Dealers** (Kael the Beastmaster)
- Theme: Companions and beast supplies
- Items: Pet eggs, mount tokens, beast whistles, companion gear
- Spawn: Wilderness areas (6% chance - rare)
- Best for: Pet collectors, companion builds

**Rune Carvers** (Durnok Runeforge)
- Theme: Ancient runes and dwarven magic
- Items: Strength/protection runes, elder rune sets, dwarven artifacts
- Spawn: Underground/ancient locations
- Best for: Alternative gear enhancement, rune builds

**Tavern Keepers** (Barnaby Brewfoot)
- Theme: Drinks, food, and social buffs
- Items: Ale, wine, tavern meals, hero's brew, dragon's blood wine
- Spawn: Towns and safe areas (13% chance - common)
- Best for: Social buffs, cheap sustenance, roleplaying

**Trap Specialists** (Sly Quickfingers)
- Theme: Rogue tools and stealth gear
- Items: Lockpicks, poison, smoke bombs, shadow cloaks, thieves' tools
- Spawn: Dangerous underground areas
- Best for: Rogues, stealth builds, dungeon delvers

**Priests** (Father Lumis)
- Theme: Holy items and divine magic
- Items: Holy water, blessing scrolls, resurrection scrolls, divine items
- Spawn: Holy areas (towns, libraries, peaceful zones)
- Best for: Clerics, paladins, undead hunting

**Total: 16 Unique Merchant Types**

### Merchant Inventory

**Always Available**
- Fixed stock items
- Replenish automatically
- Consistent prices
- Example: 10x Potions at 10 gold each

**Random Pool**
- Rolled on merchant encounter
- Based on spawn chance (10-60%)
- Limited stock (usually 1-3)
- Higher rarity items
- Example: 30% chance for Phoenix Down

### Buy/Sell Mechanics

**Buying**
- Check gold availability
- Check stock availability
- Deduct gold, add item to inventory
- Items stack automatically

**Selling**
- Sell price = 40% of buy price
- Any item can be sold
- Gold added immediately
- Item removed from inventory

**Price Calculation**
```javascript
// Base price from item data
const basePrice = item.price || estimatedValue;

// Selling gives 40% back
const sellPrice = Math.floor(basePrice * 0.4);
```

### API - Shop Endpoints

#### GET `/api/shop/merchants`
Get all available merchants.

**Response:**
```json
{
  "success": true,
  "merchants": [
    {
      "id": "wandering_merchant",
      "name": "Garen the Wanderer",
      "description": "A cheerful trader with a cart full of oddities",
      "merchant_type": "general",
      "spawn_locations": ["whispering_woods", "highland_reaches"]
    }
  ]
}
```

#### GET `/api/shop/merchants/:location`
Get merchants in a specific location.

**Example:** `GET /api/shop/merchants/whispering_woods`

**Response:**
```json
{
  "success": true,
  "location": "whispering_woods",
  "merchants": [
    {
      "id": "wandering_merchant",
      "name": "Garen the Wanderer",
      "description": "A cheerful trader...",
      "merchant_type": "general",
      "greeting": "Ah, a customer! Come, come!"
    }
  ]
}
```

#### GET `/api/shop/:merchantId`
Get merchant's current inventory.

**Example:** `GET /api/shop/wandering_merchant`

**Response:**
```json
{
  "success": true,
  "merchant": {
    "id": "wandering_merchant",
    "name": "Garen the Wanderer",
    "description": "A cheerful trader...",
    "merchant_type": "general"
  },
  "greeting": "Ah, a customer! Come, come!",
  "inventory": {
    "always": [
      {
        "id": "potion",
        "name": "Potion",
        "price": 10,
        "stock": 10,
        "rarity": "common",
        "type": "health",
        "description": "Restore 30 HP"
      }
    ],
    "random": [
      {
        "id": "health_potion",
        "name": "Health Potion",
        "price": 35,
        "stock": 1,
        "rarity": "uncommon",
        "type": "health",
        "description": "Restore 150 HP"
      }
    ]
  }
}
```

#### POST `/api/shop/buy`
Buy item from merchant.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "merchantId": "wandering_merchant",
  "itemId": "health_potion",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchased 2x Health Potion for 70 gold",
  "itemData": {
    "id": "health_potion",
    "name": "Health Potion",
    "price": 35,
    "stock": 8,
    "rarity": "uncommon"
  },
  "totalCost": 70,
  "remainingGold": 130
}
```

#### POST `/api/shop/sell`
Sell item to merchant.

**Body:**
```json
{
  "player": "username",
  "channel": "channelname",
  "merchantId": "wandering_merchant",
  "itemId": "rusty_sword",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sold 1x Rusty Sword for 4 gold",
  "itemData": {
    "name": "Rusty Sword",
    "rarity": "common"
  },
  "goldEarned": 4,
  "remainingGold": 204
}
```

---

## Item Comparison System

### Comparison Features

**Equipment Comparison**
- Compare two equipment items
- Shows stat differences
- Recommends better item
- Considers all stats (attack, defense, magic, agility, HP, crit)

**Equipped vs Inventory**
- Compare inventory item with currently equipped
- Identifies upgrades
- Shows improvement percentage

**Best Item Finder**
- Find best item for a slot in inventory
- Ranks by total stats
- Shows alternatives

**Upgrade Suggestions**
- Scan entire inventory
- Find all possible upgrades
- Prioritize by improvement

### API - Item Comparison

#### POST `/api/items/compare`
Compare two items or item with equipped.

**Body (Compare with Equipped):**
```json
{
  "player": "username",
  "channel": "channelname",
  "itemId1": "steel_sword"
}
```

**Response:**
```json
{
  "valid": true,
  "isUpgrade": true,
  "currentlyEquipped": "Rusty Sword",
  "considering": "Steel Sword",
  "differences": {
    "attack": {
      "item1": 5,
      "item2": 15,
      "diff": 10,
      "better": "item2"
    }
  },
  "totalDiff": 10,
  "recommendation": {
    "choice": "item2",
    "reason": "Steel Sword is better overall (1 improved stats)"
  }
}
```

**Body (Direct Comparison):**
```json
{
  "player": "username",
  "channel": "channelname",
  "itemId1": "rusty_sword",
  "itemId2": "steel_sword"
}
```

#### GET `/api/items/upgrades`
Get all upgrade suggestions for character.

**Query:** `?player=username&channel=channelname`

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "slot": "weapon",
      "action": "upgrade",
      "currentItem": "Rusty Sword",
      "newItem": "Steel Sword",
      "improvements": 1,
      "reason": "Steel Sword is better overall (1 improved stats)"
    },
    {
      "slot": "ring_1",
      "action": "equip",
      "item": "Ring of Strength",
      "reason": "Empty slot - equip Ring of Strength for stat gains"
    }
  ],
  "count": 2
}
```

### Usage Examples

**Quick Upgrade Check**
```javascript
// Player loots new weapon
const comparator = new ItemComparator();
const result = comparator.compareWithEquipped(character, 'steel_sword');

if (result.isUpgrade) {
  console.log(`✅ Upgrade: ${result.considering} > ${result.currentlyEquipped}`);
  console.log(`   ${result.recommendation.reason}`);
} else {
  console.log('❌ Not an upgrade, keep current weapon');
}
```

**Full Inventory Scan**
```javascript
const comparator = new ItemComparator();
const suggestions = comparator.getUpgradeSuggestions(character);

if (suggestions.length > 0) {
  console.log(`Found ${suggestions.length} upgrades:`);
  suggestions.forEach(s => {
    console.log(`- ${s.slot}: ${s.reason}`);
  });
}
```

**Manual Item Comparison**
```javascript
const item1 = comparator.getItemData('rusty_sword');
const item2 = comparator.getItemData('steel_sword');

const result = comparator.compareEquipment(item1, item2);

console.log(`Comparing: ${result.item1.name} vs ${result.item2.name}`);
Object.entries(result.differences).forEach(([stat, data]) => {
  console.log(`${stat}: ${data.item1} → ${data.item2} (${data.diff > 0 ? '+' : ''}${data.diff})`);
});
console.log(`Recommendation: ${result.recommendation.reason}`);
```

---

## Twitch Bot Integration

### Shop Commands

```javascript
// !shop - Show nearby merchants
if (command === '!shop') {
  const response = await fetch(`/api/shop/merchants/${character.location}`);
  const data = await response.json();
  
  if (data.merchants.length === 0) {
    client.say(channel, `@${username} No merchants in ${character.location}`);
  } else {
    client.say(channel, 
      `🏪 @${username} Merchants: ${data.merchants.map(m => m.name).join(', ')}`
    );
  }
}

// !shop <merchant_id> - View merchant inventory
if (args[0]) {
  const merchantId = args[0];
  const response = await fetch(`/api/shop/${merchantId}`);
  const data = await response.json();
  
  if (data.success) {
    client.say(channel, `${data.greeting}`);
    const items = data.inventory.always.slice(0, 3);
    items.forEach(item => {
      client.say(channel, `  ${item.name} - ${item.price}g (${item.stock} in stock)`);
    });
  }
}

// !buy <merchant_id> <item_id> [quantity]
if (command === '!buy') {
  const [merchantId, itemId, qty = 1] = args;
  
  const response = await fetch('/api/shop/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, merchantId, itemId, quantity: parseInt(qty) })
  });
  
  const data = await response.json();
  
  if (data.success) {
    client.say(channel, `✅ @${username} ${data.message} (${data.remainingGold}g left)`);
  } else {
    client.say(channel, `❌ @${username} ${data.message}`);
  }
}

// !sell <merchant_id> <item_id> [quantity]
if (command === '!sell') {
  const [merchantId, itemId, qty = 1] = args;
  
  const response = await fetch('/api/shop/sell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, merchantId, itemId, quantity: parseInt(qty) })
  });
  
  const data = await response.json();
  
  if (data.success) {
    client.say(channel, `💰 @${username} ${data.message} (${data.remainingGold}g total)`);
  } else {
    client.say(channel, `❌ @${username} ${data.message}`);
  }
}
```

### Consumable Commands

```javascript
// !use <item_id> - Use consumable
if (command === '!use') {
  const itemId = args[0];
  
  const response = await fetch('/api/consumable/use', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, itemId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    client.say(channel, `✨ @${username} ${data.message}`);
    
    if (data.statusEffect) {
      client.say(channel, `  Buff active: ${data.statusEffect.effect}`);
    }
  } else {
    client.say(channel, `❌ @${username} ${data.message}`);
  }
}

// !potion - Quick use health potion
if (command === '!potion' || command === '!hp') {
  const response = await fetch('/api/consumable/use', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, itemId: 'health_potion' })
  });
  
  const data = await response.json();
  
  if (data.success) {
    client.say(channel, `💚 @${username} +${data.healAmount} HP!`);
  } else {
    client.say(channel, `❌ @${username} ${data.message}`);
  }
}
```

### Comparison Commands

```javascript
// !compare <item_id> - Compare with equipped
if (command === '!compare') {
  const itemId = args[0];
  
  const response = await fetch('/api/items/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: username, channel, itemId1: itemId })
  });
  
  const data = await response.json();
  
  if (data.valid && data.isUpgrade) {
    client.say(channel, `⬆️ @${username} ${data.recommendation.reason}`);
  } else if (data.valid) {
    client.say(channel, `➡️ @${username} Current item is better or equal`);
  }
}

// !upgrades - Show all available upgrades
if (command === '!upgrades') {
  const response = await fetch(`/api/items/upgrades?player=${username}&channel=${channel}`);
  const data = await response.json();
  
  if (data.suggestions.length === 0) {
    client.say(channel, `@${username} No upgrades available in inventory`);
  } else {
    client.say(channel, `📊 @${username} Found ${data.count} upgrade(s):`);
    data.suggestions.slice(0, 3).forEach(s => {
      client.say(channel, `  ${s.slot}: ${s.action} ${s.newItem || s.item}`);
    });
  }
}
```

---

## Database Schema

### Character Columns Updated

```sql
-- Added to player_progress table
consumable_cooldowns JSONB DEFAULT '{}'
```

Stores consumable cooldown timestamps:
```json
{
  "health_potion": 1234567890123,
  "strength_elixir": 1234567950000
}
```

---

## Performance Considerations

- **Consumable data cached in memory** (no DB queries per use)
- **Merchant inventory rolled once** per encounter (not per view)
- **Item comparison done client-side** (no DB queries)
- **Loot generation optimized** with rarity filters
- **Scales to 1000+ items** easily

---

## Best Practices

### For Players

1. **Stock up before dangerous areas** - Potions save lives
2. **Compare before equipping** - Use `/api/items/compare`
3. **Sell unwanted gear** - 40% value back
4. **Check merchant inventories** - Random pool has rare items
5. **Use buffs strategically** - 10+ minute durations for bosses

### For Developers

1. **Validate item existence** before operations
2. **Check cooldowns** before allowing consumable use
3. **Update character gold** immediately on transactions
4. **Save character state** after buy/sell/use
5. **Handle edge cases** (empty inventory, no gold, etc.)

---

## Testing

Run comprehensive tests:
```bash
node Testing/test_loot_item_system.js
```

**Test Coverage:**
- ✅ Consumable loading and usage (11 tests)
- ✅ Shop mechanics (buy/sell) (11 tests)
- ✅ Item comparison (8 tests)
- ✅ Merchant systems
- ✅ Cooldown management
- ✅ Inventory updates

**Test Results:** 30/30 passing ✅

---

## Troubleshooting

**Consumable won't use:**
- Check item is in inventory
- Verify cooldown has expired
- Ensure item ID is correct

**Can't buy item:**
- Check gold amount
- Verify merchant has stock
- Ensure merchant sells that item

**Comparison not working:**
- Items must be same slot
- Ensure items are equipment (not consumables)
- Check item IDs are valid

**Sell price too low:**
- Sell price is 40% of buy price
- This is intentional game balance

---

**Status:** ✅ Complete and Tested  
**Version:** 1.0  
**Last Updated:** Phase 2.2 Implementation
