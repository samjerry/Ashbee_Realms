/**
 * DungeonManager.js
 * Manages instanced dungeons with multi-floor progression, bosses, and modifiers
 * Features: Floor progression, room types, boss mechanics, leaderboards, modifiers
 */

const { loadData } = require('../data/data_loader');
const Combat = require('./Combat');
const LootGenerator = require('./LootGenerator');
const fs = require('fs');
const path = require('path');

class DungeonManager {
  constructor() {
    this.dungeons = null;
    this.monsters = null;
    this.metadata = null;
  }

  /**
   * Load dungeon data from individual dungeon files
   * Supports both new structure (data/dungeons/) and legacy (data/dungeons.json)
   */
  async loadDungeons() {
    if (!this.dungeons) {
      this.dungeons = {};
      
      // Try to load from new structure first
      const dungeonsPath = path.join(__dirname, '..', 'data', 'dungeons');
      
      if (fs.existsSync(dungeonsPath) && fs.statSync(dungeonsPath).isDirectory()) {
        // Load from new folder structure
        console.log('Loading dungeons from new folder structure...');
        this.dungeons = await this.loadDungeonsFromFolders();
        
        // Load metadata
        const metadataPath = path.join(dungeonsPath, '_metadata.json');
        if (fs.existsSync(metadataPath)) {
          this.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        }
      } else {
        // Fallback to legacy dungeons.json
        console.log('Loading dungeons from legacy dungeons.json...');
        const data = await loadData('dungeons');
        this.dungeons = data.dungeons;
        this.metadata = {
          dungeon_difficulties: data.dungeon_difficulties,
          dungeon_modifiers: data.dungeon_modifiers
        };
      }
      
      // Load monsters and convert array to object by ID
      const monsterData = await loadData('monsters');
      this.monsters = {};
      
      if (Array.isArray(monsterData.monsters)) {
        for (const monster of monsterData.monsters) {
          this.monsters[monster.id] = monster;
        }
      } else {
        this.monsters = monsterData.monsters;
      }
    }
    return this.dungeons;
  }

  /**
   * Load dungeons from organized folder structure
   */
  async loadDungeonsFromFolders() {
    const dungeons = {};
    const dungeonsPath = path.join(__dirname, '..', 'data', 'dungeons');
    const difficultyFolders = ['easy', 'medium', 'hard', 'very_hard', 'extreme', 'special'];
    
    for (const folder of difficultyFolders) {
      const folderPath = path.join(dungeonsPath, folder);
      
      if (!fs.existsSync(folderPath)) continue;
      
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const dungeonId = file.replace('.json', '');
        const filePath = path.join(folderPath, file);
        const dungeonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        dungeons[dungeonId] = dungeonData;
      }
    }
    
    return dungeons;
  }

  /**
   * Get all available dungeons
   * @param {Character} character - Character to check access for
   * @returns {Array} Available dungeons
   */
  async getAvailableDungeons(character) {
    await this.loadDungeons();
    
    const available = [];
    for (const [dungeonId, dungeon] of Object.entries(this.dungeons)) {
      const canEnter = this.canEnterDungeon(character, dungeon);
      const isCompleted = character.completedDungeons?.includes(dungeonId) || false;
      
      available.push({
        id: dungeonId,
        name: dungeon.name,
        description: dungeon.description,
        difficulty: dungeon.difficulty,
        required_level: dungeon.required_level,
        max_level: dungeon.max_level,
        floors: dungeon.floors,
        location: dungeon.location,
        can_enter: canEnter,
        is_completed: isCompleted,
        time_limit: dungeon.time_limit,
        respawn_time: dungeon.respawn_time
      });
    }
    
    return available;
  }

  /**
   * Check if character can enter dungeon
   */
  canEnterDungeon(character, dungeon) {
    // Level requirements
    if (character.level < dungeon.required_level) {
      return false;
    }
    
    if (dungeon.max_level && character.level > dungeon.max_level) {
      return false;
    }
    
    // Location requirement
    if (dungeon.location && character.location !== dungeon.location) {
      return false;
    }
    
    // Check if in combat
    if (character.inCombat) {
      return false;
    }
    
    return true;
  }

  /**
   * Start a dungeon run
   * @param {Character} character - Character entering dungeon
   * @param {string} dungeonId - Dungeon to enter
   * @param {Array} modifiers - Optional modifiers to apply
   * @returns {Object} Dungeon state
   */
  async startDungeon(character, dungeonId, modifiers = []) {
    await this.loadDungeons();
    
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) {
      throw new Error(`Dungeon ${dungeonId} not found`);
    }
    
    if (!this.canEnterDungeon(character, dungeon)) {
      throw new Error('Cannot enter this dungeon');
    }
    
    // Generate dungeon instance
    const dungeonState = {
      dungeon_id: dungeonId,
      current_floor: 1,
      current_room: 0,
      cleared_rooms: [],
      total_rooms: dungeon.rooms_per_floor[0],
      boss_defeated: false,
      modifiers: modifiers,
      start_time: Date.now(),
      time_limit: dungeon.time_limit,
      loot_collected: [],
      monsters_killed: 0,
      deaths: 0,
      floor_layouts: this.generateFloorLayouts(dungeon)
    };
    
    character.dungeonState = dungeonState;
    character.location = `${dungeon.name} - Floor 1`;
    
    return {
      success: true,
      message: `Entered ${dungeon.name}`,
      dungeon_state: dungeonState,
      dungeon_info: {
        name: dungeon.name,
        description: dungeon.description,
        floors: dungeon.floors,
        current_floor: 1,
        rooms_on_floor: dungeon.rooms_per_floor[0]
      }
    };
  }

  /**
   * Generate room layouts for all floors
   */
  generateFloorLayouts(dungeon) {
    const layouts = [];
    
    for (let floor = 1; floor <= dungeon.floors; floor++) {
      const roomCount = dungeon.rooms_per_floor[floor - 1];
      const floorRooms = [];
      
      for (let i = 0; i < roomCount; i++) {
        // Last room on boss floor is always boss
        if (floor === dungeon.boss_floor && i === roomCount - 1) {
          floorRooms.push({
            type: 'boss',
            index: i,
            description: 'The final chamber awaits...'
          });
        } else {
          // Random room type from dungeon rooms
          const roomTemplate = dungeon.rooms[Math.floor(Math.random() * dungeon.rooms.length)];
          floorRooms.push({
            ...roomTemplate,
            index: i
          });
        }
      }
      
      layouts.push(floorRooms);
    }
    
    return layouts;
  }

  /**
   * Advance to next room in dungeon
   * @param {Character} character - Character advancing
   * @returns {Object} Room encounter result
   */
  async advanceRoom(character) {
    if (!character.dungeonState) {
      throw new Error('Not in a dungeon');
    }
    
    await this.loadDungeons();
    
    const state = character.dungeonState;
    const dungeon = this.dungeons[state.dungeon_id];
    
    // Check time limit
    if (state.time_limit) {
      const elapsed = (Date.now() - state.start_time) / 1000;
      if (elapsed > state.time_limit) {
        return this.failDungeon(character, 'Time limit exceeded');
      }
    }
    
    // Move to next room
    state.current_room++;
    
    const currentFloor = state.floor_layouts[state.current_floor - 1];
    const room = currentFloor[state.current_room - 1];
    
    if (!room) {
      // Floor complete, advance to next floor
      return this.advanceFloor(character);
    }
    
    // Process room based on type
    return await this.processRoom(character, room, dungeon);
  }

  /**
   * Process a dungeon room
   */
  async processRoom(character, room, dungeon) {
    const state = character.dungeonState;
    
    switch (room.type) {
      case 'combat':
        return this.startRoomCombat(character, room, dungeon);
      
      case 'boss':
        return this.startBossFight(character, dungeon);
      
      case 'treasure':
        return this.openTreasure(character, room, dungeon);
      
      case 'trap':
        return this.triggerTrap(character, room);
      
      case 'puzzle':
        return this.presentPuzzle(character, room);
      
      case 'event':
        return this.triggerEvent(character, room);
      
      default:
        return {
          type: 'empty',
          message: 'The room is empty.',
          description: room.description || 'An empty chamber'
        };
    }
  }

  /**
   * Start combat encounter in room
   */
  async startRoomCombat(character, room, dungeon) {
    await this.loadDungeons(); // Ensure monsters are loaded
    
    const state = character.dungeonState;
    
    // Generate monsters for room
    const monsters = [];
    for (const monsterSpec of room.monsters) {
      const count = Array.isArray(monsterSpec.count) 
        ? Math.floor(Math.random() * (monsterSpec.count[1] - monsterSpec.count[0] + 1)) + monsterSpec.count[0]
        : monsterSpec.count;
      
      for (let i = 0; i < count; i++) {
        const monster = this.createDungeonMonster(monsterSpec.id, character.level, state.modifiers);
        monsters.push(monster);
      }
    }
    
    return {
      type: 'combat',
      description: room.description,
      monsters: monsters,
      message: `Combat encounter! ${monsters.length} enemies block your path.`
    };
  }

  /**
   * Create dungeon monster with modifiers applied
   */
  createDungeonMonster(monsterId, playerLevel, modifiers) {
    if (!this.monsters) {
      throw new Error('Monsters not loaded. Call loadDungeons() first.');
    }
    
    let template = this.monsters[monsterId];
    if (!template) {
      // Create placeholder monster if not found in monsters.json
      console.warn(`Monster ${monsterId} not found, creating placeholder`);
      template = {
        id: monsterId,
        name: monsterId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        level: playerLevel,
        hp: 50 + (playerLevel * 8),
        max_hp: 50 + (playerLevel * 8),
        attack: 8 + (playerLevel * 1.5),
        defense: 5 + playerLevel,
        magic: 3 + playerLevel,
        agility: 5 + playerLevel,
        xp_reward: playerLevel * 25,
        gold_reward: [playerLevel * 5, playerLevel * 10]
      };
    }
    
    let monster = { ...template };
    
    // Convert stats array to individual properties if needed
    if (Array.isArray(monster.stats)) {
      monster.hp = monster.stats[0];
      monster.max_hp = monster.stats[0];
      monster.attack = monster.stats[1];
      monster.defense = monster.stats[2];
      monster.agility = monster.stats[3];
    }
    
    // Ensure numeric properties exist
    monster.hp = monster.hp || 50;
    monster.max_hp = monster.max_hp || monster.hp;
    monster.attack = monster.attack || 10;
    monster.defense = monster.defense || 5;
    
    // Apply modifiers
    for (const modId of modifiers) {
      const mod = this.getModifierEffects(modId);
      if (mod) {
        monster.hp = Math.floor(monster.hp * (mod.monster_stat_multiplier || 1));
        monster.max_hp = monster.hp;
        monster.attack = Math.floor(monster.attack * (mod.monster_stat_multiplier || 1));
        monster.defense = Math.floor(monster.defense * (mod.monster_stat_multiplier || 1));
      }
    }
    
    return monster;
  }

  /**
   * Start boss fight
   */
  startBossFight(character, dungeon) {
    // Select boss from boss pool using weighted random
    const bossPool = dungeon.boss_pool;
    const totalWeight = bossPool.reduce((sum, boss) => sum + (boss.spawn_weight || 100), 0);
    let random = Math.random() * totalWeight;
    
    let selectedBoss = bossPool[0];
    for (const boss of bossPool) {
      random -= boss.spawn_weight || 100;
      if (random <= 0) {
        selectedBoss = boss;
        break;
      }
    }
    
    // Create boss monster
    const bossMonster = this.createBossMonster(selectedBoss, character.level, character.dungeonState.modifiers);
    
    return {
      type: 'boss',
      description: `You've reached the final chamber. ${selectedBoss.description}`,
      boss: bossMonster,
      boss_info: {
        name: selectedBoss.name,
        phases: selectedBoss.phases || [],
        mechanics: selectedBoss.mechanics || {}
      },
      message: `Boss encounter: ${selectedBoss.name}!`
    };
  }

  /**
   * Create boss monster with multipliers
   */
  createBossMonster(bossTemplate, playerLevel, modifiers) {
    // Try to get base monster, fallback to creating from template if not found
    let baseMonster = this.monsters[bossTemplate.id];
    
    if (!baseMonster) {
      // Create placeholder boss monster from template info
      baseMonster = {
        id: bossTemplate.id,
        name: bossTemplate.name,
        level: playerLevel,
        hp: 100 + (playerLevel * 10),
        max_hp: 100 + (playerLevel * 10),
        attack: 10 + (playerLevel * 2),
        defense: 5 + playerLevel,
        magic: 5 + playerLevel,
        agility: 5 + playerLevel,
        xp_reward: playerLevel * 50,
        gold_reward: [playerLevel * 10, playerLevel * 20]
      };
    }
    
    // Scale to player level
    let boss = { ...baseMonster };
    
    // Convert stats array to individual properties if needed (for monsters.json format)
    if (Array.isArray(boss.stats)) {
      boss.hp = boss.stats[0];
      boss.max_hp = boss.stats[0];
      boss.attack = boss.stats[1];
      boss.defense = boss.stats[2];
      boss.agility = boss.stats[3];
    }
    
    // Ensure numeric properties exist
    boss.hp = boss.hp || 100;
    boss.max_hp = boss.max_hp || boss.hp;
    boss.attack = boss.attack || 10;
    
    // Apply boss multipliers
    boss.hp = Math.floor(boss.hp * (bossTemplate.health_multiplier || 3));
    boss.max_hp = boss.hp;
    boss.attack = Math.floor(boss.attack * (bossTemplate.damage_multiplier || 1.5));
    boss.is_boss = true;
    boss.phases = bossTemplate.phases || [];
    boss.mechanics = bossTemplate.mechanics || {};
    boss.special_abilities = bossTemplate.special_abilities || [];
    boss.name = bossTemplate.name; // Use boss name from template
    
    // Apply dungeon modifiers
    for (const modId of modifiers) {
      const mod = this.getModifierEffects(modId);
      if (mod) {
        boss.hp = Math.floor(boss.hp * (mod.monster_stat_multiplier || 1));
        boss.max_hp = boss.hp;
        boss.attack = Math.floor(boss.attack * (mod.monster_stat_multiplier || 1));
      }
    }
    
    return boss;
  }

  /**
   * Open treasure room
   */
  openTreasure(character, room, dungeon) {
    const lootGen = new LootGenerator();
    const state = character.dungeonState;
    
    // Generate gold
    const gold = Array.isArray(room.guaranteed_gold)
      ? Math.floor(Math.random() * (room.guaranteed_gold[1] - room.guaranteed_gold[0] + 1)) + room.guaranteed_gold[0]
      : 0;
    
    character.gold += gold;
    
    // Generate items
    const loot = [];
    const lootCount = 1 + Math.floor(Math.random() * 2); // 1-2 items
    
    for (let i = 0; i < lootCount; i++) {
      const item = lootGen.generateLoot(character.level, 'epic');
      if (item) {
        loot.push(item);
        state.loot_collected.push(item.id);
      }
    }
    
    // Mark room as cleared
    state.cleared_rooms.push(`${state.current_floor}-${state.current_room}`);
    
    return {
      type: 'treasure',
      description: room.description,
      gold: gold,
      loot: loot,
      message: `Found treasure! +${gold} gold and ${loot.length} items.`
    };
  }

  /**
   * Trigger trap room
   */
  triggerTrap(character, room) {
    const state = character.dungeonState;
    
    // Trap detection check (based on agility)
    const detectionChance = Math.min(0.8, character.stats.agility / 100);
    const detected = Math.random() < detectionChance;
    
    if (detected) {
      state.cleared_rooms.push(`${state.current_floor}-${state.current_room}`);
      return {
        type: 'trap',
        description: room.description,
        detected: true,
        message: 'You detected and disarmed the trap!'
      };
    }
    
    // Trap triggers
    const damage = Array.isArray(room.damage)
      ? Math.floor(Math.random() * (room.damage[1] - room.damage[0] + 1)) + room.damage[0]
      : 20;
    
    character.hp = Math.max(0, character.hp - damage);
    state.cleared_rooms.push(`${state.current_floor}-${state.current_room}`);
    
    return {
      type: 'trap',
      description: room.description,
      detected: false,
      damage: damage,
      hp_remaining: character.hp,
      message: `Trap triggered! You took ${damage} damage.`
    };
  }

  /**
   * Present puzzle to solve
   */
  presentPuzzle(character, room) {
    return {
      type: 'puzzle',
      description: room.description,
      puzzle_type: room.puzzle_type,
      difficulty: room.difficulty,
      reward: room.reward,
      message: 'A puzzle blocks your way. Use !solve [answer] to attempt it.',
      pending_puzzle: {
        room_index: character.dungeonState.current_room,
        puzzle_type: room.puzzle_type
      }
    };
  }

  /**
   * Solve puzzle
   */
  solvePuzzle(character, answer) {
    const state = character.dungeonState;
    
    // Simple success check (in real game, validate actual answer)
    const successChance = character.level >= 10 ? 0.7 : 0.5;
    const success = Math.random() < successChance;
    
    if (success) {
      state.cleared_rooms.push(`${state.current_floor}-${state.current_room}`);
      return {
        success: true,
        message: 'Puzzle solved! The way forward is clear.',
        reward: 'Shortcut unlocked - skip 1 room'
      };
    }
    
    return {
      success: false,
      message: 'Puzzle failed. Prepare for combat!',
      consequence: 'spawn_enemies'
    };
  }

  /**
   * Trigger event room
   */
  triggerEvent(character, room) {
    const state = character.dungeonState;
    state.cleared_rooms.push(`${state.current_floor}-${state.current_room}`);
    
    return {
      type: 'event',
      description: room.description,
      event_id: room.event_id,
      message: 'A mysterious event occurs...'
    };
  }

  /**
   * Complete room (after combat/puzzle/etc)
   */
  completeRoom(character) {
    const state = character.dungeonState;
    const roomId = `${state.current_floor}-${state.current_room}`;
    
    if (!state.cleared_rooms.includes(roomId)) {
      state.cleared_rooms.push(roomId);
    }
    
    return {
      success: true,
      rooms_cleared: state.cleared_rooms.length,
      current_progress: `Floor ${state.current_floor}, Room ${state.current_room}/${state.total_rooms}`
    };
  }

  /**
   * Advance to next floor
   */
  advanceFloor(character) {
    const state = character.dungeonState;
    const dungeon = this.dungeons[state.dungeon_id];
    
    state.current_floor++;
    state.current_room = 0;
    state.total_rooms = dungeon.rooms_per_floor[state.current_floor - 1];
    character.location = `${dungeon.name} - Floor ${state.current_floor}`;
    
    // Full heal between floors
    character.hp = character.maxHp;
    
    return {
      type: 'floor_complete',
      message: `Floor ${state.current_floor - 1} complete! Advancing to Floor ${state.current_floor}.`,
      new_floor: state.current_floor,
      rooms_on_floor: state.total_rooms,
      hp_restored: true
    };
  }

  /**
   * Complete dungeon (after boss defeated)
   */
  async completeDungeon(character) {
    const state = character.dungeonState;
    const dungeon = this.dungeons[state.dungeon_id];
    
    // Calculate completion time
    const completionTime = Math.floor((Date.now() - state.start_time) / 1000);
    
    // Apply modifier bonuses
    let rewardMultiplier = 1.0;
    for (const modId of state.modifiers) {
      const mod = this.getModifierEffects(modId);
      if (mod) {
        rewardMultiplier *= mod.reward_multiplier || 1.0;
      }
    }
    
    // Calculate rewards
    const baseXP = dungeon.rewards.xp;
    const xpReward = Math.floor(baseXP * rewardMultiplier);
    
    const goldMin = dungeon.rewards.gold[0];
    const goldMax = dungeon.rewards.gold[1];
    const goldReward = Math.floor((Math.random() * (goldMax - goldMin + 1) + goldMin) * rewardMultiplier);
    
    character.xp += xpReward;
    character.gold += goldReward;
    
    // Generate guaranteed loot
    const lootGen = new LootGenerator();
    const loot = [];
    
    if (dungeon.rewards.guaranteed_loot) {
      const lootItem = lootGen.generateLoot(character.level, 'epic');
      if (lootItem) {
        loot.push(lootItem);
      }
    }
    
    // First clear bonus
    const isFirstClear = !character.completedDungeons?.includes(state.dungeon_id);
    let firstClearRewards = null;
    
    if (isFirstClear && dungeon.rewards.first_clear_bonus) {
      const bonus = dungeon.rewards.first_clear_bonus;
      character.xp += bonus.xp;
      
      firstClearRewards = {
        xp: bonus.xp,
        title: bonus.title,
        items: bonus.items || []
      };
      
      // Add to completed dungeons
      if (!character.completedDungeons) {
        character.completedDungeons = [];
      }
      character.completedDungeons.push(state.dungeon_id);
    }
    
    // Record leaderboard entry
    const leaderboardEntry = {
      player_name: character.name,
      dungeon_id: state.dungeon_id,
      completion_time: completionTime,
      modifiers: state.modifiers,
      monsters_killed: state.monsters_killed,
      deaths: state.deaths,
      timestamp: Date.now()
    };
    
    // Clear dungeon state
    character.dungeonState = null;
    character.location = dungeon.location;
    
    return {
      success: true,
      message: `Dungeon complete! ${dungeon.name} conquered!`,
      completion_time: completionTime,
      rewards: {
        xp: xpReward,
        gold: goldReward,
        loot: loot
      },
      first_clear_bonus: firstClearRewards,
      leaderboard_entry: leaderboardEntry,
      statistics: {
        monsters_killed: state.monsters_killed,
        deaths: state.deaths,
        rooms_cleared: state.cleared_rooms.length
      }
    };
  }

  /**
   * Fail dungeon (death or timeout)
   */
  failDungeon(character, reason) {
    const state = character.dungeonState;
    const dungeon = this.dungeons[state.dungeon_id];
    
    // Clear state
    character.dungeonState = null;
    character.location = dungeon.location;
    character.hp = Math.floor(character.maxHp * 0.5);
    
    return {
      success: false,
      message: `Dungeon failed: ${reason}`,
      reason: reason,
      statistics: {
        monsters_killed: state.monsters_killed,
        rooms_cleared: state.cleared_rooms.length
      }
    };
  }

  /**
   * Exit dungeon (abandon)
   */
  exitDungeon(character) {
    if (!character.dungeonState) {
      throw new Error('Not in a dungeon');
    }
    
    return this.failDungeon(character, 'Abandoned');
  }

  /**
   * Get dungeon modifiers
   */
  getModifierEffects(modifierId) {
    // Use metadata if available, otherwise fallback to hardcoded
    if (this.metadata && this.metadata.dungeon_modifiers && this.metadata.dungeon_modifiers[modifierId]) {
      return this.metadata.dungeon_modifiers[modifierId];
    }
    
    // Fallback to hardcoded modifiers for backward compatibility
    const modifiers = {
      'hard_mode': {
        monster_count_multiplier: 2.0,
        monster_stat_multiplier: 1.5,
        reward_multiplier: 2.0
      },
      'ironman': {
        no_healing_items: true,
        no_revive: true,
        reward_multiplier: 3.0
      },
      'speed_run': {
        time_pressure: true,
        reward_multiplier: 2.5
      },
      'cursed': {
        monster_stat_multiplier: 1.8,
        healing_penalty: 0.5,
        reward_multiplier: 2.5
      }
    };
    
    return modifiers[modifierId] || null;
  }

  /**
   * Get leaderboard for dungeon
   */
  async getLeaderboard(dungeonId, limit = 10) {
    // This would query database for top runs
    // For now, return empty array (implement with db.js)
    return [];
  }

  /**
   * Get dungeon by ID
   */
  async getDungeon(dungeonId) {
    await this.loadDungeons();
    return this.dungeons[dungeonId];
  }

  /**
   * Get dungeons by difficulty
   */
  async getDungeonsByDifficulty(difficulty) {
    await this.loadDungeons();
    
    return Object.values(this.dungeons).filter(d => d.difficulty === difficulty);
  }
}

module.exports = DungeonManager;
