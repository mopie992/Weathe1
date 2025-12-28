# RoadWeather - Technology Stack & Troubleshooting Guide

## 🛠️ Technology Stack

### Frontend
- **Framework**: React Native (via Expo)
- **Language**: JavaScript (ES6+)
- **UI Library**: React
- **Web Build**: Expo Web (Webpack)
- **Maps**: Mapbox GL JS (for web)
- **HTTP Client**: Axios
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: React Native StyleSheet API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)
- **HTTP Client**: Axios
- **Caching**: Redis (optional, graceful fallback if unavailable)
- **Polyline Decoding**: @mapbox/polyline

### APIs & Services
- **Mapbox**: Directions API, Geocoding API, Mapbox GL JS
- **OpenWeather**: Current Weather API, 5-Day Forecast API

### Development Tools
- **Package Manager**: npm
- **Build Tool**: Expo CLI
- **Version Control**: Git
- **Code Editor**: Any (VS Code recommended)

---

## 🌐 Services & Hosting

### What You're Using:

#### 1. **GitHub** (Code Repository)
- **Purpose**: Stores your code, version control
- **Repository**: `https://github.com/mopie992/Weathe1`
- **Status**: ✅ **Always active** (free, no maintenance needed)
- **What it does**: 
  - Stores all your code
  - Tracks changes
  - Allows collaboration
  - **Auto-deploys to Railway** when you push code

#### 2. **Railway** (Backend Hosting)
- **Purpose**: Hosts your Node.js/Express backend API
- **URL**: `https://weathe1-production.up.railway.app`
- **Status**: ✅ **MUST BE RUNNING** for app to work
- **What it does**:
  - Runs your backend server 24/7
  - Handles API requests from frontend
  - Connects to Mapbox & OpenWeather APIs
- **Cost**: Pay-as-you-go (you have free credits)
- **Auto-deploy**: Yes (from GitHub)

#### 3. **Dreamhost** (Frontend Hosting)
- **Purpose**: Hosts your static web frontend
- **URL**: `https://roadweather.app`
- **Status**: ✅ **MUST BE RUNNING** for app to work
- **What it does**:
  - Serves your React web app
  - Static file hosting
- **Cost**: Your existing hosting plan

#### 4. **Vercel** (NOT Currently Used)
- **Status**: ❌ Not in use
- **Note**: We considered it but went with Dreamhost instead

---

## 📋 What Needs to Be Running

### ✅ Always Running (No Action Needed)
- **GitHub**: Always active, no maintenance
- **Railway**: Auto-runs, auto-deploys from GitHub
- **Dreamhost**: Your hosting, should always be up

### ⚠️ Things to Monitor
- **Railway**: Check if backend is responding
- **Dreamhost**: Check if frontend is accessible
- **API Keys**: Monitor usage (Mapbox & OpenWeather)

---

## 🔧 Troubleshooting Guide

### Problem: App Not Loading / Blank Screen

**Check:**
1. **Frontend (Dreamhost)**:
   - Visit: `https://roadweather.app`
   - Should see the app interface
   - If blank: Check browser console (F12) for errors

2. **Backend (Railway)**:
   - Visit: `https://weathe1-production.up.railway.app/api/health`
   - Should return: `{"status":"ok","message":"RoadWeather API is running"}`
   - If error: Backend is down

**Solutions:**
- **Frontend down**: Re-upload `web-build` folder to Dreamhost
- **Backend down**: 
  - Check Railway dashboard: https://railway.app
  - Check deployment logs
  - Restart service if needed

---

### Problem: "Failed to fetch directions" Error

**Causes:**
- Backend not responding
- API keys missing/invalid
- Network issues

**Solutions:**
1. Check Railway backend is running (see above)
2. Verify API keys in Railway:
   - Go to Railway → Your Service → Variables
   - Check `MAPBOX_TOKEN` and `OPENWEATHER_KEY` are set
3. Check browser console (F12) for specific error

---

### Problem: "Failed to fetch weather data" Error

**Causes:**
- OpenWeather API key invalid
- Rate limit exceeded
- Backend error

**Solutions:**
1. Check Railway logs for API errors
2. Verify `OPENWEATHER_KEY` in Railway variables
3. Check OpenWeather dashboard for usage/errors
4. Test API directly: `https://weathe1-production.up.railway.app/api/weather/test-forecast?lat=40.7128&lon=-74.0060`

---

### Problem: Map Not Showing

**Causes:**
- Mapbox token missing/invalid
- Ad blocker blocking Mapbox
- Network issues

**Solutions:**
1. Check browser console (F12) for Mapbox errors
2. Verify `EXPO_PUBLIC_MAPBOX_TOKEN` in frontend `.env`
3. Disable ad blocker temporarily
4. Check Mapbox dashboard for token status

---

### Problem: Weather Data Not Changing / All Same Temperature

**Causes:**
- Backend returning empty hourly arrays
- Cache issues
- API processing errors

**Solutions:**
1. Check Railway logs for processing errors
2. Add `clearCache=true` to weather request (temporary)
3. Check browser console for `hourlyLength=0` errors
4. Verify OpenWeather API is returning data

---

### Problem: Location Not Detecting

**Causes:**
- Browser permissions denied
- GPS unavailable (laptops)
- Network geolocation failed

**Solutions:**
1. Allow location permissions in browser
2. Use manual address entry instead
3. Check browser console for geolocation errors

---

### Problem: Changes Not Appearing After Upload

**Causes:**
- Browser cache
- Old files still served
- Build not completed

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Verify files uploaded correctly to Dreamhost
4. Check file timestamps match upload time

---

## 🔄 Deployment Workflow

### Making Changes:

#### Frontend Changes:
1. Edit files in `frontend/` folder
2. Run: `cd frontend && npm run build:web`
3. Upload `frontend/web-build/` folder to Dreamhost
4. Clear browser cache

#### Backend Changes:
1. Edit files in `backend/` folder
2. Commit to GitHub: `git add . && git commit -m "message" && git push`
3. Railway auto-deploys (check Railway dashboard)
4. Wait 1-2 minutes for deployment

#### Both Frontend & Backend:
1. Make changes
2. Commit to GitHub: `git add . && git commit -m "message" && git push`
3. Railway auto-deploys backend
4. Build frontend: `cd frontend && npm run build:web`
5. Upload `frontend/web-build/` to Dreamhost

---

## 📁 Project Structure

```
WeatherApp-1/
├── backend/              # Node.js/Express backend
│   ├── routes/          # API routes (directions, weather)
│   ├── utils/           # Helper functions
│   ├── server.js        # Main server file
│   └── package.json     # Backend dependencies
│
├── frontend/            # React Native/Expo frontend
│   ├── components/     # React components
│   ├── services/        # API service functions
│   ├── App.js          # Main app component
│   ├── app.config.js   # Expo configuration
│   └── package.json    # Frontend dependencies
│
├── favicon/            # Website favicons
├── web-build/          # Built frontend (upload to Dreamhost)
└── README.md           # Project documentation
```

---

## 🔑 Environment Variables

### Backend (Railway):
- `MAPBOX_TOKEN` - Your Mapbox API token
- `OPENWEATHER_KEY` - Your OpenWeather API key
- `PORT` - Server port (default: 3000)
- `REDIS_URL` - Optional Redis cache URL

### Frontend (Local `.env` file):
- `EXPO_PUBLIC_MAPBOX_TOKEN` - Mapbox token for frontend
- `EXPO_PUBLIC_API_URL` - Backend API URL (optional, auto-detects)

---

## 🚨 Emergency Procedures

### Backend Down:
1. Go to Railway dashboard
2. Check deployment logs
3. Restart service if needed
4. Check environment variables are set
5. Verify GitHub connection

### Frontend Down:
1. Check Dreamhost is accessible
2. Re-upload `web-build` folder
3. Verify file permissions
4. Check `.htaccess` file exists

### API Keys Invalid:
1. Check Railway variables
2. Verify keys in Mapbox/OpenWeather dashboards
3. Rotate keys if compromised
4. Update Railway variables
5. Update frontend `.env` if needed

---

## 📊 Monitoring & Health Checks

### Daily Checks:
- ✅ Site accessible: `https://roadweather.app`
- ✅ Backend responding: `https://weathe1-production.up.railway.app/api/health`

### Weekly Checks:
- ✅ Railway usage/billing
- ✅ API usage (Mapbox & OpenWeather)
- ✅ GitHub repository status

### Monthly Checks:
- ✅ Review API costs
- ✅ Check for security updates
- ✅ Review error logs

---

## 🛠️ Common Commands

### Local Development:
```bash
# Start backend
cd backend
npm start

# Start frontend
cd frontend
npm start

# Build frontend for production
cd frontend
npm run build:web
```

### Git Commands:
```bash
# Check status
git status

# Commit changes
git add .
git commit -m "Description of changes"
git push origin main

# Pull latest changes
git pull origin main
```

---

## 📞 Support Resources

### Documentation:
- **Expo**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/
- **Express**: https://expressjs.com/
- **Mapbox**: https://docs.mapbox.com/
- **OpenWeather**: https://openweathermap.org/api

### Your Dashboards:
- **GitHub**: https://github.com/mopie992/Weathe1
- **Railway**: https://railway.app
- **Mapbox**: https://account.mapbox.com/
- **OpenWeather**: https://home.openweathermap.org/
- **Dreamhost**: Your hosting control panel

---

## ✅ Quick Health Check Checklist

Run these checks if something's not working:

- [ ] Site loads: `https://roadweather.app`
- [ ] Backend responds: `https://weathe1-production.up.railway.app/api/health`
- [ ] No console errors (F12 in browser)
- [ ] Railway service is running
- [ ] API keys are set in Railway
- [ ] Frontend `.env` has Mapbox token
- [ ] Recent changes pushed to GitHub
- [ ] Frontend rebuilt after changes
- [ ] Browser cache cleared

---

**Last Updated**: December 27, 2025

