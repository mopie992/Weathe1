# WeatherRoute Quick Start

## 🚀 Getting Started in 5 Minutes

### 1. Backend Setup (2 minutes)

```bash
cd backend
npm install
```

Create `backend/.env` file:
```
MAPBOX_TOKEN=your_mapbox_token
OPENWEATHER_KEY=your_openweather_key
PORT=3000
```

Start server:
```bash
npm start
```

### 2. Frontend Setup (2 minutes)

```bash
cd frontend
npm install
```

Update Mapbox token in `frontend/components/MapView.js`:
- Replace `YOUR_MAPBOX_TOKEN_HERE` with your actual token

Start Expo:
```bash
npm start
```

### 3. Test It (1 minute)

1. Open Expo Go app on your phone
2. Scan the QR code
3. Grant location permissions
4. Enter destination: `40.7128,-74.0060` (New York)
5. Tap "Search"
6. Drag the timeline slider to see future weather!

## 📝 Notes

- **Mapbox Token**: Get free token at https://account.mapbox.com/access-tokens/
- **OpenWeather Key**: Sign up at https://openweathermap.org/api
- **Destination Format**: Currently accepts "latitude,longitude" format
- **API Endpoints**: Backend runs on `http://localhost:3000`

## 🐛 Common Issues

**"Failed to fetch directions"**
- Check backend is running
- Verify Mapbox token is correct

**"Failed to fetch weather data"**
- Check OpenWeather API key
- Note: One Call API 3.0 requires paid plan (use 2.5 for free tier)

**Map not showing**
- Verify Mapbox token in `MapView.js`
- Check token has correct scopes

## 🎯 Next Steps

- Add geocoding for address search
- Implement route optimization
- Add offline caching
- Enhance weather animations

