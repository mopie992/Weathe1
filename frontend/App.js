import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
// Use web map for web, placeholder for mobile
const MapViewComponent = Platform.OS === 'web' 
  ? require('./components/MapViewWeb').default
  : require('./components/MapViewPlaceholder').default;
import TimelineSlider from './components/TimelineSlider';
import DepartureTimeSelector from './components/DepartureTimeSelector';
import { getDirections } from './services/directionsService';
import { getWeather } from './services/weatherService';
import * as Location from 'expo-location';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDuration, setRouteDuration] = useState(null); // Route duration in seconds
  const [routeDistance, setRouteDistance] = useState(null); // Route distance in meters
  const [weatherHourlyData, setWeatherHourlyData] = useState([]); // Full hourly forecasts for all points
  const [weatherData, setWeatherData] = useState([]); // Current hour's weather data for display
  const [departureTimeOffset, setDepartureTimeOffset] = useState(0); // Minutes from now for departure
  const [selectedTime, setSelectedTime] = useState(0); // Hours from now (for slider preview)
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
      setRouteDuration(route.duration); // Duration in seconds
      setRouteDistance(route.distance); // Distance in meters

      // CRITICAL: Only fetch weather for points we'll actually display (every 30 minutes)
      // This dramatically reduces API calls for long trips
      const weatherPoints = calculateWeatherPoints(route.coordinates, route.duration);
      console.log(`Route: ${route.coordinates.length} total points, ${route.duration/60} min duration`);
      console.log(`Fetching weather for ${weatherPoints.length} points (30-min intervals only)...`);
      
      // IMPORTANT: Fetch weather ONCE for all hours (0-48) - this is the ONLY API call
      // The slider will later switch between this cached data without making new API calls
      const weatherPromise = getWeather(weatherPoints);
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
          // Weather will be updated by useEffect when routeDuration is set
        }
        setSelectedTime(0);
        setDepartureTimeOffset(0); // Reset to NOW
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
   * Calculate which route points we need weather for (every 30 minutes)
   * This reduces API calls by only fetching weather for displayed markers
   */
  const calculateWeatherPoints = (routeCoordinates, routeDurationSeconds) => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !routeDurationSeconds) {
      return [];
    }

    const totalDurationMinutes = routeDurationSeconds / 60;
    const INTERVAL_MINUTES = 30;
    const numIntervals = Math.ceil(totalDurationMinutes / INTERVAL_MINUTES);
    
    // Calculate which points we need (every 30 minutes)
    const weatherPoints = [];
    const numPoints = routeCoordinates.length;

    // Always include first point
    weatherPoints.push(routeCoordinates[0]);

    // Add points at 30-minute intervals
    for (let i = 1; i <= numIntervals; i++) {
      const targetMinutes = i * INTERVAL_MINUTES;
      if (targetMinutes >= totalDurationMinutes) {
        // Don't go beyond route duration
        break;
      }
      
      // Calculate which route point corresponds to this time
      const progress = targetMinutes / totalDurationMinutes;
      const pointIndex = Math.floor(progress * (numPoints - 1));
      
      // Make sure we don't duplicate points
      if (pointIndex > 0 && pointIndex < numPoints) {
        const point = routeCoordinates[pointIndex];
        // Check if we already have this point
        if (!weatherPoints.find(p => p.lat === point.lat && p.lon === point.lon)) {
          weatherPoints.push(point);
        }
      }
    }

    // Always include last point
    const lastPoint = routeCoordinates[routeCoordinates.length - 1];
    if (!weatherPoints.find(p => p.lat === lastPoint.lat && p.lon === lastPoint.lon)) {
      weatherPoints.push(lastPoint);
    }

    console.log(`Calculated ${weatherPoints.length} weather points for ${totalDurationMinutes.toFixed(1)} min trip (30-min intervals)`);
    return weatherPoints;
  };

  /**
   * Calculate estimated arrival time at each point along the route
   * Based on departure time and route duration
   * Each point shows weather at the time you'll arrive there
   */
  const calculateEstimatedArrivalTimes = (departureOffsetMinutes, routeDurationSeconds) => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !routeDurationSeconds) {
      return [];
    }

    const departureTime = new Date(Date.now() + departureOffsetMinutes * 60 * 1000);
    const totalDurationMinutes = routeDurationSeconds / 60;
    const numPoints = routeCoordinates.length;

    // Calculate estimated arrival time at each point
    // Assume uniform speed along the route
    return routeCoordinates.map((_, index) => {
      // Calculate progress (0 to 1) along the route
      const progress = index / (numPoints - 1);
      // Calculate elapsed time in minutes from departure
      const elapsedMinutes = progress * totalDurationMinutes;
      // Calculate arrival time at this point (departure + elapsed time)
      const arrivalTime = new Date(departureTime.getTime() + elapsedMinutes * 60 * 1000);
      // Calculate hours from NOW (not from departure) for weather lookup
      const hoursFromNow = (arrivalTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const minutesFromNow = (arrivalTime.getTime() - Date.now()) / (1000 * 60);
      
      console.log(`Point ${index}: Progress ${(progress * 100).toFixed(1)}%, Elapsed ${elapsedMinutes.toFixed(1)}min, Arrival in ${hoursFromNow.toFixed(2)}h from now`);
      
      return {
        pointIndex: index,
        arrivalTime,
        hoursFromNow,
        minutesFromNow,
        elapsedMinutesFromDeparture: elapsedMinutes,
        progress: progress
      };
    });
  };

  /**
   * Extract weather data based on estimated arrival times at each point
   * No API call - just switches between already-fetched data
   */
  const extractWeatherForEstimatedTimes = (hourlyData, arrivalTimes) => {
    if (!hourlyData || hourlyData.length === 0 || !arrivalTimes || arrivalTimes.length === 0) {
      return [];
    }

    try {
      return hourlyData.map((pointData, index) => {
        const { lat, lon, hourlyForecasts } = pointData;
        if (!hourlyForecasts) {
          console.warn('Missing hourlyForecasts for point:', lat, lon);
          return null;
        }

        const arrivalInfo = arrivalTimes[index];
        if (!arrivalInfo) {
          return null;
        }

        // Calculate which forecast interval to use based on arrival time
        // hoursFromNow is the time from NOW when you'll arrive at this point
        const hoursFromNow = arrivalInfo.hoursFromNow;
        const minutesFromNow = arrivalInfo.minutesFromNow;
        let weather;

        if (hoursFromNow <= 0) {
          // Already passed or current - use current weather
          weather = hourlyForecasts.current;
          console.log(`Point ${index}: Using current weather (arrival in past/now)`);
        } else if (minutesFromNow < 60) {
          // Less than 1 hour away - use current weather (closest we have)
          weather = hourlyForecasts.current;
          console.log(`Point ${index}: Using current weather (arrival in ${minutesFromNow.toFixed(0)}min)`);
        } else {
          // More than 1 hour away - map to 3-hour interval index
          // OpenWeather gives 3-hour intervals, so:
          // 1-3 hours = index 0, 4-6 hours = index 1, etc.
          const intervalIndex = Math.floor((hoursFromNow - 1) / 3);
          
          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];
              console.log(`Point ${index}: Using forecast interval ${intervalIndex} (arrival in ${hoursFromNow.toFixed(1)}h, temp: ${weather.temp}°C)`);
            } else {
              // Beyond forecast range, use last available
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
              console.log(`Point ${index}: Beyond forecast, using last available (arrival in ${hoursFromNow.toFixed(1)}h)`);
            }
          } else {
            // No hourly data, use current
            weather = hourlyForecasts.current;
            console.log(`Point ${index}: No hourly data, using current`);
          }
        }

        if (!weather || !weather.weather) {
          console.warn('Invalid weather data for point:', lat, lon);
          return null;
        }

        return {
          lat,
          lon,
          arrivalTime: arrivalInfo.arrivalTime,
          hoursFromNow: arrivalInfo.hoursFromNow,
          timestamp: weather.timestamp || Math.floor(arrivalInfo.arrivalTime.getTime() / 1000),
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
      }).filter(item => item !== null);
    } catch (error) {
      console.error('Error extracting weather for estimated times:', error);
      return [];
    }
  };

  /**
   * Extract weather data for a specific hour from cached hourly forecasts (for slider preview)
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
        
        // Debug: Log structure on first point only
        if (hourlyData.indexOf(pointData) === 0 && hoursFromNow > 0) {
          console.log('Debug hourlyForecasts structure:', {
            hasCurrent: !!hourlyForecasts.current,
            hasHourly: !!hourlyForecasts.hourly,
            hourlyLength: hourlyForecasts.hourly?.length || 0,
            hourlyType: Array.isArray(hourlyForecasts.hourly),
            hourlySample: hourlyForecasts.hourly?.[0]
          });
        }

        let weather;

        if (hoursFromNow === 0) {
          // Current weather
          weather = hourlyForecasts.current;
        } else if (hoursFromNow > 0) {
          // OpenWeather 5-day forecast gives 3-hour intervals (not true hourly)
          // Map slider hours to 3-hour interval index
          // Hour 1-3 = index 0, Hour 4-6 = index 1, etc.
          // intervalIndex = 0 for hours 1-3, 1 for hours 4-6, 2 for hours 7-9, etc.
          const intervalIndex = Math.floor((hoursFromNow - 1) / 3);
          
          // Check if hourly array exists and has data
          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];
              console.log(`Hour +${hoursFromNow}: Using 3-hour interval index ${intervalIndex}/${hourlyForecasts.hourly.length - 1}, temp: ${weather.temp}°C`);
            } else {
              // If beyond available forecast, use the last available forecast
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
              console.log(`Hour +${hoursFromNow}: Beyond forecast range (${hourlyForecasts.hourly.length} intervals), using last available, temp: ${weather.temp}°C`);
            }
          } else {
            // No hourly data available - fallback to current
            console.warn(`No hourly forecast array available for hour +${hoursFromNow}, using current. hourlyForecasts:`, hourlyForecasts);
            weather = hourlyForecasts.current;
          }
        } else {
          // Fallback to current for any other case
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

  const handleDepartureTimeChange = (offsetMinutes) => {
    setDepartureTimeOffset(offsetMinutes);
    updateWeatherForDepartureTime(offsetMinutes, selectedTime);
  };

  const handleTimeChange = (hours) => {
    setSelectedTime(hours);
    updateWeatherForDepartureTime(departureTimeOffset, hours);
  };

  const updateWeatherForDepartureTime = (departureOffsetMinutes, previewHoursOffset = 0) => {
    // IMPORTANT: No API call here - just switch between cached hourly data
    if (weatherHourlyData.length === 0 || !routeDuration) {
      console.warn('No cached weather data or route duration available');
      return;
    }

    // Calculate estimated arrival times at each point
    const arrivalTimes = calculateEstimatedArrivalTimes(departureOffsetMinutes, routeDuration);
    
    // If preview offset is set (from slider), adjust arrival times
    // This shifts the departure time forward/backward to preview different scenarios
    if (previewHoursOffset !== 0) {
      arrivalTimes.forEach(arrival => {
        arrival.hoursFromNow += previewHoursOffset;
        arrival.minutesFromNow += previewHoursOffset * 60;
        arrival.arrivalTime = new Date(arrival.arrivalTime.getTime() + previewHoursOffset * 60 * 60 * 1000);
      });
    }

    // Extract weather for estimated arrival times
    const weatherForTimes = extractWeatherForEstimatedTimes(weatherHourlyData, arrivalTimes);
    
    // Filter to only show markers every 30 minutes along the trip
    const filteredWeatherData = filterWeatherTo30MinIntervals(weatherForTimes, arrivalTimes);
    setWeatherData(filteredWeatherData);
    
    console.log(`Updated weather for departure +${departureOffsetMinutes}min, preview +${previewHoursOffset}h`);
    console.log(`Showing ${filteredWeatherData.length} markers (30-min intervals)`);
  };

  /**
   * Filter weather data to only show markers at 30-minute intervals
   * This reduces clutter and data usage
   */
  const filterWeatherTo30MinIntervals = (weatherData, arrivalTimes) => {
    if (!weatherData || weatherData.length === 0 || !arrivalTimes || arrivalTimes.length === 0) {
      return [];
    }

    const filtered = [];
    let lastShownMinutes = -Infinity;
    const INTERVAL_MINUTES = 30;
    const TOLERANCE_MINUTES = 5; // Allow 5 min tolerance for rounding

    weatherData.forEach((weatherItem, index) => {
      const arrivalInfo = arrivalTimes[index];
      if (!arrivalInfo || !arrivalInfo.elapsedMinutesFromDeparture) return;

      const elapsedMinutes = arrivalInfo.elapsedMinutesFromDeparture;
      
      if (elapsedMinutes === undefined || isNaN(elapsedMinutes)) {
        console.warn(`Missing elapsedMinutes for point ${index}`);
        return;
      }
      
      // Show marker if:
      // 1. It's the first point (start)
      // 2. It's the last point (destination)
      // 3. It's at a 30-minute interval (0, 30, 60, 90, etc.)
      const isFirst = index === 0;
      const isLast = index === weatherData.length - 1;
      
      // Check if this is close to a 30-minute interval
      const remainder = elapsedMinutes % INTERVAL_MINUTES;
      const is30MinInterval = remainder < TOLERANCE_MINUTES || remainder > (INTERVAL_MINUTES - TOLERANCE_MINUTES);
      
      // Also ensure we don't show markers too close together (at least 25 min apart)
      const isFarEnoughFromLast = elapsedMinutes - lastShownMinutes >= (INTERVAL_MINUTES - TOLERANCE_MINUTES);
      
      if (isFirst || isLast || (is30MinInterval && isFarEnoughFromLast)) {
        filtered.push(weatherItem);
        lastShownMinutes = elapsedMinutes;
        console.log(`✓ Including marker at index ${index}: ${elapsedMinutes.toFixed(1)} min elapsed (${(elapsedMinutes/60).toFixed(1)}h)`);
      } else {
        console.log(`✗ Skipping marker at index ${index}: ${elapsedMinutes.toFixed(1)} min elapsed (not at 30-min interval)`);
      }
    });

    console.log(`Filtered ${weatherData.length} points to ${filtered.length} markers (30-min intervals)`);
    return filtered;
  };

  // Update weather when departure time, route, or preview slider changes
  useEffect(() => {
    if (weatherHourlyData.length > 0 && routeDuration && routeCoordinates.length > 0) {
      updateWeatherForDepartureTime(departureTimeOffset, selectedTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departureTimeOffset, selectedTime, routeDuration, routeCoordinates.length, weatherHourlyData.length]);

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

      {/* Departure Time Selector and Estimated Arrival */}
      {routeCoordinates.length > 0 && routeDuration && (
        <View style={styles.departureContainer}>
          <DepartureTimeSelector
            departureTimeOffset={departureTimeOffset}
            onDepartureTimeChange={handleDepartureTimeChange}
          />
          {routeDuration && (
            <View style={styles.arrivalInfo}>
              <Text style={styles.arrivalLabel}>Estimated Arrival:</Text>
              <Text style={styles.arrivalTime}>
                {(() => {
                  const departureTime = new Date(Date.now() + departureTimeOffset * 60 * 1000);
                  const arrivalTime = new Date(departureTime.getTime() + routeDuration * 1000);
                  const hours = arrivalTime.getHours();
                  const minutes = arrivalTime.getMinutes();
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const displayHours = hours % 12 || 12;
                  const displayMinutes = minutes.toString().padStart(2, '0');
                  return `${displayHours}:${displayMinutes} ${ampm}`;
                })()}
              </Text>
              <Text style={styles.durationText}>
                ({Math.round(routeDuration / 60)} min)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          currentLocation={currentLocation}
          routeCoordinates={routeCoordinates}
          weatherData={weatherData}
        />
      </View>

      {/* Timeline Slider - Preview different departure times */}
      {routeCoordinates.length > 0 && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Preview Weather: {selectedTime === 0 ? 'Current' : `+${selectedTime}h`} from departure
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
  departureContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  arrivalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
  },
  arrivalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  arrivalTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
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

