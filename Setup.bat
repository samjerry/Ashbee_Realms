@echo off
setlocal EnableDelayedExpansion

REM ===============================
REM Twitch Adventure Bot Setup
REM ===============================

echo.
echo === 1) Create virtual environment ===
python -m venv .venv
if %ERRORLEVEL% neq 0 (
    echo Failed to create venv. Do you have Python installed and on PATH?
    echo press any key to exit
    pause >nul
    exit /b 1
)

echo.
echo === 2) Activate environment and install dependencies ===
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo === 3) Ensure env files exist ===
if not exist config.env (
    echo Creating config.env
    (
        echo TWITCH_CHANNEL=
        echo TWITCH_BOT_NICK=
        echo TWITCH_OAUTH=
        echo COMMAND_PREFIX=
        echo JWT_SECRET=
        echo BASE_URL=http://localhost:8000
        echo LOOT_MIN_RARITY=
        echo DISPLAY_GAINED_LEVEL=
        echo DISPLAY_PLAYER_DIED=
        echo DISPLAY_ENCOUNTER_BOSS=
    )>config.env
)

echo.
echo === 4) Get Twitch OAuth tokens (guided) ===
echo We will open the Twitch Developer Console so you can create an app first.
echo Steps:
echo   1) Press the purple button "Register Your Application"
echo   2) Name: any name you like (only for you)
echo   3) OAuth Redirect URLs: http://localhost:8000/oauth/callback
echo      (copy this somewhere safe, used later)
echo   4) Category: Chat Bot
echo   5) Client Type: Confidential
echo   6) Complete the reCAPTCHA and press Create
echo   7) Press Manage on your new application
echo   8) Copy the Client ID and New Secret into a text file for later use

choice /C YN /M "Open the Twitch Developer Console now?"
if errorlevel 2 (
    echo Skipping opening the console in browser...
) else (
    start "" https://dev.twitch.tv/console/apps
)

echo.
echo When you have your Client ID, Client Secret, and Redirect URL, we'll continue.
REM Run the guided helper which will prompt and then open the auth page
.venv\Scripts\python.exe tools\get_twitch_tokens.py


if %ERRORLEVEL% neq 0 (
    echo Token helper exited with an error. You can re-run this script later.
)

echo.
echo === 5) Collect missing settings ===
set /p TW_CHANNEL=Enter the Twitch channel name (the channel the bot joins): 
set "TW_BOTNICK=!TW_CHANNEL!"
set /p CMD_PREFIX=Enter the command prefix [recommended = %%]: 
if "!CMD_PREFIX!"=="" set "CMD_PREFIX=%"

REM Generate a default JWT secret if user leaves blank (32 chars)
for /f %%A in ('powershell -NoProfile -Command "$s=-join ((48..57+65..90+97..122)|Get-Random -Count 32|%%{[char]$_}); Write-Output $s"') do set "GEN_JWT=%%A"
set /p JWT=Enter JWT secret (leave blank to auto-generate): 
if "!JWT!"=="" set "JWT=!GEN_JWT!"

set /p BASE=Enter BASE_URL (default: http://localhost:8000): 
if "!BASE!"=="" set "BASE=http://localhost:8000"

echo.
echo --- Loot Broadcast Setting ---
echo LOOT_MIN_RARITY controls which loot drops are announced to chat.
echo Only drops at or above this rarity will be broadcast.
echo Options:
echo   1) Common
echo   2) Uncommon
echo   3) Rare
echo   4) Epic        (default)
echo   5) Legendary
echo   6) Mythic
:ask_loot
set "LOOT_CHOICE="
set /p LOOT_CHOICE=Choose a number 1-6 (press Enter for default Epic): 
if "!LOOT_CHOICE!"=="" set "LOOT=epic" & goto loot_done
if "!LOOT_CHOICE!"=="1" set "LOOT=common" & goto loot_done
if "!LOOT_CHOICE!"=="2" set "LOOT=uncommon" & goto loot_done
if "!LOOT_CHOICE!"=="3" set "LOOT=rare" & goto loot_done
if "!LOOT_CHOICE!"=="4" set "LOOT=epic" & goto loot_done
if "!LOOT_CHOICE!"=="5" set "LOOT=legendary" & goto loot_done
if "!LOOT_CHOICE!"=="6" set "LOOT=mythic" & goto loot_done
echo Please enter a valid choice (1-6).
goto ask_loot
:loot_done

echo.
echo --- Display Flags ---
echo These control which in-game events are announced to chat.
echo   DISPLAY_GAINED_LEVEL  - Announces when a player levels up.
echo   DISPLAY_PLAYER_DIED   - Announces when a player dies.
echo   DISPLAY_ENCOUNTER_BOSS- Announces when a boss encounter starts.
echo Answer Yes or No (default: Yes).

REM DISPLAY_GAINED_LEVEL
:ask_disp_lvl
choice /C YN /M "Display level-up in chat?"
if errorlevel 2 set "DISP_LVL=false" & goto got_disp_lvl
if errorlevel 1 set "DISP_LVL=true"  & goto got_disp_lvl
goto ask_disp_lvl
:got_disp_lvl

REM DISPLAY_PLAYER_DIED
:ask_disp_die
choice /C YN /M "Display player death in chat?"
if errorlevel 2 set "DISP_DIE=false" & goto got_disp_die
if errorlevel 1 set "DISP_DIE=true"  & goto got_disp_die
goto ask_disp_die
:got_disp_die

REM DISPLAY_ENCOUNTER_BOSS
:ask_disp_boss
choice /C YN /M "Display boss encounters in chat?"
if errorlevel 2 set "DISP_BOSS=false" & goto got_disp_boss
if errorlevel 1 set "DISP_BOSS=true"  & goto got_disp_boss
goto ask_disp_boss
:got_disp_boss

echo.
echo === 6) Write values into config.env ===

REM Pull existing TWITCH_OAUTH from config.env if present
set "TWITCH_OAUTH_VALUE="
for /f "usebackq tokens=1,* delims==" %%A in (`
  findstr /r "^TWITCH_OAUTH=" config.env 2^>nul
`) do set "TWITCH_OAUTH_VALUE=%%B"

REM Write fresh config.env (single source of truth)
(
  echo TWITCH_CHANNEL=!TW_CHANNEL!
  echo TWITCH_BOT_NICK=!TW_BOTNICK!
  echo TWITCH_OAUTH=!TWITCH_OAUTH_VALUE!
  echo COMMAND_PREFIX=!CMD_PREFIX!
  echo JWT_SECRET=!JWT!
  echo BASE_URL=!BASE!
  echo LOOT_MIN_RARITY=!LOOT!
  echo DISPLAY_GAINED_LEVEL=!DISP_LVL!
  echo DISPLAY_PLAYER_DIED=!DISP_DIE!
  echo DISPLAY_ENCOUNTER_BOSS=!DISP_BOSS!
)>config.env

echo Wrote config.env

echo.
echo === Creating Run_bot.bat ===
(
  echo @echo off
  echo setlocal EnableDelayedExpansion
  echo cd /d "%%~dp0"
  echo.
  echo if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
  echo.
  echo for /f "usebackq tokens^=1,* delims^==^" %%%%A in ^( ^
    findstr /r "^[^#].*=" config.env 2^^^>nul ^
  ^) do set "%%%%A=%%%%B"
  echo.
  echo if "%%TWITCH_OAUTH%%"=="" ^(
  echo   echo [ERROR] TWITCH_OAUTH is empty. Run setup to get tokens.
  echo   pause ^& exit /b 1
  echo ^)
  echo if "%%TWITCH_CHANNEL%%"=="" ^(
  echo   echo [ERROR] TWITCH_CHANNEL is empty. Set it in config.env.
  echo   pause ^& exit /b 1
  echo ^)
  echo.
  echo echo Starting server and bot...
  echo start "Adventure Server" cmd /k ".venv\Scripts\python.exe" -m uvicorn server.app:app --reload
  echo timeout /t 2 /nobreak ^>nul
  echo start "Twitch Bot" cmd /k ".venv\Scripts\python.exe" -m server.twitch_bot
  echo endlocal
) > Run_bot.bat

echo.
echo =====================================
echo Setup complete
echo - config.env updated.
echo.
echo - Start the bot by launching the Run_bot.bat
echo =====================================


echo.
echo press any key to exit
pause >nul
endlocal