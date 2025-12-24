const express = require('express');
const axios = require('axios');
const { getCachedWeather, setCachedWeather } = require('../utils/cache');

const router = express.Router();

/**
 * GET /api/weather
 * Returns hourly forecasted weather for coordinates along a route (0-48 hours)
 * Query params: coordinates (JSON array of {lat, lon})
 * Returns: Array of weather data with hourly forecasts for each coordinate
 */
router.get('/', async (req, res) => {
  try {
    const { coordinates } = req.query;

    if (!coordinates) {
      return res.status(400).json({ 
        error: 'Missing required parameter: coordinates' 
      });
    }

    const openweatherKey = process.env.OPENWEATHER_KEY;
    if (!openweatherKey) {
      return res.status(500).json({ 
        error: 'OpenWeather API key not configured' 
      });
    }

    let coordsArray;
    try {
      coordsArray = JSON.parse(coordinates);
    } catch (e) {
      return res.status(400).json({ 
        error: 'Invalid coordinates format. Expected JSON array.' 
      });
    }

    if (!Array.isArray(coordsArray) || coordsArray.length === 0) {
      return res.status(400).json({ 
        error: 'Coordinates must be a non-empty array' 
      });
    }

    const weatherData = [];

    // Fetch weather for each coordinate (once per route)
    for (const coord of coordsArray) {
      const { lat, lon } = coord;

      // Cache key: lat/lon only (not timestamp, since we fetch all hours)
      const cacheKey = `weather:${lat}:${lon}`;
      let hourlyForecasts = await getCachedWeather(cacheKey);

      if (!hourlyForecasts) {
        // Fetch from OpenWeather One Call API with timeout
        const url = `https://api.openweathermap.org/data/3.0/onecall`;
        try {
          const response = await axios.get(url, {
            params: {
              lat,
              lon,
              appid: openweatherKey,
              units: 'metric',
              exclude: 'minutely,alerts'
            },
            timeout: 10000 // 10 second timeout per request
          });

        // Process hourly forecasts (0-48 hours)
        hourlyForecasts = {
          current: {
            temp: response.data.current.temp,
            feels_like: response.data.current.feels_like,
            humidity: response.data.current.humidity,
            wind_speed: response.data.current.wind_speed,
            wind_deg: response.data.current.wind_deg,
            weather: response.data.current.weather[0],
            precip: response.data.current.rain || response.data.current.snow || { '1h': 0 },
            timestamp: response.data.current.dt
          },
          hourly: []
        };

        // Process each hourly forecast (0-48 hours)
        if (response.data.hourly && response.data.hourly.length > 0) {
          hourlyForecasts.hourly = response.data.hourly.slice(0, 48).map((hourly) => ({
            temp: hourly.temp,
            feels_like: hourly.feels_like,
            humidity: hourly.humidity,
            wind_speed: hourly.wind_speed,
            wind_deg: hourly.wind_deg,
            weather: hourly.weather[0],
            precip: hourly.rain || hourly.snow || { '1h': 0 },
            timestamp: hourly.dt
          }));
        }

          // Cache for 1 hour (weather data updates hourly)
          await setCachedWeather(cacheKey, hourlyForecasts, 3600);
        } catch (error) {
          console.error(`Weather API error for ${lat},${lon}:`, error.message);
          // Use a default/fallback weather object if API fails
          hourlyForecasts = {
            current: {
              temp: 20,
              feels_like: 20,
              humidity: 50,
              wind_speed: 5,
              wind_deg: 0,
              weather: { main: 'Clear', description: 'clear sky' },
              precip: { '1h': 0 },
              timestamp: Math.floor(Date.now() / 1000)
            },
            hourly: []
          };
        }
      }

      weatherData.push({
        lat,
        lon,
        hourlyForecasts: hourlyForecasts
      });
    }

    res.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch weather data',
      details: error.message 
    });
  }
});

module.exports = router;

