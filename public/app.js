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
  const loginSection = await $('#loginSection');
  
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
  }
}

async function loginWithTwitch(){
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
  
  if (!gameState.user) {
    actionButtons.style.display = 'none';
    return;
  }

  actionButtons.style.display = 'block';

  // Hide all buttons first
  document.querySelectorAll('#actionButtons button').forEach(btn => {
    btn.style.display = 'none';
  });

  // Show buttons based on state
  if (!gameState.hasCharacter) {
    show('startBtn');
  } else if (gameState.inCombat) {
    show('attackBtn', 'skillBtn', 'useItemBtn', 'fleeBtn');
    show('statsBtn', 'inventoryBtn');
  } else if (gameState.inShop) {
    show('buyBtn', 'sellBtn', 'inventoryBtn');
    show('statsBtn', 'equipBtn', 'unequipBtn');
    show('exploreBtn');
  } else {
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

function updateLog(message) {
  const log = document.getElementById('log');
  if (log) log.textContent = message;
}

async function gameAction(endpoint, body = {}) {
  const channel = getChannel();
  if (!channel) {
    updateLog('⚠️ Error: No channel specified.');
    return null;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ channel, ...body })
    });

    const data = await res.json();
    
    if (res.ok) {
      await loadCharacterProgress();
      updateUI();
      return data;
    } else {
      updateLog(`❌ Error: ${data.error || 'Action failed'}`);
      return null;
    }
  } catch (err) {
    updateLog(`❌ Error: ${err.message}`);
    return null;
  }
}

// Info Functions
async function showHowToPlay() {
  updateLog(`🗺️ Welcome to Ashbee Realms!

This is a web-based RPG adventure game!

🎮 Getting Started:
1. Log in with your Twitch account
2. Access the game through a streamer's channel: Type !adventure in their Twitch chat
3. The streamer will share a link to play on their channel
4. Use the action buttons on this page to explore, battle, and progress!

🎯 How It Works:
• All gameplay happens through buttons on this website
• Your actions and progress are announced in the Twitch chat
• The buttons change based on your situation (exploration, combat, shop, etc.)
• Your progress is automatically saved

📺 Twitch Integration:
• Type !adventure in a participating streamer's chat to get started
• Game announcements appear in the streamer's chat
• Play alongside other viewers!

Your adventure awaits!`);
}

async function showCommands() {
  updateLog(`💬 Game is fully playable through website buttons - no chat commands needed!`);
}

// Action button handlers
async function startAdventure() {
  updateLog('🎮 Creating character... (Use Twitch chat: !start to create your character)');
}

async function exploreWorld() {
  updateLog('🗺️ Exploring...');
  const data = await gameAction('/api/action', { actionId: 'explore' });
  if (data) updateLog(`🗺️ ${data.result || 'You venture forth...'}`);
}

async function enterBattle() {
  updateLog('⚔️ Seeking battle...');
  const data = await gameAction('/api/action', { actionId: 'battle' });
  if (data) updateLog(`⚔️ ${data.result || 'A monster appears!'}`);
}

async function restCharacter() {
  updateLog('🏕️ Resting...');
  const data = await gameAction('/api/action', { actionId: 'rest' });
  if (data) updateLog(`🏕️ ${data.result || 'You recover your strength.'}`);
}

async function viewStats() {
  if (!gameState.character) {
    updateLog('⚠️ No character data. Create a character first!');
    return;
  }

  const char = gameState.character;
  updateLog(`📊 Character Stats:

Name: ${char.name || 'Unknown'}
Class: ${char.class || 'Adventurer'}
Level: ${char.level || 1}

❤️ HP: ${char.hp || 0}/${char.maxHp || 100}
⚡ Mana: ${char.mana || 0}/${char.maxMana || 50}
💰 Gold: ${char.gold || 0}

⚔️ Attack: ${char.attack || 0}
🛡️ Defense: ${char.defense || 0}
✨ Magic: ${char.magic || 0}

📍 Location: ${gameState.location || 'Unknown'}`);
}

async function viewInventory() {
  const channel = getChannel();
  if (!channel) {
    updateLog('⚠️ Error: No channel specified.');
    return;
  }

  const res = await fetch(`/api/player/progress?channel=${channel}`, {
    credentials: 'same-origin'
  });
  
  if (res.ok) {
    const data = await res.json();
    const inv = data.inventory || [];
    
    if (inv.length > 0) {
      let text = `🎒 Inventory (${inv.length} items):\n\n`;
      inv.forEach(item => {
        text += `• ${item.name}${item.equipped ? ' ✓ (equipped)' : ''}\n`;
      });
      updateLog(text);
    } else {
      updateLog('🎒 Your inventory is empty.');
    }
  }
}

async function viewPassives() {
  updateLog('🌟 Passive skill tree interface coming soon!');
}

async function combatAttack() {
  updateLog('⚔️ Attacking...');
  const data = await gameAction('/api/combat/attack', {});
  if (data) updateLog(`⚔️ ${data.result || 'You strike!'}`);
}

async function combatSkill() {
  updateLog('✨ Skill selection interface coming soon!');
}

async function combatItem() {
  updateLog('🧪 Item selection interface coming soon!');
}

async function combatFlee() {
  updateLog('🏃 Attempting to flee...');
  const data = await gameAction('/api/combat/flee', {});
  if (data) updateLog(`🏃 ${data.result || 'You escape!'}`);
}

async function viewQuests() {
  updateLog('📜 Quest interface coming soon!');
}

async function enterShop() {
  updateLog('🏪 Shop interface coming soon!');
  gameState.inShop = true;
  updateUI();
}

async function buyItem() {
  updateLog('💰 Buy interface coming soon!');
}

async function sellItem() {
  updateLog('💵 Sell interface coming soon!');
}

async function equipItem() {
  updateLog('⚔️ Equipment interface coming soon!');
}

async function unequipItem() {
  updateLog('🔓 Unequip interface coming soon!');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  initThemes();
  await updateUser();

  const channel = getChannel();
  if (channel) {
    const channelInfoEl = document.getElementById('channelInfo');
    if (channelInfoEl) {
      channelInfoEl.textContent = `Playing on ${channel}'s channel`;
      channelInfoEl.style.display = 'block';
    }
  }
  
  // Attach event listeners
  document.getElementById('loginBtn')?.addEventListener('click', loginWithTwitch);
  document.getElementById('howToPlayBtn')?.addEventListener('click', showHowToPlay);
  document.getElementById('startBtn')?.addEventListener('click', startAdventure);
  document.getElementById('exploreBtn')?.addEventListener('click', exploreWorld);
  document.getElementById('battleBtn')?.addEventListener('click', enterBattle);
  document.getElementById('restBtn')?.addEventListener('click', restCharacter);
  document.getElementById('statsBtn')?.addEventListener('click', viewStats);
  document.getElementById('inventoryBtn')?.addEventListener('click', viewInventory);
  document.getElementById('passiveBtn')?.addEventListener('click', viewPassives);
  document.getElementById('attackBtn')?.addEventListener('click', combatAttack);
  document.getElementById('skillBtn')?.addEventListener('click', combatSkill);
  document.getElementById('useItemBtn')?.addEventListener('click', combatItem);
  document.getElementById('fleeBtn')?.addEventListener('click', combatFlee);
  document.getElementById('questBtn')?.addEventListener('click', viewQuests);
  document.getElementById('shopBtn')?.addEventListener('click', enterShop);
  document.getElementById('buyBtn')?.addEventListener('click', buyItem);
  document.getElementById('sellBtn')?.addEventListener('click', sellItem);
  document.getElementById('equipBtn')?.addEventListener('click', equipItem);
  document.getElementById('unequipBtn')?.addEventListener('click', unequipItem);
});
