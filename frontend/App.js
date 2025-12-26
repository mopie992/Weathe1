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
  const [weatherPoints, setWeatherPoints] = useState([]); // Coordinates we fetched weather for (30-min intervals)
  const [weatherPointIndices, setWeatherPointIndices] = useState([]); // Route indices corresponding to weather points
  const [weatherHourlyData, setWeatherHourlyData] = useState([]); // Full hourly forecasts for weather points only
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
      const { points: calculatedWeatherPoints, indices: calculatedWeatherIndices } = calculateWeatherPoints(route.coordinates, route.duration);
      setWeatherPoints(calculatedWeatherPoints); // Store which points we fetched weather for
      setWeatherPointIndices(calculatedWeatherIndices); // Store route indices for each weather point
      console.log(`Route: ${route.coordinates.length} total points, ${route.duration/60} min duration`);
      console.log(`Fetching weather for ${calculatedWeatherPoints.length} points (30-min intervals only)...`);
      
      // IMPORTANT: Fetch weather ONCE for all hours (0-48) - this is the ONLY API call
      // The slider will later switch between this cached data without making new API calls
      const weatherPromise = getWeather(calculatedWeatherPoints);
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
   * Returns both the coordinates and their corresponding route indices
   * This reduces API calls by only fetching weather for displayed markers
   */
  const calculateWeatherPoints = (routeCoordinates, routeDurationSeconds) => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !routeDurationSeconds) {
      return { points: [], indices: [] };
    }

    const totalDurationMinutes = routeDurationSeconds / 60;
    const INTERVAL_MINUTES = 30;
    
    // Calculate which points we need (every 30 minutes)
    const weatherPoints = [];
    const weatherIndices = [];
    const numPoints = routeCoordinates.length;
    const usedIndices = new Set();

    // Always include first point
    weatherPoints.push(routeCoordinates[0]);
    weatherIndices.push(0);
    usedIndices.add(0);

    // Add points at 30-minute intervals
    let targetMinutes = INTERVAL_MINUTES;
    while (targetMinutes < totalDurationMinutes) {
      // Calculate which route point corresponds to this time
      const progress = targetMinutes / totalDurationMinutes;
      const pointIndex = Math.min(
        Math.floor(progress * (numPoints - 1)),
        numPoints - 1
      );
      
      // Make sure we haven't used this index and it's valid
      if (pointIndex > 0 && pointIndex < numPoints && !usedIndices.has(pointIndex)) {
        weatherPoints.push(routeCoordinates[pointIndex]);
        weatherIndices.push(pointIndex);
        usedIndices.add(pointIndex);
        console.log(`Added weather point at ${targetMinutes} min (index ${pointIndex}, progress ${(progress*100).toFixed(1)}%)`);
      }
      
      targetMinutes += INTERVAL_MINUTES;
    }

    // Always include last point if not already included
    const lastIndex = numPoints - 1;
    if (!usedIndices.has(lastIndex)) {
      weatherPoints.push(routeCoordinates[lastIndex]);
      weatherIndices.push(lastIndex);
      usedIndices.add(lastIndex);
    }

    console.log(`Calculated ${weatherPoints.length} weather points for ${totalDurationMinutes.toFixed(1)} min trip (30-min intervals)`);
    console.log(`Weather points:`, weatherPoints.map((p, i) => `Point ${i}: ${p.lat.toFixed(4)},${p.lon.toFixed(4)} (route index ${weatherIndices[i]})`));
    return { points: weatherPoints, indices: weatherIndices };
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
   * Note: hourlyData only contains weather for the 30-min interval points we fetched
   */
  const extractWeatherForEstimatedTimes = (hourlyData, arrivalTimes) => {
    if (!hourlyData || hourlyData.length === 0 || !weatherPoints || weatherPoints.length === 0) {
      return [];
    }

    try {
      // hourlyData has weather for the 30-min interval points (weatherPoints)
      // We already know which route indices correspond to each weather point (weatherPointIndices)
      // Use that mapping directly instead of trying to match coordinates
      
      // Process each weather point we fetched
      return hourlyData.map((pointData, weatherIndex) => {
        const { lat, lon, hourlyForecasts } = pointData;
        if (!hourlyForecasts) {
          console.warn('Missing hourlyForecasts for point:', lat, lon);
          return null;
        }

        // Use the stored route index mapping instead of coordinate matching
        const routeIndex = weatherPointIndices[weatherIndex];
        if (routeIndex === undefined || routeIndex === null) {
          console.warn(`No route index mapping for weather point ${weatherIndex}: ${lat},${lon}`);
          return null;
        }
        
        if (routeIndex < 0 || routeIndex >= routeCoordinates.length) {
          console.warn(`Invalid route index ${routeIndex} for weather point ${weatherIndex}`);
          return null;
        }
        const arrivalInfo = arrivalTimes[routeIndex];
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
          console.log(`Point ${weatherIndex}: Using current weather (arrival in past/now)`);
        } else if (minutesFromNow < 60) {
          // Less than 1 hour away - use current weather (closest we have)
          weather = hourlyForecasts.current;
          console.log(`Point ${weatherIndex}: Using current weather (arrival in ${minutesFromNow.toFixed(0)}min)`);
        } else {
          // More than 1 hour away - map to 3-hour interval index
          // OpenWeather gives 3-hour intervals, so:
          // 1-3 hours = index 0, 4-6 hours = index 1, etc.
          // But we need to account for the fact that forecast[0] is for 3 hours from now
          // So: 1-3h = index 0, 4-6h = index 1, 7-9h = index 2, etc.
          const intervalIndex = Math.floor((hoursFromNow - 1) / 3);
          
          console.log(`Point ${weatherIndex}: hoursFromNow=${hoursFromNow.toFixed(2)}, intervalIndex=${intervalIndex}, hourlyLength=${hourlyForecasts.hourly?.length || 0}`);
          
          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex >= 0 && intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];
              console.log(`Point ${weatherIndex}: Using forecast interval ${intervalIndex}/${hourlyForecasts.hourly.length - 1} (arrival in ${hoursFromNow.toFixed(1)}h, temp: ${weather.temp}°C)`);
            } else if (intervalIndex >= hourlyForecasts.hourly.length) {
              // Beyond forecast range, use last available
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
              console.log(`Point ${weatherIndex}: Beyond forecast (${intervalIndex} >= ${hourlyForecasts.hourly.length}), using last available (arrival in ${hoursFromNow.toFixed(1)}h, temp: ${weather.temp}°C)`);
            } else {
              // Negative index (shouldn't happen, but fallback)
              weather = hourlyForecasts.current;
              console.log(`Point ${weatherIndex}: Invalid interval index ${intervalIndex}, using current`);
            }
          } else {
            // No hourly data, use current
            weather = hourlyForecasts.current;
            console.log(`Point ${weatherIndex}: No hourly data (length=${hourlyForecasts.hourly?.length || 0}), using current`);
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
    // Note: weatherHourlyData only contains data for 30-min interval points
    // extractWeatherForEstimatedTimes will map it to route coordinates
    const weatherForTimes = extractWeatherForEstimatedTimes(weatherHourlyData, arrivalTimes);
    
    // Since we already fetched only 30-min interval points, include all of them
    // The filter function will ensure first/last are included
    const filteredWeatherData = filterWeatherTo30MinIntervals(weatherForTimes);
    setWeatherData(filteredWeatherData);
    
    console.log(`Updated weather for departure +${departureOffsetMinutes}min, preview +${previewHoursOffset}h`);
    console.log(`Showing ${filteredWeatherData.length} markers (30-min intervals)`);
  };

  /**
   * Filter weather data to only show markers at 30-minute intervals
   * Note: weatherData already contains arrivalTime info, so we use that directly
   */
  const filterWeatherTo30MinIntervals = (weatherData) => {
    if (!weatherData || weatherData.length === 0) {
      return [];
    }

    const filtered = [];
    let lastShownMinutes = -Infinity;
    const INTERVAL_MINUTES = 30;
    const TOLERANCE_MINUTES = 5; // Allow 5 min tolerance for rounding

    weatherData.forEach((weatherItem, index) => {
      if (!weatherItem || !weatherItem.arrivalTime) {
        console.warn(`Missing arrivalTime for weather item ${index}`);
        return;
      }

      // Calculate elapsed minutes from departure
      // We need to get this from the arrivalTime - but we don't have departure time here
      // Actually, the weatherItem should have hoursFromNow which we can use
      // For now, let's just include all points since they're already at 30-min intervals
      // But we'll keep the first/last logic
      
      const isFirst = index === 0;
      const isLast = index === weatherData.length - 1;
      
      // Since we already fetched only 30-min interval points, include all of them
      // But ensure they're spaced properly
      if (isFirst || isLast) {
        filtered.push(weatherItem);
        console.log(`✓ Including ${isFirst ? 'first' : 'last'} marker at index ${index}`);
      } else {
        // For intermediate points, check if they're at reasonable intervals
        // Since we already calculated them at 30-min intervals, include them all
        filtered.push(weatherItem);
        console.log(`✓ Including intermediate marker at index ${index}`);
      }
    });

    console.log(`Including ${filtered.length} markers (already at 30-min intervals)`);
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

