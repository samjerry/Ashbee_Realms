async function $(sel){ return document.querySelector(sel); }

// Game state management
let gameState = {
  user: null,
  character: null,
  location: null,
  inCombat: false,
  inShop: false,
  hasCharacter: false
};

// Get channel from URL parameter
function getChannelFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('channel');
}

// Store channel in session storage for persistence
function getChannel() {
  let channel = getChannelFromURL();
  if (channel) {
    sessionStorage.setItem('gameChannel', channel);
  } else {
    channel = sessionStorage.getItem('gameChannel');
  }
  return channel;
}

// Theme management
function initThemes() {
  const savedTheme = localStorage.getItem('theme') || 'greek';
  setTheme(savedTheme);
  
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = e.target.dataset.theme;
      setTheme(theme);
    });
  });
}

function setTheme(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem('theme', theme);
  
  // Update active button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

async function fetchMe(){
  try{
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('not logged');
    return await res.json();
  } catch(e){ return null; }
}

async function updateUser(){
  const data = await fetchMe();
  const userEl = await $("#user");
  const loginBtn = await $('#loginBtn');
  const loginSection = await $('#loginSection');
  const infoSection = await $('#infoSection');
  
  if (data && data.user){
    gameState.user = data.user;
    userEl.textContent = `Logged in as ${data.user.displayName}`;
    loginSection.style.display = 'none';
    
    // Load character progress
    await loadCharacterProgress();
    updateUI();
  } else {
    gameState.user = null;
    userEl.textContent = 'Not logged in';
    loginSection.style.display = 'block';
    infoSection.style.display = 'block';
  }
}

async function loginWithTwitch(){
  // Redirect to the Twitch OAuth flow
  window.location.href = '/auth/twitch';
}

async function loadCharacterProgress() {
  const channel = getChannel();
  if (!channel || !gameState.user) return;

  try {
    const res = await fetch(`/api/player/progress?channel=${channel}`, {
      credentials: 'same-origin'
    });
    
    if (res.ok) {
      const data = await res.json();
      gameState.character = data.character;
      gameState.location = data.location;
      gameState.hasCharacter = !!data.character;
      gameState.inCombat = data.inCombat || false;
      gameState.inShop = data.location === 'Shop' || false;
      
      updateCharacterStatus();
    }
  } catch (err) {
    console.error('Failed to load character:', err);
  }
}

function updateCharacterStatus() {
  const statusEl = document.getElementById('characterStatus');
  if (!gameState.character) {
    statusEl.style.display = 'none';
    return;
  }

  const char = gameState.character;
  statusEl.style.display = 'block';
  statusEl.innerHTML = `
    <strong>${char.name}</strong> - Level ${char.level || 1} ${char.class || 'Adventurer'}<br>
    ❤️ HP: ${char.hp || 0}/${char.maxHp || 100} | ⚡ Mana: ${char.mana || 0}/${char.maxMana || 50} | 💰 Gold: ${char.gold || 0}<br>
    📍 ${gameState.location || 'Unknown Location'}
  `;
}

function updateUI() {
  const actionButtons = document.getElementById('actionButtons');
  const infoSection = document.getElementById('infoSection');
  
  if (!gameState.user) {
    actionButtons.style.display = 'none';
    infoSection.style.display = 'block';
    return;
  }

  infoSection.style.display = 'none';
  actionButtons.style.display = 'block';

  // Hide all buttons first
  document.querySelectorAll('#actionButtons button').forEach(btn => {
    btn.style.display = 'none';
  });

  // Show buttons based on state
  if (!gameState.hasCharacter) {
    // No character - show start button
    show('startBtn');
  } else if (gameState.inCombat) {
    // In combat - show combat actions
    show('attackBtn', 'skillBtn', 'useItemBtn', 'fleeBtn');
    show('statsBtn', 'inventoryBtn'); // Always available
  } else if (gameState.inShop) {
    // In shop - show shop actions
    show('buyBtn', 'sellBtn', 'inventoryBtn');
    show('statsBtn', 'equipBtn', 'unequipBtn');
    show('exploreBtn'); // Leave shop
  } else {
    // Normal exploration - show all exploration options
    show('exploreBtn', 'battleBtn', 'restBtn');
    show('statsBtn', 'inventoryBtn', 'passiveBtn');
    show('questBtn', 'shopBtn');
    show('equipBtn', 'unequipBtn');
  }
}

function show(...buttonIds) {
  buttonIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = 'inline-block';
  });
}

async function logout(){
  // Clear session by redirecting to a logout endpoint (we'll add this to server)
  // For now, just redirect to home
  window.location.href = '/adventure';
}

async function explore(){
  const channel = getChannel();
  if (!channel) {
    const log = await $("#log");
    log.textContent = '⚠️ Error: No channel specified. Please access the game through a streamer\'s !adventure command.';
    return;
  }

  const log = await $("#log");
  log.textContent = `🗺️ How to Play Ashbee Realms:

This is a Twitch chat-based RPG adventure game!

🎮 Main Commands:
!start - Create your character
!explore - Venture into the wilderness
!battle - Fight monsters
!rest - Recover health and mana
!stats - View your character
!inventory - Check your items

⚔️ Combat Commands:
!attack - Basic attack
!skill <name> - Use a skill
!item <name> - Use an item
!flee - Run from battle

📚 More Commands:
!quest - View available quests
!shop - Visit the shop
!equip <item> - Equip gear
!passive - View skill tree

Type commands in ${channel}'s Twitch chat to play!`;
}

async function rest(){
  const channel = getChannel();
  if (!channel) {
    const log = await $("#log");
    log.textContent = '⚠️ Error: No channel specified. Please access the game through a streamer\'s !adventure command.';
    return;
  }

  const log = await $("#log");
  log.textContent = `💬 Available Twitch Chat Commands:

⚔️ EXPLORATION & COMBAT:
!start - Begin your adventure
!explore - Explore the world
!battle - Enter combat
!rest - Recover HP/Mana
!attack - Attack in combat
!skill <name> - Use skill
!flee - Escape battle

📊 CHARACTER & ITEMS:
!stats - View character stats
!inventory - Check items
!equip <item> - Equip gear
!unequip <slot> - Remove gear
!passive - View skill tree

🎯 QUESTS & SHOPS:
!quest - View quests
!shop - Browse items
!buy <item> - Purchase item
!sell <item> - Sell item

Type these commands in ${channel}'s Twitch chat!`;
}

async function showInventory(){
  const channel = getChannel();
  if (!channel) {
    const log = await $("#log");
    log.textContent = '⚠️ Error: No channel specified. Please access the game through a streamer\'s !adventure command.';
    return;
  }

  const res = await fetch(`/api/player/progress?channel=${channel}`, {
    method: 'GET',
    credentials: 'same-origin'
  });
  const data = await res.json();
  const log = await $("#log");
  
  if (res.ok && data){
    const char = data.character || {};
    const inv = data.inventory || [];
    let text = `📊 Character: ${char.name || 'Unknown'}\n`;
    text += `❤️ HP: ${char.hp || 0}/${char.maxHp || 0} | ⚡ Mana: ${char.mana || 0}/${char.maxMana || 0}\n`;
    text += `⭐ Level: ${char.level || 1} | 💰 Gold: ${char.gold || 0}\n`;
    text += `📍 Location: ${data.location || 'Unknown'}\n\n`;
    
    if (inv.length > 0) {
      text += `🎒 Inventory (${inv.length} items):\n`;
      text += inv.slice(0, 10).map(item => `• ${item.name} ${item.equipped ? '(equipped)' : ''}`).join('\n');
      if (inv.length > 10) text += `\n... and ${inv.length - 10} more`;
    } else {
      text += '🎒 Inventory is empty.';
    }
    
    log.textContent = text;
  } else {
    log.textContent = `❌ Error: ${data.error || 'Failed to load character data'}`;
  }
}

async function loadPlayerProgress() {
  const channel = getChannel();
  if (!channel) {
    console.warn('No channel specified for loading progress');
    return null;
  }

  try {
    const response = await fetch(`/api/player/progress?channel=${encodeURIComponent(channel)}`);
    if (response.ok) {
      const data = await response.json();
      return data.progress;
    }
  } catch (err) {
    console.error('Failed to load progress:', err);
  }
  return null;
}

async function savePlayerProgress(playerData) {
  const channel = getChannel();
  if (!channel) {
    console.warn('No channel specified for saving progress');
    return false;
  }

  try {
    const response = await fetch(`/api/player/progress?channel=${encodeURIComponent(channel)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: playerData, channel })
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to save progress:', err);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () =>{
  initThemes();
  await updateUser();
  
  // Display channel info if available
  const channel = getChannel();
  if (channel) {
    const channelInfoEl = document.getElementById('channelInfo');
    if (channelInfoEl) {
      channelInfoEl.textContent = `Playing on ${channel}'s channel`;
      channelInfoEl.style.display = 'block';
    }
  }
  
  (await $('#loginBtn')).addEventListener('click', loginWithTwitch);
  (await $('#exploreBtn')).addEventListener('click', explore);
  (await $('#restBtn')).addEventListener('click', rest);
  (await $('#inventoryBtn')).addEventListener('click', showInventory);
});
