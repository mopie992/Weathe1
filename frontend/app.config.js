require('dotenv').config();

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
    web: {},
    extra: {
      // Make environment variables available to the app
      mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
      apiUrl: process.env.EXPO_PUBLIC_API_URL
    }
  }
};

