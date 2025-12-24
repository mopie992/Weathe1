import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
// Use web map for web, placeholder for mobile
const MapViewComponent = Platform.OS === 'web' 
  ? require('./components/MapViewWeb').default
  : require('./components/MapViewPlaceholder').default;
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
  const [error, setError] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Don't block the app - allow manual entry
        console.log('Location permission denied - using default location');
        // Set a default location (can be changed)
        setCurrentLocation({
          latitude: 40.7128,
          longitude: -74.0060
        });
        Alert.alert(
          'Location Permission',
          'Location permission was denied. Using default location (NYC). You can still search for routes.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      console.log('Got location:', location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Location error:', error);
      // Don't block the app - set default location
      setCurrentLocation({
        latitude: 40.7128,
        longitude: -74.0060
      });
      Alert.alert(
        'Location Error',
        'Could not get your location. Using default location (NYC). You can still search for routes.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSearchRoute = async () => {
    if (!currentLocation || !destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      // Parse destination (could be address or lat,lon)
      const destCoords = await parseDestination(destination);
      
      const origin = `${currentLocation.longitude},${currentLocation.latitude}`;
      const dest = `${destCoords.longitude},${destCoords.latitude}`;

      // Get route
      const route = await getDirections(origin, dest);
      setRouteCoordinates(route.coordinates);

      // Fetch weather once for all hours (0-48) - this is the only API call
      // Use Promise.race to timeout after 30 seconds
      console.log('Fetching weather for', route.coordinates.length, 'points...');
      
      const weatherPromise = getWeather(route.coordinates);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Weather request timed out after 30 seconds')), 30000)
      );

      try {
        const weatherHourly = await Promise.race([weatherPromise, timeoutPromise]);
        console.log('Weather data received:', weatherHourly);
        console.log('Weather data length:', weatherHourly?.length || 0);
        
        if (!weatherHourly || weatherHourly.length === 0) {
          console.warn('No weather data received, using fallback');
          // Don't throw - just use empty data so route still shows
          setWeatherHourlyData([]);
          setWeatherData([]);
        } else {
          setWeatherHourlyData(weatherHourly);
          // Extract current hour (0) weather for initial display
          const currentWeather = extractWeatherForHour(weatherHourly, 0);
          console.log('Extracted current weather:', currentWeather);
          console.log('Current weather length:', currentWeather?.length || 0);
          setWeatherData(currentWeather);
        }
        setSelectedTime(0);
      } catch (weatherError) {
        console.error('Weather fetch error (non-fatal):', weatherError);
        // Don't fail the whole search - show route without weather
        setWeatherHourlyData([]);
        setWeatherData([]);
        Alert.alert(
          'Weather Unavailable', 
          'Route loaded successfully, but weather data could not be fetched. The route is still visible on the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Route search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch route or weather data';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
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

    try {
      return hourlyData.map((pointData) => {
        const { lat, lon, hourlyForecasts } = pointData;
        if (!hourlyForecasts) {
          console.warn('Missing hourlyForecasts for point:', lat, lon);
          return null;
        }

        let weather;

        if (hoursFromNow === 0) {
          // Current weather
          weather = hourlyForecasts.current;
        } else if (hoursFromNow > 0 && hoursFromNow <= 48 && hourlyForecasts.hourly && hourlyForecasts.hourly[hoursFromNow - 1]) {
          // Hourly forecast (hourly array is 0-indexed, but hour 0 is "current", so hour 1 = index 0)
          weather = hourlyForecasts.hourly[hoursFromNow - 1];
        } else {
          // Fallback to current if hour is out of range
          weather = hourlyForecasts.current;
        }

        if (!weather || !weather.weather) {
          console.warn('Invalid weather data for point:', lat, lon);
          return null;
        }

        return {
          lat,
          lon,
          timestamp: weather.timestamp || Math.floor(Date.now() / 1000),
          weather: {
            temp: weather.temp || 20,
            precip: (weather.precip && weather.precip['1h']) || 0,
            precip_type: (weather.weather && weather.weather.main) ? weather.weather.main.toLowerCase() : 'clear',
            wind: weather.wind_speed || 0,
            wind_deg: weather.wind_deg || 0,
            humidity: weather.humidity || 50,
            condition: (weather.weather && weather.weather.main) || 'Clear',
            description: (weather.weather && weather.weather.description) || 'clear sky'
          }
        };
      }).filter(item => item !== null); // Remove null entries
    } catch (error) {
      console.error('Error extracting weather for hour:', error);
      return [];
    }
  };

  const handleTimeChange = (hours) => {
    setSelectedTime(hours);
    
    // No API call - just switch between cached hourly data
    if (weatherHourlyData.length > 0) {
      const weatherForHour = extractWeatherForHour(weatherHourlyData, hours);
      setWeatherData(weatherForHour);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setError(null)}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 20,
    textAlign: 'center',
  },
});

