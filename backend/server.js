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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WeatherRoute API is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WeatherRoute backend server running on port ${PORT}`);
});

