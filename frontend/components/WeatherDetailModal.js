import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { reverseGeocode } from '../services/geocodingService';

const WeatherDetailModal = ({ visible, onClose, weatherData, temperatureUnit = 'C' }) => {
  const [locationName, setLocationName] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Reverse geocode location when modal opens or weatherData changes
  useEffect(() => {
    if (visible && weatherData && weatherData.lat && weatherData.lon) {
      setLoadingLocation(true);
      reverseGeocode(weatherData.lat, weatherData.lon)
        .then(name => {
          setLocationName(name || `Approximate: ${weatherData.lat.toFixed(2)}, ${weatherData.lon.toFixed(2)}`);
          setLoadingLocation(false);
        })
        .catch(error => {
          console.error('Error reverse geocoding location:', error);
          setLocationName(`Approximate: ${weatherData.lat.toFixed(2)}, ${weatherData.lon.toFixed(2)}`);
          setLoadingLocation(false);
        });
    } else {
      setLocationName(null);
    }
  }, [visible, weatherData]);

  if (!weatherData || !weatherData.weather) {
    return null;
  }

  const weather = weatherData.weather;
  const convertTemp = (tempC) => {
    if (temperatureUnit === 'F') {
      return Math.round((tempC * 9/5) + 32);
    }
    return Math.round(tempC);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatArrivalTime = (arrivalTime) => {
    if (!arrivalTime) return 'N/A';
    const time = new Date(arrivalTime);
    return time.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWeatherIcon = (condition) => {
    const icons = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️',
    };
    return icons[condition] || '🌤️';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Weather Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Weather Icon and Main Temp */}
          <View style={styles.mainSection}>
            <Text style={styles.weatherIcon}>
              {getWeatherIcon(weather.weather?.main || weather.condition)}
            </Text>
            <Text style={styles.mainTemp}>
              {convertTemp(weather.temp)}°{temperatureUnit}
            </Text>
            <Text style={styles.condition}>
              {weather.weather?.description || weather.condition || 'Unknown'}
            </Text>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Feels Like</Text>
              <Text style={styles.detailValue}>
                {convertTemp(weather.feels_like || weather.temp)}°{temperatureUnit}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>
                {weather.humidity || 0}%
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Wind Speed</Text>
              <Text style={styles.detailValue}>
                {weather.wind_speed ? Math.round(weather.wind_speed * 2.237).toFixed(1) : 0} mph
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Wind Direction</Text>
              <Text style={styles.detailValue}>
                {weather.wind_deg ? `${Math.round(weather.wind_deg)}°` : 'N/A'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Precipitation</Text>
              <Text style={styles.detailValue}>
                {weather.precip?.['1h'] ? `${(weather.precip['1h'] * 0.03937).toFixed(2)} in` : '0 in'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Forecast Time</Text>
              <Text style={styles.detailValue}>
                {weather.timestamp ? formatTime(weather.timestamp) : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Arrival Time */}
          {weatherData.arrivalTime && (
            <View style={styles.arrivalSection}>
              <Text style={styles.arrivalLabel}>Estimated Arrival</Text>
              <Text style={styles.arrivalValue}>
                {formatArrivalTime(weatherData.arrivalTime)}
              </Text>
            </View>
          )}

          {/* Location */}
          {weatherData.lat && weatherData.lon && (
            <View style={styles.locationSection}>
              <Text style={styles.locationText}>
                Location: {loadingLocation ? 'Loading...' : (locationName || `${weatherData.lat.toFixed(4)}, ${weatherData.lon.toFixed(4)}`)}
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 24,
  },
  mainSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weatherIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  mainTemp: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  condition: {
    fontSize: 18,
    color: '#666',
    textTransform: 'capitalize',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  arrivalSection: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  arrivalLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arrivalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  locationSection: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WeatherDetailModal;

