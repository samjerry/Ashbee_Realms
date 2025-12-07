# Ashbee Realms - Development Roadmap

## 🎯 Current State Analysis

### ✅ What's Complete (Data Layer)
- **38 JSON data files** with rich game content
- **400+ gear items** organized by category (weapons, armor, headgear, accessories)
- **5 character classes** with balanced level 1 starting gear
- **126 monsters** across all rarity tiers with abilities and loot tables
- **21 game systems** fully designed (quests, achievements, events, factions, etc.)
- **Database abstraction** (SQLite for dev, PostgreSQL for prod)
- **Twitch OAuth integration** (player login)
- **Basic bot commands** (`!adventure`)

### ⚠️ What's Missing (Core Systems)
- **No game loop implementation** - Data exists but isn't connected
- **No combat system** - Monster data unused
- **No inventory management** - Gear data unused
- **No progression system** - XP, leveling, stats not implemented
- **No quest engine** - Quest data not connected
- **No loot system** - Monster loot tables not used
- **Frontend is minimal** - No real UI for gameplay
- **Bot commands incomplete** - Only `!adventure` works

---

## 📋 Development Phases

### **Phase 1: Core Game Loop (Foundation)** 
*Priority: CRITICAL | Time: 2-3 weeks*

Build the fundamental game systems that make everything else work.

#### 1.1 Character System Implementation
**Goal:** Make character classes functional with stats and equipment.

**Tasks:**
- [ ] Implement character stat calculations (base stats + level + equipment)
- [ ] Create equipment manager (equip/unequip items, validate slots)
- [ ] Implement inventory system (add/remove items, max capacity)
- [ ] Add stat display API endpoint (`GET /api/player/stats`)
- [ ] Update database schema to store equipped items properly
- [ ] Create character initialization from classes.json

**Files to modify:**
- `server.js` - Add character API endpoints
- `db.js` - Add inventory/equipment queries
- Create `game/character.js` - Character class with stat calculations
- Create `game/inventory.js` - Inventory management

**Testing:**
```javascript
// Should work after completion:
POST /api/player/equip { itemId: "rusty_sword" }
GET /api/player/stats // Returns calculated stats
GET /api/player/inventory // Returns items list
```

---

#### 1.2 Combat System Implementation
**Goal:** Turn-based combat using monster data.

**Tasks:**
- [ ] Design turn-based combat flow (player action → monster action → repeat)
- [ ] Implement damage calculation (attack vs defense, criticals, passives)
- [ ] Create combat state machine (idle, in_combat, victory, defeat)
- [ ] Integrate monster abilities (from monster_abilities.json)
- [ ] Implement status effects during combat (poison, bleeding, buffs)
- [ ] Add combat rewards (XP, gold, loot from monster_loot.json)
- [ ] Create combat API endpoints

**Files to create:**
- `game/combat.js` - Combat engine
- `game/monsters.js` - Monster AI and abilities
- `game/loot.js` - Loot generation from tables

**Files to modify:**
- `server.js` - Add combat endpoints
- `bot.js` - Add combat announcements

**API Design:**
```javascript
POST /api/combat/start { monsterId: "goblin_scout" }
POST /api/combat/action { action: "attack" | "skill" | "item", target }
GET /api/combat/state // Current combat status
POST /api/combat/flee // Escape attempt
```

**Testing:**
- Start combat with goblin_scout
- Attack until victory
- Verify XP and loot rewards
- Test monster abilities triggering
- Test status effects (poison, bleeding)

---

#### 1.3 Progression System Implementation
**Goal:** XP, leveling, stat increases.

**Tasks:**
- [ ] Implement XP gain and level-up calculations
- [ ] Add stat increases per level (from classes.json stat_bonuses)
- [ ] Create level-up rewards (skill points, new abilities)
- [ ] Implement skill cooldowns
- [ ] Add character death and respawn mechanics
- [ ] Create progression API endpoints

**Files to create:**
- `game/progression.js` - Leveling system

**Files to modify:**
- `game/character.js` - Add level-up logic
- `server.js` - Add progression endpoints
- `db.js` - Store level/XP

**Logic:**
```javascript
// XP formula from constants.json or per-class
xpToNextLevel = baseXP * (level ^ 1.5)
onLevelUp() {
  stats += class.stat_bonuses_per_level
  hp = max_hp
  triggerAnnouncement("LEVEL_UP")
}
```

---

#### 1.4 Location & Exploration System
**Goal:** Players can move between biomes and encounter events.

**Tasks:**
- [ ] Implement biome system (load from biomes.json)
- [ ] Create travel mechanics (movement between locations)
- [ ] Add random encounter system (from random_encounters.json)
- [ ] Implement biome-specific events (from events.json)
- [ ] Add location-based monster spawning
- [ ] Create exploration API endpoints

**Files to create:**
- `game/exploration.js` - Movement and encounters
- `game/events.js` - Event system

**Files to modify:**
- `server.js` - Add exploration endpoints

**API Design:**
```javascript
POST /api/explore { direction: "north" | "south" | "east" | "west" }
GET /api/location/current // Current biome info
GET /api/location/available // Where can I go?
```

---

### **Phase 2: Content Integration (Make Data Useful)**
*Priority: HIGH | Time: 2-3 weeks*

Connect all the JSON data to working game systems.

#### 2.1 Quest System Implementation
**Goal:** Players can accept, complete, and turn in quests.

**Tasks:**
- [ ] Create quest manager (load from quests.json)
- [ ] Implement quest tracking (objectives, progress)
- [ ] Add quest state machine (available, active, completed, failed)
- [ ] Create quest rewards system (XP, gold, items, reputation)
- [ ] Implement quest triggers (talk to NPC, kill monsters, collect items)
- [ ] Add quest log UI/API

**Files to create:**
- `game/quests.js` - Quest engine

**Files to modify:**
- `server.js` - Add quest endpoints
- `game/combat.js` - Track quest kill objectives
- `game/inventory.js` - Track quest item objectives

**API Design:**
```javascript
GET /api/quests/available // Quests player can accept
POST /api/quests/accept { questId }
GET /api/quests/active // Player's current quests
POST /api/quests/complete { questId }
```

---

#### 2.2 Loot & Item System
**Goal:** Monsters drop items, players can use/sell them.

**Tasks:**
- [ ] Implement loot generation (from monster_loot.json)
- [ ] Create item pickup and auto-loot
- [ ] Add consumable item usage (potions, food, scrolls)
- [ ] Implement vendor/shop system (NPCs sell items)
- [ ] Add item rarity drops (common → mythic)
- [ ] Create item comparison (better/worse than equipped)

**Files to create:**
- `game/shop.js` - Vendor system

**Files to modify:**
- `game/loot.js` - Expand loot generation
- `game/inventory.js` - Add item usage
- `server.js` - Add shop/item endpoints

---

#### 2.3 NPC & Dialogue System
**Goal:** Players can interact with NPCs and get quests/lore.

**Tasks:**
- [ ] Load NPCs from npcs.json
- [ ] Implement dialogue tree system (from dialogues.json)
- [ ] Create NPC interaction triggers
- [ ] Add branching dialogue choices
- [ ] Implement dialogue rewards and quest unlocks
- [ ] Create merchant NPC functionality

**Files to create:**
- `game/npcs.js` - NPC manager
- `game/dialogue.js` - Dialogue engine

**Files to modify:**
- `server.js` - Add NPC/dialogue endpoints

---

#### 2.4 Achievement System
**Goal:** Track player accomplishments and grant rewards.

**Tasks:**
- [ ] Load achievements from achievements.json
- [ ] Implement achievement tracking (progress monitoring)
- [ ] Add achievement unlock notifications
- [ ] Create achievement rewards (titles, items, passives)
- [ ] Add achievement API and UI

**Files to create:**
- `game/achievements.js` - Achievement tracker

**Files to modify:**
- All game systems - Add achievement triggers
- `server.js` - Add achievement endpoints

---

### **Phase 3: Advanced Systems (Depth & Retention)**
*Priority: MEDIUM | Time: 3-4 weeks*

Add complexity and long-term progression.

#### 3.1 Dungeon System
**Goal:** Multi-floor instanced dungeons with bosses.

**Tasks:**
- [ ] Load dungeons from dungeons.json
- [ ] Implement floor progression system
- [ ] Create dungeon state (current floor, cleared rooms)
- [ ] Add dungeon-specific loot tables
- [ ] Implement boss encounters with mechanics
- [ ] Add dungeon modifiers (ironman, speed run, cursed)
- [ ] Create dungeon leaderboards

**Files to create:**
- `game/dungeons.js` - Dungeon manager

---

#### 3.2 Faction & Reputation System
**Goal:** Player standing with different factions affects gameplay.

**Tasks:**
- [ ] Load factions from factions.json
- [ ] Implement reputation tracking (Hostile → Exalted)
- [ ] Add reputation gain/loss from actions
- [ ] Create faction-specific rewards and vendors
- [ ] Implement faction quests
- [ ] Add faction abilities/bonuses

**Files to create:**
- `game/factions.js` - Faction manager

---

#### 3.3 Enchanting & Crafting System
**Goal:** Improve gear with enchantments.

**Tasks:**
- [ ] Load enchantments from enchantments.json
- [ ] Implement enchanting mechanics (success rates, materials)
- [ ] Add enchantment application to items
- [ ] Create material gathering system
- [ ] Implement crafting recipes
- [ ] Add enchanting UI/API

**Files to create:**
- `game/enchanting.js` - Enchanting system
- `game/crafting.js` - Crafting system

---

#### 3.4 Passive Progression System ⭐
**Goal:** Account-wide permanent progression (survives character death).

**Tasks:**
- [ ] Load passives from passives.json
- [ ] Implement passive unlock system (cost, requirements)
- [ ] Add passive effects to gameplay
- [ ] Create passive skill tree UI
- [ ] Implement passive currency (souls, legacy points)
- [ ] Add death experience (gain progression from dying)

**Files to create:**
- `game/passives.js` - Passive manager

---

#### 3.5 Status Effects & Combat Depth
**Goal:** Buffs, debuffs, and tactical combat.

**Tasks:**
- [ ] Load status effects from status_effects.json
- [ ] Implement effect application and stacking
- [ ] Add effect duration tracking and tick damage
- [ ] Create effect combos (wet+shock=paralyzed)
- [ ] Add cleanse/dispel mechanics
- [ ] Implement aura effects

**Files to modify:**
- `game/combat.js` - Integrate status effects

---

### **Phase 4: Multiplayer & Social Features**
*Priority: MEDIUM | Time: 2-3 weeks*

Twitch integration and community features.

#### 4.1 Raid System
**Goal:** Group content for multiple Twitch viewers.

**Tasks:**
- [ ] Load raids from raids.json
- [ ] Implement raid lobby system (players join)
- [ ] Create role system (tank, healer, DPS)
- [ ] Add coordinated combat (multiple players vs boss)
- [ ] Implement raid-specific mechanics
- [ ] Add raid rewards and leaderboards
- [ ] Create Twitch channel points integration

**Files to create:**
- `game/raids.js` - Raid manager

---

#### 4.2 Twitch Integration Enhancement
**Goal:** Deep Twitch chat and channel points integration.

**Tasks:**
- [ ] Implement full bot command set (!stats, !inventory, !fight, !explore)
- [ ] Add channel points rewards (buffs, items, pet help)
- [ ] Create viewer voting on player decisions
- [ ] Implement bits effects (power-ups, special loot)
- [ ] Add chat game events (everyone can participate)
- [ ] Create stream overlay with player stats

**Files to modify:**
- `bot.js` - Expand command system
- Create `twitch/channelPoints.js` - Channel points handler
- Create `twitch/bits.js` - Bits integration

---

#### 4.3 Leaderboards & Seasons
**Goal:** Competitive elements and seasonal resets.

**Tasks:**
- [ ] Load seasons from seasons.json
- [ ] Implement season progression (levels, rewards)
- [ ] Create leaderboards (level, wealth, dungeon speed)
- [ ] Add seasonal currency and shop
- [ ] Implement season reset mechanics
- [ ] Create seasonal events and challenges

**Files to create:**
- `game/seasons.js` - Season manager
- `game/leaderboards.js` - Leaderboard tracking

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
- [ ] Implement character creation flow (from CHARACTER_CREATION_GUIDE.md)
- [ ] Create gameplay tips system
- [ ] Add command cheat sheet in-game
- [ ] Create video/GIF demonstrations

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
