# Read token from .env and strip optional oauth: prefix
$envFile = Get-Content .env
$tokLine = $envFile | Where-Object { $_ -match '^BOT_OAUTH_TOKEN=' }
$tok = $tokLine -replace '^BOT_OAUTH_TOKEN=','' -replace '"',''
$tokClean = $tok -replace '^oauth:',''

# Validate against Twitch
Invoke-RestMethod -Uri 'https://id.twitch.tv/oauth2/validate' -Headers @{ Authorization = "OAuth $tokClean" } -ErrorAction Stop