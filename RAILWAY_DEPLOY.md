# Railway Deployment - Step by Step

## Method 1: Deploy from GitHub (Recommended)

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repo**: `mopie992/Weathe1`
6. **Railway will auto-detect** - it should see the `backend` folder

## Method 2: If Railway doesn't auto-detect backend folder

### Option A: Create a Service for Backend
1. After creating the project, click **"+ New"** → **"GitHub Repo"**
2. Select your repo again
3. In the service settings, look for **"Root Directory"** or **"Working Directory"**
4. Set it to: `backend`
5. Or use the **"Configure"** button in the service

### Option B: Use Railway CLI
```bash
railway login
railway init
railway link
railway up
```

## Method 3: Manual Configuration

1. After deploying, click on your **service**
2. Go to **"Settings"** tab
3. Look for:
   - **"Root Directory"** → set to `backend`
   - **"Start Command"** → should be `npm start`
   - **"Build Command"** → should be `npm install`

## Environment Variables

**Go to your service → Variables tab** and add:
- `MAPBOX_TOKEN` = `pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtams4OTZhaTBybTEzZm9wdmJzejlkbDQifQ.pnMrqfJ4qv6_n9fKb8eNfQ`
- `OPENWEATHER_KEY` = `your_openweather_key_here`

## Alternative: Deploy Backend Folder Only

If Railway is having trouble, you can:
1. Create a **separate GitHub repo** just for the backend
2. Or use **Railway's GitHub integration** and point it to the `backend` subfolder

## What to Look For

After deployment, Railway will show:
- **Deployment URL** (like: `https://your-app.up.railway.app`)
- **Logs** showing "WeatherRoute backend server running on port..."

## Test Your Deployment

Visit: `https://your-url.railway.app/health`

Should return: `{"status":"ok","message":"WeatherRoute API is running"}`

