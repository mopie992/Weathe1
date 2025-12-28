const express = require('express');
const axios = require('axios');
const { decodePolyline, sampleCoordinates } = require('../utils/polylineDecoder');

const router = express.Router();

/**
 * GET /api/directions
 * Fetches driving route from Mapbox Directions API
 * Query params: origin (lat,lon), destination (lat,lon)
 */
router.get('/', async (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Missing required parameters: origin and destination' 
      });
    }

    const mapboxToken = process.env.MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('❌ MAPBOX_TOKEN not set in environment variables');
      return res.status(500).json({ 
        error: 'Mapbox token not configured' 
      });
    }
    
    console.log(`📍 Directions request: origin=${origin}, destination=${destination}`);
    console.log(`📍 Mapbox token present: ${mapboxToken ? 'Yes' : 'No'} (${mapboxToken ? mapboxToken.substring(0, 20) + '...' : 'missing'})`);

    // Call Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${destination}`;
    const response = await axios.get(url, {
      params: {
        access_token: mapboxToken,
        geometries: 'polyline6',
        overview: 'full',
        steps: false
      }
    });

    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }

    const route = response.data.routes[0];
    const polyline = route.geometry;

    // Decode polyline to coordinates
    const coordinates = decodePolyline(polyline);
    
    // CRITICAL: Normalize coordinates that are 10x too large
    // This can happen if polyline decoder has issues
    const normalizedCoordinates = coordinates.map(coord => {
      let { lat, lon } = coord;
      
      // Fix coordinates that are 10x too large
      if (Math.abs(lat) > 90) {
        console.warn(`⚠️ Fixing latitude ${lat} in directions (too large), dividing by 10`);
        lat = lat / 10;
      }
      if (Math.abs(lon) > 180) {
        console.warn(`⚠️ Fixing longitude ${lon} in directions (too large), dividing by 10`);
        lon = lon / 10;
      }
      
      // Validate
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.error(`❌ Invalid coordinate after normalization: ${lat},${lon} (original: ${coord.lat},${coord.lon})`);
        throw new Error(`Invalid coordinate: ${lat},${lon}`);
      }
      
      return { lat, lon };
    });

    // Calculate route distance to determine sampling interval
    const routeDistanceKm = route.distance / 1000; // Convert meters to km
    
    // Adjust sampling interval based on route length:
    // Short routes (< 50km): 5km intervals
    // Medium routes (50-200km): 10km intervals  
    // Long routes (200-500km): 20km intervals
    // Very long routes (> 500km): 30km intervals
    let samplingInterval = 5;
    if (routeDistanceKm > 500) {
      samplingInterval = 30;
    } else if (routeDistanceKm > 200) {
      samplingInterval = 20;
    } else if (routeDistanceKm > 50) {
      samplingInterval = 10;
    }
    
    console.log(`Route distance: ${routeDistanceKm.toFixed(1)}km, using ${samplingInterval}km sampling interval`);
    
    // Sample coordinates
    let sampledCoordinates = sampleCoordinates(normalizedCoordinates, samplingInterval);
    
    // CRITICAL: Limit to maximum 50 points to prevent API overload
    // This ensures we don't make too many weather API calls
    const MAX_WEATHER_POINTS = 50;
    if (sampledCoordinates.length > MAX_WEATHER_POINTS) {
      console.warn(`⚠️ Route has ${sampledCoordinates.length} points, limiting to ${MAX_WEATHER_POINTS} for weather API`);
      // Evenly sample down to MAX_WEATHER_POINTS
      const step = Math.floor(sampledCoordinates.length / MAX_WEATHER_POINTS);
      sampledCoordinates = sampledCoordinates.filter((_, index) => 
        index === 0 || // Always include first
        index === sampledCoordinates.length - 1 || // Always include last
        index % step === 0 // Sample evenly
      );
      console.log(`Reduced to ${sampledCoordinates.length} points for weather fetching`);
    }
    
    console.log(`📍 Directions: Returning ${sampledCoordinates.length} normalized coordinates`);

    res.json({
      coordinates: sampledCoordinates,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      geometry: polyline // keep original for rendering
    });
  } catch (error) {
    console.error('❌ Directions API error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch directions',
      details: error.response?.data?.message || error.message 
    });
  }
});

module.exports = router;

