async function $(sel){ return document.querySelector(sel); }

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
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ actionId: 'fightBoss' })
  });
  const data = await res.json();
  const log = await $("#log");
  if (res.ok){
    log.textContent = `Result: ${JSON.stringify(data.newState)}\nEvents: ${JSON.stringify(data.eventsToBroadcast)}`;
  } else {
    log.textContent = `Error: ${JSON.stringify(data)}`;
  }
}

document.addEventListener('DOMContentLoaded', async () =>{
  initThemes();
  await updateUser();
  (await $('#loginBtn')).addEventListener('click', loginWithTwitch);
  (await $('#fightBtn')).addEventListener('click', fightBoss);
});
