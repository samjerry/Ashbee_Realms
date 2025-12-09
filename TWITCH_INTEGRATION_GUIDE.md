# Twitch Integration Guide

## Bot Commands

### Raid Commands

**!raid** - Show available raid commands
```
!raid list                          # Show active lobbies
!raid create <raidId> [difficulty]  # Create a new raid lobby
!raid join <lobbyId> [role]         # Join an existing lobby
!raid leave                         # Leave your current lobby
!raid role <tank|healer|dps>        # Change your role
!raid info <raidId>                 # Get raid details
```

**Examples:**
```
!raid create goblin_siege normal
!raid join lobby_1234567890 tank
!raid role healer
!raid leave
```

### Voting Commands

**!vote <option>** - Vote during raid events
- Viewers can vote on raid events during 30-second voting windows
- Bits increase vote weight (more bits = more influence)
- Options will be announced during raid events

**Example:**
```
!vote buff_players
```

---

## Channel Point Redemptions

### Setting Up Redemptions in Twitch

1. Go to your Twitch Creator Dashboard
2. Navigate to **Viewer Rewards** > **Channel Points**
3. Click **Add New Custom Reward**
4. Configure each redemption:

### Available Redemptions

#### 1. Minor Heal (500 points)
- **Title**: Minor Heal
- **Description**: Restore 25% of your HP
- **Webhook URL**: `https://your-domain.com/api/redemptions/heal`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}"
}
```

#### 2. Strength Boost (750 points)
- **Title**: Strength Boost
- **Description**: Gain +25% attack damage for 10 turns
- **Webhook URL**: `https://your-domain.com/api/redemptions/buff`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "buffType": "strength"
}
```

#### 3. Defense Boost (750 points)
- **Title**: Defense Boost
- **Description**: Gain +30% defense for 10 turns
- **Webhook URL**: `https://your-domain.com/api/redemptions/buff`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "buffType": "defense"
}
```

#### 4. Haste (1,000 points)
- **Title**: Haste
- **Description**: Gain +50% speed for 10 turns
- **Webhook URL**: `https://your-domain.com/api/redemptions/buff`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "buffType": "haste"
}
```

#### 5. Gold Boost (1,000 points)
- **Title**: Gold Boost
- **Description**: Receive 50 gold per your level
- **Webhook URL**: `https://your-domain.com/api/redemptions/gold`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}"
}
```

#### 6. XP Boost (1,500 points)
- **Title**: XP Boost
- **Description**: Gain 100 XP per your level (may level you up!)
- **Webhook URL**: `https://your-domain.com/api/redemptions/xp`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}"
}
```

#### 7. Random Item (Common) (2,000 points)
- **Title**: Random Item (Common)
- **Description**: Receive a random common item
- **Webhook URL**: `https://your-domain.com/api/redemptions/item`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "rarity": "common"
}
```

#### 8. Random Item (Uncommon) (5,000 points)
- **Title**: Random Item (Uncommon)
- **Description**: Receive a random uncommon item
- **Webhook URL**: `https://your-domain.com/api/redemptions/item`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "rarity": "uncommon"
}
```

#### 9. Random Item (Rare) (10,000 points)
- **Title**: Random Item (Rare)
- **Description**: Receive a random rare item
- **Webhook URL**: `https://your-domain.com/api/redemptions/item`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "rarity": "rare"
}
```

#### 10. Instant Travel (3,000 points)
- **Title**: Instant Travel
- **Description**: Teleport to any unlocked location
- **Webhook URL**: `https://your-domain.com/api/redemptions/teleport`
- **Request Body**:
```json
{
  "player": "{{user_login}}",
  "channel": "{{broadcaster_login}}",
  "destination": "{{user_input}}"
}
```
- **Requires User Input**: Yes (destination name)

---

## API Endpoints

### Get Available Redemptions
```
GET /api/redemptions/available
```

**Response:**
```json
{
  "redemptions": [
    {
      "id": "heal",
      "name": "Minor Heal",
      "description": "Restore 25% of your HP",
      "cost": 500,
      "endpoint": "/api/redemptions/heal"
    },
    ...
  ],
  "count": 10
}
```

### Process Redemption (Generic Format)
```
POST /api/redemptions/{type}
```

**Request Body:**
```json
{
  "player": "username",      // Twitch username (REQUIRED)
  "channel": "channelname",   // Channel name (REQUIRED)
  "amount": 100,              // Optional: custom amount
  "buffType": "strength",     // For buffs: strength, defense, haste, regeneration
  "rarity": "rare",           // For items: common, uncommon, rare
  "destination": "Town Square" // For teleport: location name
}
```

---

## Testing Redemptions

### Manual Testing via API

You can test redemptions directly via the API without Twitch:

```bash
# Heal redemption
curl -X POST http://localhost:3000/api/redemptions/heal \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","channel":"testchannel"}'

# Buff redemption
curl -X POST http://localhost:3000/api/redemptions/buff \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","channel":"testchannel","buffType":"strength"}'

# Gold redemption
curl -X POST http://localhost:3000/api/redemptions/gold \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","channel":"testchannel","amount":500}'

# XP redemption
curl -X POST http://localhost:3000/api/redemptions/xp \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","channel":"testchannel","amount":1000}'

# Item redemption
curl -X POST http://localhost:3000/api/redemptions/item \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","channel":"testchannel","rarity":"rare"}'

# Teleport redemption
curl -X POST http://localhost:3000/api/redemptions/teleport \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","channel":"testchannel","destination":"Whispering Woods"}'
```

---

## Important Notes

### Player-Specific Redemptions
- ✅ **All redemptions apply ONLY to the redeeming player**
- The `player` field in the request must match the Twitch username
- The `channel` field identifies which stream/channel the player is on

### Chat Announcements
- All successful redemptions broadcast to chat
- Format: `💊 PlayerName redeemed Minor Heal and restored 250 HP!`

### Multi-Channel Support
- Each channel can have separate player progress
- Redemptions are channel-specific (player on ChannelA != player on ChannelB)

### Error Handling
- Invalid players return 404
- Missing fields return 400
- Server errors return 500
- Failed redemptions do NOT consume channel points (handled by Twitch)

---

## EventSub Webhook Setup (Optional)

For automatic redemption processing, set up Twitch EventSub webhooks:

1. Register your callback URL: `https://your-domain.com/api/twitch/eventsub`
2. Subscribe to `channel.channel_points_custom_reward_redemption.add`
3. Implement webhook verification in `server.js`

**Example EventSub Handler:**
```javascript
app.post('/api/twitch/eventsub', (req, res) => {
  // Verify webhook challenge
  if (req.body.challenge) {
    return res.send(req.body.challenge);
  }

  // Process redemption
  const event = req.body.event;
  const reward = event.reward.title;
  const user = event.user_login;
  const broadcaster = event.broadcaster_user_login;

  // Map reward to endpoint
  const rewardMap = {
    'Minor Heal': '/api/redemptions/heal',
    'Strength Boost': '/api/redemptions/buff',
    // ... etc
  };

  // Call appropriate endpoint
  // ... implementation
});
```

---

## Troubleshooting

### Bot Commands Not Working
1. Check bot is connected: Look for `✅ Bot connected` in console
2. Verify channels in `.env`: `CHANNELS=channelname1,channelname2`
3. Check OAuth token is valid: `BOT_OAUTH_TOKEN=oauth:...`

### Redemptions Not Applying
1. Verify player exists in database
2. Check player name matches exactly (case-insensitive)
3. Verify channel name is correct
4. Check server logs for errors

### Announcements Not Showing
1. Verify bot is connected to channel
2. Check cooldowns (2s global, 3s per user)
3. Ensure `rawAnnounce()` is being called

---

## Next Steps

- [ ] Add EventSub webhook integration for automatic processing
- [ ] Create chat mini-games (!roll, !trivia, !predict)
- [ ] Add viewer participation in solo adventures
- [ ] Implement more redemption types
- [ ] Add redemption history/analytics
