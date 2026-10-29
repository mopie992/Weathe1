# RoadWeather

**Live app: [roadweather.app](https://roadweather.app)**

Weather forecasts for the whole drive, not just the start and the end. Enter a destination and RoadWeather builds the route, then shows the weather you'll hit at each point along it. A timeline slider lets you scrub forward through the trip to see what conditions will be like when you actually get there.

## What it does

- Builds a driving route from your current location (or any address) to a destination
- Places weather markers along the route at 30-minute intervals
- Timeline slider previews conditions (rain, snow, wind, temperature) at each point, at the time you'd reach it
- Shows departure and arrival times, with distance in miles and kilometers
- Address and place-name search through geocoding
- Tap a marker for a detailed weather view

## How it works

1. The user enters a destination.
2. The backend requests a route from the Mapbox Directions API and decodes the polyline into coordinates.
3. Coordinates are sampled along the route by travel time.
4. For each sample point, the backend pulls the OpenWeather forecast for the time the driver would be there.
5. The merged route-plus-weather payload goes to the frontend, which draws the route and overlay. The slider re-renders the overlay as it moves.

Weather responses are cached (Redis, optional with a graceful fallback when it isn't available) to keep API usage down.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React Native via Expo, exported as a web build; Mapbox GL JS; Axios |
| Backend | Node.js, Express, `@mapbox/polyline`, optional Redis |
| Routing and maps | Mapbox Directions, Geocoding, and GL JS |
| Weather | OpenWeather current and forecast APIs |
| Hosting | Static frontend on DreamHost; Node API on Railway |

## Project structure

```
frontend/     Expo app and web build (components/, services/, landing/)
backend/      Express API
  server.js
  routes/     directions.js, weather.js
  utils/      polylineDecoder.js, cache.js
scripts/      Deploy tooling (SFTP swap deploy)
deploy.ps1    One-command build and upload
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Health check |
| `GET /api/directions` | Driving route between two points, polyline decoded to coordinates |
| `GET /api/weather` | Forecast weather for coordinates along the route |

## Running it locally

You'll need a [Mapbox](https://account.mapbox.com/) token and an [OpenWeather](https://openweathermap.org/api) API key.

```bash
git clone https://github.com/mopie992/Weathe1.git
cd Weathe1/backend
npm install
```

Create `backend/.env`:

```
MAPBOX_TOKEN=your_mapbox_token
OPENWEATHER_KEY=your_openweather_key
PORT=3000
```

```bash
npm start
```

In a second terminal:

```bash
cd Weathe1/frontend
npm install
npm start
```

See `LOCAL_SETUP.md` and `QUICKSTART.md` for more detail, and `DEPLOY.md` for deployment.

## Roadmap

Planned, not yet built (see `FEATURES_ROADMAP.md`):

- Weather radar overlay with an on/off toggle
- Severe weather alerts along the route
- Weather conditions legend
- Links to local weather cameras along the route
- "What if I leave later?" departure comparison
- Offline navigation with cached weather

## Notes

Built by Karm Parker. Developed with AI coding assistants (Cursor and Claude) for scaffolding and iteration; I direct the product, review the output in the browser, and handle deployment.
