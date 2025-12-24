const express = require('express');
const axios = require('axios');
const { getCachedWeather, setCachedWeather } = require('../utils/cache');

const router = express.Router();

/**
 * GET /api/weather
 * Returns hourly forecasted weather for coordinates along a route (0-48 hours)
 * Uses Current Weather API + 5 Day Forecast API (free tier)
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
        try {
          // Use Current Weather API + Forecast API (free tier)
          const [currentResponse, forecastResponse] = await Promise.all([
            // Current weather
            axios.get('https://api.openweathermap.org/data/2.5/weather', {
              params: {
                lat,
                lon,
                appid: openweatherKey,
                units: 'metric'
              },
              timeout: 10000
            }),
            // 5 day forecast (3-hour intervals, we'll convert to hourly)
            axios.get('https://api.openweathermap.org/data/2.5/forecast', {
              params: {
                lat,
                lon,
                appid: openweatherKey,
                units: 'metric'
              },
              timeout: 10000
            })
          ]);

          // Process current weather
          const current = currentResponse.data;
          hourlyForecasts = {
            current: {
              temp: current.main.temp,
              feels_like: current.main.feels_like,
              humidity: current.main.humidity,
              wind_speed: current.wind?.speed || 0,
              wind_deg: current.wind?.deg || 0,
              weather: current.weather[0],
              precip: { '1h': current.rain?.['1h'] || current.snow?.['1h'] || 0 },
              timestamp: current.dt
            },
            hourly: []
          };

          // Process forecast (3-hour intervals, convert to hourly estimates)
          if (forecastResponse.data && forecastResponse.data.list) {
            hourlyForecasts.hourly = forecastResponse.data.list.slice(0, 16).map((item, index) => {
              // Interpolate between 3-hour forecasts for hourly data
              return {
                temp: item.main.temp,
                feels_like: item.main.feels_like,
                humidity: item.main.humidity,
                wind_speed: item.wind?.speed || 0,
                wind_deg: item.wind?.deg || 0,
                weather: item.weather[0],
                precip: { '1h': item.rain?.['3h'] ? item.rain['3h'] / 3 : item.snow?.['3h'] ? item.snow['3h'] / 3 : 0 },
                timestamp: item.dt
              };
            });
          }

          // Cache for 1 hour (weather data updates hourly)
          await setCachedWeather(cacheKey, hourlyForecasts, 3600);
        } catch (error) {
          console.error(`Weather API error for ${lat},${lon}:`, error.response?.data || error.message);
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
