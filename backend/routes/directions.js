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

    // Sample coordinates (every 5-10 km)
    const sampledCoordinates = sampleCoordinates(coordinates, 5); // 5 km intervals

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

