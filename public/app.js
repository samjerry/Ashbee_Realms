async function $(sel){ return document.querySelector(sel); }

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
  
  if (data && data.user){
    userEl.textContent = `Logged in as ${data.user.displayName}`;
    loginBtn.style.display = 'none'; // hide login button when logged in
  } else {
    userEl.textContent = 'Not logged in';
    loginBtn.style.display = 'inline-block'; // show login button
  }
}

async function loginWithTwitch(){
  // Redirect to the Twitch OAuth flow
  window.location.href = '/auth/twitch';
}

async function logout(){
  // Clear session by redirecting to a logout endpoint (we'll add this to server)
  // For now, just redirect to home
  window.location.href = '/adventure';
}

async function fightBoss(){
  const channel = getChannel();
  if (!channel) {
    const log = await $("#log");
    log.textContent = 'Error: No channel specified. Please access the game through a streamer\'s !adventure command.';
    return;
  }

  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ actionId: 'fightBoss', channel })
  });
  const data = await res.json();
  const log = await $("#log");
  if (res.ok){
    log.textContent = `Result: ${JSON.stringify(data.newState)}\nEvents: ${JSON.stringify(data.eventsToBroadcast)}`;
  } else {
    log.textContent = `Error: ${JSON.stringify(data)}`;
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
  (await $('#fightBtn')).addEventListener('click', fightBoss);
});
