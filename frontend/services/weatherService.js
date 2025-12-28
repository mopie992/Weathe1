import axios from 'axios';

// API URL - automatically switches between local and production
// Set EXPO_PUBLIC_API_URL environment variable for production
// For local dev: use localhost:3000
// For production: use Railway URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'  // Local web development
        : 'https://weathe1-production.up.railway.app/api')  // Production: Always use Railway backend
    : (__DEV__ ? 'http://localhost:3000/api' : 'https://weathe1-production.up.railway.app/api'));  // Mobile: local or Railway

/**
 * Fetch hourly weather forecasts for coordinates along a route (0-48 hours)
 * This should be called once per route, not on every slider movement
 * @param {Array} coordinates - Array of {lat, lon} objects
 * @returns {Promise<Array>} Weather data array with hourly forecasts
 */
export async function getWeather(coordinates, clearCache = false) {
  try {
    const response = await axios.get(`${API_BASE_URL}/weather`, {
      params: {
        coordinates: JSON.stringify(coordinates),
        clearCache: clearCache ? 'true' : undefined
      },
      timeout: 120000 // 120 second timeout (weather API can be slow with many points for long trips)
    });

    // Log response to debug empty arrays
    if (response.data && Array.isArray(response.data)) {
      const emptyCount = response.data.filter(item => !item.hourlyForecasts?.hourly || item.hourlyForecasts.hourly.length === 0).length;
      if (emptyCount > 0) {
        console.error(`❌ Received ${emptyCount} points with empty hourly arrays out of ${response.data.length} total`);
        // Log first point's structure to debug
        if (response.data[0]) {
          console.error(`❌ First point structure:`, {
            hasHourlyForecasts: !!response.data[0].hourlyForecasts,
            hourlyForecastsType: typeof response.data[0].hourlyForecasts,
            hasHourly: !!response.data[0].hourlyForecasts?.hourly,
            hourlyType: typeof response.data[0].hourlyForecasts?.hourly,
            hourlyIsArray: Array.isArray(response.data[0].hourlyForecasts?.hourly),
            hourlyLength: response.data[0].hourlyForecasts?.hourly?.length || 0,
            hasCurrent: !!response.data[0].hourlyForecasts?.current,
            fullStructure: JSON.stringify(response.data[0], null, 2).substring(0, 1000)
          });
        }
      }
      const pointsWithHourly = response.data.filter(item => item.hourlyForecasts?.hourly?.length > 0).length;
      console.log(`✅ Weather response: ${response.data.length} points, ${pointsWithHourly} with hourly data, ${emptyCount} with empty arrays`);
      if (pointsWithHourly === 0) {
        console.error(`🚨 CRITICAL: All points have empty hourly arrays! Backend may not be returning forecast data.`);
      }
    }

    return response.data;
  } catch (error) {
    console.error('Weather service error:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Weather request timed out');
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch weather data');
  }
}

