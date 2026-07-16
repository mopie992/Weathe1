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

// Log API URL for debugging
if (typeof window !== 'undefined') {
}

/**
 * Fetch driving route from backend
 * @param {string} origin - "lon,lat" format
 * @param {string} destination - "lon,lat" format
 * @returns {Promise<Object>} Route data with coordinates
 */
export async function getDirections(origin, destination) {
  try {
    const response = await axios.get(`${API_BASE_URL}/directions`, {
      params: {
        origin,
        destination
      }
    });

    return response.data;
  } catch (error) {
    console.error('Directions service error:', error);
    throw new Error('Failed to fetch directions');
  }
}

