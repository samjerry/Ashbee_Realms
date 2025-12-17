# Testing Guide for Character Role Assignment Fix

## Overview
This guide helps verify that the character role assignment fix is working correctly.

## Quick Setup

### 1. Broadcaster Authentication (Required for full functionality)

**URL to visit:**
```
http://localhost:3000/auth/broadcaster
```
Or on production:
```
https://your-domain.com/auth/broadcaster
```

**What to expect:**
1. Redirected to Twitch authorization page
2. See requested permissions:
   - Read your email address
   - View your channel's VIPs
   - View your channel's subscriptions
   - View your channel's moderators
3. Click "Authorize"
4. Redirected back to game with success message

**Verification:**
- Check server logs for: `✅ Broadcaster authenticated: {YourName} ({yourchannel})`
- Check database for entry in `broadcaster_auth` table

## Test Scenarios

### Test 1: VIP User with Broadcaster Auth ✅ (BEST CASE)

**Prerequisites:**
- Broadcaster has authenticated via `/auth/broadcaster`
- Test user has VIP status in your channel

**Steps:**
1. Have VIP user log in via OAuth
2. User creates a character
3. Check character's role

**Expected Result:**
- Character has `['vip']` role
- Name color is `#FF1493` (deep pink)
- Server logs show: `✅ Fetched roles from Twitch API: ['vip']`

### Test 2: Subscriber User with Broadcaster Auth ✅

**Prerequisites:**
- Broadcaster has authenticated
- Test user is subscribed to your channel

**Steps:**
1. Subscriber logs in and creates character

**Expected Result:**
- Character has `['subscriber']` role
- Name color is `#6441A5` (purple)
- Server logs show: `✅ Fetched roles from Twitch API: ['subscriber']`

### Test 3: Moderator User with Broadcaster Auth ✅

**Prerequisites:**
- Broadcaster has authenticated
- Test user is a moderator in your channel

**Steps:**
1. Moderator logs in and creates character

**Expected Result:**
- Character has `['moderator']` role (possibly with other roles like subscriber)
- Name color is `#00FF00` (green) or higher role color
- Server logs show: `✅ Fetched roles from Twitch API: ['moderator', ...]`

### Test 4: VIP User WITHOUT Broadcaster Auth (FALLBACK) ⚠️

**Prerequisites:**
- Broadcaster has NOT authenticated
- Test user has VIP status

**Steps:**
1. VIP user chats in Twitch chat
2. Bot detects VIP badge and stores role
3. User logs in and creates character

**Expected Result:**
- Character has `['vip']` role (from database, not API)
- Name color is `#FF1493` (deep pink)
- Server logs show: `⚠️ Broadcaster not authenticated for channel {channel} - using fallback role detection`

### Test 5: VIP User with No Prior Activity (DEGRADED) ⚠️

**Prerequisites:**
- Broadcaster has NOT authenticated
- VIP user has never chatted

**Steps:**
1. VIP user logs in and creates character WITHOUT chatting first

**Expected Result:**
- Character has `['viewer']` role initially
- Name color is `#FFFFFF` (white)
- After user chats in Twitch, role updates to `['vip']`

### Test 6: Multiple Roles (VIP + Subscriber)

**Prerequisites:**
- Broadcaster has authenticated
- Test user is BOTH VIP and subscriber

**Steps:**
1. User logs in and creates character

**Expected Result:**
- Character has `['subscriber', 'vip']` role (or `['vip', 'subscriber']`)
- Name color is based on highest role in hierarchy (VIP: `#FF1493`)
- User can change color in settings to either VIP pink or subscriber purple

### Test 7: Beta Tester

**Prerequisites:**
- User is listed in `Testers.txt` file

**Steps:**
1. User logs in and creates character

**Expected Result:**
- Character has `['viewer', 'tester']` or `['vip', 'tester']` etc.
- Has access to cyan tester color `#00FFFF`

### Test 8: MarrowOfAlbion (Creator)

**Prerequisites:**
- User is "MarrowOfAlbion" or "MarrowOfAlb1on"

**Steps:**
1. Log in and create character

**Expected Result:**
- Character has `['creator']` role
- Name color is `#FFD700` (gold)

## Verification Checklist

After testing, verify:

- [ ] Broadcaster authentication completed successfully
- [ ] VIP users get VIP role
- [ ] Subscribers get subscriber role
- [ ] Moderators get moderator role
- [ ] Users with multiple roles show all roles
- [ ] Name colors match role hierarchy
- [ ] Settings panel allows color selection for multi-role users
- [ ] Fallback to chat-based detection works when broadcaster not authenticated
- [ ] No errors in server logs (except expected warnings)

## Common Issues and Solutions

### Issue: VIP getting viewer role

**Check:**
1. Has broadcaster authenticated? → Visit `/auth/broadcaster`
2. Does user have twitchId in session? → Check OAuth login
3. Are API calls succeeding? → Check server logs for error messages

**Solution:**
- If broadcaster not authenticated: Follow setup in Step 1 above
- If API calls failing: Check error messages for missing scopes

### Issue: "Failed to check VIP status: requires scope: channel:read:vips"

**Cause:** Broadcaster didn't grant VIP permission during OAuth

**Solution:**
- Broadcaster should re-authenticate at `/auth/broadcaster`
- Make sure to click "Authorize" and grant ALL permissions

### Issue: User's role not updating after getting VIP

**Cause:** User created character before getting VIP, and hasn't chatted since

**Solutions:**
1. Have user chat in Twitch → Bot will detect new VIP badge and update role
2. Or have user delete and recreate character (nuclear option)
3. Or manually update role in database (admin only)

## Server Log Examples

### Successful Broadcaster Auth
```
✅ Broadcaster token exchange successful
📋 Granted scopes: [ 'user:read:email', 'channel:read:vips', 'channel:read:subscriptions', 'moderation:read' ]
✅ Broadcaster authenticated: YourName (yourchannel)
✅ Saved broadcaster auth for channel: yourchannel
```

### Successful Role Fetch
```
🔍 Fetching roles from Twitch API for TestVIP
✅ Fetched roles from Twitch API: [ 'vip' ]
🎭 Assigned roles to TestVIP: [ 'vip' ]
```

### Fallback to Database
```
⚠️ Broadcaster not authenticated for channel yourchannel - using fallback role detection
🎭 Assigned roles to TestVIP: [ 'viewer' ]
```

### API Permission Missing
```
Failed to check VIP status: GET /helix/channels/vips requires scope: channel:read:vips (Status: 401)
```

## Database Queries for Verification

### Check if broadcaster is authenticated
```sql
SELECT * FROM broadcaster_auth WHERE channel_name = 'yourchannel';
```

### Check user's roles
```sql
SELECT player_id, name, roles FROM players_yourchannel WHERE name = 'TestVIP';
```

### Check all VIPs in channel
```sql
SELECT player_id, name, roles FROM players_yourchannel WHERE roles::jsonb ? 'vip';
```

## Next Steps

After successful testing:
1. ✅ Broadcaster authentication working
2. ✅ VIP detection working  
3. ✅ Subscriber detection working
4. ✅ Moderator detection working
5. ✅ Fallback to chat detection working
6. ✅ Name colors displaying correctly
7. ✅ Ready for production use!

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify broadcaster authentication in database
3. Test with stub login: `/auth/fake?name=TestUser`
4. Check BROADCASTER_SETUP.md for troubleshooting

---

**Questions?** Review server logs - they provide detailed information about every step of the role detection process!
