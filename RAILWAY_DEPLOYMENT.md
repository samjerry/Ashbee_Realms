# Railway Deployment Guide - Ashbee Realms

This guide explains how to deploy both the backend and frontend to Railway on a **single service**.

---

## ⚠️ IMPORTANT: Database Migration Required

**If you get errors about missing columns (e.g., "column 'base_stats' does not exist"):**

Your Railway database schema needs to be updated. Run the migration script:

```powershell
# 1. Get your Railway DATABASE_URL
#    Railway dashboard → PostgreSQL service → Variables → Copy DATABASE_URL

# 2. Add to .env file temporarily:
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway

# 3. Run migration (includes comprehensive checks):
npm run migrate

# 4. Remove DATABASE_URL from .env when done
```

**The migration script will:**
- ✅ Validate all environment variables
- ✅ Test PostgreSQL connection
- ✅ Verify database permissions
- ✅ Check if tables exist and are properly linked
- ✅ Add missing columns with default values
- ✅ Update existing player records
- ✅ Verify the migration succeeded

You only need to run this once, or whenever new database columns are added to the code.

---

## 🎯 Overview

**Development vs Production:**
- **Development**: Frontend runs on port 3001 (Vite dev server), Backend on port 3000
- **Production (Railway)**: Everything runs on port 3000 (backend serves frontend static files)

---

## 📦 Deployment Architecture

Railway will:
1. Install backend dependencies (`npm install` in root)
2. Install frontend dependencies (`cd public && npm install`)
3. Build React app to static files (`cd public && npm run build` → `public/dist/`)
4. Start Node.js server (`npm start`)
5. Server serves API on `/api` routes + static files from `public/dist/`

---

## 🛠️ Step 1: Update server.js

Add static file serving to `server.js` (after all API routes):

```javascript
// Serve React frontend (production only)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  
  // Serve static files from public/dist
  app.use(express.static(path.join(__dirname, 'public/dist')));
  
  // Serve index.html for all non-API routes (React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist/index.html'));
  });
}
```

---

## 🛠️ Step 2: Update package.json

Add build script to root `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "build": "cd public && npm install && npm run build",
    "dev": "node server.js"
  }
}
```

---

## 🛠️ Step 3: Create Environment Variables in Railway

### Required Variables:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...  # Railway will provide this
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_BOT_USERNAME=your_bot_username
TWITCH_OAUTH_TOKEN=your_oauth_token
TWITCH_CHANNEL=your_channel_name
SESSION_SECRET=your_random_secret_key
```

### Optional Variables:
```env
CLIENT_URL=https://your-app.up.railway.app  # For WebSocket CORS
```

---

## 🛠️ Step 4: Railway Configuration

### Create `railway.toml` in project root:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## 🚀 Step 5: Deploy to Railway

### Option A: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add PostgreSQL database (Railway Marketplace)
6. Set environment variables (Step 3)
7. Railway auto-builds and deploys

### Option B: Railway CLI
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to PostgreSQL
railway add

# Deploy
railway up
```

---

## 🔧 Step 6: Verify Deployment

### Check Build Logs:
- Railway should show: "Building frontend..." and "Starting server..."

### Test Endpoints:
- **Frontend**: `https://your-app.up.railway.app`
- **API Health**: `https://your-app.up.railway.app/api/health`
- **WebSocket**: Should connect automatically

### Common Issues:

**1. Build fails:**
```bash
# Check Railway logs for errors
# Ensure public/package.json exists
# Verify all dependencies are listed
```

**2. Frontend shows blank page:**
```bash
# Check server.js has static file serving
# Verify public/dist/ exists after build
# Check browser console for errors
```

**3. API calls fail (404):**
```bash
# Ensure API routes come BEFORE static file serving
# Check proxy configuration is removed (only for dev)
# Verify all /api routes are defined
```

**4. WebSocket fails to connect:**
```bash
# Add CLIENT_URL environment variable
# Update websocket/socketHandler.js CORS config
# Ensure Socket.io server is initialized in server.js
```

**5. Database errors (column does not exist):**
```bash
# Your database schema is outdated
# Run migration script locally:
#   1. Get DATABASE_URL from Railway dashboard
#   2. Add to your local .env file temporarily
#   3. Run: node migrate-database.js
#   4. Remove DATABASE_URL from .env when done
```

---

## 🔄 Database Migrations

When you add new columns or tables to `db.js`, your Railway database needs to be updated:

### Migration Process (Comprehensive Validation):

1. **Get DATABASE_URL** from Railway dashboard (PostgreSQL service → Variables)
2. **Add to local `.env`** file temporarily:
   ```
   DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway
   ```
3. **Run migration**: `npm run migrate`
4. **Remove DATABASE_URL** from `.env` when complete

### What the Enhanced Migration Does:

**Pre-Flight Checks:**
- ✅ Validates all environment variables (format, length, required fields)
- ✅ Tests PostgreSQL connection (hostname, port, credentials)
- ✅ Verifies database permissions (CREATE, CONNECT, USAGE)
- ✅ Checks if required tables exist (players, player_progress, permanent_stats)
- ✅ Ensures database is properly linked to your project

**Migration Execution:**
- ✅ Analyzes current column structure
- ✅ Adds any missing columns with proper defaults
- ✅ Updates existing player records with default values
- ✅ Safe to run multiple times (idempotent)

**Post-Migration Verification:**
- ✅ Confirms column count is correct
- ✅ Tests sample queries to ensure accessibility
- ✅ Provides helpful error messages if issues occur

### Helpful Commands:

```powershell
# Check environment variables only (no database changes)
npm run check-env

# Full migration with validation
npm run migrate
```

---

## 🔐 Security Checklist

Before deploying:

- [ ] Set `NODE_ENV=production` in Railway
- [ ] Generate strong `SESSION_SECRET`
- [ ] Never commit `.env` file to git
- [ ] Add `.env` to `.gitignore`
- [ ] Verify OAuth tokens are in environment variables only
- [ ] Enable HTTPS (Railway provides this automatically)
- [ ] Set up database backups (Railway PostgreSQL settings)

---

## 📊 Monitoring & Logs

### View Logs:
```powershell
railway logs
```

### Check Service Status:
- Railway Dashboard → Your Project → Deployments
- View CPU, Memory, Network usage

### Database Logs:
- Railway Dashboard → PostgreSQL Service → Logs

---

## 🔄 Update Workflow

### For code changes:
1. **Local Testing**:
   ```powershell
   # Terminal 1 - Backend
   npm start
   
   # Terminal 2 - Frontend dev server
   cd public
   npm run dev
   ```

2. **Push to GitHub**:
   ```powershell
   git add .
   git commit -m "Your changes"
   git push
   ```

3. **Railway auto-deploys** (if GitHub integration enabled)

### Manual Deploy:
```powershell
railway up
```

---

## 🌐 Custom Domain (Optional)

1. Go to Railway Project Settings
2. Click "Domains" → "Generate Domain"
3. Or add custom domain (e.g., `play.ashbeerealms.com`)
4. Update DNS records (Railway provides CNAME)
5. Update `CLIENT_URL` environment variable

---

## 💾 Database Migrations

Railway PostgreSQL persists data across deploys. If you change schema:

```javascript
// Add migration script to package.json
"migrate": "node migrations/run-migrations.js"
```

Then in Railway:
- Run migration manually: `railway run npm run migrate`
- Or add to buildCommand: `npm run migrate && npm run build`

---

## 🚨 Rollback

If deployment breaks:

1. **Railway Dashboard** → Deployments
2. Find last working deployment
3. Click "Redeploy"

Or via CLI:
```powershell
railway rollback
```

---

## 📈 Scaling (If needed)

Railway automatically scales based on:
- CPU usage
- Memory usage
- Request load

**Upgrade plan** if you need:
- More RAM (default: 512MB → 8GB)
- More CPU (default: shared → dedicated)
- More storage (default: 1GB → 100GB)

---

## 🧪 Testing Production Build Locally

Before deploying, test production build locally:

```powershell
# 1. Build frontend
cd public
npm run build

# 2. Set NODE_ENV
$env:NODE_ENV="production"

# 3. Start server (serves static files)
cd ..
npm start

# 4. Test at http://localhost:3000
```

This simulates Railway environment exactly.

---

## 📞 Troubleshooting

### Frontend not loading:
```javascript
// Verify server.js has:
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public/dist')));
}
```

### WebSocket not connecting:
```javascript
// Check websocket/socketHandler.js:
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});
```

### Database connection fails:
```bash
# Railway provides DATABASE_URL automatically
# Ensure db.js uses process.env.DATABASE_URL
```

---

## ✅ Final Checklist

Before going live:

- [ ] Frontend builds successfully (`npm run build`)
- [ ] Backend serves static files in production
- [ ] All environment variables set in Railway
- [ ] Database connected and migrations run
- [ ] WebSocket connects properly
- [ ] Twitch bot connects to chat
- [ ] API endpoints respond correctly
- [ ] No sensitive data in code (use env vars)
- [ ] `.gitignore` includes `.env`, `node_modules`, `public/dist`

---

## 🎉 You're Live!

Once deployed, your game will be accessible at:
- `https://your-app.up.railway.app`

Share the link with your Twitch viewers and let them play! 🎮

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Vite Production Build](https://vitejs.dev/guide/build.html)
- [Express Static Files](https://expressjs.com/en/starter/static-files.html)
- [Socket.io with Railway](https://socket.io/docs/v4/deploying/)
