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

    console.log(`Testing forecast API for ${lat},${lon}`);
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
      console.log(`Reduced to ${coordsArray.length} coordinates for weather fetching`);
    }

    const weatherData = [];

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
        
        console.log(`📍 Using coordinates: ${lat},${lon} (original: ${coord.lat},${coord.lon})`);

      // Cache key: lat/lon only (not timestamp, since we fetch all hours)
      const cacheKey = `weather:${lat}:${lon}`;
      let hourlyForecasts = await getCachedWeather(cacheKey);

      // Don't use cache if hourly array is empty (means previous fetch failed)
      if (hourlyForecasts) {
        const hourlyLength = hourlyForecasts.hourly?.length || 0;
        console.log(`🔍 Cache check for ${lat},${lon}: hourlyLength=${hourlyLength}`);
        if (hourlyLength === 0) {
          console.log(`⚠️ Cache has empty hourly array for ${lat},${lon}, fetching fresh data`);
          hourlyForecasts = null; // Force fresh fetch
        } else {
          console.log(`✅ Using cached data for ${lat},${lon} with ${hourlyLength} hourly forecasts`);
        }
      } else {
        console.log(`📥 No cache found for ${lat},${lon}, will fetch fresh data`);
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
                // 5 day forecast (3-hour intervals, we'll convert to hourly)
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
              console.error(`API call error for ${lat},${lon}:`, {
                message: apiError.message,
                code: apiError.code,
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                data: apiError.response?.data
              });
              throw apiError;
            }
            
            // Log successful API calls
            console.log(`API calls successful for ${lat},${lon}:`, {
              currentStatus: currentResponse.status,
              forecastStatus: forecastResponse.status,
              forecastHasData: !!forecastResponse.data,
              forecastListLength: forecastResponse.data?.list?.length || 0
            });

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
            console.log(`Forecast response status for ${lat},${lon}:`, forecastResponse.status);
            console.log(`Forecast response has data:`, !!forecastResponse.data);
            if (forecastResponse.data) {
              console.log(`Forecast response keys:`, Object.keys(forecastResponse.data));
              console.log(`Forecast response.list exists:`, !!forecastResponse.data.list);
              console.log(`Forecast response.list length:`, forecastResponse.data.list?.length || 0);
            }
            
            // Process forecast - API test shows this works, so process it
            if (forecastResponse && forecastResponse.data && forecastResponse.data.list) {
              const forecastList = forecastResponse.data.list;
              console.log(`✅ Forecast data received for ${lat},${lon}: ${forecastList.length} intervals`);
              console.log(`✅ Forecast list sample (first item):`, forecastList[0] ? {
                dt: forecastList[0].dt,
                main: forecastList[0].main ? 'exists' : 'missing',
                weather: forecastList[0].weather ? 'exists' : 'missing',
                weatherLength: forecastList[0].weather?.length || 0
              } : 'null');
              
              if (Array.isArray(forecastList) && forecastList.length > 0) {
                const processed = forecastList.slice(0, 16).map((item, index) => {
                  // Validate item
                  if (!item) {
                    console.warn(`⚠️ Null item at index ${index} for ${lat},${lon}`);
                    return null;
                  }
                  if (!item.main) {
                    console.warn(`⚠️ Missing main at index ${index} for ${lat},${lon}`);
                    return null;
                  }
                  if (!item.weather || !Array.isArray(item.weather) || item.weather.length === 0) {
                    console.warn(`⚠️ Invalid weather at index ${index} for ${lat},${lon}:`, {
                      hasWeather: !!item.weather,
                      isArray: Array.isArray(item.weather),
                      length: item.weather?.length || 0
                    });
                    return null;
                  }
                  
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
                
                hourlyForecasts.hourly = processed.filter(item => item !== null);
                
                console.log(`✅ Successfully processed ${hourlyForecasts.hourly.length} hourly forecasts for ${lat},${lon} (from ${forecastList.length} raw items)`);
                if (hourlyForecasts.hourly.length > 0) {
                  console.log(`✅ Sample hourly data:`, hourlyForecasts.hourly[0]);
                } else {
                  console.error(`❌ All forecast items were filtered out for ${lat},${lon}!`);
                }
              } else {
                console.error(`❌ Forecast list is not a valid array for ${lat},${lon}:`, {
                  isArray: Array.isArray(forecastList),
                  length: forecastList?.length || 0,
                  type: typeof forecastList
                });
                hourlyForecasts.hourly = [];
              }
            } else {
              console.error(`❌ No forecast data in response for ${lat},${lon}:`, {
                hasResponse: !!forecastResponse,
                hasData: !!(forecastResponse && forecastResponse.data),
                hasList: !!(forecastResponse && forecastResponse.data && forecastResponse.data.list),
                isArray: Array.isArray(forecastResponse?.data?.list),
                responseStatus: forecastResponse?.status,
                responseDataKeys: forecastResponse?.data ? Object.keys(forecastResponse.data) : 'no data'
              });
              hourlyForecasts.hourly = [];
            }
            
            // CRITICAL: Log final state before returning
            console.log(`🔍 Final hourlyForecasts for ${lat},${lon}:`, {
              hasCurrent: !!hourlyForecasts.current,
              hasHourly: !!hourlyForecasts.hourly,
              hourlyLength: hourlyForecasts.hourly?.length || 0,
              hourlySample: hourlyForecasts.hourly?.[0] || 'none'
            });

            // CRITICAL: Only cache if we have hourly data
            const hourlyCount = hourlyForecasts.hourly?.length || 0;
            if (hourlyCount > 0) {
              await setCachedWeather(cacheKey, hourlyForecasts, 3600);
              console.log(`✅ Cached ${hourlyCount} hourly forecasts for ${lat},${lon}`);
            } else {
              console.error(`❌ NOT caching - hourly array is empty for ${lat},${lon}`);
            }
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

        // CRITICAL: Log what we're returning
        const finalHourlyLength = hourlyForecasts.hourly?.length || 0;
        console.log(`📤 Returning for ${lat},${lon}: hourlyLength=${finalHourlyLength}`);
        
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
