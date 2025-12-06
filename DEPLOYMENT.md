## Deploying to Railway

This guide walks you through deploying your Twitch Adventure bot to Railway.app, so it runs 24/7 on the cloud.

### Prerequisites

1. **GitHub account** — Railway deploys from GitHub repos
2. **Railway account** — Sign up at railway.app (free tier available)
3. **Code pushed to GitHub** — Make sure your code is in a GitHub repository

### Step 1: Create a GitHub Repository

```bash
cd "c:\Users\jojaj\OneDrive\Bureaublad\Stroom\Dungeon Crawler"
git init
git add .
git commit -m "Initial commit: Twitch Adventure bot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dungeon-crawler.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 2: Set Up PostgreSQL on Railway

1. Go to **railway.app**
2. Sign in with GitHub
3. Click **+ New Project**
4. Click **Add Service** → **Provision PostgreSQL**
5. Wait for the database to initialize (2-3 minutes)
6. Click the PostgreSQL card → **Connect**
7. Copy the `DATABASE_URL` (it will look like `postgresql://user:pass@host:port/db`)

### Step 3: Deploy Your Node App on Railway

1. In the same project, click **+ New Service**
2. Select **GitHub Repo** (authenticate if needed)
3. Select your `dungeon-crawler` repository
4. Railway will auto-detect Node.js
5. Click **Deploy**

### Step 4: Set Environment Variables on Railway

After deployment starts, click your Node.js service → **Variables** and add:

```
# Bot credentials
BOT_USERNAME=ashbee_realms_narrator
BOT_OAUTH_TOKEN=oauth:xxxx_your_token_here_xxxx
CHANNEL=MarrowOfAlbion

# Twitch OAuth
TWITCH_CLIENT_ID=72qo6341srsf2fr6z5pqqpgvfwof2f
TWITCH_CLIENT_SECRET=ag2was429la1ybcavbl6pszhohvc4m

# Session & server
SESSION_SECRET=your_super_secret_random_string_here_change_me
PORT=3000

# Cooldowns (optional, in milliseconds)
GLOBAL_COOLDOWN_MS=2000
USER_COOLDOWN_MS=5000
```

**Important:** Railway automatically provides `DATABASE_URL` for PostgreSQL (you don't need to add it).

### Step 5: Update Twitch OAuth Redirect URI

Your Railway app will get a public URL like `https://dungeon-crawler-prod.railway.app`.

1. Go to **dev.twitch.tv/console/apps** → your app → **Manage**
2. Update **OAuth Redirect URLs** to:
   ```
   https://your-app-prod.railway.app/auth/twitch/callback
   ```
   (replace with your actual Railway URL)

3. Update your `.env` locally and re-push to GitHub:
   ```
   BASE_URL=https://your-app-prod.railway.app
   ```
   ```bash
   git add .env
   git commit -m "Update BASE_URL for Railway deployment"
   git push
   ```

### Step 6: Monitor & Test

1. In Railway, click your Node.js service → **Logs** to see console output
2. Visit your Railway URL (e.g., `https://dungeon-crawler-prod.railway.app/adventure`)
3. Test Twitch OAuth login
4. Test bot announcements by fighting a boss

### Troubleshooting

**Build fails with "pg" module not found:**
- Make sure you ran `npm install` locally and committed `package-lock.json`
- Push the updated code to GitHub

**Database connection error:**
- Verify `DATABASE_URL` is set in Railway Variables
- Check PostgreSQL service is running (green status)
- Logs should show "✅ Connected to PostgreSQL"

**Twitch OAuth redirect fails:**
- Verify the Redirect URI in Twitch console matches exactly (case-sensitive, including https://)
- Make sure your `BASE_URL` environment variable is set correctly

**Bot doesn't announce:**
- Check that `BOT_OAUTH_TOKEN` is correct and hasn't expired
- Verify `BOT_USERNAME` and `CHANNEL` match your Twitch account names (lowercase)
- Check logs for connection errors

### Going Further

**Connect to Railway PostgreSQL locally (for debugging):**

The `DATABASE_URL` from Railway can be used locally too:

```bash
# Set it temporarily in PowerShell
$env:DATABASE_URL = "postgresql://user:pass@host:port/db"
npm start
```

**Use Railway CLI (optional):**

```bash
npm install -g @railway/cli
railway login
railway link  # select your Railway project
railway up    # deploy from command line
```

**Scale up:**

Railway's free tier should handle modest traffic. If you need more power:
- Click your service → **Scale** → increase CPU/Memory
- Cost is pay-as-you-go (~$1-5 USD/month for small usage)

### Keeping Your Bot Running 24/7

Railway keeps your app running automatically. To restart it manually:
1. Click your Node.js service
2. Click **More** (…) → **Restart**

Updates automatically redeploy when you push to GitHub (if auto-deploy is enabled).
