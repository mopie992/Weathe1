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
    name: "RoadWeather",
    slug: "roadweather",
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
      bundleIdentifier: "com.roadweather.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff"
      },
      package: "com.roadweather.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      // Configure webpack to inject environment variables
      config: {
        plugins: []
      },
      favicon: "./assets/favicon.ico"
    },
    extra: {
      // Make environment variables available to the app
      mapboxToken: env.EXPO_PUBLIC_MAPBOX_TOKEN,
      apiUrl: env.EXPO_PUBLIC_API_URL
    }
  }
};

