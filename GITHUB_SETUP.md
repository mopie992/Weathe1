# GitHub Setup & Deployment

## Step 1: Push Code to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   cd "C:\Users\karmp\Dropbox\AI_Stuffs\WeatherApp-1"
   git init
   git add .
   git commit -m "Initial commit - WeatherRoute app"
   ```

2. **Connect to Your GitHub Repo**:
   ```bash
   git remote add origin https://github.com/mopie992/Weathe1.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy Backend to Railway (Easiest)

1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repo: **mopie992/Weathe1**
5. Railway will detect it's a Node.js app
6. **Important**: Set the root directory to `backend`:
   - Go to Settings → Source
   - Set Root Directory to: `backend`
7. Add Environment Variables (Settings → Variables):
   ```
   MAPBOX_TOKEN=your_mapbox_token_here
   OPENWEATHER_KEY=your_openweather_key_here
   ```
   **Important**: Never commit real API keys to GitHub! Use Railway's environment variables instead.
8. Railway will auto-deploy and give you a URL like: `https://weatherroute-production.up.railway.app`

## Step 3: Update Frontend to Use Online Backend

Once you have your Railway URL (e.g., `https://weatherroute-production.up.railway.app`):

1. Create `frontend/.env` file:
   ```
   EXPO_PUBLIC_API_URL=https://weatherroute-production.up.railway.app/api
   ```
   (Replace with your actual Railway URL)

2. Restart Expo:
   ```bash
   cd frontend
   npm start
   ```

## Step 4: Deploy Frontend (Optional)

### Option A: Expo Hosting (Easiest for Mobile)
- Your app already works with Expo Go
- For production, use Expo's EAS Build service

### Option B: Web Version
- Press `w` in Expo to test web version
- Can deploy to Vercel for web hosting

## Benefits of Online Deployment

✅ Works from anywhere - no local network needed  
✅ No IP address configuration  
✅ No firewall issues  
✅ Shareable URL  
✅ Always available  

## Quick Test

After deployment, test your backend:
```
https://your-railway-url.railway.app/health
```

Should return: `{"status":"ok","message":"WeatherRoute API is running"}`

