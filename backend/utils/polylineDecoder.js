const polyline = require('@mapbox/polyline');

/**
 * Decode polyline string to array of coordinates
 * @param {string} encodedPolyline - Encoded polyline string
 * @returns {Array} Array of {lat, lon} objects
 */
function decodePolyline(encodedPolyline) {
  try {
    const decoded = polyline.decode(encodedPolyline);
    return decoded.map(([lat, lon]) => ({ lat, lon }));
  } catch (error) {
    console.error('Polyline decoding error:', error);
    throw new Error('Failed to decode polyline');
  }
}

/**
 * Sample coordinates along a route at specified intervals
 * @param {Array} coordinates - Array of {lat, lon} objects
 * @param {number} intervalKm - Sampling interval in kilometers
 * @returns {Array} Sampled coordinates
 */
function sampleCoordinates(coordinates, intervalKm = 5) {
  if (coordinates.length === 0) return [];

  const sampled = [coordinates[0]]; // Always include first point
  let accumulatedDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    accumulatedDistance += distance;

    if (accumulatedDistance >= intervalKm * 1000) {
      sampled.push(curr);
      accumulatedDistance = 0;
    }
  }

  // Always include last point
  if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
    sampled.push(coordinates[coordinates.length - 1]);
  }

  return sampled;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  decodePolyline,
  sampleCoordinates,
  calculateDistance
};

