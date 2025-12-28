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

// Log API URL for debugging
if (typeof window !== 'undefined') {
  console.log('API Base URL:', API_BASE_URL);
  console.log('Hostname:', window.location.hostname);
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

