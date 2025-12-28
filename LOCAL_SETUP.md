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
MAPBOX_TOKEN=pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtam1lM2RteTFibnMzZG95cTNkcmp6cG4ifQ.JVhbzl61PK0gbQUscHhuVw
OPENWEATHER_KEY=3a4c4264b5f92df345d7f177b64cf469
PORT=3000
```

### Frontend (`frontend/.env`)
```
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtam1lM2RteTFibnMzZG95cTNkcmp6cG4ifQ.JVhbzl61PK0gbQUscHhuVw
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

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

