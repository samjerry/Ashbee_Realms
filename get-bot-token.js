#!/usr/bin/env node
/**
 * OAuth Token Generator for Twitch Bot
 * 
 * This script implements the OAuth Authorization Code flow to obtain a fresh bot token.
 * It will:
 * 1. Open the Twitch authorization page in your browser
 * 2. Listen for the redirect callback
 * 3. Exchange the authorization code for tokens
 * 4. Validate the token
 * 5. Update .env with the new BOT_OAUTH_TOKEN
 */

require('dotenv').config();
const axios = require('axios');
const http = require('http');
const { parse: parseUrl } = require('url');
const { parse: parseQuery } = require('querystring');
const fs = require('fs');
const path = require('path');
const open = require('open');

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const BOT_USERNAME = process.env.BOT_USERNAME;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${BASE_URL.replace(/\/$/, '')}/auth/twitch/callback`;

const SCOPES = 'chat:read chat:edit';
const LISTEN_PORT = 3000; // callback server port

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error('❌ TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

if (!BOT_USERNAME) {
  console.error('❌ BOT_USERNAME must be set in .env');
  process.exit(1);
}

let callbackServer;
let authCode;
let authState;

function generateState() {
  return Math.random().toString(36).slice(2);
}

function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state: state
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

function startCallbackServer() {
  return new Promise((resolve, reject) => {
    let serverReady = false;
    
    callbackServer = http.createServer((req, res) => {
      const parsed = parseUrl(req.url, true);
      
      if (parsed.pathname !== '/auth/twitch/callback') {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const { code, state, error } = parsed.query;

      if (error) {
        res.writeHead(400);
        res.end(`Authorization denied: ${error}`);
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (!code || state !== authState) {
        res.writeHead(400);
        res.end('Invalid state or missing code');
        reject(new Error('Invalid state or missing code'));
        return;
      }

      authCode = code;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>✅ Authorization Successful!</h1>
        <p>You can close this window. The bot is obtaining the token...</p>
      `);
      resolve();
    });

    callbackServer.listen(LISTEN_PORT, () => {
      console.log(`✅ Callback server listening on port ${LISTEN_PORT}`);
      serverReady = true;
    });

    callbackServer.on('error', reject);

    // Timeout after 5 minutes
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for authorization callback (5 minutes)'));
    }, 5 * 60 * 1000);
    
    // Clean up timeout when we resolve
    const originalResolve = resolve;
    resolve = () => {
      clearTimeout(timeoutId);
      originalResolve();
    };
  });
}

async function exchangeCodeForToken() {
  console.log('🔄 Exchanging authorization code for tokens...');
  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      }
    });

    const { access_token, refresh_token, scope } = response.data;
    console.log('✅ Token obtained!');
    console.log(`   Scopes: ${scope.join(', ')}`);
    return { access_token, refresh_token, scope };
  } catch (err) {
    console.error('❌ Token exchange failed:', err.response ? err.response.data : err.message);
    throw err;
  }
}

async function validateToken(token) {
  console.log('🔍 Validating token...');
  try {
    const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${token}`
      }
    });

    const { client_id, login, scopes } = response.data;
    console.log('✅ Token is valid!');
    console.log(`   Client ID: ${client_id}`);
    console.log(`   Login: ${login}`);
    console.log(`   Scopes: ${scopes.join(', ')}`);

    if (login.toLowerCase() !== BOT_USERNAME.toLowerCase()) {
      throw new Error(`Token belongs to "${login}" but BOT_USERNAME is "${BOT_USERNAME}". Please authorize with the correct bot account.`);
    }

    if (!scopes.includes('chat:read') || !scopes.includes('chat:edit')) {
      throw new Error(`Token missing required scopes. Has: ${scopes.join(', ')}. Needs: chat:read, chat:edit`);
    }

    return { login, scopes };
  } catch (err) {
    console.error('❌ Validation failed:', err.response ? err.response.data : err.message);
    throw err;
  }
}

function updateEnvFile(accessToken) {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Replace BOT_OAUTH_TOKEN line
  const newToken = `oauth:${accessToken}`;
  envContent = envContent.replace(
    /^BOT_OAUTH_TOKEN=.*/m,
    `BOT_OAUTH_TOKEN=${newToken}`
  );

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('✅ .env updated with new BOT_OAUTH_TOKEN');
}

async function main() {
  try {
    console.log('🚀 Starting Twitch Bot OAuth Token Generator\n');
    console.log(`Bot Account: ${BOT_USERNAME}`);
    console.log(`Scopes: ${SCOPES}`);
    console.log(`Redirect URI: ${REDIRECT_URI}\n`);
    
    console.log('⚠️  IMPORTANT: Verify this redirect URI is registered in Twitch Developer Console:');
    console.log(`   ${REDIRECT_URI}\n`);

    // Generate state FIRST
    authState = generateState();
    console.log('🔐 Generated OAuth state token\n');

    // Start callback server (this returns a promise that resolves when callback is received)
    console.log('📡 Starting callback server...');
    const callbackPromise = startCallbackServer();

    // Now open browser AFTER server is listening but DON'T wait for callback yet
    await new Promise(r => setTimeout(r, 200)); // give server time to start
    
    const authUrl = buildAuthUrl(authState);
    console.log(`🔗 Opening authorization URL in browser...\n`);
    await open(authUrl);
    console.log(`If browser doesn't open, visit:\n   ${authUrl}\n`);
    
    console.log('⏳ Waiting for authorization callback...\n');
    
    // NOW wait for the callback
    await callbackPromise;

    // Wait for callback
    console.log('⏳ Waiting for authorization callback...');
    // (resolved by startCallbackServer promise)

    // Exchange code for token
    const { access_token, refresh_token } = await exchangeCodeForToken();

    // Validate token
    await validateToken(access_token);

    // Update .env
    updateEnvFile(access_token);

    console.log('\n✨ All done! Your bot token is ready.\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your server: npm start');
    console.log('   2. Test the bot in Twitch chat\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (callbackServer) {
      callbackServer.close();
    }
  }
}

main();
