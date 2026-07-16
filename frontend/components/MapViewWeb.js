import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import Constants from 'expo-constants';

// Mapbox GL JS for web - load from CDN
// Get token from environment variable (set in .env or Railway)
// Try multiple sources: Expo config, environment variable, or window
const getMapboxToken = () => {
  // Try Expo Constants first (from app.config.js)
  if (Constants.expoConfig?.extra?.mapboxToken) {
    return Constants.expoConfig.extra.mapboxToken;
  }
  // Try process.env (for webpack/build time)
  if (process.env.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  }
  // Try window (for runtime - set by webpack DefinePlugin)
  if (typeof window !== 'undefined' && window.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return window.EXPO_PUBLIC_MAPBOX_TOKEN;
  }
  // Last resort: try to read from a global variable that might be set
  if (typeof window !== 'undefined' && window.__MAPBOX_TOKEN__) {
    return window.__MAPBOX_TOKEN__;
  }
  console.warn('⚠️ Mapbox token not found in any source!');
  return '';
};

const MAPBOX_TOKEN = getMapboxToken();

const MapViewWeb = ({ currentLocation, routeCoordinates, weatherData, temperatureUnit = 'C', onMarkerClick }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [mapboxgl, setMapboxgl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Load Mapbox GL from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.mapboxgl) {
      setMapboxgl(window.mapboxgl);
      setLoading(false);
      return;
    }

    // Load CSS
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    // Load JS script
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => {
      if (window.mapboxgl) {
        setMapboxgl(window.mapboxgl);
        setLoading(false);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Mapbox GL from CDN');
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapboxgl || loading) return;

    if (!map.current && mapContainer.current) {
      // Try multiple ways to get the token (Expo loads env vars at build time)
      let token = MAPBOX_TOKEN;

      // Try Constants.expoConfig.extra first (from app.config.js)
      if (!token && Constants.expoConfig?.extra?.mapboxToken) {
        token = Constants.expoConfig.extra.mapboxToken;
      }

      // Try process.env
      if (!token && process.env.EXPO_PUBLIC_MAPBOX_TOKEN) {
        token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
      }

      // Try window variable
      if (!token && typeof window !== 'undefined' && window.EXPO_PUBLIC_MAPBOX_TOKEN) {
        token = window.EXPO_PUBLIC_MAPBOX_TOKEN;
      }

      if (!token) {
        console.error('❌ Mapbox token not found! Set EXPO_PUBLIC_MAPBOX_TOKEN environment variable.');
        setMapError('Mapbox token not configured. Please check your .env file and restart the dev server.');
        return;
      }

      // Validate token format (should start with pk.)
      if (!token.startsWith('pk.')) {
        console.error('❌ Invalid Mapbox token format! Token should start with "pk."');
        setMapError('Invalid Mapbox token format. Please check your .env file.');
        return;
      }

      mapboxgl.accessToken = token;

      // Use currentLocation if available, otherwise use a default center (North America)
      const center = currentLocation
        ? [currentLocation.longitude, currentLocation.latitude]
        : [-98, 39]; // Default: center of North America (US)
      const zoom = currentLocation ? 12 : 4; // Zoomed in if location available, regional view otherwise

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom
      });

      // Handle map load events
      map.current.on('load', () => {
        setLoading(false);
      });

      map.current.on('error', (e) => {
        console.error('❌ Map error:', e);
        setLoading(false);
      });

      // Add current location marker if available
      if (currentLocation) {
        new mapboxgl.Marker({ color: '#007AFF' })
          .setLngLat([currentLocation.longitude, currentLocation.latitude])
          .addTo(map.current);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxgl, loading]); // Removed currentLocation dependency - handle it separately

  // Update map center when currentLocation becomes available
  useEffect(() => {
    if (!map.current || !currentLocation || !mapboxgl) return;

    try {
      // Fly to the new location
      map.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 12,
        duration: 1000
      });

      // Add or update current location marker
      // Remove existing marker if any
      const existingMarker = markersRef.current.find(m => m.type === 'currentLocation');
      if (existingMarker && existingMarker.marker) {
        existingMarker.marker.remove();
      }

      // Add new marker
      const marker = new mapboxgl.Marker({ color: '#007AFF' })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map.current);

      markersRef.current.push({ type: 'currentLocation', marker });
    } catch (error) {
      console.error('Error updating map center:', error);
    }
  }, [currentLocation, mapboxgl]);

  // Update route line
  useEffect(() => {
    if (!map.current || !routeCoordinates || routeCoordinates.length === 0 || !mapboxgl) return;

    // Check if map style is loaded before adding route
    const addRoute = () => {
      // Check if map is fully loaded and style is ready
      if (!map.current.loaded() || !map.current.isStyleLoaded()) {
        // Wait for map to load
        if (map.current.loaded()) {
          // Map is loaded but style might not be, wait for style
          map.current.once('styledata', () => {
            addRoute();
          });
        } else {
          // Map not loaded yet, wait for load event
          map.current.once('load', () => {
            addRoute();
          });
        }
        return;
      }

    try {
      // Remove existing route source if it exists
      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      // Add route line - validate coordinates
      const coordinates = routeCoordinates
        .map(coord => {
          // Handle different coordinate formats (lat/lon, Lat/Lon, latitude/longitude)
          let lon, lat;

          if (coord.lon !== undefined && coord.lat !== undefined) {
            lon = typeof coord.lon === 'number' ? coord.lon : parseFloat(coord.lon);
            lat = typeof coord.lat === 'number' ? coord.lat : parseFloat(coord.lat);
          } else if (coord.Lon !== undefined && coord.Lat !== undefined) {
            lon = typeof coord.Lon === 'number' ? coord.Lon : parseFloat(coord.Lon);
            lat = typeof coord.Lat === 'number' ? coord.Lat : parseFloat(coord.Lat);
          } else if (coord.longitude !== undefined && coord.latitude !== undefined) {
            lon = typeof coord.longitude === 'number' ? coord.longitude : parseFloat(coord.longitude);
            lat = typeof coord.latitude === 'number' ? coord.latitude : parseFloat(coord.latitude);
          } else if (Array.isArray(coord) && coord.length >= 2) {
            // Handle [lat, lon] or [lon, lat] format
            lat = typeof coord[0] === 'number' ? coord[0] : parseFloat(coord[0]);
            lon = typeof coord[1] === 'number' ? coord[1] : parseFloat(coord[1]);
          } else {
            console.warn('Unknown coordinate format:', coord);
            return null;
          }

          // Fix coordinates that are 10x too large (common polyline decoding issue)
          if (Math.abs(lat) > 90) {
            lat = lat / 10;
          }
          if (Math.abs(lon) > 180) {
            lon = lon / 10;
          }

          // Validate range
          if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
            console.warn('Invalid coordinate after fix:', { lat, lon, original: coord });
            return null;
          }
          return [lon, lat];
        })
        .filter(coord => coord !== null); // Remove invalid coordinates

      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#007AFF',
          'line-width': 4
        }
      });

      // Fit map to route bounds
      if (coordinates.length > 0 && mapboxgl) {
        try {
          // Validate coordinates first - filter out invalid ones
          const validCoords = coordinates.filter(coord => {
            const [lon, lat] = coord;
            return (
              typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180 &&
              typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
            );
          });

          if (validCoords.length > 0) {
            const bounds = validCoords.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(validCoords[0], validCoords[0]));

            map.current.fitBounds(bounds, {
              padding: 50
            });
          }
        } catch (error) {
          console.error('Error fitting bounds:', error);
        }
      }
    } catch (error) {
      console.error('Error adding route:', error);
    }
    };

    // Call addRoute function
    addRoute();
  }, [routeCoordinates, mapboxgl]);

  // Helper function to convert temperature
  const convertTemp = (tempC) => {
    if (temperatureUnit === 'F') {
      return Math.round((tempC * 9/5) + 32);
    }
    return Math.round(tempC);
  };

  // Update weather markers
  useEffect(() => {
    if (!map.current || !weatherData || weatherData.length === 0 || !mapboxgl) {
      return;
    }

    try {

      // Remove existing markers completely
      if (markersRef.current && markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          try {
            // Check if marker has remove method (Mapbox Marker object)
            if (marker && typeof marker.remove === 'function') {
              marker.remove();
            } else if (marker && marker.marker && typeof marker.marker.remove === 'function') {
              // Handle nested marker structure
              marker.marker.remove();
            } else {
              console.warn('Marker does not have remove method:', marker);
            }
          } catch (e) {
            console.warn('Error removing marker:', e);
          }
        });
        markersRef.current = [];
      }

      // Add weather markers
      weatherData.forEach((item, index) => {
        if (!item || !item.weather) {
          console.warn('Invalid weather item at index', index, item);
          return;
        }

        const weather = item.weather;
        const color = getWeatherColor(weather);
        const icon = getWeatherIcon(weather.condition);

        // Get coordinates - handle different formats
        let lon, lat;
        if (item.lon !== undefined && item.lat !== undefined) {
          lon = typeof item.lon === 'number' ? item.lon : parseFloat(item.lon);
          lat = typeof item.lat === 'number' ? item.lat : parseFloat(item.lat);
        } else {
          console.warn('Missing coordinates in weather item:', item);
          return;
        }

        // Fix coordinates that are 10x too large
        if (Math.abs(lat) > 90) {
          lat = lat / 10;
        }
        if (Math.abs(lon) > 180) {
          lon = lon / 10;
        }

        // Validate coordinates
        if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          console.warn('Invalid coordinates for weather marker:', { lat, lon, original: item });
          return;
        }

        if (typeof document !== 'undefined') {
          // Format estimated arrival time
          const formatArrivalTime = (arrivalTime) => {
            if (!arrivalTime) return '';
            const time = new Date(arrivalTime);
            const hours = time.getHours();
            const minutes = time.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            return `${displayHours}:${displayMinutes} ${ampm}`;
          };

          const el = document.createElement('div');
          el.className = 'weather-marker';
          el.style.width = '60px';
          el.style.height = 'auto';
          el.style.minHeight = '70px';
          el.style.borderRadius = '8px';
          el.style.backgroundColor = color;
          el.style.border = '2px solid #fff';
          el.style.display = 'flex';
          el.style.flexDirection = 'column';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontSize = '14px';
          el.style.cursor = 'pointer';
          el.style.zIndex = '1000'; // Ensure markers are above route line
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'; // Make markers more visible
          el.style.padding = '6px 4px';
          el.style.boxSizing = 'border-box';
          el.style.transition = 'box-shadow 0.2s, border-width 0.2s';
          el.style.transformOrigin = 'center center';

          // Add hover effect (using box-shadow and border instead of transform to avoid positioning issues)
          el.addEventListener('mouseenter', () => {
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
            el.style.borderWidth = '3px';
            el.style.zIndex = '1001'; // Bring to front on hover
          });
          el.addEventListener('mouseleave', () => {
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            el.style.borderWidth = '2px';
            el.style.zIndex = '1000';
          });

          // Add click handler
          if (onMarkerClick) {
            el.addEventListener('click', () => {
              onMarkerClick(item);
            });
          }

          const displayTemp = convertTemp(weather.temp);

          // Determine text color based on background color for better contrast
          // White/snow backgrounds need dark text, others need light text
          const condition = weather.condition.toLowerCase();
          const isLightBackground = condition.includes('snow') || condition.includes('clear');
          const timeTextColor = isLightBackground ? '#333' : '#fff';
          const timeTextShadow = isLightBackground
            ? '0 1px 2px rgba(255,255,255,0.8)'
            : '0 1px 2px rgba(0,0,0,0.8)';

          el.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 2px;">${icon}</div>
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px; color: ${timeTextColor}; text-shadow: ${timeTextShadow};">${displayTemp}°${temperatureUnit}</div>
            <div style="font-size: 9px; color: ${timeTextColor}; text-align: center; line-height: 1.1; opacity: 0.95; text-shadow: ${timeTextShadow};">
              ${item.arrivalTime ? formatArrivalTime(item.arrivalTime) : 'est'}
            </div>
          `;

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lon, lat])
            .addTo(map.current);

          markersRef.current.push(marker);
        }
      });

    } catch (error) {
      console.error('Error adding weather markers:', error);
    }
  }, [weatherData, mapboxgl, temperatureUnit, onMarkerClick]);

  if (typeof window === 'undefined') {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text>Not running in browser</Text>
        </View>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={{ color: '#dc3545', textAlign: 'center', padding: 20 }}>
            {mapError}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 10, textAlign: 'center', padding: 10 }}>
            Make sure EXPO_PUBLIC_MAPBOX_TOKEN is set in your .env file and restart the dev server.
          </Text>
        </View>
      </View>
    );
  }

  if (loading || !mapboxgl) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {React.createElement('div', { ref: mapContainer, style: styles.map })}
    </View>
  );
};

function getWeatherColor(weather) {
  const condition = weather.condition.toLowerCase();

  if (condition.includes('rain') || condition.includes('drizzle')) {
    return 'rgba(59, 130, 246, 0.8)';
  } else if (condition.includes('snow')) {
    return 'rgba(255, 255, 255, 0.9)';
  } else if (condition.includes('storm') || condition.includes('thunder')) {
    return 'rgba(99, 102, 241, 0.8)';
  } else if (condition.includes('fog') || condition.includes('mist')) {
    return 'rgba(156, 163, 175, 0.8)';
  } else if (condition.includes('clear')) {
    return 'rgba(251, 191, 36, 0.8)';
  } else {
    return 'rgba(148, 163, 184, 0.8)';
  }
}

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
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: '400px',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapViewWeb;

