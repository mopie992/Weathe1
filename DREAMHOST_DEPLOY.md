# RoadWeather Deployment Guide for Dreamhost

This guide will help you deploy RoadWeather to `roadweather.app` on Dreamhost.

## Overview

RoadWeather consists of two parts:
1. **Frontend** - React Native/Expo web app (static files)
2. **Backend** - Node.js/Express API (needs to run continuously)

## Prerequisites

- Dreamhost account with:
  - Domain `roadweather.app` configured
  - Node.js support enabled
  - SSH access enabled
- Your API keys:
  - Mapbox token
  - OpenWeather API key

---

## Part 1: Deploy Backend API

### Step 1: Set Up Node.js Application in Dreamhost

1. Log into Dreamhost panel
2. Go to **Domains** → **Manage Domains**
3. Find `roadweather.app` and click **Edit**
4. Under **Web Options**, enable **Passenger** (for Node.js apps)
5. Set **Web directory** to: `/home/yourusername/roadweather.app/backend`
6. Set **Passenger app type** to: `Node.js`
7. Set **Passenger app root** to: `/home/yourusername/roadweather.app/backend`

### Step 2: Upload Backend Files

Via SSH or SFTP, upload the backend files to:
```
/home/yourusername/roadweather.app/backend/
```

Required files:
- `server.js`
- `package.json`
- `routes/` directory (with all route files)
- `utils/` directory (with all utility files)
- `.env` file (create this - see below)

### Step 3: Create Backend `.env` File

Create `/home/yourusername/roadweather.app/backend/.env`:

```env
PORT=3000
MAPBOX_TOKEN=your_mapbox_token_here
OPENWEATHER_KEY=your_openweather_key_here
NODE_ENV=production
```

**Note:** Dreamhost Passenger typically uses port 3000, but check your Passenger settings.

### Step 4: Install Dependencies and Start

Via SSH:

```bash
cd ~/roadweather.app/backend
npm install --production
```

### Step 5: Configure Passenger

Create `package.json` with a `start` script (should already exist):
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

Passenger will automatically run `npm start`.

### Step 6: Set Up API Subdomain (Optional but Recommended)

For cleaner URLs, set up `api.roadweather.app`:

1. In Dreamhost panel, add subdomain `api` for `roadweather.app`
2. Point it to the same backend directory
3. Your API will be accessible at: `https://api.roadweather.app`

**OR** use a path: `https://roadweather.app/api`

---

## Part 2: Deploy Frontend

### Step 1: Build Frontend for Production

On your local machine:

```bash
cd frontend
npm install
npx expo export:web
```

This creates a `web-build/` directory with static files.

### Step 2: Upload Frontend Files

Upload the contents of `web-build/` to:
```
/home/yourusername/roadweather.app/
```

**Important:** Upload the **contents** of `web-build/`, not the folder itself.

Your structure should be:
```
/home/yourusername/roadweather.app/
├── index.html
├── _expo/
├── static/
└── ... (other build files)
```

### Step 3: Update Frontend Environment Variables

Before building, update `frontend/.env`:

```env
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
EXPO_PUBLIC_API_URL=https://api.roadweather.app/api
```

Or if using path-based API:
```env
EXPO_PUBLIC_API_URL=https://roadweather.app/api
```

**Important:** Rebuild after changing `.env`:
```bash
cd frontend
npx expo export:web
```

### Step 4: Configure Web Directory

In Dreamhost panel for `roadweather.app`:
- Set **Web directory** to: `/home/yourusername/roadweather.app`
- Make sure **Passenger** is **disabled** for the frontend (it's static files)

---

## Part 3: Verify Deployment

### Test Backend

```bash
curl https://api.roadweather.app/health
# or
curl https://roadweather.app/api/health
```

Should return:
```json
{"status":"ok","message":"RoadWeather API is running"}
```

### Test Frontend

1. Visit `https://roadweather.app`
2. Open browser console (F12)
3. Check for errors
4. Try searching for a route

---

## Part 4: Troubleshooting

### Backend Not Starting

1. Check Passenger logs:
   ```bash
   tail -f ~/roadweather.app/backend/logs/passenger.log
   ```

2. Verify Node.js version:
   ```bash
   node --version
   ```
   Dreamhost should have Node.js 16+ available

3. Check `.env` file exists and has correct values

### Frontend Not Loading

1. Check file permissions:
   ```bash
   chmod 644 ~/roadweather.app/*.html
   chmod 644 ~/roadweather.app/static/**/*
   ```

2. Verify `index.html` exists in web root

3. Check browser console for errors (CORS, API URL, etc.)

### CORS Issues

If you see CORS errors, update `backend/server.js`:

```javascript
app.use(cors({
  origin: ['https://roadweather.app', 'https://www.roadweather.app'],
  credentials: true
}));
```

### API URL Issues

If frontend can't reach backend:
1. Verify `EXPO_PUBLIC_API_URL` in frontend `.env`
2. Rebuild frontend after changing `.env`
3. Check backend is accessible via the URL you set

---

## Part 5: SSL/HTTPS

Dreamhost provides free Let's Encrypt SSL certificates:

1. In Dreamhost panel → **Domains** → **Manage Domains**
2. Click **Edit** for `roadweather.app`
3. Enable **Let's Encrypt SSL**
4. Wait for certificate to be issued (usually a few minutes)

---

## Part 6: Environment Variables Summary

### Backend `.env` (at `/home/yourusername/roadweather.app/backend/.env`):
```env
PORT=3000
MAPBOX_TOKEN=pk.eyJ1...
OPENWEATHER_KEY=your_key_here
NODE_ENV=production
```

### Frontend `.env` (before building, at `frontend/.env`):
```env
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
EXPO_PUBLIC_API_URL=https://api.roadweather.app/api
```

---

## Quick Deployment Checklist

- [ ] Backend files uploaded to `~/roadweather.app/backend/`
- [ ] Backend `.env` file created with API keys
- [ ] Backend dependencies installed (`npm install`)
- [ ] Passenger configured for backend
- [ ] Frontend built (`npx expo export:web`)
- [ ] Frontend files uploaded to `~/roadweather.app/`
- [ ] Frontend `.env` configured and rebuilt
- [ ] SSL certificate enabled
- [ ] Backend health check works
- [ ] Frontend loads at `https://roadweather.app`
- [ ] Route search works end-to-end

---

## Support

If you encounter issues:
1. Check Dreamhost logs (Passenger, error logs)
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure file permissions are correct (644 for files, 755 for directories)

