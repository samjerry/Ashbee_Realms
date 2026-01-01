# Testing the Edit Existing Settings Flow

## Overview
This implementation adds a comprehensive "edit existing settings" flow for the broadcaster setup page that loads current game state, displays it in the form, and properly updates the database row.

## Testing Checklist

### 1. New Broadcaster (First Time Setup)
**Test Steps:**
1. Broadcaster runs `!setup` command in their Twitch channel
2. Completes OAuth flow and is redirected to `/setup`
3. Setup page should show:
   - Default values in all fields:
     - World Name: "Ashbee Realms"
     - Game Mode: "softcore"
     - Weather: "Clear"
     - Time of Day: "Day"
     - Season: "Spring"
   - Header says "Game Setup" (not "Edit Game Settings")
   - "Save Changes" button is disabled (no changes made yet)
4. Change some settings (e.g., set World Name to "My World")
5. Verify "Save Changes" button becomes enabled
6. Verify yellow warning shows "⚠️ You have unsaved changes"
7. Click "Save Changes"
8. Verify success message: "✅ Settings saved successfully!"
9. Verify database has ONE row for this channel

**Expected Database Behavior:**
- SQL: `INSERT INTO game_state (...) VALUES (...)`
- Console log: `✨ Created game state for <channel>`

### 2. Existing Broadcaster (Edit Settings)
**Test Steps:**
1. Broadcaster who previously ran setup runs `!setup` again
2. Completes OAuth flow and is redirected to `/setup`
3. Setup page should show:
   - Previously saved values pre-filled in all fields
   - Header says "Edit Game Settings"
   - Yellow alert: "You have existing settings. Make changes and save to update."
   - "Save Changes" button is disabled (no changes made yet)
4. Change some settings (e.g., Weather to "Rain")
5. Verify changed field label turns yellow and shows "(Modified)"
6. Click "Reset" button
7. Verify field reverts to original value
8. Change field again and click "Save Changes"
9. Verify success message appears
10. Verify database still has ONE row for this channel (not duplicated)

**Expected Database Behavior:**
- SQL: `UPDATE game_state SET ... WHERE channel_name = ...`
- Console log: `🔄 Updated game state for <channel>`

### 3. Change Detection
**Test Steps:**
1. Open setup page with existing settings
2. Change World Name field
3. Verify:
   - Label turns yellow
   - Shows "(Modified)" text
   - "Save Changes" button becomes enabled
   - Yellow warning appears at bottom
4. Change it back to original value
5. Verify:
   - Label returns to gray
   - "(Modified)" text disappears
   - "Save Changes" button becomes disabled
   - Yellow warning disappears

### 4. Unsaved Changes Warning
**Test Steps:**
1. Make changes to any field
2. Attempt to navigate away or close browser
3. Verify browser shows: "You have unsaved changes. Are you sure you want to leave?"
4. Click "Reset" or "Save Changes"
5. Attempt to navigate away again
6. Verify no warning appears

### 5. Validation
**Test Steps:**
1. Verify these game modes work: softcore, hardcore, ironman
2. Verify these weather options work: Clear, Rain, Snow, Storm, Fog
3. Verify these times of day work: Day, Night, Dawn, Dusk
4. Verify these seasons work: Spring, Summer, Autumn, Winter
5. Verify World Name is limited to 50 characters

### 6. API Endpoints
**Manual Testing with curl/Postman:**

Get Settings:
```bash
curl -X GET http://localhost:3000/api/setup/settings \
  -H "Cookie: sessionId=..." \
  -H "Content-Type: application/json"
```

Expected Response (new setup):
```json
{
  "success": true,
  "settings": {
    "worldName": "Ashbee Realms",
    "gameMode": "softcore",
    "weather": "Clear",
    "timeOfDay": "Day",
    "season": "Spring",
    "maintenanceMode": false,
    "activeEvent": null
  },
  "channel": "testchannel",
  "isExistingSetup": false
}
```

Save Settings:
```bash
curl -X POST http://localhost:3000/api/setup/settings \
  -H "Cookie: sessionId=..." \
  -H "Content-Type: application/json" \
  -d '{
    "worldName": "My Custom World",
    "gameMode": "hardcore",
    "weather": "Storm",
    "timeOfDay": "Night",
    "season": "Winter"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Settings saved successfully",
  "settings": {
    "worldName": "My Custom World",
    "gameMode": "hardcore",
    "weather": "Storm",
    "timeOfDay": "Night",
    "season": "Winter",
    "maintenanceMode": false,
    "activeEvent": null
  }
}
```

### 7. Database Verification
**Check for duplicates:**
```sql
SELECT channel_name, COUNT(*) 
FROM game_state 
GROUP BY channel_name 
HAVING COUNT(*) > 1;
```
Expected: No rows (no duplicates)

**Check update vs create:**
```sql
SELECT 
  channel_name, 
  world_name, 
  game_mode, 
  weather, 
  last_updated 
FROM game_state 
WHERE channel_name = 'testchannel';
```
After first save: Should see row with created timestamp
After second save: Should see SAME row with updated timestamp (not new row)

## Implementation Details

### Files Modified
- `db.js` - Enhanced `getGameState()` and `setGameState()` functions
- `server.js` - Mounted new setup routes, updated consistency
- `public/src/App.jsx` - Updated to use new SetupView component

### Files Created
- `routes/setup.routes.js` - New API endpoints for setup
- `public/src/components/Setup/SetupView.jsx` - New setup UI component

### Key Features
1. ✅ Loads existing settings when broadcaster accesses setup
2. ✅ Pre-populates form fields with current values
3. ✅ Updates (not duplicates) settings when saved
4. ✅ Shows confirmation of what changed
5. ✅ Visual indicators for modified fields
6. ✅ Unsaved changes warning
7. ✅ Reset functionality
8. ✅ Proper validation
9. ✅ UPSERT SQL for update/create logic
10. ✅ Logging to show update vs create
