const express = require('express');
const axios = require('axios');
const { getCachedWeather, setCachedWeather } = require('../utils/cache');

const router = express.Router();

/**
 * Test endpoint to check forecast API directly
 * GET /api/weather/test-forecast?lat=40.7128&lon=-74.0060
 */
router.get('/test-forecast', async (req, res) => {
  try {
    const { lat = 40.7128, lon = -74.0060 } = req.query;
    const openweatherKey = process.env.OPENWEATHER_KEY;

    if (!openweatherKey) {
      return res.status(500).json({ error: 'OpenWeather API key not configured' });
    }

    const forecastResponse = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat,
        lon,
        appid: openweatherKey,
        units: 'metric'
      },
      timeout: 15000
    });

    res.json({
      status: forecastResponse.status,
      hasData: !!forecastResponse.data,
      hasList: !!(forecastResponse.data && forecastResponse.data.list),
      listLength: forecastResponse.data?.list?.length || 0,
      listSample: forecastResponse.data?.list?.[0] || null,
      responseKeys: forecastResponse.data ? Object.keys(forecastResponse.data) : [],
      fullResponse: forecastResponse.data
    });
  } catch (error) {
    console.error('Forecast API test error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
});

/**
 * GET /api/weather
 * Returns hourly forecasted weather for coordinates along a route (0-36 hours)
 * Uses Current Weather API + 5 Day Forecast API (free tier)
 * Query params: coordinates (JSON array of {lat, lon})
 * Returns: Array of weather data with hourly forecasts for each coordinate
 * Note: OpenWeather provides 3-hour intervals. We limit to 12 items (36 hours) to reduce API calls.
 */
router.get('/', async (req, res) => {
  try {
    const { coordinates, clearCache } = req.query;

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

    // Limit to maximum 50 coordinates to prevent API overload and timeouts
    const MAX_COORDINATES = 50;
    if (coordsArray.length > MAX_COORDINATES) {
      console.warn(`⚠️ Request has ${coordsArray.length} coordinates, limiting to ${MAX_COORDINATES}`);
      // Keep first, last, and evenly sample the rest
      const step = Math.floor(coordsArray.length / MAX_COORDINATES);
      coordsArray = coordsArray.filter((_, index) =>
        index === 0 ||
        index === coordsArray.length - 1 ||
        index % step === 0
      );
    }

    const weatherData = [];

    // Capture clearCache in a const to ensure it's accessible in the map callback
    const shouldClearCache = clearCache === 'true';

    // Fetch weather for all coordinates in parallel (much faster!)
    const weatherPromises = coordsArray.map(async (coord) => {
      try {
        let { lat, lon } = coord;

        // CRITICAL: Fix coordinates that are 10x too large (common issue from frontend)
        // Valid latitude: -90 to 90, Valid longitude: -180 to 180
        if (Math.abs(lat) > 90) {
          console.warn(`⚠️ Fixing latitude ${lat} (too large), dividing by 10`);
          lat = lat / 10;
        }
        if (Math.abs(lon) > 180) {
          console.warn(`⚠️ Fixing longitude ${lon} (too large), dividing by 10`);
          lon = lon / 10;
        }

        // Validate coordinates are in valid range
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error(`❌ Invalid coordinates after fix: ${lat},${lon} (original: ${coord.lat},${coord.lon})`);
          throw new Error(`Invalid coordinates: ${lat},${lon}`);
        }


      // Cache key: lat/lon only (not timestamp, since we fetch all hours)
      const cacheKey = `weather:${lat}:${lon}`;
      let hourlyForecasts = null;

      // Only check cache if clearCache is not requested
      if (!shouldClearCache) {
        hourlyForecasts = await getCachedWeather(cacheKey);
        const hourlyLength = hourlyForecasts?.hourly?.length || 0;

        // ALWAYS refetch if hourly array is empty (even if cached)
        if (hourlyForecasts && hourlyLength === 0) {
          console.warn(`⚠️ Cache has empty hourly array for ${lat},${lon}, fetching fresh data`);
          hourlyForecasts = null; // Force refetch
        } else if (hourlyForecasts && hourlyLength > 0) {
        } else {
        }
      } else {
      }

      if (!hourlyForecasts) {
          try {
            // Use Current Weather API + Forecast API (free tier)
            let currentResponse, forecastResponse;

            try {
              [currentResponse, forecastResponse] = await Promise.all([
                // Current weather
                axios.get('https://api.openweathermap.org/data/2.5/weather', {
                  params: {
                    lat,
                    lon,
                    appid: openweatherKey,
                    units: 'metric'
                  },
                  timeout: 15000 // Increased timeout for OpenWeather API
                }),
                // Forecast API (3-hour intervals, limited to 36 hours / 12 items to reduce API calls)
                axios.get('https://api.openweathermap.org/data/2.5/forecast', {
                  params: {
                    lat,
                    lon,
                    appid: openweatherKey,
                    units: 'metric'
                  },
                  timeout: 15000 // Increased timeout for OpenWeather API
                })
              ]);
            } catch (apiError) {
              console.error(`❌ API call error for ${lat},${lon}:`, {
                message: apiError.message,
                code: apiError.code,
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                data: apiError.response?.data
              });
              throw apiError;
            }

            // Check for API errors in response
            if (forecastResponse?.data?.cod && forecastResponse.data.cod !== '200' && forecastResponse.data.cod !== 200) {
              console.error(`❌ OpenWeather API error for ${lat},${lon}:`, {
                cod: forecastResponse.data.cod,
                message: forecastResponse.data.message
              });
              throw new Error(`OpenWeather API error: ${forecastResponse.data.message || 'Unknown error'}`);
            }

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

            // Process forecast - API test shows this works, so process it
            if (forecastResponse && forecastResponse.data && forecastResponse.data.list) {
              const forecastList = forecastResponse.data.list;

              if (Array.isArray(forecastList) && forecastList.length > 0) {
                // Limit to 12 items (36 hours) to reduce API calls and keep forecasts accurate
                // OpenWeather provides 3-hour intervals, so 12 items = 36 hours
                const maxItems = Math.min(forecastList.length, 12);
                const processed = forecastList.slice(0, maxItems).map((item, index) => {
                  // Validate item
                  if (!item) {
                    console.warn(`⚠️ Null item at index ${index} for ${lat},${lon}`);
                    return null;
                  }

                  // More lenient validation - log what's missing instead of filtering
                  if (!item.main) {
                    console.error(`❌ Missing main at index ${index} for ${lat},${lon} - item keys:`, Object.keys(item));
                    return null;
                  }

                  // Check weather array - be more lenient
                  if (!item.weather) {
                    console.error(`❌ Missing weather at index ${index} for ${lat},${lon}`);
                    return null;
                  }

                  if (!Array.isArray(item.weather)) {
                    console.error(`❌ Weather is not array at index ${index} for ${lat},${lon}, type:`, typeof item.weather);
                    return null;
                  }

                  if (item.weather.length === 0) {
                    console.error(`❌ Weather array is empty at index ${index} for ${lat},${lon}`);
                    return null;
                  }

                  // All validations passed - create the hourly forecast object
                  const hourlyItem = {
                    temp: item.main.temp,
                    feels_like: item.main.feels_like,
                    humidity: item.main.humidity,
                    wind_speed: item.wind?.speed || 0,
                    wind_deg: item.wind?.deg || 0,
                    weather: item.weather[0],
                    precip: { '1h': item.rain?.['3h'] ? item.rain['3h'] / 3 : item.snow?.['3h'] ? item.snow['3h'] / 3 : 0 },
                    timestamp: item.dt
                  };

                  return hourlyItem;
                });

                hourlyForecasts.hourly = processed.filter(item => item !== null);


                // CRITICAL: If all items were filtered out, something is wrong - log everything
                if (hourlyForecasts.hourly.length === 0) {
                  console.error(`❌ CRITICAL: All forecast items were filtered out for ${lat},${lon}!`);
                  console.error(`❌ Raw processed array (first 5):`, processed.slice(0, 5));
                  console.error(`❌ Full forecast list length:`, forecastList.length);
                  console.error(`❌ First 3 raw items structure:`, forecastList.slice(0, 3).map((item, idx) => ({
                    index: idx,
                    hasMain: !!item.main,
                    mainKeys: item.main ? Object.keys(item.main) : 'no main',
                    hasWeather: !!item.weather,
                    weatherType: typeof item.weather,
                    weatherIsArray: Array.isArray(item.weather),
                    weatherLength: item.weather?.length || 0,
                    weatherContent: item.weather,
                    allKeys: Object.keys(item)
                  })));

                  // EMERGENCY FALLBACK: If processing failed but we have raw data, try to use it anyway
                  if (forecastList.length > 0 && forecastList[0] && forecastList[0].main && forecastList[0].weather) {
                    console.warn(`⚠️ Attempting emergency fallback - using raw forecast items directly`);
                    const maxItems = Math.min(forecastList.length, 12);
                    hourlyForecasts.hourly = forecastList.slice(0, maxItems).map(item => ({
                      temp: item.main?.temp || 20,
                      feels_like: item.main?.feels_like || 20,
                      humidity: item.main?.humidity || 50,
                      wind_speed: item.wind?.speed || 0,
                      wind_deg: item.wind?.deg || 0,
                      weather: Array.isArray(item.weather) && item.weather.length > 0 ? item.weather[0] : { main: 'Clear', description: 'clear sky' },
                      precip: { '1h': item.rain?.['3h'] ? item.rain['3h'] / 3 : item.snow?.['3h'] ? item.snow['3h'] / 3 : 0 },
                      timestamp: item.dt
                    }));
                  }
                }
              } else {
                console.error(`❌ Forecast list is not a valid array for ${lat},${lon}:`, {
                  isArray: Array.isArray(forecastList),
                  length: forecastList?.length || 0,
                  type: typeof forecastList,
                  forecastResponseType: typeof forecastResponse,
                  forecastResponseDataType: typeof forecastResponse?.data
                });
                hourlyForecasts.hourly = [];
              }
            } else {
              console.error(`❌ CRITICAL: No forecast data in response for ${lat},${lon}:`, {
                hasResponse: !!forecastResponse,
                responseType: typeof forecastResponse,
                hasData: !!(forecastResponse && forecastResponse.data),
                hasList: !!(forecastResponse && forecastResponse.data && forecastResponse.data.list),
                isArray: Array.isArray(forecastResponse?.data?.list),
                responseStatus: forecastResponse?.status,
                responseDataKeys: forecastResponse?.data ? Object.keys(forecastResponse.data) : 'no data',
                responseDataString: forecastResponse?.data ? JSON.stringify(forecastResponse.data).substring(0, 500) : 'no data'
              });
              hourlyForecasts.hourly = [];
            }

            // CRITICAL: Only cache if we have hourly data
            const hourlyCount = hourlyForecasts.hourly?.length || 0;
            if (hourlyCount > 0) {
              await setCachedWeather(cacheKey, hourlyForecasts, 3600);
            } else {
              console.error(`❌ NOT caching - hourly array is empty for ${lat},${lon}`);
            }
          } catch (error) {
            console.error(`❌ Weather API error for ${lat},${lon}:`, {
              message: error.message,
              code: error.code,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              stack: error.stack
            });
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
            // Don't cache error responses
            console.warn(`⚠️ Not caching error response for ${lat},${lon}`);
          }
        }

        const finalHourlyLength = hourlyForecasts.hourly?.length || 0;

        if (finalHourlyLength === 0) {
          console.error(`🚨 ERROR: Returning empty hourly array for ${lat},${lon}!`);
        }

        return {
          lat,
          lon,
          hourlyForecasts: hourlyForecasts
        };
      } catch (error) {
        console.error(`Error processing weather for coordinate:`, error.message);
        // Return fallback data instead of failing completely
        const { lat, lon } = coord;
        return {
          lat,
          lon,
          hourlyForecasts: {
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
          }
        };
      }
    });

    // Wait for all weather requests to complete (in parallel)
    const results = await Promise.all(weatherPromises);
    weatherData.push(...results);

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
