import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';

// Placeholder map component for Expo Go
// react-native-maps doesn't work in Expo Go - requires custom build
const MapViewPlaceholder = ({ currentLocation, routeCoordinates, weatherData }) => {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>🗺️ Map View</Text>
        <Text style={styles.subtitle}>
          {currentLocation 
            ? `Location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
            : 'Getting location...'}
        </Text>
        {routeCoordinates.length > 0 && (
          <Text style={styles.info}>
            Route: {routeCoordinates.length} points
          </Text>
        )}
        {weatherData.length > 0 && (
          <View style={styles.weatherInfo}>
            <Text style={styles.info}>
              Weather: {weatherData.length} points
            </Text>
            <ScrollView style={styles.weatherList}>
              {weatherData.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.weatherItem}>
                  <Text style={styles.weatherText}>
                    {item.weather.condition}: {Math.round(item.weather.temp)}°C
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        <Text style={styles.note}>
          Note: Full map requires custom build.{'\n'}
          Use web version (press 'w' in Expo) for full map support.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  note: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  weatherInfo: {
    marginTop: 15,
    width: '100%',
  },
  weatherList: {
    maxHeight: 100,
    marginTop: 5,
  },
  weatherItem: {
    padding: 5,
    backgroundColor: '#fff',
    marginVertical: 2,
    borderRadius: 5,
  },
  weatherText: {
    fontSize: 12,
    color: '#333',
  },
});

export default MapViewPlaceholder;

