# Deployment Guide for WeatherRoute

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo: `mopie992/Weathe1`
5. Select the `backend` folder
6. Add environment variables:
   - `MAPBOX_TOKEN=pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtams4OTZhaTBybTEzZm9wdmJzejlkbDQifQ.pnMrqfJ4qv6_n9fKb8eNfQ`
   - `OPENWEATHER_KEY=9f85f2a889dbc649a5cb54e5bdc97831`
   - `PORT` (auto-set by Railway)
7. Railway will auto-deploy and give you a URL like: `https://your-app.railway.app`

### Option 2: Render
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repo: `mopie992/Weathe1`
5. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables (same as above)
7. Deploy!

### Option 3: Vercel (For Frontend)
- Frontend can be deployed to Vercel
- Backend to Railway/Render

## After Backend is Deployed

1. Update frontend API URLs:
   - Edit `frontend/services/directionsService.js`
   - Edit `frontend/services/weatherService.js`
   - Replace `http://172.16.0.45:3000/api` with your deployed backend URL

2. Deploy frontend:
   - Use Expo's hosting (built-in)
   - Or deploy to Vercel for web version

## Environment Variables Needed

Backend needs these in the cloud platform:
- `MAPBOX_TOKEN` - Your Mapbox token
- `OPENWEATHER_KEY` - Your OpenWeather key
- `PORT` - Usually auto-set by platform

