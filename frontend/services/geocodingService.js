import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Get Mapbox token from environment
 */
const getMapboxToken = () => {
  // Try Expo Constants first (from app.config.js)
  if (Constants.expoConfig?.extra?.mapboxToken) {
    return Constants.expoConfig.extra.mapboxToken;
  }
  // Try process.env (for webpack/build time)
  if (process.env.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  }
  // Try window (for runtime, less common for Expo web)
  if (typeof window !== 'undefined' && window.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return window.EXPO_PUBLIC_MAPBOX_TOKEN;
  }
  console.error('Mapbox token not found for geocoding');
  return '';
};

/**
 * Geocode a place name or address to coordinates using Mapbox Geocoding API
 * @param {string} query - Place name, address, or location query
 * @returns {Promise<Object>} { latitude, longitude, name }
 */
export async function geocode(query) {
  try {
    const token = getMapboxToken();
    if (!token) {
      throw new Error('Mapbox token not configured');
    }

    const response = await axios.get('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json', {
      params: {
        access_token: token,
        limit: 1, // Get the best match
        types: 'place,address,poi' // Restrict to places, addresses, and points of interest
      },
      timeout: 10000
    });

    if (!response.data || !response.data.features || response.data.features.length === 0) {
      throw new Error(`No results found for "${query}"`);
    }

    const feature = response.data.features[0];
    const [longitude, latitude] = feature.center;
    const name = feature.place_name || feature.text || query;

    return {
      latitude,
      longitude,
      name
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid Mapbox token. Please check your API key.');
    }
    if (error.response?.status === 429) {
      throw new Error('Geocoding API rate limit exceeded. Please try again later.');
    }
    if (error.message.includes('No results found')) {
      throw error;
    }
    throw new Error(`Failed to geocode "${query}". Please try a different location.`);
  }
}

