const express = require('express');
const cors = require('cors');
require('dotenv').config();

const directionsRoutes = require('./routes/directions');
const weatherRoutes = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/directions', directionsRoutes);
app.use('/api/weather', weatherRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'WeatherRoute API is running', version: '1.0.0' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WeatherRoute API is running' });
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
  console.log(`WeatherRoute backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mapbox token: ${process.env.MAPBOX_TOKEN ? 'Set' : 'Missing'}`);
  console.log(`OpenWeather key: ${process.env.OPENWEATHER_KEY ? 'Set' : 'Missing'}`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

