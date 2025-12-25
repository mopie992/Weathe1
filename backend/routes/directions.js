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
      return res.status(500).json({ 
        error: 'Mapbox token not configured' 
      });
    }

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

    // Sample coordinates (every 5-10 km)
    const sampledCoordinates = sampleCoordinates(normalizedCoordinates, 5); // 5 km intervals
    
    console.log(`📍 Directions: Returning ${sampledCoordinates.length} normalized coordinates`);

    res.json({
      coordinates: sampledCoordinates,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      geometry: polyline // keep original for rendering
    });
  } catch (error) {
    console.error('Directions API error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch directions',
      details: error.message 
    });
  }
});

module.exports = router;

