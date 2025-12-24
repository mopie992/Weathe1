import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapViewComponent from './components/MapView';
import TimelineSlider from './components/TimelineSlider';
import AlertsPanel from './components/AlertsPanel';
import { getDirections } from './services/directionsService';
import { getWeather } from './services/weatherService';
import * as Location from 'expo-location';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [weatherHourlyData, setWeatherHourlyData] = useState([]); // Full hourly forecasts for all points
  const [weatherData, setWeatherData] = useState([]); // Current hour's weather data for display
  const [selectedTime, setSelectedTime] = useState(0); // Hours from now
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for this app.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleSearchRoute = async () => {
    if (!currentLocation || !destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    setLoading(true);
    try {
      // Parse destination (could be address or lat,lon)
      const destCoords = await parseDestination(destination);
      
      const origin = `${currentLocation.longitude},${currentLocation.latitude}`;
      const dest = `${destCoords.longitude},${destCoords.latitude}`;

      // Get route
      const route = await getDirections(origin, dest);
      setRouteCoordinates(route.coordinates);

      // Fetch weather once for all hours (0-48) - this is the only API call
      const weatherHourly = await getWeather(route.coordinates);
      setWeatherHourlyData(weatherHourly);

      // Extract current hour (0) weather for initial display
      const currentWeather = extractWeatherForHour(weatherHourly, 0);
      setWeatherData(currentWeather);
      setSelectedTime(0);
    } catch (error) {
      console.error('Route search error:', error);
      Alert.alert('Error', 'Failed to fetch route or weather data');
    } finally {
      setLoading(false);
    }
  };

  const parseDestination = async (input) => {
    // Simple parsing - if it's lat,lon format, use it directly
    const latLonMatch = input.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (latLonMatch) {
      return {
        latitude: parseFloat(latLonMatch[1]),
        longitude: parseFloat(latLonMatch[2])
      };
    }

    // Otherwise, would need geocoding API
    // For now, return a default or show error
    throw new Error('Please enter destination as "latitude,longitude" or implement geocoding');
  };

  /**
   * Extract weather data for a specific hour from cached hourly forecasts
   * No API call - just switches between already-fetched data
   */
  const extractWeatherForHour = (hourlyData, hoursFromNow) => {
    if (!hourlyData || hourlyData.length === 0) return [];

    return hourlyData.map((pointData) => {
      const { lat, lon, hourlyForecasts } = pointData;
      let weather;

      if (hoursFromNow === 0) {
        // Current weather
        weather = hourlyForecasts.current;
      } else if (hoursFromNow > 0 && hoursFromNow <= 48 && hourlyForecasts.hourly[hoursFromNow - 1]) {
        // Hourly forecast (hourly array is 0-indexed, but hour 0 is "current", so hour 1 = index 0)
        weather = hourlyForecasts.hourly[hoursFromNow - 1];
      } else {
        // Fallback to current if hour is out of range
        weather = hourlyForecasts.current;
      }

      return {
        lat,
        lon,
        timestamp: weather.timestamp,
        weather: {
          temp: weather.temp,
          precip: weather.precip['1h'] || 0,
          precip_type: weather.weather.main.toLowerCase(),
          wind: weather.wind_speed,
          wind_deg: weather.wind_deg,
          humidity: weather.humidity,
          condition: weather.weather.main,
          description: weather.weather.description
        }
      };
    });
  };

  const handleTimeChange = (hours) => {
    setSelectedTime(hours);
    
    // No API call - just switch between cached hourly data
    if (weatherHourlyData.length > 0) {
      const weatherForHour = extractWeatherForHour(weatherHourlyData, hours);
      setWeatherData(weatherForHour);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter destination (lat,lon)"
          value={destination}
          onChangeText={setDestination}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleSearchRoute}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          currentLocation={currentLocation}
          routeCoordinates={routeCoordinates}
          weatherData={weatherData}
        />
        <AlertsPanel weatherData={weatherData} />
      </View>

      {/* Timeline Slider */}
      {routeCoordinates.length > 0 && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Weather Forecast: +{selectedTime} hours
          </Text>
          <TimelineSlider
            value={selectedTime}
            onValueChange={handleTimeChange}
            maxHours={48}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  sliderContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
});

