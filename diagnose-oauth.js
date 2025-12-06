#!/usr/bin/env node
/**
 * Simple diagnostic server to see what Twitch is sending to the callback URL
 * Run this and manually visit the authorization URL in your browser
 */

require('dotenv').config();
const http = require('http');
const { parse: parseUrl } = require('url');
const open = require('open');

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const SCOPES = 'chat:read chat:edit';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${BASE_URL.replace(/\/$/, '')}/auth/twitch/callback`;

if (!TWITCH_CLIENT_ID) {
  console.error('❌ TWITCH_CLIENT_ID not set in .env');
  process.exit(1);
}

const authState = Math.random().toString(36).slice(2);

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state: authState
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

const server = http.createServer((req, res) => {
  const parsed = parseUrl(req.url, true);
  
  console.log('\n📨 ===== CALLBACK RECEIVED =====');
  console.log(`Full URL: ${req.url}`);
  console.log(`Pathname: ${parsed.pathname}`);
  console.log(`Query params: ${JSON.stringify(parsed.query, null, 2)}`);
  
  const { code, state, error, error_description } = parsed.query;
  
  console.log('\nExtracted values:');
  console.log(`  code: ${code || '(none)'}`);
  console.log(`  state: ${state || '(none)'}`);
  console.log(`  state matches: ${state === authState ? '✅ YES' : '❌ NO'}`);
  console.log(`  error: ${error || '(none)'}`);
  console.log(`  error_description: ${error_description || '(none)'}`);
  console.log('===============================\n');
  
  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>❌ Authorization Error</h1>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Description:</strong> ${error_description || 'No description'}</p>
      <p>Check the terminal for full details.</p>
    `);
  } else if (!code || state !== authState) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>❌ Invalid Callback</h1>
      <p>Code or state missing/invalid. Check the terminal for full details.</p>
    `);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>✅ Valid Callback Received!</h1>
      <p><strong>Code:</strong> ${code}</p>
      <p><strong>State:</strong> ${state}</p>
      <p>Check the terminal for the full details. You can now close this window.</p>
    `);
  }
});

const PORT = 3000;
server.listen(PORT, async () => {
  console.log('🚀 Diagnostic OAuth Callback Server\n');
  console.log(`📡 Server listening on http://localhost:${PORT}`);
  console.log(`🔐 State: ${authState}\n`);
  
  const authUrl = buildAuthUrl();
  console.log(`🔗 Authorization URL (will open in browser):\n`);
  console.log(`${authUrl}\n`);
  
  console.log('Opening browser in 1 second...\n');
  
  setTimeout(async () => {
    await open(authUrl);
    console.log('When you authorize (or see an error), the details will appear here.\n');
  }, 1000);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  server.close();
  process.exit(0);
});
