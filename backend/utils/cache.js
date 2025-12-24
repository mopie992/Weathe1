const redis = require('redis');

let redisClient = null;
let redisAvailable = false;

// Initialize Redis client if REDIS_URL is provided
// But make it optional - app works fine without Redis
if (process.env.REDIS_URL) {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
      // Silently handle Redis errors - caching is optional
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('Redis cache connected');
    });

    // Try to connect, but don't fail if Redis isn't available
    redisClient.connect().catch(() => {
      redisAvailable = false;
      console.log('Redis not available - continuing without cache');
    });
  } catch (error) {
    // Redis not available - that's okay
    redisAvailable = false;
  }
}

/**
 * Get cached weather data
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} Cached weather data or null
 */
async function getCachedWeather(key) {
  if (!redisClient || !redisAvailable) {
    return null; // No caching if Redis not available
  }

  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    // Silently fail - caching is optional
    return null;
  }
}

/**
 * Set cached weather data
 * @param {string} key - Cache key
 * @param {Object} data - Weather data to cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 */
async function setCachedWeather(key, data, ttl = 3600) {
  if (!redisClient || !redisAvailable) {
    return; // No caching if Redis not available
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    // Silently fail - caching is optional
  }
}

module.exports = {
  getCachedWeather,
  setCachedWeather
};

