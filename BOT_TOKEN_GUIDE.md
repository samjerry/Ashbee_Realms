# Automated Bot Token Refresh - Setup Guide

## Problem
Twitch OAuth tokens expire after a few hours, causing the bot to disconnect and requiring manual token regeneration every day.

## Solution
Automated token refresh using refresh tokens. The bot will automatically renew its OAuth token before expiry without manual intervention.

---

## 🚀 Quick Setup

### Step 1: Generate Initial Tokens (One-Time Setup)

Run this command **locally** on your development machine:

```bash
node get-bot-token.js
```

This will:
1. Open your browser to authorize the bot
2. Generate both `BOT_OAUTH_TOKEN` and `BOT_REFRESH_TOKEN`
3. Save them to your `.env` file
4. Display the values you need for Railway

**Save the output!** You'll see something like:
```
🔑 IMPORTANT: Save these for Railway:
   BOT_OAUTH_TOKEN=oauth:abc123...
   BOT_REFRESH_TOKEN=xyz789...
```

### Step 2: Add Environment Variables to Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Add these environment variables:

```env
BOT_OAUTH_TOKEN=oauth:abc123xyz...
BOT_REFRESH_TOKEN=def456uvw...
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
BOT_USERNAME=your_bot_username
```

**Important:** You need **both** tokens for auto-refresh to work!

### Step 3: Deploy & Enjoy

Deploy your code to Railway. The bot will:
- ✅ Use the current OAuth token
- ✅ Automatically refresh it every 4 hours
- ✅ Never expire (as long as refresh token is valid)
- ✅ Update the token in memory without restarting

---

## 📋 How It Works

### Token Lifecycle

```
Initial Token (valid for ~4-6 hours)
         ↓
   Token Manager starts
         ↓
   Schedules refresh at 80% expiry
         ↓
   Auto-refreshes using BOT_REFRESH_TOKEN
         ↓
   Gets new access token + new refresh token
         ↓
   Updates environment variable in memory
         ↓
   Reschedules next refresh
         ↓
   (repeats forever)
```

### Files Added

1. **`bot-token-manager.js`** - Token refresh automation
   - Validates existing tokens
   - Refreshes tokens before expiry
   - Schedules automatic refresh
   - Updates tokens in memory

2. **Updated `bot.js`** - Now uses token manager
   - Initializes token manager on startup
   - Handles token refresh automatically
   - Graceful shutdown support

3. **Updated `get-bot-token.js`** - Now saves refresh token
   - Generates both access and refresh tokens
   - Saves to `.env` file
   - Displays Railway instructions

---

## 🔧 Development vs Production

### Development (Local)
- Tokens saved to `.env` file
- Auto-refreshed and file is updated
- Can regenerate anytime with `node get-bot-token.js`

### Production (Railway)
- Tokens stored as environment variables
- Auto-refreshed in memory only
- Environment variables remain unchanged
- No file system writes needed

---

## ⚠️ Troubleshooting

### Bot disconnects after a few hours

**Cause:** Missing `BOT_REFRESH_TOKEN` in Railway

**Fix:**
1. Run `node get-bot-token.js` locally
2. Copy the `BOT_REFRESH_TOKEN` value
3. Add it to Railway environment variables
4. Restart your Railway service

### Error: "No valid token or refresh token available"

**Cause:** Neither a valid token nor refresh token exists

**Fix:**
1. Run `node get-bot-token.js` locally
2. Copy **both** tokens to Railway:
   - `BOT_OAUTH_TOKEN`
   - `BOT_REFRESH_TOKEN`
3. Restart Railway service

### Token refresh fails

**Possible causes:**
- Refresh token expired (rarely happens, but can if unused for 60+ days)
- Invalid `TWITCH_CLIENT_ID` or `TWITCH_CLIENT_SECRET`
- Twitch API is down

**Fix:**
1. Regenerate tokens: `node get-bot-token.js`
2. Update Railway environment variables
3. Restart service

### Bot says "Token will auto-refresh every ~4 hours" but still disconnects

**Check:**
1. Verify `BOT_REFRESH_TOKEN` is set in Railway
2. Check Railway logs for error messages
3. Ensure `TWITCH_CLIENT_SECRET` is set correctly

---

## 🔐 Security Best Practices

### Never Commit Tokens
- ✅ `.env` is in `.gitignore`
- ✅ Never commit `.env` to Git
- ✅ Never share tokens publicly

### Token Storage
- **Local Dev:** `.env` file (gitignored)
- **Production:** Railway environment variables
- **Never:** Hardcoded in code

### Token Rotation
- Access tokens: Auto-refreshed every ~4 hours
- Refresh tokens: Valid for 60+ days (renewed on each refresh)
- If compromised: Revoke in Twitch Developer Console and regenerate

---

## 📊 Monitoring

### Check Token Status

The bot logs will show:
```
✅ Existing bot token is valid
⏰ Auto-refresh scheduled for 192 minutes from now
```

Or if refreshing:
```
🔄 Refreshing bot token...
✅ Bot token refreshed! Expires in 4 hours
⏰ Auto-refresh scheduled for 192 minutes from now
```

### Railway Logs

Watch your Railway logs for these messages:
- `✅ Bot initialized with auto-refreshing token` - All good!
- `⏰ Auto-refreshing bot token...` - Scheduled refresh happening
- `❌ Failed to refresh bot token` - Problem, check credentials

---

## 🎯 Quick Reference

### Environment Variables Needed

```env
# Required for Bot
BOT_USERNAME=your_bot_name
BOT_OAUTH_TOKEN=oauth:abc123...
BOT_REFRESH_TOKEN=xyz789...

# Required for Twitch API
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret

# Optional
CHANNELS=channel1,channel2
BASE_URL=https://your-railway-url.up.railway.app
```

### Commands

```bash
# Generate new tokens (run locally)
node get-bot-token.js

# Start server with auto-refresh
npm start

# Check if token is valid (manual check)
curl -H "Authorization: OAuth YOUR_TOKEN" https://id.twitch.tv/oauth2/validate
```

---

## ✅ Checklist for Railway Deployment

- [ ] Run `node get-bot-token.js` locally
- [ ] Copy both `BOT_OAUTH_TOKEN` and `BOT_REFRESH_TOKEN`
- [ ] Add both to Railway environment variables
- [ ] Verify `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are set
- [ ] Deploy/restart Railway service
- [ ] Check logs for "✅ Bot initialized with auto-refreshing token"
- [ ] Test bot in Twitch chat
- [ ] Verify auto-refresh happens after 4 hours

**Done!** Your bot will now stay connected 24/7 without manual intervention. 🎉
