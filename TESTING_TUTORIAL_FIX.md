# Testing Guide: Tutorial Flow Fix

## Overview
This document provides step-by-step instructions for testing the tutorial flow fix that resolves the "Dialogue node not found" error.

## What Was Fixed

### Critical Bug Fix
**Problem**: Tutorial dialogue failed to load with error "Dialogue node not found"  
**Root Cause**: App.jsx was using incorrect NPC ID `'eldrin'` instead of `'tutorial_mentor'`  
**Solution**: Changed line 136 in App.jsx to use correct NPC ID

### Enhanced Debugging
- Added comprehensive logging throughout the tutorial flow
- Improved error messages with context markers `[App]`, `[TutorialDialogue]`, `[OAuth]`
- Enhanced reset script with better UX

## Prerequisites

Before testing, ensure:
1. Backend server is running (`npm start` from root directory)
2. You have access to browser developer console
3. You can authenticate via Twitch OAuth

## Test Case 1: New Player Flow (First Time User)

### Expected Behavior
New players should see the tutorial dialogue before character creation.

### Steps
1. **Clear Session**
   - Open browser developer tools (F12)
   - Clear all cookies and session storage
   - Close all browser tabs

2. **Authenticate**
   - Navigate to the application
   - Click "Login with Twitch"
   - Complete OAuth flow

3. **Verify Redirect**
   - Check URL after redirect: Should be `/adventure?tutorial=true&channel=<channel_name>`
   - Check browser console for: `🔍 [App] URL parameters parsed: { isTutorial: true, ... }`

4. **Verify Tutorial Dialogue**
   - Tutorial dialogue should appear immediately
   - Check console for:
     ```
     🎓 [App] Tutorial mode detected - showing tutorial dialogue
     📖 [TutorialDialogue] Loading dialogue node: { npcId: 'tutorial_mentor', nodeId: 'character_selection' }
     📖 [TutorialDialogue] Dialogue response: { success: true, hasNode: true, ... }
     ✅ [TutorialDialogue] Dialogue node loaded: character_selection
     ```

5. **Verify Dialogue Content**
   - NPC name should display: "Eldrin the Guide"
   - Icon should display: 🧙‍♂️
   - Dialogue text: "Welcome, brave soul, to {world_name}! I am Eldrin..."
   - Button should display: "Let me choose my class and role"

6. **Complete Flow**
   - Click "Let me choose my class and role"
   - Character creation screen should appear
   - Create character and verify it saves

### Expected Console Output
```
🔍 [App] URL parameters parsed: { isTutorial: true, isCreate: false, url: '/adventure?tutorial=true&channel=...' }
🔍 [App] Player fetched: { hasPlayer: false }
🎓 [App] Tutorial mode detected - showing tutorial dialogue
📖 [TutorialDialogue] Loading dialogue node: { npcId: 'tutorial_mentor', nodeId: 'character_selection' }
📖 [TutorialDialogue] Dialogue response: { success: true, hasNode: true, error: undefined }
✅ [TutorialDialogue] Dialogue node loaded: character_selection
```

### Success Criteria
- ✅ No "Dialogue node not found" error
- ✅ Eldrin dialogue appears correctly
- ✅ Character creation opens after clicking button
- ✅ All console logs show correct flow

## Test Case 2: Returning Player Flow (Tutorial Already Completed)

### Expected Behavior
Players who already completed the tutorial should skip directly to character creation.

### Steps
1. **Setup Test User**
   - Use existing account that completed tutorial before
   - OR manually mark tutorial as complete in database:
     ```sql
     UPDATE account_progress SET tutorial_completed = true WHERE player_id = '<your_id>';
     ```

2. **Authenticate**
   - Login with Twitch OAuth

3. **Verify Redirect**
   - Check URL: Should be `/adventure?create=true&channel=<channel_name>`
   - Check console for: `🔍 [App] URL parameters parsed: { isTutorial: false, isCreate: true, ... }`

4. **Verify Direct to Character Creation**
   - Character creation screen should appear immediately
   - NO tutorial dialogue should appear
   - Check console for:
     ```
     📝 [App] Create mode detected - showing character creation (tutorial skipped)
     ```

### Expected Console Output
```
🔍 [App] URL parameters parsed: { isTutorial: false, isCreate: true, url: '/adventure?create=true&channel=...' }
🔍 [App] Player fetched: { hasPlayer: false }
📝 [App] Create mode detected - showing character creation (tutorial skipped)
```

### Success Criteria
- ✅ Tutorial dialogue is skipped
- ✅ Character creation appears immediately
- ✅ Console logs show correct flow

## Test Case 3: Existing Player Flow (Character Already Created)

### Expected Behavior
Players with existing characters should go directly to the game.

### Steps
1. **Setup Test User**
   - Use account with existing character

2. **Authenticate**
   - Login with Twitch OAuth

3. **Verify Redirect**
   - Check URL: Should be `/adventure?channel=<channel_name>` (no tutorial or create param)

4. **Verify Game Loads**
   - Main game interface should load
   - Character data should be visible
   - No character creation or tutorial dialogue

### Success Criteria
- ✅ Game loads normally
- ✅ Character data is displayed
- ✅ No tutorial or character creation screens

## Test Case 4: Reset Tutorial Progress

### Purpose
Allows re-testing tutorial flow without creating new accounts.

### Steps
1. **Find Your Player ID**
   - Check database or look in session storage/cookies

2. **Run Reset Script**
   ```bash
   node scripts/reset_tutorial_progress.js <player_id>
   ```

3. **Verify Output**
   ```
   🔄 Resetting tutorial progress for player: <player_id>
   
   📊 Loading account progress...
      Current state: tutorial_completed = true
      ✅ Set tutorial_completed = false
   
   🎮 Checking characters...
      Checking character in channel: default
      ✅ Reset tutorial progress for default
   
   ✅ Tutorial progress reset complete!
   
   Next steps:
   1. Log out of the application
   2. Clear your browser session/cookies
   3. Log in again to test tutorial flow
   ```

4. **Follow Next Steps**
   - Log out of application
   - Clear browser cookies/session
   - Re-authenticate
   - Should now follow "New Player Flow" (Test Case 1)

## Server-Side Logging

The OAuth callback endpoint provides detailed logging. Look for these in server logs:

### New Player
```
🔍 [OAuth] Checking character for player: <username> (ID: <id>), channel: <channel>
🔍 [OAuth] Character exists: false, needs creation: true
🔍 [OAuth] Account progress loaded: false
🔍 [OAuth] tutorial_completed flag: false
📝 [OAuth] New player <username> - redirecting to tutorial
🔀 [OAuth] Redirect URL: /adventure?tutorial=true&channel=<channel>
```

### Returning Player
```
🔍 [OAuth] Checking character for player: <username> (ID: <id>), channel: <channel>
🔍 [OAuth] Character exists: false, needs creation: true
🔍 [OAuth] Account progress loaded: true
🔍 [OAuth] tutorial_completed flag: true
📝 [OAuth] Returning player <username> - redirecting to character creation (tutorial already completed)
🔀 [OAuth] Redirect URL: /adventure?create=true&channel=<channel>
```

## Common Issues

### Issue: "Dialogue node not found" Error
**Status**: FIXED ✅  
**Cause**: Wrong NPC ID in App.jsx  
**Solution**: Updated to use `'tutorial_mentor'` instead of `'eldrin'`

### Issue: Tutorial Dialogue Doesn't Appear
**Check**:
1. Verify URL has `?tutorial=true` parameter
2. Check console for App initialization logs
3. Verify player data is null/undefined
4. Check for JavaScript errors in console

### Issue: Character Creation Doesn't Open After Dialogue
**Check**:
1. Verify dialogue choice has `action: "open_character_creation"`
2. Check console for action trigger logs
3. Verify TutorialDialogue `onAction` prop is set

## Data Files Reference

### Dialogue Data
- **File**: `data/dialogue/tutorial_mentor_dialogue.json`
- **Tree ID**: `tutorial_mentor_dialogue`
- **Node ID**: `character_selection`
- **NPC ID**: `tutorial_mentor`

### NPC Data
- **File**: `data/npcs/tutorial_mentor.json`
- **ID**: `tutorial_mentor`
- **Name**: "Eldrin the Guide"
- **Title**: "Veteran Adventurer"
- **Icon**: 🧙‍♂️

## API Endpoints

### Get Dialogue Node
- **Endpoint**: `GET /api/tutorial/dialogue/:npcId/:nodeId`
- **Example**: `GET /api/tutorial/dialogue/tutorial_mentor/character_selection`
- **Response**:
  ```json
  {
    "success": true,
    "node": {
      "id": "character_selection",
      "text": "Welcome, brave soul...",
      "choices": [...],
      "action": "open_character_creation"
    }
  }
  ```

### Get NPC Data
- **Endpoint**: `GET /api/tutorial/npc/:npcId`
- **Example**: `GET /api/tutorial/npc/tutorial_mentor`

## Success Metrics

After testing, all these should be true:
- ✅ No "Dialogue node not found" errors
- ✅ New players see tutorial dialogue
- ✅ Returning players skip to character creation
- ✅ Existing players load game normally
- ✅ Console logs show clear flow tracking
- ✅ Reset script works correctly

## Rollback Plan

If issues are found:
1. Revert commit `20805eb`
2. Re-deploy previous version
3. Report issues with console logs

## Support

For issues or questions:
1. Check browser console logs
2. Check server logs
3. Verify data files exist and are valid JSON
4. Use reset script to test fresh user flow
