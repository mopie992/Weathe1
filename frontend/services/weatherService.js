import axios from 'axios';

// API URL - automatically switches between local and production
// Set EXPO_PUBLIC_API_URL environment variable for production
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (__DEV__ ? 'http://172.16.0.45:3000/api' : 'https://weathe1-production.up.railway.app/api');

/**
 * Fetch hourly weather forecasts for coordinates along a route (0-48 hours)
 * This should be called once per route, not on every slider movement
 * @param {Array} coordinates - Array of {lat, lon} objects
 * @returns {Promise<Array>} Weather data array with hourly forecasts
 */
export async function getWeather(coordinates) {
  try {
    const response = await axios.get(`${API_BASE_URL}/weather`, {
      params: {
        coordinates: JSON.stringify(coordinates)
      }
    });

    return response.data;
  } catch (error) {
    console.error('Weather service error:', error);
    throw new Error('Failed to fetch weather data');
  }
}

