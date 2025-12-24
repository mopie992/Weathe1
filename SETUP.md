# WeatherRoute Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Mapbox account and access token
- OpenWeather API key
- (Optional) Redis for caching

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `backend` directory:
```
MAPBOX_TOKEN=your_mapbox_token_here
OPENWEATHER_KEY=your_openweather_key_here
PORT=3000
REDIS_URL=redis://localhost:6379
```

4. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:3000`

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Update the Mapbox token in `components/MapView.js`:
   - Replace `YOUR_MAPBOX_TOKEN_HERE` with your actual Mapbox access token
   - Or better yet, use environment variables (see below)

4. Update the API base URL in `services/directionsService.js` and `services/weatherService.js`:
   - For local development, it should point to `http://localhost:3000/api`
   - For production, update to your production API URL

5. Start the Expo development server:
```bash
npm start
```

6. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator, `a` for Android emulator

## Getting API Keys

### Mapbox
1. Go to https://www.mapbox.com/
2. Sign up for a free account
3. Navigate to Account → Access tokens
4. Copy your default public token

### OpenWeather
1. Go to https://openweathermap.org/
2. Sign up for a free account
3. Navigate to API keys section
4. Generate a new API key
5. Note: The One Call API 3.0 requires a paid subscription. For free tier, you may need to use the 2.5 One Call API or adjust the endpoint in `backend/routes/weather.js`

## Testing

1. Start the backend server
2. Start the frontend Expo app
3. Grant location permissions when prompted
4. Enter a destination in "lat,lon" format (e.g., "40.7128,-74.0060")
5. Tap "Search" to fetch route and weather
6. Use the timeline slider to preview weather at different times

## Troubleshooting

### Backend Issues
- Ensure all environment variables are set in `.env`
- Check that ports 3000 (backend) are not in use
- Verify API keys are valid and have proper permissions

### Frontend Issues
- Make sure backend is running before starting frontend
- Check that Mapbox token is set in `MapView.js`
- Verify location permissions are granted
- For Android, you may need to configure network security for localhost API calls

### Mapbox Issues
- Ensure your Mapbox token has the correct scopes
- Check that you're using the correct SDK version

### OpenWeather Issues
- Free tier has rate limits (60 calls/minute)
- One Call API 3.0 requires paid subscription
- Consider using 2.5 API or implementing caching

## Next Steps

- Implement geocoding for address-to-coordinates conversion
- Add route optimization based on weather
- Implement offline caching
- Add push notifications for severe weather
- Enhance weather visualization with animations

