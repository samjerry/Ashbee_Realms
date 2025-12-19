import { create } from 'zustand';
import io from 'socket.io-client';

// Use window.location.origin to connect to current host (works on both localhost and Railway)
const socket = io(window.location.origin);

const useGameStore = create((set, get) => ({
  // Player state
  player: null,
  isLoading: true,
  error: null,
  
  // Game state (world)
  gameState: {
    weather: 'Clear',
    timeOfDay: 'Day',
    season: 'Spring',
    activeEvent: null,
    lastBroadcast: null,
    maintenanceMode: false
  },
  
  // UI state
  activeTab: 'character',
  showCombat: false,
  showDialogue: false,
  showSettings: false,
  isMobileMenuOpen: false,
  
  // Combat state
  combat: null,
  combatLog: [],
  combatMenuState: 'main', // 'main', 'fight', 'items'
  
  // Quest state
  activeQuests: [],
  availableQuests: [],
  
  // Inventory state
  inventory: [],
  equipment: {},
  
  // Map state
  currentLocation: null,
  availableLocations: [],
  
  // Achievements
  achievements: [],
  
  // Bestiary state
  bestiary: {
    unlocked: false,
    entries: [],
    stats: {
      totalMonsters: 0,
      encountered: 0,
      defeated: 0,
      unknown: 0,
      encounterPercentage: 0,
      defeatPercentage: 0,
      completionPercentage: 0
    }
  },
  
  // Dialogue state
  currentDialogue: null,
  dialogueHistory: [],
  
  // Socket connection
  socket,
  connected: false,
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab, isMobileMenuOpen: false }),
  
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  
  openSettings: () => set({ showSettings: true, isMobileMenuOpen: false }),
  
  closeSettings: () => set({ showSettings: false }),
  
  setPlayer: (player) => set({ player, isLoading: false }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  // Fetch player data
  fetchPlayer: async () => {
    try {
      set({ isLoading: true });
      
      // Fetch player stats (server already verified auth to serve this page)
      const response = await fetch('/api/player/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch player stats');
      }
      
      const data = await response.json();
      set({ player: data, isLoading: false });
      return true; // Indicate success
    } catch (error) {
      console.error('Failed to fetch player:', error);
      set({ error: error.message, isLoading: false });
      return false; // Indicate failure
    }
  },
  
  // Combat actions
  startCombat: (monster) => {
    set({ 
      showCombat: true, 
      combat: { monster, turn: 'player', playerHp: get().player.hp },
      combatMenuState: 'main'
    });
  },
  
  endCombat: () => {
    set({ showCombat: false, combat: null, combatLog: [], combatMenuState: 'main' });
  },
  
  addCombatLog: (message) => {
    set((state) => ({ 
      combatLog: [...state.combatLog, { message, timestamp: Date.now() }] 
    }));
  },
  
  performCombatAction: async (action) => {
    try {
      let endpoint;
      let body = {};
      
      // Determine which endpoint to call based on action type
      if (action === 'attack') {
        endpoint = '/api/combat/attack';
      } else if (action === 'run') {
        endpoint = '/api/combat/flee';
      } else if (typeof action === 'object' && action.type === 'item') {
        endpoint = '/api/combat/item';
        body = { itemId: action.itemId };
      } else if (typeof action === 'string') {
        // Assume it's an ability ID
        endpoint = '/api/combat/ability';
        body = { abilityId: action };
      } else {
        console.error('Unknown combat action:', action);
        return;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (result.log) {
        result.log.forEach(msg => get().addCombatLog(msg));
      }
      
      // Update combat state
      if (result.state) {
        set({ combat: result });
      }
      
      if (result.victory || result.defeat || result.fled) {
        setTimeout(() => {
          get().endCombat();
          // Reload player data to get updated stats
          get().fetchPlayer();
        }, 3000);
      }
      
      return result;
    } catch (error) {
      console.error('Combat action failed:', error);
    }
  },
  
  setCombatMenuState: (state) => set({ combatMenuState: state }),
  
  // Bestiary actions
  fetchBestiary: async () => {
    try {
      const response = await fetch('/api/bestiary');
      if (!response.ok) {
        throw new Error('Failed to fetch bestiary');
      }
      
      const data = await response.json();
      set({ bestiary: data });
    } catch (error) {
      console.error('Failed to fetch bestiary:', error);
    }
  },
  
  checkBestiaryUnlock: async () => {
    try {
      const response = await fetch('/api/bestiary/unlock-status');
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      set((state) => ({
        bestiary: {
          ...state.bestiary,
          unlocked: data.unlocked
        }
      }));
    } catch (error) {
      console.error('Failed to check bestiary unlock:', error);
    }
  },
  
  // Quest actions
  fetchQuests: async () => {
    try {
      const [activeRes, availableRes] = await Promise.all([
        fetch('/api/quests/active'),
        fetch('/api/quests/available')
      ]);
      
      const activeData = await activeRes.json();
      const availableData = await availableRes.json();
      
      // Handle both array and object responses
      const activeQuests = Array.isArray(activeData) ? activeData : (activeData.quests || []);
      const availableQuests = Array.isArray(availableData) ? availableData : (availableData.quests || []);
      
      set({ activeQuests, availableQuests });
    } catch (error) {
      console.error('Failed to fetch quests:', error);
      set({ activeQuests: [], availableQuests: [] });
    }
  },
  
  acceptQuest: async (questId) => {
    try {
      const player = get().player;
      const channel = player?.channel;
      
      await fetch('/api/quests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, channel })
      });
      get().fetchQuests();
    } catch (error) {
      console.error('Failed to accept quest:', error);
    }
  },
  
  abandonQuest: async (questId) => {
    try {
      const player = get().player;
      const channel = player?.channel;
      
      await fetch('/api/quests/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, channel })
      });
      get().fetchQuests();
    } catch (error) {
      console.error('Failed to abandon quest:', error);
    }
  },
  
  // Inventory actions
  fetchInventory: async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      set({ 
        inventory: data.items || data.inventory || [],
        equipment: data.equipment || {}
      });
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      set({ inventory: [], equipment: {} });
    }
  },
  
  equipItem: async (itemId, slot) => {
    try {
      await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, slot })
      });
      get().fetchInventory();
      get().fetchPlayer();
    } catch (error) {
      console.error('Failed to equip item:', error);
    }
  },
  
  // Map actions
  fetchLocations: async () => {
    try {
      const response = await fetch('/api/exploration/biomes');
      const data = await response.json();
      set({ 
        availableLocations: Array.isArray(data) ? data : (data.biomes || [])
      });
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      set({ availableLocations: [] });
    }
  },
  
  travelTo: async (locationId) => {
    try {
      await fetch('/api/exploration/travel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: locationId })
      });
      // Handle travel state updates via WebSocket
    } catch (error) {
      console.error('Failed to start travel:', error);
    }
  },
  
  // Achievement actions
  fetchAchievements: async () => {
    try {
      const response = await fetch('/api/achievements');
      const data = await response.json();
      set({ 
        achievements: Array.isArray(data) ? data : (data.achievements || [])
      });
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      set({ achievements: [] });
    }
  },
  
  // Dialogue actions
  startDialogue: async (npcId) => {
    try {
      const response = await fetch('/api/dialogue/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId })
      });
      const data = await response.json();
      set({ currentDialogue: data, showDialogue: true });
    } catch (error) {
      console.error('Failed to start dialogue:', error);
    }
  },
  
  makeDialogueChoice: async (choiceIndex) => {
    try {
      const response = await fetch('/api/dialogue/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          npcId: get().currentDialogue.npcId, 
          choiceIndex 
        })
      });
      const data = await response.json();
      
      if (data.completed) {
        set({ currentDialogue: null, showDialogue: false });
      } else {
        set({ currentDialogue: data });
      }
    } catch (error) {
      console.error('Failed to make dialogue choice:', error);
    }
  },
  
  // WebSocket handlers
  setupSocketListeners: () => {
    const player = get().player;
    
    // Use the character's username (character name) as the room identifier
    // This matches what the backend uses in socketHandler.emitPlayerUpdate()
    const playerIdentifier = player?.username;
    const channel = player?.channel || 'default';
    
    if (!playerIdentifier) {
      console.error('[WebSocket] Cannot join room: player username is undefined', { 
        player,
        hasChannel: !!player?.channel 
      });
      return;
    }
    
    if (!player?.channel) {
      console.warn('[WebSocket] ⚠️ Player channel not set, using default fallback.', {
        playerChannel: player?.channel,
        fallbackChannel: channel
      });
    }
    
    console.log(`[WebSocket] Joining room with:`, {
      playerIdentifier,
      channel,
      roomId: `${playerIdentifier}_${channel}`
    });
    
    // Join player-specific room
    socket.emit('join', { player: playerIdentifier, channel });
    
    socket.on('connect', () => {
      set({ connected: true });
      console.log('Connected to game server');
      
      // Rejoin room on reconnect
      const currentPlayer = get().player;
      if (currentPlayer?.username) {
        const channel = currentPlayer?.channel || 'default';
        console.log(`[WebSocket] Reconnecting to room: ${currentPlayer.username}_${channel}`);
        socket.emit('join', { player: currentPlayer.username, channel });
      }
    });
    
    socket.on('disconnect', () => {
      set({ connected: false });
      console.log('Disconnected from game server');
    });
    
    // Handle successful room join confirmation
    socket.on('joined', (data) => {
      console.log('[WebSocket] ✅ Successfully joined room:', data);
    });
    
    // Handle WebSocket errors
    socket.on('error', (error) => {
      console.error('[WebSocket] ❌ Error:', error);
    });
    
    // Player updates
    socket.on('player:update', (data) => {
      console.log('👤 Player update received:', data);
      set((state) => ({ player: { ...state.player, ...data } }));
    });
    
    socket.on('player:levelup', (data) => {
      console.log('🎉 Level up!', data);
      set((state) => ({ 
        player: { ...state.player, level: data.newLevel, xp: data.xp }
      }));
      // Show level up animation
    });
    
    // Combat updates
    socket.on('combat:update', (data) => {
      if (data.type === 'combat_started') {
        set({ showCombat: true, combat: data.state });
      } else if (data.type === 'combat_action') {
        if (data.result.log) {
          data.result.log.forEach(msg => get().addCombatLog(msg));
        }
        set((state) => ({ 
          combat: { ...state.combat, ...data.result.state }
        }));
      } else if (data.type === 'combat_victory' || data.type === 'combat_defeat') {
        if (data.result.log) {
          data.result.log.forEach(msg => get().addCombatLog(msg));
        }
        // Combat will end via API response
      }
    });
    
    // Quest updates
    socket.on('quest:update', () => {
      get().fetchQuests();
    });
    
    // Achievement notifications
    socket.on('achievement:unlocked', (achievement) => {
      console.log('🏆 Achievement unlocked:', achievement);
      // TODO: Show notification toast
      get().fetchAchievements();
    });
    
    // Inventory updates
    socket.on('inventory:update', () => {
      get().fetchInventory();
    });
    
    // General notifications
    socket.on('notification', (notification) => {
      console.log('📬 Notification:', notification);
      // TODO: Show toast notification
    });
    
    // Location updates
    socket.on('location:change', (location) => {
      set({ currentLocation: location });
    });
    
    // Dungeon progress
    socket.on('dungeon:progress', (progress) => {
      console.log('🏰 Dungeon progress:', progress);
      // TODO: Update dungeon state
    });
    
    // Shop updates
    socket.on('shop:update', (data) => {
      console.log('🏪 Shop updated:', data);
      // TODO: Refresh shop if open
    });
    
    // Faction updates
    socket.on('faction:update', (data) => {
      console.log('⚔️ Faction update:', data);
      // TODO: Show reputation change
    });
    
    // Status effects
    socket.on('status:effect', (effect) => {
      console.log('✨ Status effect:', effect);
      // TODO: Show effect notification
    });
    
    // Party updates
    socket.on('party:update', (data) => {
      console.log('👥 Party update:', data);
      // TODO: Update party UI
    });
    
    // Raid updates
    socket.on('raid:update', (data) => {
      console.log('⚔️ Raid update:', data);
      // TODO: Update raid UI
    });
    
    socket.on('raid:combat:action', (action) => {
      console.log('⚔️ Raid combat action:', action);
      // TODO: Show raid combat log
    });
    
    socket.on('raid:boss:phase', (phase) => {
      console.log('👹 Boss phase change:', phase);
      // TODO: Show phase transition
    });
    
    socket.on('raid:voting:started', (voteData) => {
      console.log('🗳️ Raid voting started:', voteData);
      // TODO: Show voting UI
    });
    
    socket.on('raid:voting:result', (result) => {
      console.log('🗳️ Voting result:', result);
      // TODO: Show voting result
    });
    
    // Chat events
    socket.on('chat:event', (event) => {
      console.log('💬 Chat event:', event);
      // TODO: Show chat event in UI
    });
    
    // Seasonal events
    socket.on('season:event', (event) => {
      console.log('🎃 Seasonal event:', event);
      // TODO: Show seasonal event notification
    });
    
    // Game state updates (from operator commands)
    socket.on('gameState:update', (gameState) => {
      console.log('🌍 Game state updated:', gameState);
      set({ gameState });
      
      // Show notification if there's a broadcast
      if (gameState.lastBroadcast) {
        console.log('📢 System Broadcast:', gameState.lastBroadcast);
        // TODO: Show toast notification with broadcast message
      }
    });
  }
}));

export default useGameStore;
