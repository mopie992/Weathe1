# RoadWeather
### GPS Navigation with Real-Time & Forecasted Weather Overlays

RoadWeather is a cross-platform mobile application that enhances traditional GPS navigation by overlaying **live and future weather conditions** along a selected driving route. A built-in **timeline slider** allows travelers to preview expected weather changes—rain, snow, wind, temperature—at different points in their journey.

This project is designed for incremental build-out using **Cursor**, **ChatGPT**, and **Claude**, with a modular architecture enabling easy extension.

---

## 🚀 Features

### Core (MVP)
- **GPS Routing**
  - Fetch driving routes using Mapbox Directions API.
  - Auto-detect user’s current position.

- **Weather Overlay**
  - Real-time and forecasted weather plotted along the route.
  - Visualization includes precipitation intensity, storms, fog, temperature, and wind.

- **Timeline Forecast Slider**
  - Drag a slider to see route conditions at future times (e.g., +1h, +3h, +6h, +12h).

- **Modular API Services**
  - Weather providers (OpenWeather, Tomorrow.io, NOAA) can be swapped without breaking app logic.

---

## 🧭 Future Enhancements
- AI-assisted route suggestions to avoid storm systems.
- “What-if I leave later?” departure simulation.
- Severe weather push notifications.
- Offline navigation + cached weather.
- Shareable route snapshots.
- Expanded map layers and animations.

---

## 🧰 Tech Stack

### Frontend
- **React Native** (Expo or bare workflow)
- **Mapbox SDK**
- **D3.js / deck.gl** for weather visualization overlays
- **Reanimated** for timeline slider animations

### Backend
- **Node.js + Express**
- **OpenWeather One Call API**
- **Mapbox Directions API**
- Polyline decoding + coordinate sampling utilities
- Optional **Redis caching**

---

## 📡 API Endpoints

### `GET /directions`
Fetches driving route and decodes polyline into coordinate points.

**Example response:**
```json
{
  "coordinates": [
    { "lat": 40.123, "lon": -82.911 },
    { "lat": 40.145, "lon": -82.887 }
  ]
}
```

### `GET /weather`
Returns forecasted weather mapped to the coordinates along the route.

**Example response:**
```json
[
  {
    "lat": 40.123,
    "lon": -82.911,
    "timestamp": 1703455200,
    "weather": {
      "temp": 3.2,
      "precip": "snow",
      "wind": 8.4
    }
  }
]
```

---

## 🔄 Data Flow Overview

1. User enters destination.
2. App retrieves route polyline via Mapbox Directions API.
3. Backend decodes polyline and samples coordinates (e.g., every 5–10 km).
4. For each coordinate:
   - Query weather forecast API.
5. Backend merges results → sends structured weather + route data to frontend.
6. User scrubs the timeline slider; overlay updates in real time.

---

## 📁 Project Structure

```
roadweather/
│
├── frontend/
│   ├── components/
│   │   ├── MapView.js
│   │   ├── WeatherOverlay.js
│   │   ├── TimelineSlider.js
│   │   └── AlertsPanel.js
│   ├── services/
│   │   ├── directionsService.js
│   │   └── weatherService.js
│   └── App.js
│
└── backend/
    ├── server.js
    ├── routes/
    │   ├── directions.js
    │   └── weather.js
    ├── utils/
    │   ├── polylineDecoder.js
    │   └── cache.js
    └── package.json
```

---

## ⚙️ Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/roadweather.git
cd roadweather
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env`:
```
MAPBOX_TOKEN=your_mapbox_token
OPENWEATHER_KEY=your_openweather_key
```

Start server:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```

---

## 🧪 Development Notes
- Timeline slider should interpolate weather transitions for smooth animations.
- Sampling interval along route (recommended): **5–10 km**.
- Cache weather responses aggressively to reduce API call volume.
- Mapbox GL supports custom layers—ideal for overlay shading, icons, or animated radar-like visuals.

---

## 🤝 Contributing
Pull requests are welcome.  
Please open issues for bug reports or feature suggestions.

---

## 📄 License
MIT License (or update as needed)

---

## ⚡ Cursor Quick-Start Prompt

```
Scaffold the RoadWeather project using the architecture described in README.md.
Create React Native components for MapView, WeatherOverlay, and TimelineSlider.
Set up a Node.js backend with /directions and /weather endpoints.
Integrate Mapbox Directions API and OpenWeather API.
Build Phase 1 MVP with routing, weather retrieval, and basic overlay rendering.
```
