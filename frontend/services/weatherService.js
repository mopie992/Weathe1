import axios from 'axios';

// API URL - Use Railway backend by default (works for both local dev and production)
// To use local backend, set EXPO_PUBLIC_API_URL=http://localhost:3000/api in .env
// For production: uses Railway URL (https://weathe1-production.up.railway.app/api)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? (window.location.hostname === 'roadweather.app'
        ? 'https://weathe1-production.up.railway.app/api'  // Production domain
        : 'https://weathe1-production.up.railway.app/api')  // Default: Always use Railway backend (works for local dev too)
    : 'https://weathe1-production.up.railway.app/api');  // Mobile: Use Railway backend

/**
 * Fetch hourly weather forecasts for coordinates along a route (0-36 hours)
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

    return response.data;
  } catch (error) {
    console.error('Weather service error:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Weather request timed out');
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch weather data');
  }
}

