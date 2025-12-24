import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView from 'react-native-maps';

const WeatherOverlay = ({ weatherData, routeCoordinates }) => {
  if (!weatherData || weatherData.length === 0 || !routeCoordinates || routeCoordinates.length === 0) {
    return null;
  }

  // Create weather markers for each point along the route
  const weatherMarkers = weatherData.map((item, index) => {
    const weather = item.weather;
    const color = getWeatherColor(weather);
    const icon = getWeatherIcon(weather.condition);

    return (
      <MapView.Marker
        key={`weather-${index}`}
        coordinate={{
          latitude: item.lat,
          longitude: item.lon
        }}
      >
        <View style={[styles.weatherMarker, { backgroundColor: color }]}>
          <Text style={styles.weatherIcon}>{icon}</Text>
          <Text style={styles.weatherTemp}>{Math.round(weather.temp)}°</Text>
          {weather.precip > 0 && (
            <Text style={styles.precipText}>
              {weather.precip.toFixed(1)}mm
            </Text>
          )}
        </View>
      </MapView.Marker>
    );
  });

  return <>{weatherMarkers}</>;
};

/**
 * Get color based on weather condition
 */
function getWeatherColor(weather) {
  const condition = weather.condition.toLowerCase();
  
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return 'rgba(59, 130, 246, 0.8)'; // Blue
  } else if (condition.includes('snow')) {
    return 'rgba(255, 255, 255, 0.9)'; // White
  } else if (condition.includes('storm') || condition.includes('thunder')) {
    return 'rgba(99, 102, 241, 0.8)'; // Purple
  } else if (condition.includes('fog') || condition.includes('mist')) {
    return 'rgba(156, 163, 175, 0.8)'; // Gray
  } else if (condition.includes('clear')) {
    return 'rgba(251, 191, 36, 0.8)'; // Yellow
  } else {
    return 'rgba(148, 163, 184, 0.8)'; // Default gray
  }
}

/**
 * Get emoji icon for weather condition
 */
function getWeatherIcon(condition) {
  const cond = condition.toLowerCase();
  
  if (cond.includes('rain') || cond.includes('drizzle')) {
    return '🌧️';
  } else if (cond.includes('snow')) {
    return '❄️';
  } else if (cond.includes('storm') || cond.includes('thunder')) {
    return '⛈️';
  } else if (cond.includes('fog') || cond.includes('mist')) {
    return '🌫️';
  } else if (cond.includes('clear')) {
    return '☀️';
  } else if (cond.includes('cloud')) {
    return '☁️';
  } else {
    return '🌤️';
  }
}

const styles = StyleSheet.create({
  weatherMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherIcon: {
    fontSize: 16,
  },
  weatherTemp: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  precipText: {
    fontSize: 8,
    color: '#000',
    marginTop: 1,
  },
});

export default WeatherOverlay;
