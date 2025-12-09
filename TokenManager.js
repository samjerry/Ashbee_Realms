/**
 * Token Manager - Handles OAuth token refresh automatically
 * Works with Railway and local development
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class TokenManager {
  constructor() {
    this.tokenFile = path.join(__dirname, '.bot-tokens.json');
    this.tokens = this.loadTokens();
    this.refreshTimer = null;
  }

  /**
   * Load tokens from file or environment
   */
  loadTokens() {
    // Try environment variables first (Railway)
    if (process.env.BOT_ACCESS_TOKEN && process.env.BOT_REFRESH_TOKEN) {
      console.log('📦 Loading tokens from environment variables');
      return {
        access_token: process.env.BOT_ACCESS_TOKEN,
        refresh_token: process.env.BOT_REFRESH_TOKEN,
        expires_at: process.env.BOT_TOKEN_EXPIRES_AT ? parseInt(process.env.BOT_TOKEN_EXPIRES_AT) : Date.now() + 3600000
      };
    }

    // Try loading from file (local development)
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        const tokens = JSON.parse(data);
        console.log('📦 Loading tokens from file');
        return tokens;
      }
    } catch (error) {
      console.error('⚠️  Error loading tokens from file:', error.message);
    }

    return null;
  }

  /**
   * Save tokens to file and optionally log for Railway
   */
  saveTokens(tokens) {
    this.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };

    // Save to file for local development
    try {
      fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokens, null, 2));
      console.log('✅ Tokens saved to file');
    } catch (error) {
      console.error('⚠️  Could not save tokens to file:', error.message);
    }

    // If running on Railway, log instructions
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('\n🚂 RAILWAY DETECTED - Update these environment variables:');
      console.log('---');
      console.log(`BOT_ACCESS_TOKEN=${this.tokens.access_token}`);
      console.log(`BOT_REFRESH_TOKEN=${this.tokens.refresh_token}`);
      console.log(`BOT_TOKEN_EXPIRES_AT=${this.tokens.expires_at}`);
      console.log('---\n');
    }

    return this.tokens;
  }

  /**
   * Get current access token, refresh if expired
   */
  async getAccessToken() {
    if (!this.tokens) {
      throw new Error('No tokens available. Run: node get-bot-token.js');
    }

    // Check if token is expired or will expire in next 5 minutes
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    if (this.tokens.expires_at - Date.now() < expiryBuffer) {
      console.log('🔄 Token expired or expiring soon, refreshing...');
      await this.refreshAccessToken();
    }

    return this.tokens.access_token;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available. Run: node get-bot-token.js');
    }

    console.log('🔄 Refreshing OAuth token...');

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refresh_token
        }
      });

      const newTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || this.tokens.refresh_token,
        expires_in: response.data.expires_in
      };

      this.saveTokens(newTokens);
      console.log('✅ Token refreshed successfully!');
      console.log(`⏰ New token expires in ${Math.floor(newTokens.expires_in / 3600)} hours`);

      return newTokens.access_token;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error.response?.data || error.message);
      throw new Error('Token refresh failed. Run: node get-bot-token.js');
    }
  }

  /**
   * Validate current token
   */
  async validateToken() {
    if (!this.tokens) {
      return false;
    }

    try {
      const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `Bearer ${this.tokens.access_token}`
        }
      });

      console.log(`✅ Token valid for user: ${response.data.login}`);
      console.log(`⏰ Expires in: ${Math.floor(response.data.expires_in / 3600)} hours`);
      return true;
    } catch (error) {
      console.log('❌ Token invalid or expired');
      return false;
    }
  }

  /**
   * Start automatic token refresh (runs every hour)
   */
  startAutoRefresh() {
    if (this.refreshTimer) {
      console.log('⚠️  Auto-refresh already running');
      return;
    }

    console.log('🔄 Starting automatic token refresh (checks every hour)');

    // Check immediately
    this.getAccessToken().catch(err => {
      console.error('⚠️  Initial token check failed:', err.message);
    });

    // Then check every hour
    this.refreshTimer = setInterval(async () => {
      try {
        await this.getAccessToken();
      } catch (error) {
        console.error('⚠️  Auto-refresh failed:', error.message);
      }
    }, 60 * 60 * 1000); // Every hour

    console.log('✅ Auto-refresh started');
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('🛑 Auto-refresh stopped');
    }
  }

  /**
   * Get token info for logging
   */
  getTokenInfo() {
    if (!this.tokens) {
      return null;
    }

    const expiresIn = Math.max(0, this.tokens.expires_at - Date.now());
    const hoursLeft = Math.floor(expiresIn / (1000 * 60 * 60));
    const minutesLeft = Math.floor((expiresIn % (1000 * 60 * 60)) / (1000 * 60));

    return {
      hasToken: !!this.tokens.access_token,
      hasRefreshToken: !!this.tokens.refresh_token,
      expiresIn: `${hoursLeft}h ${minutesLeft}m`,
      isExpired: expiresIn <= 0
    };
  }
}

module.exports = TokenManager;
