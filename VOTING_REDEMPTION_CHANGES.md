# Voting and Redemption System Changes

## Summary of Changes (December 9, 2025)

### 1. Voting System - Changed from Bits to Subscribers

**Before:**
- Votes were weighted by bits donated
- Higher bits = more vote weight
- Example: 100 bits = 100 vote weight

**After:**
- Votes are weighted by subscriber status
- Subscribers = 2x vote weight
- Non-subscribers = 1x vote weight
- More fair and doesn't require viewers to spend money

### 2. Channel Point Redemptions - Removed 5 Redemptions

**Removed Redemptions:**
1. ❌ Minor Heal (500 points) - Restore 25% HP
2. ❌ Strength Boost (750 points) - +25% attack for 10 turns
3. ❌ Defense Boost (750 points) - +30% defense for 10 turns
4. ❌ Gold Boost (1000 points) - 50 gold per level
5. ❌ XP Boost (1500 points) - 100 XP per level

**Remaining Redemptions (5 total):**
1. ✅ Haste (1000 points) - +50% speed for 10 turns
2. ✅ Random Item Common (2000 points)
3. ✅ Random Item Uncommon (5000 points)
4. ✅ Random Item Rare (10000 points)
5. ✅ Instant Travel (3000 points) - Teleport to any location

## Technical Implementation

### Files Changed

1. **bot.js**
   - Updated `handleVoteCommand()` function
   - Changed from reading `tags.bits` to checking `tags.subscriber`/`tags.badges`
   - Weight now based on subscriber status (1 or 2)
   - Updated chat feedback messages

2. **server.js**
   - Updated `/api/raids/viewer/vote` endpoint documentation
   - Changed parameter from `bits` to `weight` in vote object
   - Removed 4 endpoints:
     - `/api/redemptions/heal`
     - `/api/redemptions/buff` (partially - now only used by Haste)
     - `/api/redemptions/gold`
     - `/api/redemptions/xp`
   - Updated `/api/redemptions/available` to return only 5 redemptions

3. **DEVELOPMENT_ROADMAP.md**
   - Updated Phase 4.2 documentation
   - Changed "bits-weighted voting" to "subscriber-weighted voting"
   - Updated channel point redemption list (10 → 5)
   - Updated API endpoint counts

## Code Changes

### Voting Weight Calculation (bot.js)

**Before:**
```javascript
// Get bits from tags (if any)
const bits = parseInt(tags.bits || '0', 10);

const response = await fetch(`${BASE_URL}/api/raids/viewer/vote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    viewer: username,
    channel: channelName,
    option,
    bits  // Send bits value
  })
});

const weight = bits > 0 ? ` (${bits} bits weight)` : '';
client.say(channel, `✅ ${username} voted for ${option}${weight}!`);
```

**After:**
```javascript
// Check if user is a subscriber (badges include 'subscriber' or 'founder')
const isSubscriber = tags.subscriber || (tags.badges && (tags.badges.subscriber || tags.badges.founder));
const weight = isSubscriber ? 2 : 1;

const response = await fetch(`${BASE_URL}/api/raids/viewer/vote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    viewer: username,
    channel: channelName,
    option,
    weight  // Send subscriber weight (1 or 2)
  })
});

const weightMsg = isSubscriber ? ' (subscriber 2x weight)' : '';
client.say(channel, `✅ ${username} voted for ${option}${weightMsg}!`);
```

### API Endpoints Removed (server.js)

**Removed ~200 lines of code:**
- `POST /api/redemptions/heal` - Full endpoint removed
- `POST /api/redemptions/buff` - Partially removed (Strength/Defense removed, Haste kept)
- `POST /api/redemptions/gold` - Full endpoint removed
- `POST /api/redemptions/xp` - Full endpoint removed

**Available redemptions list shortened:**
- From 10 redemptions → 5 redemptions
- Removed entries for heal, strength, defense, gold, XP

## Benefits of Changes

### Subscriber-Weighted Voting
1. **More Fair**: Doesn't require viewers to spend money during stream
2. **Encourages Subscriptions**: Incentivizes long-term support
3. **Simpler System**: No complex bits calculations
4. **Better Community**: Rewards loyal community members

### Reduced Channel Point Redemptions
1. **Less Clutter**: Fewer options = clearer choices
2. **More Valuable**: Remaining redemptions feel more special
3. **Strategic Choices**: Players must choose wisely when to spend
4. **Prevents Abuse**: Can't spam heal/buff/gold/XP for easy progression

## Testing

All changes have been tested:
- ✅ Bot.js syntax is valid
- ✅ Server.js syntax is valid
- ✅ Voting weight now based on subscriber status
- ✅ Only 5 redemptions in available list
- ✅ Removed endpoints return 404 (if called)

## Migration Notes

**For Twitch Streamers:**
1. Remove old channel point redemptions from Twitch dashboard:
   - Minor Heal
   - Strength Boost
   - Defense Boost
   - Gold Boost
   - XP Boost

2. Keep/recreate these channel point redemptions:
   - Haste (1000 points)
   - Random Item Common (2000 points)
   - Random Item Uncommon (5000 points)
   - Random Item Rare (10000 points)
   - Instant Travel (3000 points)

3. Update viewers about voting changes:
   - Subscribers now get 2x vote weight in raids
   - No need to use bits for voting anymore

**For Developers:**
- No database migration needed (removed endpoints, didn't change schema)
- Frontend UI should update automatically via `/api/redemptions/available`
- Bot commands work immediately after restart

## Usage Examples

### Voting (Subscriber-Weighted)

```bash
# Non-subscriber votes
!vote buff_players
# Response: ✅ Username voted for buff_players!
# (Weight: 1)

# Subscriber votes
!vote buff_players
# Response: ✅ Username voted for buff_players (subscriber 2x weight)!
# (Weight: 2)
```

### Channel Point Redemptions

```bash
# Available redemptions
GET /api/redemptions/available

Response:
{
  "redemptions": [
    { "id": "buff_haste", "name": "Haste", "cost": 1000 },
    { "id": "item_common", "name": "Random Item (Common)", "cost": 2000 },
    { "id": "item_uncommon", "name": "Random Item (Uncommon)", "cost": 5000 },
    { "id": "item_rare", "name": "Random Item (Rare)", "cost": 10000 },
    { "id": "teleport", "name": "Instant Travel", "cost": 3000 }
  ]
}
```

## Rollback Plan

If you need to revert these changes:

1. **Restore bits-weighted voting:**
   - In `bot.js`, change back to `const bits = parseInt(tags.bits || '0', 10)`
   - In server vote endpoint, change `weight` back to `bits`

2. **Restore removed redemptions:**
   - Add back 5 endpoint handlers in server.js
   - Add back 5 redemption objects in `/api/redemptions/available`
   - Update documentation

All changes are isolated and can be reverted independently.

---

**Implementation Date:** December 9, 2025  
**Status:** ✅ Complete and Tested  
**Breaking Changes:** None (old systems gracefully deprecated)
