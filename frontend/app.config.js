// Load environment variables
const env = require('./load-env');

if (env.EXPO_PUBLIC_MAPBOX_TOKEN && !env.EXPO_PUBLIC_MAPBOX_TOKEN.startsWith('pk.')) {
  console.error('Mapbox token does not start with "pk." and may be invalid.');
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
    },
    extra: {
      // Make environment variables available to the app
      mapboxToken: env.EXPO_PUBLIC_MAPBOX_TOKEN,
      apiUrl: env.EXPO_PUBLIC_API_URL
    }
  }
};

