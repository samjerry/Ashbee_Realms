import { create } from 'zustand';
import io from 'socket.io-client';

// Use window.location.origin to connect to current host (works on both localhost and Railway)
const socket = io(window.location.origin);

const useGameStore = create((set, get) => ({
  // Player state
  player: null,
  isLoading: true,
  error: null,
  
  // UI state
  activeTab: 'character',
  showCombat: false,
  showDialogue: false,
  showSettings: false,
  
  // Combat state
  combat: null,
  combatLog: [],
  
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
  
  // Dialogue state
  currentDialogue: null,
  dialogueHistory: [],
  
  // Socket connection
  socket,
  connected: false,
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setPlayer: (player) => set({ player, isLoading: false }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  // Fetch player data
  fetchPlayer: async () => {
    try {
      set({ isLoading: true });
      const response = await fetch('/api/player/stats');
      const data = await response.json();
      set({ player: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  // Combat actions
  startCombat: (monster) => {
    set({ 
      showCombat: true, 
      combat: { monster, turn: 'player', playerHp: get().player.hp }
    });
  },
  
  endCombat: () => {
    set({ showCombat: false, combat: null, combatLog: [] });
  },
  
  addCombatLog: (message) => {
    set((state) => ({ 
      combatLog: [...state.combatLog, { message, timestamp: Date.now() }] 
    }));
  },
  
  performCombatAction: async (action) => {
    try {
      const response = await fetch('/api/combat/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
      
      if (result.log) {
        result.log.forEach(msg => get().addCombatLog(msg));
      }
      
      if (result.status === 'victory' || result.status === 'defeat') {
        setTimeout(() => get().endCombat(), 3000);
      }
      
      return result;
    } catch (error) {
      console.error('Combat action failed:', error);
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
      await fetch('/api/quests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      get().fetchQuests();
    } catch (error) {
      console.error('Failed to accept quest:', error);
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
    socket.on('connect', () => {
      set({ connected: true });
      console.log('Connected to game server');
    });
    
    socket.on('disconnect', () => {
      set({ connected: false });
      console.log('Disconnected from game server');
    });
    
    socket.on('player:update', (data) => {
      set((state) => ({ player: { ...state.player, ...data } }));
    });
    
    socket.on('combat:update', (data) => {
      if (data.log) {
        data.log.forEach(msg => get().addCombatLog(msg));
      }
    });
    
    socket.on('quest:update', () => {
      get().fetchQuests();
    });
    
    socket.on('achievement:unlocked', (achievement) => {
      // Show notification
      console.log('Achievement unlocked:', achievement);
      get().fetchAchievements();
    });
  }
}));

export default useGameStore;
