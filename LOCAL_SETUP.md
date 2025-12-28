# Local Development Setup

## Quick Start

### 1. Start Backend (Terminal 1)
```powershell
cd backend
npm start
```
You should see: `Server running on port 3000`

### 2. Start Frontend (Terminal 2)
```powershell
cd frontend
npx expo start --web
```
Then press `w` to open in browser, or visit the URL shown (usually `http://localhost:8081`)

### 3. Test It Works
- Open browser console (F12)
- Try searching for a route (e.g., `43.65323,-79.38318`)
- Check console for any errors

## Environment Variables Needed

### Backend (`backend/.env`)
```
MAPBOX_TOKEN=your_mapbox_token_here
OPENWEATHER_KEY=your_openweather_key_here
PORT=3000
```

**⚠️ IMPORTANT**: Replace `your_mapbox_token_here` and `your_openweather_key_here` with your actual API keys.
- Get Mapbox token: https://account.mapbox.com/
- Get OpenWeather key: https://home.openweathermap.org/api_keys

### Frontend (`frontend/.env`)
```
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**⚠️ IMPORTANT**: Replace `your_mapbox_token_here` with your actual Mapbox token.

## Troubleshooting

### Backend won't start
- Check if port 3000 is already in use
- Verify `backend/.env` exists with correct keys
- Run `npm install` in backend folder

### Frontend can't connect to backend
- Make sure backend is running on port 3000
- Check browser console for CORS errors
- Verify `frontend/.env` has `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

### Test backend directly
Visit: `http://localhost:3000/health`
Should return: `{"status":"ok","message":"WeatherRoute API is running"}`

