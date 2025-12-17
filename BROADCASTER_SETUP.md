# Broadcaster Setup Guide

## Why Broadcaster Authentication is Required

To ensure all players receive their correct Twitch roles (VIP, Subscriber, Moderator) immediately during character creation, the broadcaster must authenticate with expanded OAuth permissions.

## What Happens Without Broadcaster Authentication?

- ❌ VIP players get "viewer" role initially
- ❌ Subscribers get "viewer" role initially  
- ❌ Moderators get "viewer" role initially
- ⚠️ Roles only update AFTER player chats in Twitch for the first time

## What Happens With Broadcaster Authentication?

- ✅ VIP players get "vip" role immediately
- ✅ Subscribers get "subscriber" role immediately
- ✅ Moderators get "moderator" role immediately
- ✅ Correct name colors applied from the start
- ✅ No need for players to chat before creating characters

## Setup Instructions

### Step 1: Navigate to Broadcaster Authentication

Visit the following URL in your browser (replace with your actual domain):

```
https://your-domain.com/auth/broadcaster
```

Or for local testing:
```
http://localhost:3000/auth/broadcaster
```

### Step 2: Authorize the Application

You will be redirected to Twitch's authorization page. The application will request the following permissions:

- **user:read:email** - Read your email address
- **channel:read:vips** - Check which users are VIPs in your channel
- **channel:read:subscriptions** - Check which users are subscribers
- **moderation:read** - Check which users are moderators

Click **"Authorize"** to grant these permissions.

### Step 3: Confirmation

After successful authentication:
- You'll be redirected back to the game
- Your broadcaster credentials will be stored securely in the database
- All future character creations will check Twitch API for accurate roles

### Step 4: Verify Setup

To verify broadcaster authentication is working:

1. Have a VIP test user log in and create a character
2. Check that they receive the VIP role (pink name color)
3. Check server logs for: `✅ Fetched roles from Twitch API: ['vip']`

## Security Notes

- Broadcaster credentials are stored encrypted in the database
- Only used to verify user roles during character creation
- Never shared with other users
- Can be revoked at any time from Twitch settings

## Troubleshooting

### "Broadcaster not authenticated" warning in logs

**Solution**: The broadcaster hasn't authenticated yet. Visit `/auth/broadcaster` to set up.

### VIP/Subscriber still showing as "viewer"

**Possible causes**:
1. Broadcaster hasn't authenticated - Follow steps above
2. User created character before broadcaster authenticated - Have user delete and recreate character
3. Twitch API scope not granted - Ensure all permissions were authorized

### How to re-authenticate

If you need to update permissions or refresh credentials:

1. Visit `/auth/broadcaster` again
2. Re-authorize the application
3. New credentials will replace old ones automatically

## For Developers

### Database Table: broadcaster_auth

```sql
CREATE TABLE broadcaster_auth (
  channel_name TEXT PRIMARY KEY,
  broadcaster_id TEXT NOT NULL,
  broadcaster_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scopes TEXT NOT NULL,
  authenticated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Check Authentication Status

```javascript
const broadcasterAuth = await db.getBroadcasterAuth('channelname');
if (broadcasterAuth) {
  console.log('Broadcaster authenticated with scopes:', broadcasterAuth.scopes);
} else {
  console.log('Broadcaster not authenticated');
}
```

## Next Steps

After completing broadcaster authentication:

1. ✅ Test with VIP users creating characters
2. ✅ Test with subscriber users  
3. ✅ Test with moderator users
4. ✅ Verify correct name colors are applied
5. ✅ Check server logs for successful role fetching

---

**Questions?** Check the server logs for detailed authentication status and role detection information.
