import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import WeatherOverlay from './WeatherOverlay';

const MapViewComponent = ({ currentLocation, routeCoordinates, weatherData }) => {
  if (!currentLocation) {
    return (
      <View style={styles.container}>
        {/* Loading or placeholder */}
      </View>
    );
  }

  // Convert route coordinates to array format for Polyline
  const routeCoordinatesArray = routeCoordinates.length > 0
    ? routeCoordinates.map(coord => ({
        latitude: coord.lat,
        longitude: coord.lon
      }))
    : [];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Route line */}
        {routeCoordinatesArray.length > 0 && (
          <MapView.Polyline
            coordinates={routeCoordinatesArray}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Weather Overlay */}
        <WeatherOverlay
          weatherData={weatherData}
          routeCoordinates={routeCoordinates}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapViewComponent;
