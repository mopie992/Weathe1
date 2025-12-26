// Load .env file and export variables
require('dotenv').config();

// This file is used to load environment variables at build time
// It's imported by app.config.js

module.exports = {
  EXPO_PUBLIC_MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '',
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://weathe1-production.up.railway.app/api'
};

