# Ashbee Realms - Balance Analysis & Recommendations
**Analysis Date:** December 9, 2025  
**Phase:** 6.1 Gameplay Balance  
**Test Coverage:** Monster difficulty, XP curves, loot rates, class viability, economy, combat simulation

---

## Executive Summary

After comprehensive testing of 126 monsters, 5 character classes, and thousands of combat simulations, **significant balance issues** have been identified that require immediate attention. The game is currently **38.5% balanced** (15 passed tests, 24 warnings).

### Critical Issues:
1. **Late/End Game Monsters Too Strong** - 2-3x player power (52-69% overtuned)
2. **XP Curve Too Flat** - Leveling 2-5x too fast at higher levels
3. **Mage Class Unplayable** - 0% win rate in combat simulations
4. **Economy Broken** - Endgame gear costs 116 hours to acquire
5. **Monster Rarity Distribution Wrong** - Too many legendaries, not enough commons

---

## 1. Monster Difficulty Scaling

### Test Results:
| Level Bracket | Status | Difficulty Ratio | Recommendation |
|---------------|--------|------------------|----------------|
| **1-10 (Early Game)** | ✅ Balanced | 0.89x (Slightly Easy) | No change needed |
| **11-25 (Mid Game)** | ✅ Balanced | 1.17x (Slightly Hard) | No change needed |
| **26-40 (Late Game)** | ⚠️ Too Hard | 1.89x | **Nerf HP/Damage by 52%** |
| **41-50 (End Game)** | ⚠️ Too Hard | 2.91x | **Nerf HP/Damage by 69%** |

### Problem Analysis:
- **Early/Mid game (1-25)**: Well-balanced, players have 60-80% win rates
- **Late game (26-40)**: Monsters have nearly 2x expected power
  - Average monster power: 1,748
  - Expected player power: 925
  - Players will die frequently without perfect gear
- **End game (41-50)**: Monsters have nearly 3x expected power
  - Average monster power: 3,564
  - Expected player power: 1,225
  - **Critical issue**: Nearly impossible to progress

### Recommended Fixes:

#### Option 1: Nerf Monster Stats (RECOMMENDED)
```javascript
// In monster generation/balancing script:
if (monster.level_range[1] >= 26 && monster.level_range[1] <= 40) {
  // Reduce late game monster stats by 40%
  monster.stats[0] *= 0.6; // HP
  monster.stats[1] *= 0.6; // Attack
  monster.stats[2] *= 0.7; // Defense (smaller reduction)
}

if (monster.level_range[1] >= 41) {
  // Reduce end game monster stats by 50%
  monster.stats[0] *= 0.5; // HP
  monster.stats[1] *= 0.5; // Attack
  monster.stats[2] *= 0.6; // Defense
}
```

#### Option 2: Buff Player Stat Growth
```javascript
// In each class stat_bonuses:
{
  "hp_per_level": 12,        // Was: 6-10, increase by 20%
  "strength_per_level": 2.4, // Was: 0.8-2.2, increase by 20%
  "defense_per_level": 1.2   // Was: 0.3-1.2, increase by 20%
}
```

**Recommendation:** Use **Option 1** (nerf monsters). Easier to implement, affects existing player saves less.

---

## 2. XP Curve & Leveling Speed

### Test Results:
| Level | XP Needed | Kills Needed | Status | Issue |
|-------|-----------|--------------|--------|-------|
| 1-20 | 100-1050 | 5-7 | ✅ Balanced | Good progression |
| 25 | 1,300 | 4 | ⚠️ Too Fast | 25% too fast |
| 30-40 | 1,550-2,050 | 3 | ⚠️ Too Fast | 67% too fast |
| 45-50 | 2,300-2,550 | 2 | ⚠️ Too Fast | 150% too fast |

### Problem Analysis:
- **Current formula:** `XP = 100 + (level - 1) * 50`
- **Linear progression** doesn't scale with difficulty
- **High-level monsters** give disproportionate XP vs effort required
- Players reach level 50 in **~14,350 total XP** (too fast)

### Recommended XP Formula:

#### Exponential Curve (RECOMMENDED)
```javascript
function getXPForLevel(level) {
  // Exponential curve: 100 * (1.15 ^ level)
  return Math.floor(100 * Math.pow(1.15, level));
}

// Results:
// Level 10: 405 XP (was 550)
// Level 25: 3,292 XP (was 1,300) ⬆️ 153%
// Level 40: 26,786 XP (was 2,050) ⬆️ 1,207%
// Level 50: 108,366 XP (was 2,550) ⬆️ 4,150%
```

#### Polynomial Curve (Alternative)
```javascript
function getXPForLevel(level) {
  // Polynomial: 100 + (level * 50) + (level^2 * 10)
  return 100 + (level * 50) + (level * level * 10);
}

// Results:
// Level 10: 1,600 XP (was 550) ⬆️ 191%
// Level 25: 7,600 XP (was 1,300) ⬆️ 485%
// Level 40: 18,100 XP (was 2,050) ⬆️ 783%
// Level 50: 27,600 XP (was 2,550) ⬆️ 982%
```

**Recommendation:** Use **Exponential Curve** for better end-game pacing.

---

## 3. Character Class Viability

### Test Results:
| Class | HP@50 | Damage@50 | Defense@50 | Balance Score | Status |
|-------|-------|-----------|------------|---------------|--------|
| **Warrior** | 600 | 102.5 | 62.8 | 0.27 | ⚠️ Too Tanky |
| **Mage** | 374 | NaN | 21.6 | NaN | ❌ BROKEN |
| **Rogue** | 433 | 95.2 | 16.7 | 0.75 | ✅ Balanced |
| **Cleric** | 492 | NaN | 67.7 | NaN | ❌ BROKEN |
| **Ranger** | 438 | 93.3 | 32.4 | 0.45 | ⚠️ Weak Damage |

### Combat Simulation Results:
| Class | Level 10 Win Rate | Status |
|-------|-------------------|--------|
| **Warrior** | 100% | Too easy |
| **Mage** | **0%** | ❌ UNPLAYABLE |
| **Rogue** | 100% | Too easy |

### Critical Issues:

#### 1. Mage Class Completely Broken
**Problem:** Magic stat not properly integrated into damage calculation
- `stats.magic` exists but isn't used in `damageOutput` calculation
- Mage has 0% win rate (dies every fight)
- Shows as "NaN" for damage output

**Fix Required:**
```javascript
// In balance_tests.js calculateClassStatsAtLevel():
const damageOutput = stats.strength + stats.magic + (stats.agility * 0.5);
// Current code only uses strength + agility, missing magic!

// In combat simulator calculateDamage():
const attack = Math.max(playerStats.strength, playerStats.magic);
// Use highest of strength OR magic for damage
```

#### 2. Warrior Too Tanky, Low Damage
**Problem:** 374 survivability vs 103 damage (3.6x difference)
- Balance score: 0.27 (should be 0.7+)
- Kills enemies but takes forever

**Fix:**
```javascript
// In classes.json - warrior:
"stat_bonuses": {
  "hp_per_level": 8,              // Was: 10 (reduce tankiness)
  "strength_per_level": 2.2,      // Was: 1.8 (increase damage)
  "defense_per_level": 1.0,       // Was: 1.2 (reduce tankiness)
  "agility_per_level": 0.5        // Was: 0.3 (increase mobility)
}
```

#### 3. Cleric Broken (Same Issue as Mage)
**Problem:** Magic-based class with no magic damage calculation

**Fix:** Same as Mage - integrate magic stat into combat

#### 4. Ranger Weak Damage
**Problem:** 206 survivability vs 93 damage (2.2x difference)

**Fix:**
```javascript
// In classes.json - ranger:
"stat_bonuses": {
  "agility_per_level": 2.5,       // Was: 2.0 (increase damage)
  "strength_per_level": 1.2       // Was: 0.8 (increase damage)
}
```

---

## 4. Loot Drop Rates & Monster Rarity

### Test Results:
| Rarity | Current % | Expected % | Status | Issue |
|--------|-----------|------------|--------|-------|
| Common | 11.9% | 50% | ⚠️ Too Rare | Need 4x more |
| Uncommon | 14.3% | 25% | ⚠️ Too Rare | Need 2x more |
| Rare | 15.9% | 15% | ✅ Balanced | Perfect |
| Epic | 19.0% | 7% | ⚠️ Too Common | Need 63% fewer |
| Legendary | 15.9% | 2.5% | ⚠️ Too Common | Need 84% fewer |
| Mythic | 10.3% | 0.5% | ⚠️ Too Common | Need 95% fewer |

### Problem Analysis:
- **Monster rarity distribution is inverted** - too many rare monsters!
- Players will encounter legendary/mythic monsters too frequently
- Rarity should represent scarcity, not commonality
- This affects:
  - XP gains (legendary monsters give more XP)
  - Loot quality (legendary monsters drop better loot)
  - Player expectations (legendaries should feel special)

### Recommended Distribution:
```javascript
// Target monster counts (for 126 total monsters):
{
  "common": 63,      // 50% - Currently only 15 (need 48 more)
  "uncommon": 32,    // 25% - Currently 18 (need 14 more)
  "rare": 19,        // 15% - Currently 20 (balanced)
  "epic": 9,         // 7% - Currently 24 (need to demote 15)
  "legendary": 3,    // 2.5% - Currently 20 (need to demote 17)
  "mythic": 1        // 0.5% - Currently 13 (need to demote 12)
}
```

**Implementation:**
1. Review `monsters.json` and reassign rarities based on:
   - Monster level (low level = common, high level = epic+)
   - Monster power (weak = common, bosses = legendary)
   - Lore importance (generic animals = common, named bosses = legendary)

2. Example reassignments:
   - `forest_wolf`, `goblin`, `slime` → **common** (currently rare/uncommon)
   - `ancient_dragon`, `lich_king`, `void_titan` → **legendary** (already correct)
   - Most mid-level monsters → **uncommon** or **rare**

---

## 5. Economy Balance (Gold & Item Costs)

### Test Results:
| Level | Gold/Hour | Hours to Gear | Status | Issue |
|-------|-----------|---------------|--------|-------|
| 1 | 266 | 0.1 | ⚠️ Too Cheap | Gear costs 6 min of farming |
| 10 | 3,000 | 0.0 | ⚠️ Too Cheap | Gear costs 1 min of farming |
| 20 | 3,825 | 0.2 | ⚠️ Too Cheap | Gear costs 12 min of farming |
| 30 | 9,000 | 0.3 | ⚠️ Too Cheap | Gear costs 18 min of farming |
| 40 | 12,000 | 0.5 | ⚠️ Too Cheap | Gear costs 30 min of farming |
| 50 | 15,000 | **116.5** | ❌ BROKEN | Gear costs **5 days of farming** |

### Problem Analysis:
- **Early/Mid game**: Gear is essentially free (1-30 minutes of farming)
- **End game**: Gear costs jump to **116 hours** (4.8 days of non-stop farming)
- **Massive jump** between level 40 and 50 gear costs
- **Target**: 1-4 hours of farming per full gear set

### Root Cause:
Level 50 gear has extreme value outliers:
- Level 50 weapons: ~1,287,000 gold (average)
- Level 50 armor: ~461,250 gold (average)
- This is **1000x more expensive** than level 40 gear!

### Recommended Fixes:

#### Option 1: Cap Gear Values (RECOMMENDED)
```javascript
// Maximum gear value formula: level * 1000
function capGearValue(item, level) {
  const maxValue = level * 1000;
  if (item.value > maxValue) {
    console.log(`Capping ${item.id} value from ${item.value} to ${maxValue}`);
    item.value = maxValue;
  }
}

// Results:
// Level 50 weapon: 50,000 gold (was 1,287,000)
// Level 50 armor: 50,000 gold (was 461,250)
// Hours to gear at L50: 6.7 hours (was 116.5) ✅
```

#### Option 2: Increase Gold Drops
```javascript
// Increase gold drops by 10x for high-level monsters
if (monster.level_range[1] >= 40) {
  lootTable.gold[0] *= 10;
  lootTable.gold[1] *= 10;
}

// Results:
// Gold per hour at L50: 150,000 (was 15,000)
// Hours to gear: 11.7 (was 116.5) ✅
```

**Recommendation:** Use **Option 1** (cap values). More predictable, easier to balance.

---

## 6. Gold Drop Balance

### Test Results:
| Level | Avg Gold Drop | Expected | Status |
|-------|---------------|----------|--------|
| 1 | 9 | 10 | ✅ Balanced |
| 10 | 100 | 100 | ✅ Balanced |
| 20 | 128 | 200 | ⚠️ 36% too low |
| 30 | 300 | 300 | ✅ Balanced |
| 40 | 400 | 400 | ✅ Balanced |
| 50 | 500 | 500 | ✅ Balanced |

### Analysis:
- **Mostly balanced** except level 20 bracket
- Level 20 gold drops should be increased by ~70 gold per kill
- This is a **minor issue** compared to other problems

**Fix:**
```javascript
// In monster_loot.json - adjust level 15-25 monster loot tables:
{
  "loot_tables": {
    "beast_common": {
      "gold": [15, 35]  // Was: [10, 25], increase by 50%
    },
    "humanoid_uncommon": {
      "gold": [40, 80]  // Was: [30, 60], increase by 33%
    }
  }
}
```

---

## Implementation Priority

### 🔴 CRITICAL (Fix Immediately):
1. **Fix Mage/Cleric Magic Damage** - Classes literally unplayable (0% win rate)
2. **Nerf Late/End Game Monsters** - 50-70% reduction in HP/damage
3. **Cap Endgame Gear Costs** - Reduce by 95-97%

### 🟠 HIGH (Fix This Week):
4. **Adjust XP Curve** - Implement exponential formula
5. **Rebalance Monster Rarities** - Redistribute 80+ monsters to correct rarities
6. **Buff Warrior/Ranger Damage** - Increase damage stat growth by 20-40%

### 🟡 MEDIUM (Fix Next Week):
7. **Increase Level 20 Gold Drops** - 33-50% boost
8. **Reduce Warrior/Ranger Tankiness** - Reduce HP/defense by 10-20%

---

## Testing Checklist

After implementing fixes, run these tests to verify balance:

### Automated Tests:
```bash
# 1. Run full balance test suite
node Testing/balance_tests.js

# Expected: 80%+ pass rate (was 38.5%)

# 2. Run combat simulations
node Testing/combat_simulator.js quick

# Expected: All classes 60-80% win rate (mage currently 0%)

# 3. Run full combat simulation (optional, takes 5-10 min)
node Testing/combat_simulator.js full

# Expected: No class below 50% or above 90% win rate
```

### Manual Tests:
1. **Create Mage character** - Can they kill a level 1 slime? (currently no)
2. **Level to 30** - Does it take 3-5 hours? (currently 30 minutes)
3. **Fight level 40 monster** - Do you survive? (currently no)
4. **Check level 50 gear costs** - Under 100k gold? (currently 1.7M)
5. **Count legendary monsters** - See only 2-3 in 100 encounters? (currently 16)

---

## Database Migration Scripts

### Script 1: Nerf Late/End Game Monsters
```javascript
// data/rebalance_monsters.js
const fs = require('fs');
const path = require('path');

const monstersPath = path.join(__dirname, 'monsters.json');
const data = JSON.parse(fs.readFileSync(monstersPath, 'utf8'));

let rebalanced = 0;

data.monsters.forEach(monster => {
  const maxLevel = monster.level_range[1];
  
  // Late game nerf (26-40)
  if (maxLevel >= 26 && maxLevel <= 40) {
    monster.stats[0] = Math.floor(monster.stats[0] * 0.6); // HP
    monster.stats[1] = Math.floor(monster.stats[1] * 0.6); // Attack
    monster.stats[2] = Math.floor(monster.stats[2] * 0.7); // Defense
    rebalanced++;
    console.log(`Nerfed ${monster.id} (L${maxLevel}): HP ${monster.stats[0]}, ATK ${monster.stats[1]}, DEF ${monster.stats[2]}`);
  }
  
  // End game nerf (41-50)
  if (maxLevel >= 41) {
    monster.stats[0] = Math.floor(monster.stats[0] * 0.5); // HP
    monster.stats[1] = Math.floor(monster.stats[1] * 0.5); // Attack
    monster.stats[2] = Math.floor(monster.stats[2] * 0.6); // Defense
    rebalanced++;
    console.log(`Nerfed ${monster.id} (L${maxLevel}): HP ${monster.stats[0]}, ATK ${monster.stats[1]}, DEF ${monster.stats[2]}`);
  }
});

fs.writeFileSync(monstersPath, JSON.stringify(data, null, 2));
console.log(`\n✅ Rebalanced ${rebalanced} monsters`);
```

### Script 2: Fix Gear Values
```javascript
// data/fix_gear_costs.js
const fs = require('fs');
const path = require('path');

function fixGearFile(filename, gearType) {
  const filePath = path.join(__dirname, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let fixed = 0;
  
  Object.values(data[gearType]).forEach(rarityArray => {
    rarityArray.forEach(item => {
      const level = item.required_level || 1;
      const maxValue = level * 1000;
      
      if (item.value > maxValue) {
        console.log(`Capping ${item.id} from ${item.value} to ${maxValue}`);
        item.value = maxValue;
        fixed++;
      }
    });
  });
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Fixed ${fixed} ${gearType}`);
}

fixGearFile('gear_weapons.json', 'weapons');
fixGearFile('gear_armor.json', 'armor');
```

### Script 3: Update XP Formula in Code
```javascript
// game/ProgressionManager.js (or wherever XP is calculated)

// OLD:
function getXPForLevel(level) {
  return 100 + (level - 1) * 50;
}

// NEW:
function getXPForLevel(level) {
  // Exponential curve for better end-game pacing
  return Math.floor(100 * Math.pow(1.15, level));
}

// ALTERNATIVE (Polynomial):
function getXPForLevel(level) {
  return 100 + (level * 50) + (level * level * 10);
}
```

---

## Summary

### Current State:
- ❌ **38.5% balanced** (15/39 tests passing)
- ❌ **2 classes unplayable** (Mage, Cleric)
- ❌ **Late/end game impossible** (monsters 2-3x too strong)
- ❌ **Leveling too fast** (2-5x faster than intended)
- ❌ **Economy broken** (116 hours for endgame gear)

### After Fixes:
- ✅ **80%+ balanced** (estimated)
- ✅ **All classes playable** (60-80% win rates)
- ✅ **Late/end game challenging but fair** (1.0-1.2x difficulty)
- ✅ **Leveling properly paced** (5-8 kills per level)
- ✅ **Economy functional** (2-4 hours per gear set)

### Development Time Estimate:
- **Critical fixes:** 2-4 hours
- **High priority:** 4-6 hours
- **Medium priority:** 2-3 hours
- **Testing & verification:** 2-3 hours
- **Total:** ~10-16 hours of work

---

**Next Steps:** Run migration scripts, test changes, iterate based on results.
