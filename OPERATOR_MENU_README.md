# Operator Menu System

The Operator Menu is a powerful admin panel that allows stream moderators and the streamer to manage game state, players, and world settings in real-time.

## Access Levels

The system has three permission levels, each with increasing privileges:

### 1. Moderator (Basic Operations)
- **Who**: Channel moderators
- **Commands**: Basic player assistance and minor world manipulation
- **Use Case**: Helping stuck players, fixing minor issues, enhancing stream experience

### 2. Streamer (Advanced Operations)  
- **Who**: Channel broadcaster/owner
- **Commands**: Full game control including removals and resets
- **Use Case**: Major stream events, content creation, storyline management

### 3. Creator (System Operations)
- **Who**: MarrowOfAlbion (game creator)
- **Commands**: Unrestricted access to all commands
- **Use Case**: System maintenance, emergency fixes, development

## Available Commands

### Moderator Commands

#### Player Management
- **Give Item**: Add specific items to player inventory
  - Parameters: Player ID, Item ID, Quantity
  - Example: Give "Health Potion" x5 to a player

- **Give Gold**: Award gold to players
  - Parameters: Player ID, Amount
  - Example: Give 1000 gold for completing a challenge

- **Give Experience**: Award XP to players
  - Parameters: Player ID, Amount
  - Example: Give 500 XP for good roleplay

- **Heal Player**: Restore player to full HP
  - Parameters: Player ID
  - Example: Heal player after unfair death

#### World Manipulation
- **Change Weather**: Alter current weather conditions
  - Options: Clear, Rain, Storm, Snow, Fog
  - Effect: Global for all players in channel

- **Change Time**: Set time of day
  - Options: Dawn, Day, Dusk, Night
  - Effect: Global for all players in channel

#### Game Events
- **Spawn Encounter**: Force specific encounter for player
  - Parameters: Player ID, Encounter ID
  - Example: Trigger boss fight or special event

- **Teleport Player**: Move player to any location
  - Parameters: Player ID, Location Name
  - Example: Rescue stuck players or start events

### Streamer Commands

All moderator commands, plus:

#### Advanced Player Management
- **Remove Item**: Take items from player inventory
  - Parameters: Player ID, Item ID, Quantity
  - Example: Remove quest items after completion

- **Remove Gold**: Deduct gold from player
  - Parameters: Player ID, Amount
  - Example: Penalties for in-game actions

- **Remove Level**: Reduce player level
  - Parameters: Player ID, Number of Levels
  - Example: Hardcore mode penalties

- **Set Player Level**: Directly set player level
  - Parameters: Player ID, Level (1-100)
  - Example: Quick character progression for events

- **Clear Inventory**: Remove all items from player
  - Parameters: Player ID
  - Example: Fresh start after major event

#### Quest & Achievement Management
- **Reset Quest**: Allow quest to be replayed
  - Parameters: Player ID, Quest ID
  - Example: Replay broken quest or special content

- **Unlock Achievement**: Grant achievement to player
  - Parameters: Player ID, Achievement ID
  - Example: Reward special achievements

#### World & Season Control
- **Change Season**: Alter current season
  - Options: Spring, Summer, Fall, Winter
  - Effect: Changes biome bonuses, events, weather patterns

- **Force Event**: Trigger global game event
  - Parameters: Event ID
  - Example: Start server-wide raid or holiday event

#### Debug Commands
- **Set Player Stats**: Directly modify player stats
  - Parameters: Player ID, Stats Object (HP, Max HP, Gold)
  - Example: Fine-tune for special scenarios

- **Give All Items**: Grant common items collection
  - Parameters: Player ID
  - Example: Testing or special rewards

### Creator Commands

All above commands, plus reserved system-level operations for future expansion.

## How to Use

### For Moderators/Streamers

1. **Access the Menu**
   - Look for the "Operator" button in the header (purple shield icon)
   - Only visible if you have operator permissions
   - Click to open the operator menu

2. **Select a Command**
   - Browse available commands in the left panel
   - Commands are organized by permission level
   - Click a command to see its details

3. **Fill Parameters**
   - Enter required information for the command
   - For player selection: use the search dropdown
   - For options: select from dropdown menus

4. **Execute**
   - Click "Execute Command" button
   - Wait for confirmation message
   - Check player list for updated status

### Command Tips

- **Be Conservative**: Start with small values and increment
- **Test First**: Try commands on test accounts when possible
- **Communicate**: Tell chat what you're doing for transparency
- **Check Logs**: Use audit log to track recent actions

## Security Features

### Rate Limiting
- Maximum 20 commands per minute per operator
- Prevents accidental spam or abuse
- Automatic reset after 1 minute

### Audit Logging
All operator actions are logged with:
- Timestamp
- Operator name and ID
- Channel name
- Command executed
- Parameters used
- Success/failure status
- Error messages (if any)

### Permission Validation
Multiple layers of security:
1. Session authentication
2. Role verification from database
3. Command permission check
4. Rate limit check
5. Parameter validation

### Auto Role Updates
- User roles automatically sync from Twitch
- Updates on every chat message
- Roles: viewer, VIP, moderator, streamer
- Creator (MarrowOfAlbion) always has access

## Technical Details

### Database Tables

#### user_roles
Tracks user permissions per channel:
```sql
CREATE TABLE user_roles (
  player_id TEXT,
  channel_name TEXT,
  role TEXT (viewer/vip/moderator/streamer),
  last_updated TIMESTAMP
);
```

#### game_state
Global game settings per channel:
```sql
CREATE TABLE game_state (
  channel_name TEXT PRIMARY KEY,
  weather TEXT DEFAULT 'Clear',
  time_of_day TEXT DEFAULT 'Day',
  season TEXT DEFAULT 'Spring',
  active_event TEXT
);
```

#### operator_audit_log
Complete audit trail:
```sql
CREATE TABLE operator_audit_log (
  id SERIAL PRIMARY KEY,
  operator_id TEXT,
  operator_name TEXT,
  channel_name TEXT,
  command TEXT,
  params JSONB,
  success BOOLEAN,
  error_message TEXT,
  executed_at TIMESTAMP
);
```

### API Endpoints

- `GET /api/operator/status` - Check access level
- `GET /api/operator/commands` - Get available commands
- `POST /api/operator/execute` - Execute command
- `GET /api/operator/players` - List channel players
- `GET /api/operator/audit-log` - View action history

### Frontend Component

Located at: `public/src/components/Operator/OperatorMenu.jsx`

Features:
- React component with hooks
- Real-time permission checking
- Interactive player search
- Command parameter validation
- Success/error messaging
- Responsive design

## Best Practices

### For Moderators

1. **Assistance Priority**
   - Fix bugs and stuck situations first
   - Enhance stream experience second
   - Entertainment effects third

2. **Communication**
   - Always announce what you're doing in chat
   - Explain why you're using commands
   - Be transparent about changes

3. **Documentation**
   - Keep notes on what works well
   - Report bugs or issues
   - Suggest new commands

### For Streamers

1. **Content Creation**
   - Use commands to create story moments
   - Balance gameplay with spectacle
   - Plan major events in advance

2. **Player Balance**
   - Avoid showing favoritism
   - Be fair with punishments/rewards
   - Consider impact on other players

3. **Stream Quality**
   - Use commands to maintain pacing
   - Fix technical issues quickly
   - Create memorable experiences

### For Everyone

- **Don't Spam**: Respect rate limits
- **Test Carefully**: Use small values first
- **Be Responsible**: Commands affect real player progress
- **Have Fun**: Enhance the experience for everyone

## Troubleshooting

### Can't See Operator Button
- Check your Twitch role in the channel
- Verify you're logged in correctly
- Try refreshing the page
- Check with streamer if you should have access

### Commands Not Working
- Check if you have permission for that command
- Verify all required parameters are filled
- Look for error messages in the UI
- Check if rate limit was exceeded

### Player Not Appearing in List
- Make sure they've joined the adventure
- Check if they're in the correct channel
- Try refreshing the player list
- Verify correct channel is selected

## Future Enhancements

Planned features:
- Batch command execution
- Command scheduling
- Custom command macros
- Enhanced audit log viewer
- Mobile-friendly operator panel
- Webhook integrations

## Support

For issues or questions:
1. Check this documentation first
2. Review audit logs for errors
3. Ask in stream chat or Discord
4. Contact MarrowOfAlbion for creator access

---

**Remember**: With great power comes great responsibility. Use operator commands wisely to enhance the game experience for everyone! 🛡️
