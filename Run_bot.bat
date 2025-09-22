@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM activate (optional but nice)
if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"

REM load config.env into process env (single source of truth)
for /f "usebackq tokens=1,* delims==" %%A in (`
  findstr /r "^[^#].*=" config.env 2^>nul
`) do set "%%A=%%B"

REM sanity check
if "%TWITCH_OAUTH%"=="" (
  echo [ERROR] TWITCH_OAUTH is empty. Run setup to get tokens.
  pause & exit /b 1
)
if "%TWITCH_CHANNEL%"=="" (
  echo [ERROR] TWITCH_CHANNEL is empty. Set it in config.env.
  pause & exit /b 1
)

echo Starting server and bot...
start "Adventure Server" cmd /k ".venv\Scripts\python.exe" -m uvicorn server.app:app --reload
timeout /t 2 /nobreak >nul
start "Twitch Bot"    cmd /k ".venv\Scripts\python.exe" -m server.twitch_bot
endlocal
