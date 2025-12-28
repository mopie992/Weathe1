const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const directionsRoutes = require('./routes/directions');
const weatherRoutes = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://roadweather.app',
    'https://www.roadweather.app',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// API Routes (must come BEFORE static files)
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'RoadWeather API is running', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RoadWeather API is running' });
});

app.use('/api/directions', directionsRoutes);
app.use('/api/weather', weatherRoutes);

// Serve static files from parent directory (frontend build)
// This allows Passenger to serve both API and frontend from one app
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath, {
  index: 'index.html',
  extensions: ['html']
}));

// Fallback: serve index.html for all non-API routes (for React Router if needed)
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handling for server startup
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - let Railway handle it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let Railway handle it
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RoadWeather backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mapbox token: ${process.env.MAPBOX_TOKEN ? 'Set' : 'Missing'}`);
  console.log(`OpenWeather key: ${process.env.OPENWEATHER_KEY ? 'Set' : 'Missing'}`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

