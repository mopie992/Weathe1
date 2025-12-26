import axios from 'axios';

// API URL - automatically switches between local and production
// Set EXPO_PUBLIC_API_URL environment variable for production
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (typeof window !== 'undefined' 
    ? 'https://weathe1-production.up.railway.app/api'  // Web always uses Railway
    : (__DEV__ ? 'http://172.16.0.45:3000/api' : 'https://weathe1-production.up.railway.app/api'));

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

