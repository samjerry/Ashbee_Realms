# Ashbee Realms - Development Roadmap

## 🎯 Current State Analysis

### ✅ What's Complete (Core Systems)
- **38 JSON data files** with rich game content
- **400+ gear items** organized by category (weapons, armor, headgear, accessories)
- **5 character classes** with balanced level 1 starting gear
- **126 monsters** across all rarity tiers with abilities and loot tables
- **21 game systems** fully designed (quests, achievements, events, factions, etc.)
- **Database abstraction** (SQLite for dev, PostgreSQL for prod)
- **Twitch OAuth integration** (player login)
- **Basic bot commands** (`!adventure`)
- ✅ **Character System** - Stats, equipment, inventory (12 tests passing)
- ✅ **Combat System** - Turn-based combat, abilities, status effects (21 tests passing)
- ✅ **Progression System** - XP, leveling, death, hardcore mode (13 tests passing)
- ✅ **Exploration System** - Multi-move travel, encounters, biomes (19 tests passing)

### 🔄 What's In Progress (Content Integration)
- **Quest engine** - Quest data not connected yet
- **Loot system** - Monster loot tables exist but not fully integrated
- **Frontend** - Minimal UI, needs gameplay interface
- **Bot commands** - Need expansion beyond `!adventure`

---

## 📋 Development Phases

### **Phase 1: Core Game Loop (Foundation)** ✅ **COMPLETED**
*Priority: CRITICAL | Completed: December 2025*

Build the fundamental game systems that make everything else work.

#### 1.1 Character System Implementation ✅ **COMPLETED**
**Goal:** Make character classes functional with stats and equipment.

**Tasks:**
- [x] ✅ Implement character stat calculations (base stats + level + equipment)
- [x] ✅ Create equipment manager (equip/unequip items, validate slots)
- [x] ✅ Implement inventory system (add/remove items, max capacity)
- [x] ✅ Add stat display API endpoint (`GET /api/player/stats`)
- [x] ✅ Update database schema to store equipped items properly
- [x] ✅ Create character initialization from classes.json

**Files created:**
- ✅ `game/Character.js` - Full Character class with stat calculations
- ✅ `game/EquipmentManager.js` - Complete equipment management (15 slots)
- ✅ `game/InventoryManager.js` - Inventory with stacking and capacity
- ✅ `game/CharacterInitializer.js` - Character creation from classes
- ✅ `game/index.js` - Central export point
- ✅ `server.js` - Added 9 character API endpoints
- ✅ `db.js` - Added character helper functions
- ✅ `data/data_loader.js` - Added general data loading

**Documentation:**
- ✅ `game/README.md` - Main character system documentation

**Testing:**
- ✅ `Testing/test_character_system.js` - Comprehensive test suite (12 tests)
- ✅ All tests passing

**Features Implemented:**
- ✅ Object-oriented Character class
- ✅ Base stats + equipment stats + derived stats
- ✅ 15 equipment slots with validation
- ✅ 30-slot inventory with stacking
- ✅ Level progression with XP tracking
- ✅ HP management (damage/healing)
- ✅ Gold management
- ✅ 5 character classes fully functional
- ✅ Database integration (save/load)
- ✅ 9 RESTful API endpoints
- ✅ Complete stat breakdown system

**See:** `game/README.md` for full documentation

**Testing:**
```javascript
// Should work after completion:
POST /api/player/equip { itemId: "rusty_sword" }
GET /api/player/stats // Returns calculated stats
GET /api/player/inventory // Returns items list
```

---

#### 1.2 Combat System Implementation ✅ **COMPLETED**
**Goal:** Turn-based combat using monster data.

**Tasks:**
- [x] ✅ Design turn-based combat flow (speed-based turn order)
- [x] ✅ Implement damage calculation (attack vs defense, criticals, passives)
- [x] ✅ Create combat state machine (idle, in_combat, victory, defeat)
- [x] ✅ Integrate monster abilities (from monster_abilities.json)
- [x] ✅ Implement status effects during combat (poison, bleeding, buffs)
- [x] ✅ Add combat rewards (XP, gold, loot from monster_loot.json)
- [x] ✅ Create combat API endpoints

**Files created:**
- ✅ `game/Combat.js` - Complete turn-based combat engine
- ✅ `game/StatusEffectManager.js` - Buff/debuff/DOT system
- ✅ `game/LootGenerator.js` - Loot generation with rarity-based drops
- ✅ `Testing/test_combat_system.js` - Comprehensive combat tests

**Files modified:**
- ✅ `server.js` - Added 5 combat API endpoints
- ✅ `game/index.js` - Exported combat classes

**Combat Features Implemented:**
- ✅ Speed-based turn order (agility determines who goes first)
- ✅ Damage calculation with defense reduction
- ✅ Critical hits (10% player, 5% monster)
- ✅ Damage variance (90-110%)
- ✅ Monster AI with ability selection
- ✅ Status effects (buffs, debuffs, damage over time)
- ✅ Loot generation with rarity-based equipment drops
- ✅ XP and gold rewards
- ✅ Victory/defeat handling with respawn mechanics
- ✅ Flee mechanic with agility-based success rate
- ✅ Skill and item usage framework
- ✅ Combat log for turn-by-turn playback
- ✅ Ability cooldown management

**API Endpoints:**
```javascript
POST /api/combat/start { monsterId: "goblin_scout" }
GET /api/combat/state // Current combat status
POST /api/combat/attack // Basic attack
POST /api/combat/skill { skillId: "power_strike" }
POST /api/combat/item { itemId: "health_potion" }
POST /api/combat/flee // Attempt to escape
```

**Testing:**
```bash
node Testing/test_combat_system.js
# 12 tests covering all combat features
```

---

#### 1.3 Progression System Implementation ✅ **COMPLETED**
**Goal:** XP, leveling, stat increases.

**Tasks:**
- [x] ✅ Implement XP gain and level-up calculations
- [x] ✅ Add stat increases per level (from classes.json stat_bonuses)
- [x] ✅ Create level-up rewards (skill points, new abilities)
- [x] ✅ Implement skill cooldowns
- [x] ✅ Add character death and respawn mechanics
- [x] ✅ Create progression API endpoints

**Files created:**
- ✅ `game/ProgressionManager.js` - XP, leveling, stat increases, death handling
- ✅ `game/SkillManager.js` - Skill cooldown management
- ✅ `Testing/test_progression_system.js` - 13 comprehensive tests

**Files modified:**
- ✅ `game/Character.js` - Added skill management and progression methods
- ✅ `game/index.js` - Exported ProgressionManager and SkillManager
- ✅ `server.js` - Added 7 progression API endpoints
- ✅ `db.js` - Added permanent_stats table and helper functions

**Features Implemented:**
- ✅ XP calculation: BASE_XP * (level ^ 1.5) scaling
- ✅ Level up handling with automatic stat increases
- ✅ **All base stats +1 per level** (strength, defense, magic, agility)
- ✅ **Class-specific bonuses** on top of base increases
- ✅ HP scaling: Base 10 HP/level + class bonus HP/level
- ✅ Skill point rewards (1 per level)
- ✅ Full heal on level up
- ✅ Skill cooldown system with global cooldown
- ✅ Death mechanics: Normal (lose 10% gold, 25% XP) vs Hardcore (character deletion)
- ✅ **Hardcore mode**: Character deletion with permanent progression retention
- ✅ Respawn system: 50% HP in Town Square
- ✅ **Permanent progression system**: Account-wide passives that survive death
- ✅ Passive unlock requirements (level, kills, crits, gold, deaths)
- ✅ Passive bonus calculation (damage, XP, gold, crit, defense multipliers)
- ✅ 7 progression API endpoints

**API Endpoints:**
```javascript
GET /api/progression/xp-info // XP and level information
POST /api/progression/add-xp // Add XP (triggers level ups)
POST /api/progression/death // Handle character death
POST /api/progression/respawn // Respawn after death
GET /api/progression/passives // Get available passives
POST /api/progression/unlock-passive // Unlock permanent passive
GET /api/progression/skills // Get skills and cooldowns
```

**Stat Increases Per Level:**
- **Base (All Classes)**: +1 Strength, +1 Defense, +1 Magic, +1 Agility, +10 HP
- **Warrior**: +1.8 Str, +1.2 Def, +0.3 Agi, +10 HP (total: +2 Str, +2 Def, +1 Mag, +1 Agi, +20 HP)
- **Mage**: +2.2 Mag, +0.4 Def, +0.5 Agi, +6 HP (total: +1 Str, +1 Def, +3 Mag, +1 Agi, +16 HP)
- **Rogue**: +1.5 Agi, +0.8 Str, +0.4 Def, +7 HP
- **Cleric**: +1.5 Mag, +1.0 Def, +0.6 Agi, +8 HP
- **Ranger**: +1.2 Agi, +1.0 Str, +0.5 Def, +8 HP

**Hardcore Mode:**
- Character deletion on death
- Permanent stats preserved:
  - Unlocked passives
  - Total kills/deaths/gold/XP
  - Highest level reached
  - Critical hit count
- New characters inherit passive bonuses

**Testing:**
```bash
node Testing/test_progression_system.js
# 13 tests covering all progression features
```

---

#### 1.4 Location & Exploration System ✅ **COMPLETED**
**Goal:** Players can move between biomes and encounter events with strategic, time-consuming travel.

**Tasks:**
- [x] ✅ Implement biome system (load from biomes.json - 13 biomes)
- [x] ✅ Create travel mechanics (multi-move travel system, 3-8+ moves based on distance)
- [x] ✅ Add random encounter system (60% combat, 25% event, 15% special)
- [x] ✅ Implement biome-specific events (from events.json)
- [x] ✅ Add location-based monster spawning (biome danger level filtering)
- [x] ✅ Create exploration API endpoints (6 endpoints)
- [x] ✅ Implement environmental effects (movement penalties, ambush chance)
- [x] ✅ Add sub-location exploration system

**Files created:**
- ✅ `game/ExplorationManager.js` - Complete exploration and travel system (446 lines)
- ✅ `game/EXPLORATION_README.md` - Comprehensive documentation with examples
- ✅ `Testing/test_exploration_system.js` - 19 comprehensive tests

**Files modified:**
- ✅ `game/Character.js` - Added travelState property for journey tracking
- ✅ `game/index.js` - Exported ExplorationManager
- ✅ `server.js` - Added 6 exploration API endpoints
- ✅ `db.js` - Added travel_state JSONB column to player_progress table

**Features Implemented:**
- ✅ **Multi-move travel system**: 3-8+ moves required between biomes (NOT instant)
- ✅ **Distance calculation**: Based on danger level difference + movement penalties
- ✅ **Travel time**: 10 minutes per move (simulated in-game time)
- ✅ **Random encounters**: 20-30% chance per move based on danger level
- ✅ **Encounter types**: Combat (60%), Events (25%), Special (15%)
- ✅ **Environmental effects**: Movement penalties, ambush chance, visibility, disease risk
- ✅ **Biome danger levels**: 1-5 with recommended level ranges
- ✅ **Sub-location exploration**: Discover areas within biomes
- ✅ **Monster filtering**: Biome-appropriate enemies based on level range
- ✅ **Travel state persistence**: Journey progress saved in database
- ✅ **Travel cancellation**: Can interrupt journey (lose progress)
- ✅ **Arrival detection**: Automatic destination arrival after final move

**API Endpoints:**
```javascript
GET /api/exploration/biomes // List all biomes with suitability info
GET /api/exploration/current // Current location + travel status
GET /api/exploration/travel-info // Calculate travel requirements
POST /api/exploration/travel/start // Begin journey
POST /api/exploration/travel/advance // Progress one move (check encounters)
POST /api/exploration/travel/cancel // Cancel travel (lose progress)
POST /api/exploration/explore // Explore current biome sub-locations
```

**Travel Mechanics:**
- **Distance Formula**: Base Moves = 3 + |destination_danger - origin_danger|
- **Movement Penalties**: Environmental effects slow travel (0-50%)
- **Encounter Chance**: 20% base + 2% per danger level per move
- **Strategic Travel**: Players must plan journeys, manage encounters, prepare supplies

**Example Travel:**
- Whispering Woods (danger 1) → Twilight Wetlands (danger 2): **5 moves** (50 min)
- Twilight Wetlands (danger 2) → Volcanic Peaks (danger 5): **7+ moves** (70+ min)

**Testing:**
```bash
node Testing/test_exploration_system.js
# 19/19 tests passing ✅
# Covers: biome loading, travel distance, encounters, exploration, full travel flow
```

**Documentation:**
- See `game/EXPLORATION_README.md` for complete API documentation
- Includes usage examples, strategic considerations, Twitch bot integration

---

### **Phase 2: Content Integration (Make Data Useful)**
*Priority: HIGH | Time: 2-3 weeks*

Connect all the JSON data to working game systems.

#### 2.1 Quest System Implementation ✅ **COMPLETED**
**Goal:** Players can accept, complete, and turn in quests.

**Tasks:**
- [x] ✅ Create quest manager (load from quests.json - 5 main, 6 side, 2 daily quests)
- [x] ✅ Implement quest tracking (objectives, progress with partial completion)
- [x] ✅ Add quest state machine (available, active, ready_to_complete, failed, abandoned)
- [x] ✅ Create quest rewards system (XP, gold, items, reputation, titles, unlocks)
- [x] ✅ Implement quest triggers (talk_to_npc, kill_monster, kill_boss, collect_item, explore_location)
- [x] ✅ Add quest log UI/API (8 comprehensive endpoints)

**Files created:**
- ✅ `game/QuestManager.js` - Complete quest management system (420 lines)
- ✅ `game/QUEST_README.md` - Comprehensive documentation with API guide
- ✅ `Testing/test_quest_system.js` - 26 comprehensive tests

**Files modified:**
- ✅ `game/index.js` - Exported QuestManager
- ✅ `game/Character.js` - Added activeQuests and completedQuests properties
- ✅ `server.js` - Added 8 quest API endpoints
- ✅ `db.js` - Added active_quests and completed_quests JSONB columns

**Features Implemented:**
- ✅ **Quest Loading**: All 13 quests loaded from quests.json
- ✅ **Quest Types**: Main story (5), Side quests (6), Daily quests (2)
- ✅ **State Machine**: available → active → ready_to_complete → completed (with failed/abandoned)
- ✅ **Objective Types**: 5 types (talk_to_npc, kill_monster, kill_boss, collect_item, explore_location)
- ✅ **Progress Tracking**: Partial completion (2/3 kills = 22% progress)
- ✅ **Prerequisites**: Quest chaining with level requirements
- ✅ **Rewards System**: XP, gold, items, reputation, titles, quest unlocks
- ✅ **Event Triggering**: Automatic updates from game actions
- ✅ **Quest Chains**: Prerequisites and unlock relationships

**API Endpoints:**
```javascript
GET /api/quests/available // Quests player can accept (filtered by level/prereqs)
POST /api/quests/accept // Accept quest and start tracking
GET /api/quests/active // Player's active quests with progress
POST /api/quests/complete // Complete quest, receive rewards
POST /api/quests/abandon // Abandon quest (lose progress)
GET /api/quests/progress/:questId // Detailed progress for specific quest
GET /api/quests/chain/:questId // Quest chain info (prereqs/unlocks)
GET /api/quests/story // Main story quests in order
```

**Quest Progression Examples:**
- **The Awakening** (Level 1): Talk to Elder Thorne, kill 3 Forest Wolves
- **The Wolf's Den** (Level 3): Requires Awakening, kill Alpha Wolf boss
- **The Goblin Menace** (Level 5): Requires Wolf's Den, kill 10 Goblin Scouts

**Testing:**
```bash
node Testing/test_quest_system.js
# 26/26 tests passing ✅
# Covers: quest loading, availability, acceptance, progress, completion, chains, events
```

**Documentation:**
- See `game/QUEST_README.md` for complete API documentation
- Includes Twitch bot integration examples and quest design patterns

---

#### 2.2 Loot & Item System ✅ **COMPLETED**
**Goal:** Monsters drop items, players can use/sell them.

**Tasks:**
- [x] ✅ Implement loot generation (from monster_loot.json - already complete from Phase 1.2)
- [x] ✅ Create item pickup and auto-loot (automatic from combat rewards)
- [x] ✅ Add consumable item usage (potions, food, scrolls with cooldowns)
- [x] ✅ Implement vendor/shop system (NPCs sell items, buy/sell mechanics)
- [x] ✅ Add item rarity drops (common → mythic - already in LootGenerator)
- [x] ✅ Create item comparison (better/worse than equipped, upgrade suggestions)

**Files created:**
- ✅ `game/ConsumableManager.js` - Complete consumable usage system (470+ lines)
- ✅ `game/ShopManager.js` - Full vendor/shop system (400+ lines)
- ✅ `game/ItemComparator.js` - Item comparison utilities (390+ lines)
- ✅ `game/LOOT_ITEM_README.md` - Comprehensive documentation
- ✅ `Testing/test_loot_item_system.js` - 30 comprehensive tests

**Files modified:**
- ✅ `game/index.js` - Exported ConsumableManager, ShopManager, ItemComparator
- ✅ `game/Character.js` - Added consumableCooldowns property
- ✅ `server.js` - Added 8 shop/consumable/comparison API endpoints
- ✅ `db.js` - Added consumable_cooldowns JSONB column
- ✅ `data/npcs.json` - Enhanced merchant inventory themes

**Features Implemented:**
- ✅ **Consumable Usage**: 6 types (health, mana, buff, food, utility, survival)
- ✅ **Cooldown System**: Per-item cooldowns (30-3600 seconds)
- ✅ **Effect Application**: Immediate healing, buffs, status effects
- ✅ **16 Themed Merchants**: Each with unique inventory pools
  1. General Supplies (survival gear, tools, basics)
  2. Alchemy/Potions (consumables specialist)
  3. Weapons Only (swords, axes, bows, staves)
  4. Armor/Defense (armor, shields, helmets)
  5. Jewelry/Accessories (rings, amulets, belts)
  6. Food/Provisions (cheap healing, rations)
  7. Scrolls/Magic (spell scrolls, tomes)
  8. Oddities/Curiosities (random strange items)
  9. Rare/Illegal (exotic high-end items, 5% spawn)
  10. Enchantments (gear upgrades, soul stones)
  11. Herbs/Nature (natural remedies, rare plants)
  12. Pets/Beasts (companions, mounts, eggs)
  13. Runes/Dwarven (ancient runes, dwarven magic)
  14. Tavern/Drinks (social buffs, cheap food)
  15. Rogue Tools (lockpicks, poisons, stealth)
  16. Holy/Divine (clerical items, resurrection)
- ✅ **Inventory Management**: Always available + random pool items
- ✅ **Buy/Sell Mechanics**: Gold transactions, stock management
- ✅ **Item Comparison**: Equipment comparison, upgrade detection
- ✅ **Upgrade Suggestions**: Scan inventory for better items
- ✅ **Price Calculation**: Rarity-based pricing, 40% sell-back rate

**API Endpoints:**
```javascript
POST /api/consumable/use      // Use potion, food, scroll
GET /api/shop/merchants        // List all merchants
GET /api/shop/merchants/:location // Merchants in location
GET /api/shop/:merchantId      // View merchant inventory
POST /api/shop/buy            // Buy item from merchant
POST /api/shop/sell           // Sell item to merchant
POST /api/items/compare       // Compare items
GET /api/items/upgrades       // Get upgrade suggestions
```

**Testing:**
```bash
node Testing/test_loot_item_system.js
# 30/30 tests passing ✅
```

**Documentation:**
- See `game/LOOT_ITEM_README.md` for complete API documentation
- Includes Twitch bot integration examples for !shop, !buy, !sell, !use, !compare commands

--- buy/sell mechanics)
- [x] ✅ Add item rarity drops (common → mythic - already in LootGenerator)
- [x] ✅ Create item comparison (better/worse than equipped, upgrade suggestions)

**Files created:**
- ✅ `game/ConsumableManager.js` - Complete consumable usage system (470+ lines)
- ✅ `game/ShopManager.js` - Full vendor/shop system (400+ lines)
- ✅ `game/ItemComparator.js` - Item comparison utilities (390+ lines)
- ✅ `game/LOOT_ITEM_README.md` - Comprehensive documentation
- ✅ `Testing/test_loot_item_system.js` - 30 comprehensive tests

**Files modified:**
- ✅ `game/index.js` - Exported ConsumableManager, ShopManager, ItemComparator
- ✅ `game/Character.js` - Added consumableCooldowns property
- ✅ `server.js` - Added 8 shop/consumable/comparison API endpoints
- ✅ `db.js` - Added consumable_cooldowns JSONB column

**Features Implemented:**
- ✅ **Consumable Usage**: Health/mana potions, buff elixirs, food, scrolls, utility items
- ✅ **Consumable Types**: 6 types (health, mana, buff, food, utility, survival)
- ✅ **Cooldown System**: Per-item cooldowns (30-3600 seconds)
- ✅ **Effect Application**: Immediate healing, buffs, status effects
- ✅ **Merchant System**: 4+ merchant types (general, potion, weapon, armor)
- ✅ **Inventory Management**: Always available + random pool items
- ✅ **Buy/Sell Mechanics**: Gold transactions, stock management
- ✅ **Item Comparison**: Equipment comparison, upgrade detection
- ✅ **Upgrade Suggestions**: Scan inventory for better items
- ✅ **Price Calculation**: Rarity-based pricing, 40% sell-back rate

**API Endpoints:**
```javascript
// Consumables
POST /api/consumable/use // Use potion, food, scroll, etc.

// Shop System
GET /api/shop/merchants // List all merchants
GET /api/shop/merchants/:location // Merchants in location
GET /api/shop/:merchantId // View merchant inventory
POST /api/shop/buy // Buy item from merchant
POST /api/shop/sell // Sell item to merchant

// Item Comparison
POST /api/items/compare // Compare two items or with equipped
GET /api/items/upgrades // Get upgrade suggestions
```

**Consumable System:**
- **Health Potions**: Lesser (50 HP), Normal (150 HP), Greater (350 HP)
- **Buff Potions**: Strength (+25% damage), Iron Skin (+30% defense), Swiftness (+50% speed)
- **Food**: Roasted Boar, Honey Bread (heal + buffs)
- **Utility**: Invisibility, Teleportation, Fortune (drop rate boost)
- **Survival**: Phoenix Down (auto-revive), Elixir of Immortality

**Merchant Types:**
- **Wandering Merchant**: General goods, spawns in 3+ locations
- **Potion Master**: Alchemical items, best potion prices
- **Weapon Dealer**: High-damage weapons, rare equipment
- **Armor Merchant**: Defensive gear, shields

**Item Comparison Features:**
- Direct equipment comparison (attack, defense, magic, agility, HP, crit)
- Compare inventory item with currently equipped
- Find best item for slot in inventory
- Full upgrade scan across all slots
- Recommendation engine (which item is better)

**Testing:**
```bash
node Testing/test_loot_item_system.js
# 30/30 tests passing ✅
# Covers: consumable usage, shop transactions, item comparison, cooldowns, inventory updates
```

**Documentation:**
- See `game/LOOT_ITEM_README.md` for complete API documentation
- Includes Twitch bot integration examples for !shop, !buy, !sell, !use, !compare commands

---

#### 2.3 NPC & Dialogue System ✅ COMPLETE
**Goal:** Players can interact with NPCs and get quests/lore.

**Status:** ✅ COMPLETE - All 38 tests passing

**Tasks:**
- [x] Load NPCs from npcs.json
- [x] Implement dialogue tree system (from dialogues.json)
- [x] Create NPC interaction triggers
- [x] Add branching dialogue choices
- [x] Implement dialogue rewards and quest unlocks
- [x] Create merchant NPC functionality
- [x] Add API endpoints (8 endpoints)
- [x] Create comprehensive test suite
- [x] Update database schema
- [x] Write documentation

**Files created:**
- `game/NPCManager.js` (345 lines) - NPC management system
- `game/DialogueManager.js` (504 lines) - Dialogue tree system
- `Testing/test_npc_dialogue.js` (471 lines) - 38 comprehensive tests
- `game/NPC_DIALOGUE_README.md` - Complete system documentation

**Files modified:**
- `game/Character.js` - Added dialogueHistory and reputation properties
- `db.js` - Added dialogue_history and reputation JSONB columns
- `game/index.js` - Exported NPCManager and DialogueManager
- `server.js` - Added 8 API endpoints

**Features implemented:**
- 16+ unique merchants with themed inventories
- Quest givers, companions, lore keepers
- Dialogue triggers: first_encounter, new_player, quest completion, level requirements
- Choice requirements: gold, items, tokens
- Choice effects: reputation, gold, XP, class changes, unlocks
- Variable replacement: {player_name}, {player_level}, {player_class}
- Dialogue history tracking with timestamps
- Multi-faction reputation system
- NPC spawn probability system (5-15% spawn rates)
- Location-based NPC spawning

**API Endpoints:**
```
GET  /api/npcs                      # List all NPCs
GET  /api/npcs/location/:location   # NPCs in location
GET  /api/npcs/type/:type           # NPCs by type
GET  /api/npcs/:npcId               # NPC details
POST /api/npcs/:npcId/interact      # Interact with NPC
POST /api/npcs/:npcId/spawn-check   # Check spawn
GET  /api/dialogue/:npcId           # Get conversations
POST /api/dialogue/start            # Start conversation
POST /api/dialogue/choice           # Make choice
```

**Testing:**
```bash
node Testing/test_npc_dialogue.js
# 38/38 tests passing ✅
# Covers: NPC loading, spawning, interaction, dialogue trees, triggers, requirements, 
#         choice effects, rewards, history tracking, integration with other systems
```

**Documentation:**
- See `game/NPC_DIALOGUE_README.md` for complete API documentation
- Includes Twitch bot integration examples for !talk, !dialogue, !choose commands
- Full trigger, requirement, and effect syntax reference
- Database schema documentation
- Integration guides for QuestManager, ShopManager, Character system

---

#### 2.4 Achievement System ✅ COMPLETE
**Goal:** Track player accomplishments and grant rewards.

**Status:** ✅ COMPLETE - All 39 tests passing

**Tasks:**
- [x] Load achievements from achievements.json
- [x] Implement achievement tracking (progress monitoring)
- [x] Add achievement unlock notifications
- [x] Create achievement rewards (titles, items, passives)
- [x] Add achievement API and UI

**Files created:**
- `game/AchievementManager.js` (640 lines) - Complete achievement tracking system
- `Testing/test_achievement_system.js` (471 lines) - 39 comprehensive tests
- `game/ACHIEVEMENT_README.md` - Complete system documentation

**Files modified:**
- `game/Character.js` - Added achievement tracking properties
- `db.js` - Added achievement database schema and helper functions
- `game/index.js` - Exported AchievementManager
- `server.js` - Added 7 achievement API endpoints

**Features implemented:**
- 36 achievements across 8 categories (combat, exploration, quests, collection, wealth, progression, challenge, seasonal)
- Automatic progress tracking for kills, levels, gold, locations, quests
- Event-driven unlock detection (combat_victory, level_up, quest_complete, etc.)
- Rich reward system: XP, gold, items, titles, passive unlocks
- Hidden achievement support
- Achievement points system with rarity tiers (common → legendary)
- Statistics dashboard with completion percentage
- Title system with unlockable display titles
- Unlock notifications with achievement details
- 20+ trackable statistics (kills, boss kills, crits, damage, locations, biomes, gold, quests, items)

**API Endpoints:**
```
GET  /api/achievements                    # Get all achievements with progress
GET  /api/achievements/category/:category # Filter by category
GET  /api/achievements/:achievementId     # Get specific achievement
GET  /api/achievements/stats              # Get statistics summary
POST /api/achievements/check              # Check for unlocks after event
POST /api/achievements/title/set          # Set active display title
GET  /api/achievements/recent             # Get recent unlocks
```

**Testing:**
```bash
node Testing/test_achievement_system.js
# 39/39 tests passing ✅
# Covers: achievement loading, progress calculation, unlocking, rewards,
#         points tracking, statistics, event checking, all criteria types
```

**Documentation:**
- See `game/ACHIEVEMENT_README.md` for complete API documentation
- Includes integration examples for all game systems
- Twitch bot command examples (!achievements, !achievement, !title)
- Full criteria types and reward system documentation

---

### **Phase 3: Advanced Systems (Depth & Retention)**
*Priority: MEDIUM | Time: 3-4 weeks*

Add complexity and long-term progression.

#### 3.1 Dungeon System ✅ COMPLETE
**Goal:** Multi-floor instanced dungeons with bosses.

**Status:** ✅ COMPLETE - All 45 tests passing

**Tasks:**
- [x] Load dungeons from dungeons.json
- [x] Implement floor progression system
- [x] Create dungeon state (current floor, cleared rooms)
- [x] Add dungeon-specific loot tables
- [x] Implement boss encounters with mechanics
- [x] Add dungeon modifiers (ironman, speed run, cursed)
- [x] Create dungeon leaderboards

**Files created:**
- ✅ `game/DungeonManager.js` (820 lines) - Complete dungeon management system
- ✅ `Testing/test_dungeon_system.js` (546 lines) - 45 comprehensive tests
- ✅ `game/DUNGEON_README.md` - Complete system documentation

**Files modified:**
- ✅ `game/Character.js` - Added dungeonState and completedDungeons properties
- ✅ `db.js` - Added dungeon_state and completed_dungeons columns, helper functions
- ✅ `game/index.js` - Exported DungeonManager
- ✅ `server.js` - Added 10 dungeon API endpoints

**Features implemented:**
- ✅ **5 Complete Dungeons**: Goblin Warrens, Crypts, Crystal Depths, Shadow Keep, Trial of Ascension
- ✅ **Room Types**: Combat, treasure, trap, puzzle, event, boss rooms
- ✅ **Boss Mechanics**: Phase-based bosses with special abilities, weighted selection
- ✅ **Modifiers**: hard_mode (2x monsters, +50% stats), ironman (no healing), speed_run, cursed
- ✅ **Floor Progression**: Multi-floor dungeons with HP restoration between floors
- ✅ **Time Limits**: Optional timed dungeons with timeout enforcement
- ✅ **Environmental Effects**: Healing penalties, ambush chance, magic bonuses
- ✅ **Reward System**: XP, gold, loot, first-clear bonuses with modifier multipliers
- ✅ **State Persistence**: Full dungeon state saved to database
- ✅ **Leaderboard System**: Track completion times and rankings
- ✅ **Level Scaling**: Dungeons have required levels and recommended ranges

**API Endpoints:**
```
GET  /api/dungeons                    # Get all available dungeons
GET  /api/dungeons/:dungeonId         # Get dungeon details
POST /api/dungeons/start              # Start dungeon run
POST /api/dungeons/advance            # Advance to next room
POST /api/dungeons/complete-room      # Mark room complete
POST /api/dungeons/complete           # Complete dungeon
POST /api/dungeons/exit               # Exit/abandon dungeon
GET  /api/dungeons/state              # Get current dungeon state
GET  /api/dungeons/leaderboard/:id    # Get dungeon leaderboard
POST /api/dungeons/solve-puzzle       # Solve puzzle room
```

**Testing:**
```bash
node Testing/test_dungeon_system.js
# 45/45 tests passing ✅ (100% success rate)
# Covers: dungeon loading, access control, room progression, boss mechanics,
#         modifiers, completion, failure, time limits, environmental effects
```

**Documentation:**
- See `game/DUNGEON_README.md` for complete API documentation
- Includes Twitch bot integration examples for dungeon commands
- Full dungeon type descriptions and boss mechanics

---

#### 3.2 Faction & Reputation System ✅ **COMPLETE**
**Goal:** Player standing with different factions affects gameplay.

**Status:** ✅ Implemented December 2025
- 6 factions with reputation tiers (Hostile → Exalted)
- Allied/enemy faction propagation (25% gain, 50% loss)
- Action-based reputation system (kill_goblin, complete_quest, etc.)
- Merchant price multipliers (70% to 150% based on standing)
- Faction abilities, mounts, and unique gear unlocks
- 8 API endpoints for faction management
- Database integration with JSONB reputation column
- 100% test coverage (18/18 tests passing)

**Tasks:**
- [x] Load factions from factions.json
- [x] Implement reputation tracking (Hostile → Exalted)
- [x] Add reputation gain/loss from actions
- [x] Create faction-specific rewards and vendors
- [x] Implement faction quests integration
- [x] Add faction abilities/bonuses
- [x] Create API endpoints
- [x] Add database schema support
- [x] Write comprehensive documentation

**Files created:**
- `game/FactionManager.js` - Complete faction management system (514 lines)
- `Testing/test_faction_system.js` - 18 comprehensive tests
- `game/FACTION_README.md` - Full documentation with API guide

---

#### 3.3 Enchanting & Crafting System ✅ **COMPLETED**
**Goal:** Improve gear with enchantments.

**Completion Date:** December 9, 2025  
**Test Coverage:** 18/18 tests created  
**API Endpoints:** 11 endpoints (5 enchanting, 6 crafting)

**Tasks:**
- ✅ Load enchantments from enchantments.json
- ✅ Implement enchanting mechanics (success rates, materials, failure consequences)
- ✅ Add enchantment application to items (enchant, remove, disenchant)
- ✅ Create crafting recipe system from consumables_extended.json + hardcoded equipment
- ✅ Implement crafting with skill progression (XP and levels)
- ✅ Add salvaging system for material recovery
- ✅ Add recipe discovery system
- ✅ Implement crafting API endpoints

**Files Created/Modified:**
- ✅ `game/EnchantingManager.js` - Complete enchanting system (550+ lines)
- ✅ `game/CraftingManager.js` - Complete crafting system (500+ lines)
- ✅ `game/Character.js` - Added craftingXP and knownRecipes properties
- ✅ `game/index.js` - Exported EnchantingManager and CraftingManager
- ✅ `server.js` - Added 11 API endpoints (5 enchanting, 6 crafting)
- ✅ `db.js` - Added crafting_xp and known_recipes columns, updated save/load functions
- ✅ `Testing/test_enchanting_crafting.js` - 18 comprehensive tests
- ✅ `game/ENCHANTING_CRAFTING_README.md` - Full documentation with API guide

**Features Implemented:**
- ✅ 35+ enchantments (weapon, armor, utility)
- ✅ Success rate system: 95% (common) → 30% (legendary)
- ✅ Failure consequences: 60% nothing, 30% lose enchantment, 10% destroy item
- ✅ Max enchantments per item: 1-6 based on rarity
- ✅ Material requirements: enchanting_dust → celestial_fragment
- ✅ Enchantment removal and disenchanting (50% material recovery)
- ✅ Crafting recipes: potions, consumables, equipment, materials
- ✅ Skill progression: 100 XP per level, 10-250 XP per craft
- ✅ Recipe discovery and tracking
- ✅ Salvaging: 25-60% material recovery (higher for enchanted items)
- ✅ Crafting summary endpoint for stats display

**API Endpoints:**
- ✅ GET `/api/enchanting/enchantments` - List enchantments (optional ?slot filter)
- ✅ GET `/api/enchanting/enchantment/:id` - Get enchantment details
- ✅ POST `/api/enchanting/enchant` - Apply enchantment to item
- ✅ POST `/api/enchanting/remove` - Remove enchantment from item
- ✅ POST `/api/enchanting/disenchant` - Disenchant for materials
- ✅ GET `/api/crafting/recipes` - List recipes (optional filters)
- ✅ GET `/api/crafting/recipe/:id` - Get recipe details
- ✅ POST `/api/crafting/craft` - Craft item from recipe
- ✅ POST `/api/crafting/salvage` - Salvage item for materials
- ✅ GET `/api/crafting/summary` - Get crafting statistics
- ✅ POST `/api/crafting/discover` - Discover new recipe

---

#### 3.4 Passive Progression System ✅ **COMPLETED**
**Goal:** Account-wide permanent progression with currency-based incremental upgrades (survives character death).

**Tasks:**
- ✅ Load passives from passive_tree.json (19 passives across 4 categories)
- ✅ Implement passive upgrade system with level-based progression
- ✅ Add passive currency system (Souls earned on death, Legacy Points on milestones)
- ✅ Implement cost scaling formula (base + level/10*2 souls, 1 LP per 5 levels)
- ✅ Add passive effects to character stats (19 different effect types)
- ✅ Create respec system (50% soul refund, full LP refund)
- ✅ Integrate currency earning into ProgressionManager
- ✅ Create 6 API endpoints for passive management

**Files created:**
- ✅ `data/passive_tree.json` - 19 passives with metadata and scaling formulas
- ✅ `game/PassiveManager.js` - Complete passive management system (450+ lines)
- ✅ `Testing/test_passive_system.js` - Comprehensive test suite (87 tests passing)

**Files modified:**
- ✅ `db.js` - Updated schema: passive_levels JSONB, souls INTEGER, legacy_points INTEGER
- ✅ `game/ProgressionManager.js` - Integrated currency earning (death/milestones), delegated bonus calculation
- ✅ `game/index.js` - Exported PassiveManager
- ✅ `server.js` - Added 6 new API endpoints + 2 legacy compatibility endpoints

**Features Implemented:**
- ✅ **19 Passives** across 4 categories:
  - **Combat (8)**: Strength, Defense, Magic, Agility, Crit Chance, Crit Damage, Damage Boost, Damage Reduction
  - **Survival (3)**: Max HP, HP on Kill, Potion Effectiveness
  - **Progression (4)**: XP Gain, Gold Gain, Reputation Gain, Quest Rewards
  - **Utility (4)**: Movement Speed, Loot Luck, Inventory Space, Merchant Prices
- ✅ **Currency System**:
  - Souls: Earned on death (1 + level/5, doubled for hardcore)
  - Legacy Points: Earned on milestones (levels 10, 20, 30, 40, 50)
  - Starting currency: 5 souls, 0 LP
- ✅ **Cost Scaling**: Base cost + Math.floor(level/10)*2 souls, 1 LP every 5 levels
- ✅ **Max Levels**: Stat passives (50), Percentage passives (20-25), HP passive (100)
- ✅ **Respec Economics**: 50% soul refund (rounded down), 100% LP refund
- ✅ **Bonus Calculation**: All 19 passive types correctly apply bonuses to character stats

**API Endpoints:**
```javascript
GET /api/passives/tree // Full passive tree with currency and summary
GET /api/passives/category/:category // Filter by category
POST /api/passives/upgrade { passiveId } // Upgrade by 1 level
POST /api/passives/respec // Reset all passives with partial refund
GET /api/passives/currency // View souls/LP balance and spending
GET /api/passives/bonuses // Get current passive bonuses
```

**Testing:**
```bash
node Testing/test_passive_system.js
# 87/87 tests passing ✅
# 100% success rate
```

**System Design:**
- Level-based progression (not boolean unlocks)
- Incremental stackable bonuses (e.g., Strength +1 per level, XP +2% per level)
- Cost increases with level to maintain progression curve
- Legacy Points gate major upgrades (every 5 levels)
- Respec allows experimentation with 50% cost recovery
- Currency persists across character deaths (hardcore-friendly)

---

#### 3.5 Status Effects & Combat Depth ✅ **COMPLETED**
**Goal:** Enhanced buffs, debuffs, and tactical combat with combos, cleansing, and auras.

**Tasks:**
- [x] ✅ Load status effects from status_effects.json (30+ effects across buff/debuff/special categories)
- [x] ✅ Implement effect application with full stacking support
- [x] ✅ Add duration tracking and tick damage/healing processing
- [x] ✅ Create effect combos (wet+shock=paralyzed, burning+oil=explosion)
- [x] ✅ Add cleanse/dispel mechanics with priority system
- [x] ✅ Implement aura effects (permanent modifiers)
- [x] ✅ Add immunity and resistance systems
- [x] ✅ Create 7 API endpoints
- [x] ✅ Write comprehensive test suite (99 tests passing)

**Files created:**
- ✅ `Testing/test_status_effects.js` - Comprehensive test suite (99 tests, 100% pass rate)

**Files modified:**
- ✅ `game/StatusEffectManager.js` - Complete rewrite with advanced features (580+ lines)
- ✅ `data/status_effects.json` - Added combo effects (wet, shock, oil, paralyzed, explosion)
- ✅ `server.js` - Added 7 status effect API endpoints

**Features Implemented:**
- ✅ **30+ Status Effects**:
  - **Buffs (13)**: Strength, Defense, Haste, Regeneration, Divine Blessing, Shrine Blessing, Invisibility, Berserk, Focus, Mana Surge
  - **Debuffs (11)**: Poison, Bleeding, Burning, Frozen, Stunned, Slowed, Weakened, Cursed, Diseased, Wet, Shock, Oil
  - **Special (6)**: Stealth, Reflect, Ethereal, Enraged, Paralyzed, Explosion
- ✅ **Effect Stacking**: Configurable max stacks (1-10), stack-based damage/healing scaling
- ✅ **Duration System**: Turn-based tick down, automatic expiry, duration refresh on reapplication
- ✅ **Damage Over Time (DOT)**: Poison, Bleeding, Burning with per-turn damage
- ✅ **Healing Over Time (HOT)**: Regeneration with flat + percentage healing
- ✅ **Effect Combos**: 
  - Wet + Shock → Paralyzed (50 bonus damage)
  - Burning + Oil → Explosion (100 bonus damage)
  - Frozen + Shatter Attack → Instant Kill (below 30% HP)
- ✅ **Cleanse System**: Priority-based debuff removal, configurable count, specific targeting
- ✅ **Dispel System**: Remove enemy buffs in combat
- ✅ **Aura Effects**: Permanent modifier effects (no duration, persist until removed)
- ✅ **Immunity System**: Divine Blessing grants curse immunity, effects can grant immunities
- ✅ **Resistance/Counters**: Wet counters Burning, Burning counters Frozen
- ✅ **Cannot Be Removed**: Special effects (Enraged) cannot be cleansed or dispelled
- ✅ **Modifier Calculation**: 20+ modifier types (attack, defense, crit, dodge, lifesteal, XP, gold, loot)
- ✅ **Special Flags**: Untargetable, Stunned, Physical Immunity, Breaks on Attack
- ✅ **Source Tracking**: Track which ability/item applied each effect

**API Endpoints:**
```javascript
GET  /api/status-effects/all          // Get all available effects + combos
GET  /api/status-effects/active       // Get character's active effects + auras + modifiers
POST /api/status-effects/apply        // Apply effect to character (admin/testing)
POST /api/status-effects/cleanse      // Cleanse debuffs from character
POST /api/status-effects/dispel       // Dispel enemy buffs in combat
POST /api/status-effects/aura/add     // Add permanent aura effect
POST /api/status-effects/aura/remove  // Remove permanent aura
```

**Testing:**
```bash
node Testing/test_status_effects.js
# 99/99 tests passing ✅
# 100% success rate
```

**Test Coverage:**
- Effect loading and templates
- Adding, stacking, and refreshing effects
- Modifier calculation (all 20+ types)
- Duration and tick processing
- Effect combos (wet+shock, burning+oil)
- Cleansing with priority system
- Dispelling buffs
- Aura effects (permanent modifiers)
- Immunity and resistance checks
- Cannot be removed effects
- Complex modifier interactions
- Special flags and source tracking

**Combat Integration:**
- Status effects automatically integrated with existing Combat.js
- Effects apply modifiers to attack, defense, damage, crit, dodge
- DOT/HOT processed each turn
- Effects can break on attack (invisibility)
- Cleanse usable via consumables or abilities

---

### **Phase 4: Multiplayer & Social Features**
*Priority: MEDIUM | Time: 2-3 weeks*

Twitch integration and community features.

#### 4.1 Raid System ✅ **COMPLETED**
**Goal:** Group content for multiple Twitch viewers.

**Status:** ✅ COMPLETE - All 112 tests passing

**Tasks:**
- [x] ✅ Load raids from raids.json (4 unique raids)
- [x] ✅ Implement raid lobby system (players join with role selection)
- [x] ✅ Create role system (tank, healer, DPS with requirements)
- [x] ✅ Add coordinated combat (multiple players vs boss)
- [x] ✅ Implement raid-specific mechanics (waves, phases, objectives, boss rush)
- [x] ✅ Add raid rewards and leaderboards (difficulty scaling)
- [x] ✅ Create Twitch viewer voting system
- [x] ✅ Implement legacy points buff system (replace channel points/bits)
- [x] ✅ Add leadership transfer (lobbies don't disband when leader leaves)
- [x] ✅ Create 15 API endpoints
- [x] ✅ Write comprehensive test suite (112 tests)
- [x] ✅ Write complete documentation

**Files created:**
- ✅ `game/RaidManager.js` (1168 lines) - Complete raid management system
- ✅ `Testing/test_raid_system.js` (427 lines) - 112 comprehensive tests
- ✅ `game/RAID_README.md` - Complete system documentation

**Files modified:**
- ✅ `game/index.js` - Exported RaidManager
- ✅ `game/Character.js` - Added legacyPoints property
- ✅ `server.js` - Added 15 raid API endpoints

**Features Implemented:**
- ✅ **4 Unique Raids**: Goblin Siege, Dragon Assault, Void Incursion, Trial of Legends
- ✅ **Multiple Raid Types**: Wave-based, Phase-based, Objective-based, Boss Rush
- ✅ **Lobby System**: Pre-raid gathering with role selection and requirements
- ✅ **Leadership Transfer**: Random player becomes leader when current leader leaves
- ✅ **Role Management**: Tank (aggro/taunts), Healer (party healing), DPS (damage)
- ✅ **Coordinated Combat**: Multiplayer turn-based combat with action logs
- ✅ **Twitch Viewer Voting**: Community votes on raid events (30s voting windows)
- ✅ **Legacy Points Buffs**: 4 raid buffs (heal 5 LP, revive 10 LP, damage 8 LP, shield 12 LP)
- ✅ **Leaderboards**: Track fastest clears, fewest deaths, highest damage
- ✅ **Difficulty Scaling**: Normal (1.0x), Hard (1.5x), Nightmare (2.0x), Mythic (3.0x)
- ✅ **Achievements**: Raid-specific achievements (Dragonslayer, Perfect Defense, Speed Kill)
- ✅ **Rewards System**: Gold, XP, items, unique loot, raid tokens, titles

**API Endpoints:**
```javascript
GET  /api/raids                       // Get all available raids
GET  /api/raids/:raidId               // Get raid details
GET  /api/raids/lobbies/active        // Get active lobbies
POST /api/raids/lobby/create          // Create lobby
POST /api/raids/lobby/join            // Join lobby
POST /api/raids/lobby/leave           // Leave lobby (transfers leadership if leader)
POST /api/raids/lobby/change-role     // Change role
POST /api/raids/start                 // Start raid
GET  /api/raids/instance/:instanceId  // Get raid state
POST /api/raids/action                // Perform action
POST /api/raids/viewer/vote           // Submit viewer vote
GET  /api/raids/buffs                 // Get available legacy points buffs
POST /api/raids/buff/purchase         // Purchase buff with legacy points
GET  /api/raids/leaderboard/:raidId   // Get leaderboard
```

**Testing:**
```bash
node Testing/test_raid_system.js
# 112/112 tests passing ✅
# 100% success rate
```

**Test Coverage:**
- Raid loading and filtering (4 raids, multiple difficulties)
- Lobby creation and management
- Player joining/leaving with role selection
- Leadership transfer when leader leaves
- Role distribution and requirements (2 tanks, 3 healers, 10 DPS for dragon)
- Lobby player limits and start requirements
- Raid instance creation and state management
- Player actions (attack, heal, ability, taunt)
- Combat log system
- Twitch viewer voting (weighted by bits)
- Legacy points buff purchase (heal, revive, damage, shield)
- Legacy points validation and deduction
- Leaderboard tracking and rankings
- Reward calculation with difficulty multipliers
- Raid achievements
- Wave-based raids (Goblin Siege with 3 waves)
- Phase-based raids (Dragon Assault with HP thresholds)
- Objective-based raids (Void Incursion with 3 objectives)
- Boss rush raids (Trial of Legends with 5 bosses)
- Difficulty scaling (1.5x rewards for hard mode)
- Leave lobby and disbanding (only when empty)
- Raid wipe handling
- Twitch integration settings
- Raid mechanics system

**Documentation:**
- See `game/RAID_README.md` for complete API documentation
- Includes Twitch bot command examples for streamers and viewers
- Full integration guide for channel points and bits
- Database schema recommendations
- Troubleshooting guide

---

#### 4.2 Twitch Integration Enhancement
**Goal:** Deep Twitch chat and channel points integration.

**Status:** 🔄 PARTIALLY COMPLETE - Raid voting + Bot commands + Channel point redemptions + Location-based raids

**Tasks:**
- [x] ✅ Create viewer voting on player decisions (implemented in raid system)
- [x] ✅ Implement subscriber-weighted voting (subscribers get 2x vote weight)
- [x] ✅ Add bot commands for raids (!raid list, !raid join, !raid here, !raid vote, etc.)
- [x] ✅ Create channel point redemptions for solo gameplay (5 redemption types)
- [x] ✅ Implement location-based raid entrances (must travel to start raids)

**Completed Features:**
- ✅ **Viewer Voting**: 30-second voting windows during raids with subscriber-weighted votes
- ✅ **Subscriber Integration**: Subscriber votes count 2x in raid decisions (non-subs count 1x)
- ✅ **Vote Options**: buff_boss, buff_players, spawn_adds, heal_all, chaos_mode
- ✅ **Raid Bot Commands**: !raid list, !raid here, !raid join, !raid leave, !raid role, !raid info
- ✅ **Vote Command**: !vote <option> for raid events with subscriber weighting
- ✅ **Location-Based Raids**: Players must travel to raid entrances to start raids
  - Goblin Siege: `whispering_woods`
  - Dragon Assault: `volcanic_peaks`
  - Void Incursion: `shadowmere_abyss`
  - Trial of Legends: `celestial_sanctum`
- ✅ **In-Game UI Raid Creation**: Removed chat command, raids now created via UI button at entrance
- ✅ **Channel Point Redemptions**: 5 redemption types for solo players
  - Haste (1000 points) - +50% speed for 10 turns
  - Random Item Common (2000 points)
  - Random Item Uncommon (5000 points)
  - Random Item Rare (10000 points)
  - Instant Travel (3000 points) - Teleport to any location

**Implementation Details:**
- **Bot Commands**: Implemented in `bot.js` with !raid here to check current location
- **Location Validation**: RaidManager validates leader is at entrance before creating lobby
- **Subscriber Voting**: Subscribers get 2x vote weight in raid events (non-subscribers get 1x)
- **Channel Points**: 5 redemption types (haste buff, random items, instant travel)
- **Announcements**: All redemptions broadcast to channel chat
- **API Endpoints**: 3 raid location endpoints, 2 redemption endpoints

**Remaining Work:**
- **Chat Mini-Games**: Community events anyone can join (!roll, !trivia, !predict)
- **EventSub Webhooks**: Real-time channel point and bits events (optional enhancement)

**Files modified:**
- ✅ `data/raids.json` - Added entrance_location to all 4 raids
- ✅ `game/RaidManager.js` - Added location validation and getRaidsAtLocation()
- ✅ `bot.js` - Removed !raid create, added !raid here command
- ✅ `server.js` - Updated /api/raids/lobby/create, added location endpoints
- ✅ `game/RAID_README.md` - Updated documentation with location requirements

**Testing:**
```bash
# Test bot commands in Twitch chat:
!raid here              # Check raids at current location
!raid list              # View active lobbies
!raid join lobby_123 tank  # Join existing lobby
!vote buff_players      # Vote in raid event (subscribers get 2x weight)

# Test API endpoints:
GET /api/raids/location/volcanic_peaks  # Get raids at location
GET /api/raids/available-here?player=username&channel=channelname
POST /api/raids/lobby/create  # Now validates player location
GET /api/redemptions/available  # Get remaining 5 redemptions
```

---

#### 4.3 Leaderboards & Seasons ✅ **COMPLETED**
**Goal:** Competitive elements and seasonal resets.

**Status:** ✅ COMPLETE - All 34 tests passing

**Tasks:**
- [x] ✅ Load seasons from seasons.json (3 seasons, 4 seasonal events)
- [x] ✅ Implement season progression (levels 1-50, XP scaling)
- [x] ✅ Create leaderboards (7 types: level, wealth, dungeon speed, boss kills, achievement points, season level, season currency)
- [x] ✅ Add seasonal currency and shop system
- [x] ✅ Implement season reset mechanics (what resets vs persists)
- [x] ✅ Create seasonal events and challenges (weekly + seasonal challenges)
- [x] ✅ Create API endpoints (17 endpoints)
- [x] ✅ Update database schema (season_progress, seasonal_challenges_completed)
- [x] ✅ Write comprehensive documentation

**Files created:**
- ✅ `game/SeasonManager.js` (498 lines) - Complete season management system
- ✅ `game/LeaderboardManager.js` (470 lines) - Full leaderboard tracking system
- ✅ `Testing/test_season_leaderboard.js` (34 tests, 100% pass rate)
- ✅ `game/SEASON_LEADERBOARD_README.md` - Complete system documentation

**Files modified:**
- ✅ `game/Character.js` - Added seasonProgress and seasonalChallengesCompleted properties
- ✅ `game/index.js` - Exported SeasonManager and LeaderboardManager
- ✅ `server.js` - Added 17 season & leaderboard API endpoints
- ✅ `db.js` - Added season_progress and seasonal_challenges_completed JSONB columns

**Features Implemented:**
- ✅ **3 Seasons**: Season of Shadows, Season of Ascension (active), Season of Dragons (planned)
- ✅ **Season Progression**: 1-50 levels with XP scaling (100 × level)
- ✅ **Seasonal Currency**: Earned from challenges, events, dungeons
- ✅ **Weekly Challenges**: 5-7 challenges reset weekly (50-100 token rewards)
- ✅ **Seasonal Challenges**: 3-5 major challenges lasting entire season
- ✅ **4 Seasonal Events**: Spring Festival, Summer Championship, Halloween Horrors, Winter Festival
- ✅ **7 Leaderboard Types**:
  - Level (highest character level)
  - Wealth (most gold)
  - Dungeon Speed (fastest clear time)
  - Boss Kills (total boss defeats)
  - Achievement Points (total points earned)
  - Season Level (highest seasonal level)
  - Season Currency (most currency earned)
- ✅ **Season Reset System**: Resets seasonal progress but preserves achievements, cosmetics, titles
- ✅ **Leaderboard Features**: Top N, player rank, nearby players, statistics, pagination
- ✅ **Milestone Rewards**: Special rewards at levels 10, 25, 50

**API Endpoints:**
```javascript
// Season Endpoints (11)
GET  /api/seasons                             // Get all seasons
GET  /api/seasons/active                      // Get active season
GET  /api/seasons/:seasonId                   // Get season details
GET  /api/seasons/progress/:player/:channel   // Get player progress
POST /api/seasons/xp/add                      // Add season XP
POST /api/seasons/currency/add                // Add currency
GET  /api/seasons/challenges/:player/:channel // Get challenges
POST /api/seasons/challenges/complete         // Complete challenge
GET  /api/seasons/events                      // Get seasonal events
GET  /api/seasons/events/:eventId             // Get event details
GET  /api/seasons/stats/:player/:channel      // Get season stats

// Leaderboard Endpoints (6)
GET  /api/leaderboards                               // Get all leaderboards
GET  /api/leaderboards/:type                         // Get rankings
GET  /api/leaderboards/:type/player/:player/:channel // Get player rank
GET  /api/leaderboards/:type/top/:count              // Get top N
GET  /api/leaderboards/:type/nearby/:player/:channel // Get nearby players
GET  /api/leaderboards/:type/stats                   // Get statistics
```

**Testing:**
```bash
node Testing/test_season_leaderboard.js
# 34/34 tests passing ✅
# 100% success rate
```

**Test Coverage:**
- Season loading and active season detection
- Season progression (XP, leveling, max level cap)
- Seasonal currency (add, spend, insufficient funds)
- Challenge system (weekly, seasonal, duplicates)
- Seasonal events and rewards
- Leaderboard updates (all 7 types)
- Leaderboard rankings and pagination
- Player rank tracking
- Top players and nearby players
- Leaderboard statistics
- Update mechanics (higher/lower values)
- Seasonal leaderboard resets

**Documentation:**
- See `game/SEASON_LEADERBOARD_README.md` for complete API documentation
- Includes bot command examples (!season, !challenges, !lb, !rank)
- Integration guides for auto-updating leaderboards
- Database schema documentation
- Season reset mechanics explained
- Troubleshooting guide

---

### **Phase 5: Polish & UI (User Experience)**
*Priority: HIGH | Time: 2-3 weeks*

Make the game accessible and enjoyable.

#### 5.1 Frontend Overhaul
**Goal:** Replace minimal UI with full game interface.

**Tasks:**
- [ ] Design and implement character sheet UI
- [ ] Create inventory/equipment interface
- [ ] Build combat UI (HP bars, actions, enemy info)
- [ ] Add quest log interface
- [ ] Create map/exploration view
- [ ] Implement dialogue UI
- [ ] Add achievement tracker
- [ ] Create settings/help pages

**Tech Stack Recommendation:**
- React or Vue.js for component-based UI
- Canvas or Phaser.js for visual effects
- WebSocket for real-time updates

**Files to modify:**
- `public/app.js` - Expand to full client
- `public/index.html` - Modern UI framework
- Add CSS framework (Tailwind, Bootstrap)

---

#### 5.2 Real-time Updates
**Goal:** Game state updates push to client instantly.

**Tasks:**
- [ ] Implement WebSocket server (Socket.io)
- [ ] Add client connection management
- [ ] Create real-time combat updates
- [ ] Implement live quest progress
- [ ] Add party/raid member updates
- [ ] Create chat integration with game events

**Files to create:**
- `websocket/server.js` - WebSocket handler

**Files to modify:**
- `server.js` - Integrate WebSocket
- `public/app.js` - WebSocket client

---

#### 5.3 Tutorial & Onboarding
**Goal:** New players understand how to play.

**Tasks:**
- [ ] Create tutorial quest (guided first experience)
- [ ] Add tooltips and help text
- [ ] Implement character creation flow
- [ ] Create gameplay tips system

---

### **Phase 6: Testing & Balance**
*Priority: CRITICAL | Time: Ongoing*

Ensure game is fun and fair.

#### 6.1 Gameplay Balance
**Tasks:**
- [ ] Balance monster difficulty vs player power
- [ ] Adjust XP curves and leveling speed
- [ ] Balance loot drop rates
- [ ] Test all character classes for viability
- [ ] Adjust combat math (too easy/hard?)
- [ ] Balance economy (gold gain vs item costs)

**Create:**
- `Testing/balance_tests.js` - Automated balance checks
- `Testing/combat_simulator.js` - Simulate fights

---

#### 6.2 Bug Fixing & Edge Cases
**Tasks:**
- [ ] Test all quest completion paths
- [ ] Verify item stacking and uniqueness
- [ ] Test death/respawn mechanics
- [ ] Validate combat edge cases (0 HP, negative damage)
- [ ] Test equipment slot validation
- [ ] Verify database transaction safety

---

#### 6.3 Performance Optimization
**Tasks:**
- [ ] Add caching for frequently loaded data
- [ ] Optimize database queries (indexes, prepared statements)
- [ ] Reduce API response times
- [ ] Implement rate limiting
- [ ] Add monitoring and logging

---

## 🗓️ Suggested Timeline

### Month 1: Foundation
- Week 1-2: Phase 1.1-1.2 (Character + Combat)
- Week 3-4: Phase 1.3-1.4 (Progression + Exploration)

### Month 2: Content
- Week 5-6: Phase 2.1-2.2 (Quests + Loot)
- Week 7-8: Phase 2.3-2.4 (NPCs + Achievements)

### Month 3: Depth
- Week 9-10: Phase 3.1-3.2 (Dungeons + Factions)
- Week 11-12: Phase 3.3-3.5 (Enchanting + Status Effects + Passives)

### Month 4: Social & Polish
- Week 13-14: Phase 4.1-4.2 (Raids + Twitch Integration)
- Week 15-16: Phase 5.1-5.2 (Frontend + Real-time)

### Ongoing: Testing & Balance (Phase 6)

---

## 🎯 Quick Wins (Do These First)

Want to see progress fast? Start here:

### Week 1 Quick Win: Basic Combat
1. Implement character stat calculations
2. Create simple turn-based combat (attack only)
3. Add monster HP/damage
4. Show victory/defeat
5. **Result:** Players can fight monsters!

### Week 2 Quick Win: Loot & Inventory
1. Generate loot on monster death
2. Add items to inventory
3. Display inventory list
4. Let players equip weapons/armor
5. **Result:** Players collect gear and get stronger!

### Week 3 Quick Win: Exploration
1. Load 3-4 biomes
2. Add movement commands
3. Random monster encounters
4. **Result:** Players can explore and find different monsters!

---

## 📊 Development Priorities

### 🔥 Critical (Do First)
1. Character system (stats, equipment)
2. Combat system (fight monsters)
3. Inventory & loot
4. Basic progression (leveling)

### ⚡ High (Do Soon)
5. Quest system
6. Location/exploration
7. Frontend UI overhaul
8. Bot command expansion

### 🎯 Medium (Do Later)
9. Dungeons
10. Factions
11. Enchanting
12. Raids
13. Seasons

### 🌟 Low (Polish & Optional)
14. Advanced status effects
15. Crafting
16. Title system
17. World states
18. Mysteries system

---

## 🛠️ Development Workflow

### Daily Development Loop
```powershell
# 1. Start development server
npm run dev

# 2. Make changes to game systems
# Edit files in game/ folder

# 3. Test in browser
# Open http://localhost:3000/adventure

# 4. Test bot commands
# Send !adventure in Twitch chat

# 5. Run validation
cd Testing
node validate_consistency.js

# 6. Commit changes
git add .
git commit -m "Implement combat system"
```

### Testing New Features
1. **Unit test** individual functions
2. **Integration test** with database
3. **Manual test** in browser
4. **Bot test** via Twitch chat
5. **Balance test** with simulations

---

## 📚 Recommended Learning Path

### If you're new to game development:
1. **Start simple:** Get combat working first (Phase 1.2)
2. **Add one system at a time:** Don't try to do everything at once
3. **Test frequently:** Make sure each piece works before moving on
4. **Use the data:** You have amazing JSON files - just connect them!

### Architecture Tips:
- **Separate concerns:** Game logic in `game/`, API in `server.js`, data in `data/`
- **Think in systems:** Combat system, Inventory system, Quest system, etc.
- **Use classes:** `Character`, `Monster`, `Quest`, `Item` classes make code clean
- **Event-driven:** Use events to trigger achievements, announcements, etc.

---

## 🎮 Example: Implementing Combat (Detailed)

Here's what Phase 1.2 looks like in practice:

### Step 1: Create Combat Engine
```javascript
// game/combat.js
class Combat {
  constructor(player, monster) {
    this.player = player;
    this.monster = monster;
    this.turn = 'player';
    this.log = [];
  }

  playerAttack() {
    const damage = this.calculateDamage(this.player.stats.attack, this.monster.defense);
    this.monster.hp -= damage;
    this.log.push(`You hit ${this.monster.name} for ${damage} damage!`);
    
    if (this.monster.hp <= 0) {
      return this.victory();
    }
    
    this.turn = 'monster';
    return this.monsterAttack();
  }

  monsterAttack() {
    const damage = this.calculateDamage(this.monster.attack, this.player.stats.defense);
    this.player.hp -= damage;
    this.log.push(`${this.monster.name} hits you for ${damage} damage!`);
    
    if (this.player.hp <= 0) {
      return this.defeat();
    }
    
    this.turn = 'player';
    return { status: 'ongoing', log: this.log };
  }

  victory() {
    const loot = generateLoot(this.monster);
    const xp = this.monster.xp_reward;
    return { status: 'victory', xp, loot, log: this.log };
  }

  defeat() {
    return { status: 'defeat', log: this.log };
  }

  calculateDamage(attack, defense) {
    const baseDamage = attack - (defense * 0.5);
    const variance = Math.random() * 0.2 + 0.9; // 90-110%
    return Math.max(1, Math.floor(baseDamage * variance));
  }
}

module.exports = Combat;
```

### Step 2: Add Combat Endpoints
```javascript
// In server.js
const Combat = require('./game/combat');

app.post('/api/combat/start', async (req, res) => {
  const user = req.session.user;
  const { monsterId } = req.body;
  
  const player = await loadCharacter(user.id);
  const monster = loadMonster(monsterId);
  
  const combat = new Combat(player, monster);
  req.session.combat = combat;
  
  res.json({ status: 'started', monster, playerHp: player.hp });
});

app.post('/api/combat/action', async (req, res) => {
  const user = req.session.user;
  const { action } = req.body;
  
  const combat = req.session.combat;
  if (!combat) return res.status(400).json({ error: 'No active combat' });
  
  if (action === 'attack') {
    const result = combat.playerAttack();
    
    if (result.status === 'victory') {
      await grantRewards(user.id, result.xp, result.loot);
      delete req.session.combat;
    }
    
    res.json(result);
  }
});
```

### Step 3: Update Frontend
```javascript
// In public/app.js
async function startCombat(monsterId) {
  const res = await fetch('/api/combat/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monsterId })
  });
  
  const data = await res.json();
  displayCombat(data);
}

async function attack() {
  const res = await fetch('/api/combat/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'attack' })
  });
  
  const result = await res.json();
  updateCombatLog(result.log);
  
  if (result.status === 'victory') {
    showVictory(result.xp, result.loot);
  } else if (result.status === 'defeat') {
    showDefeat();
  }
}
```

---

## 🎉 Success Metrics

You'll know you're making progress when:

### Phase 1 Complete:
- [ ] Players can create characters
- [ ] Players can fight monsters
- [ ] Combat feels fair and functional
- [ ] Players gain XP and level up
- [ ] Players can explore different locations

### Phase 2 Complete:
- [ ] Players can accept and complete quests
- [ ] Monsters drop loot
- [ ] Players can buy/sell items
- [ ] NPCs have dialogue trees
- [ ] Achievements unlock and grant rewards

### Phase 3 Complete:
- [ ] Dungeons are playable and challenging
- [ ] Faction reputation affects gameplay
- [ ] Enchanting adds depth to gear progression
- [ ] Passive progression survives death

### Phase 4 Complete:
- [ ] Raids work with multiple players
- [ ] Twitch chat fully integrated
- [ ] Channel points add value
- [ ] Seasons create competitive cycles

### Phase 5 Complete:
- [ ] UI is intuitive and attractive
- [ ] Game updates in real-time
- [ ] Tutorial guides new players
- [ ] Game is fun to watch on stream

---

## 🚀 Getting Started NOW

**To begin development today:**

1. **Choose your starting point** (Recommend: Phase 1.1 Character System)
2. **Create game folder:** `mkdir game`
3. **Create first file:** `game/character.js`
4. **Implement basic stat calculations**
5. **Add API endpoint to test it**
6. **Celebrate small wins!**

**Your first PR should:**
- Implement character stat loading from classes.json
- Calculate total stats (base + equipment)
- Add `/api/player/stats` endpoint
- Test with all 5 classes

**That's it! Start small, build momentum, iterate!**

---

*Good luck, developer! You have an incredible foundation of data. Now bring it to life!* 🎮✨
