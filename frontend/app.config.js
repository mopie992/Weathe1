// Load environment variables
const env = require('./load-env');

// Log to verify .env is loaded (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('Environment variables loaded:', {
    hasMapboxToken: !!env.EXPO_PUBLIC_MAPBOX_TOKEN,
    hasApiUrl: !!env.EXPO_PUBLIC_API_URL,
    mapboxTokenPreview: env.EXPO_PUBLIC_MAPBOX_TOKEN ? 
      env.EXPO_PUBLIC_MAPBOX_TOKEN.substring(0, 20) + '...' : 'not set'
  });
}

module.exports = {
  expo: {
    name: "WeatherRoute",
    slug: "weatherroute",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.weatherroute.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff"
      },
      package: "com.weatherroute.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      // Configure webpack to inject environment variables
      config: {
        plugins: []
      }
    },
    extra: {
      // Make environment variables available to the app
      mapboxToken: env.EXPO_PUBLIC_MAPBOX_TOKEN,
      apiUrl: env.EXPO_PUBLIC_API_URL
    }
  }
};

