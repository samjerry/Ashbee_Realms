# Character System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHARACTER SYSTEM                            │
│                   (Core Game Loop Foundation)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER (REST)                         │
├─────────────────────────────────────────────────────────────────┤
│  GET  /api/classes                    - List all classes        │
│  GET  /api/classes/:type              - Get class info          │
│  GET  /api/classes/:type/preview      - Preview progression     │
│  POST /api/player/create              - Create character        │
│  GET  /api/player/stats               - Get stats breakdown     │
│  GET  /api/player/inventory           - Get inventory           │
│  GET  /api/player/equipment           - Get equipment           │
│  POST /api/player/equip               - Equip item              │
│  POST /api/player/unequip             - Unequip item            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (db.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  getCharacter(playerId, channel)      - Load Character instance │
│  saveCharacter(playerId, channel, char) - Save Character        │
│  createCharacter(playerId, channel, name, class) - Create new   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CHARACTER CLASS LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Character (game/Character.js)                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Properties:                                              │   │
│  │  • name, classType, level, xp, hp, maxHp, gold         │   │
│  │  • equipment (EquipmentManager instance)                │   │
│  │  • inventory (InventoryManager instance)                │   │
│  │                                                          │   │
│  │ Methods:                                                 │   │
│  │  • getBaseStats()          - Class + level stats        │   │
│  │  • getEquipmentStats()     - Equipment bonuses          │   │
│  │  • getFinalStats()         - Total calculated stats     │   │
│  │  • getStatsBreakdown()     - Detailed breakdown         │   │
│  │  • equipItem(itemId)       - Equip from inventory       │   │
│  │  • unequipItem(slot)       - Unequip to inventory       │   │
│  │  • gainXP(amount)          - XP + level up              │   │
│  │  • heal(amount)            - Restore HP                 │   │
│  │  • takeDamage(amount)      - Apply damage               │   │
│  │  • addGold() / spendGold() - Gold management            │   │
│  │  • toDatabase()            - Serialize for DB           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓           ↓                           │
│       ┌──────────────────────────────────────────────┐          │
│       │                                                │          │
│  ┌────▼──────────────────┐    ┌──────────────────────▼────┐    │
│  │  EquipmentManager     │    │   InventoryManager         │    │
│  │  (game/Equipment...)  │    │   (game/Inventory...)      │    │
│  ├───────────────────────┤    ├────────────────────────────┤    │
│  │ Manages:              │    │ Manages:                   │    │
│  │  • 15 equipment slots │    │  • 30 inventory slots      │    │
│  │  • Level validation   │    │  • Item stacking           │    │
│  │  • Stat aggregation   │    │  • Item counting           │    │
│  │  • Slot swapping      │    │  • Capacity limits         │    │
│  │                       │    │  • Item categorization     │    │
│  │ Slots:                │    │                            │    │
│  │  • main_hand          │    │ Operations:                │    │
│  │  • off_hand           │    │  • addItem(id, qty)        │    │
│  │  • armor              │    │  • removeItem(id, qty)     │    │
│  │  • headgear           │    │  • hasItem(id)             │    │
│  │  • legs, hands, etc.  │    │  • getItemCount(id)        │    │
│  │  • ring1, ring2       │    │  • getItemsWithCounts()    │    │
│  │  • amulet, belt       │    │  • getSummary()            │    │
│  └───────────────────────┘    └────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              CHARACTER INITIALIZATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │   CharacterInitializer (game/CharacterInitializer.js)   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Static Methods:                                          │   │
│  │  • getAvailableClasses()        - List classes          │   │
│  │  • getClassInfo(type)            - Get class data       │   │
│  │  • isValidClass(type)            - Validate class       │   │
│  │  • getStartingEquipment(type)    - Starting gear        │   │
│  │  • getStartingInventory(type)    - Starting items       │   │
│  │  • getStartingStats(type)        - Initial stats        │   │
│  │  • getStatGrowth(type)           - Level bonuses        │   │
│  │  • previewClassProgression()     - Stats at levels      │   │
│  │  • compareClasses()              - Side-by-side         │   │
│  │  • createCharacterData()         - Full char object     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  data/data_loader.js                                             │
│  ├─ loadData(name) - Load any JSON file with caching            │
│  └─ reloadData(name) - Reload specific data                     │
│                                                                   │
│  Data Files:                                                     │
│  ├─ classes.json         - 5 character classes                  │
│  ├─ gear_weapons.json    - 200+ weapons                         │
│  ├─ gear_armor.json      - 150+ armor pieces                    │
│  ├─ gear_headgear.json   - 100+ headgear                        │
│  ├─ gear_accessories.json - 150+ accessories                    │
│  ├─ consumables_extended.json - Potions, food, etc.            │
│  └─ items.json           - Miscellaneous items                  │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
                        DATA FLOW EXAMPLE
═══════════════════════════════════════════════════════════════════

[CREATE CHARACTER]
User → API: POST /api/player/create {classType: "warrior"}
      → db.createCharacter()
      → Character.createNew()
      → CharacterInitializer.createCharacterData()
      → Loads classes.json
      → Creates Character instance
      → EquipmentManager created with starting gear
      → InventoryManager created with starting items
      → Save to database
      → Return character data

[EQUIP ITEM]
User → API: POST /api/player/equip {itemId: "iron_sword"}
      → db.getCharacter() → Load Character instance
      → character.equipItem("iron_sword")
      → Check inventory.hasItem()
      → equipment.equip() → Validates level, finds slot
      → Unequips old item (if any)
      → inventory.removeItem() → Remove from inventory
      → inventory.addItem() → Add unequipped item
      → Recalculate maxHP from getFinalStats()
      → db.saveCharacter() → Save to database
      → Return success/message

[GET STATS]
User → API: GET /api/player/stats
      → db.getCharacter() → Load Character instance
      → character.getStatsBreakdown()
      → getBaseStats() → Calculate from class + level
      → equipment.getTotalStats() → Sum equipment bonuses
      → getFinalStats() → Combine base + equipment + derived
      → Return full breakdown (base, equipment, final)

═══════════════════════════════════════════════════════════════════
                          STATS CALCULATION
═══════════════════════════════════════════════════════════════════

Base Stats (from class + level):
  Warrior Level 1:  STR=5, DEF=4, MAG=1, AGI=2, HP=110
  Warrior Level 5:  STR=12, DEF=8, MAG=1, AGI=3, HP=150
  
Equipment Stats (from equipped items):
  Iron Sword:       Attack=15
  Steel Armor:      Defense=8
  
Final Stats (calculated):
  Attack    = Equipment.attack + Base.strength = 15 + 12 = 27
  Defense   = Base.defense + Equipment.defense = 8 + 8 = 16
  Crit%     = Base.agility × 0.5% = 3 × 0.5 = 1.5%
  Dodge%    = Base.agility × 0.3% = 3 × 0.3 = 0.9%
  Block%    = Base.defense × 0.2% = 8 × 0.2 = 1.6%

═══════════════════════════════════════════════════════════════════
                        CHARACTER CLASSES
═══════════════════════════════════════════════════════════════════

┌────────────┬─────┬─────┬─────┬─────┬─────┬──────────────────────┐
│ Class      │ HP  │ STR │ DEF │ MAG │ AGI │ Special Ability      │
├────────────┼─────┼─────┼─────┼─────┼─────┼──────────────────────┤
│ Warrior    │ 110 │  5  │  4  │  1  │  2  │ Berserker Rage       │
│ Mage       │  80 │  1  │  2  │  6  │  3  │ Arcane Blast         │
│ Rogue      │  90 │  3  │  2  │  1  │  6  │ Shadow Strike        │
│ Cleric     │ 100 │  2  │  4  │  5  │  2  │ Divine Intervention  │
│ Ranger     │  95 │  3  │  3  │  2  │  5  │ Multishot            │
└────────────┴─────┴─────┴─────┴─────┴─────┴──────────────────────┘

Growth Rates (per level):
  Warrior: HP+10, STR+1.8, DEF+1.2, AGI+0.3
  Mage:    HP+6,  MAG+2.2, DEF+0.4, AGI+0.5
  Rogue:   HP+7,  AGI+2.0, STR+0.8, DEF+0.3
  Cleric:  HP+8,  MAG+1.3, DEF+1.3, STR+0.4
  Ranger:  HP+7,  AGI+1.5, STR+1.0, DEF+0.6

═══════════════════════════════════════════════════════════════════
```
