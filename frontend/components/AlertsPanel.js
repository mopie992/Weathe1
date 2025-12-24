import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';

const AlertsPanel = ({ weatherData }) => {
  if (!weatherData || weatherData.length === 0) {
    return null;
  }

  // Filter for severe weather conditions
  const alerts = weatherData
    .map((item, index) => {
      const weather = item.weather;
      const severity = getSeverity(weather);
      
      if (severity === 'none') return null;

      return {
        id: index,
        location: `Point ${index + 1}`,
        condition: weather.condition,
        description: weather.description,
        severity,
        temp: weather.temp,
        precip: weather.precip,
        wind: weather.wind,
        lat: item.lat,
        lon: item.lon
      };
    })
    .filter(alert => alert !== null);

  if (alerts.length === 0) {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'severe':
        return '#DC2626'; // Red
      case 'moderate':
        return '#F59E0B'; // Orange
      case 'minor':
        return '#EAB308'; // Yellow
      default:
        return '#6B7280'; // Gray
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'severe':
        return '⚠️';
      case 'moderate':
        return '⚡';
      case 'minor':
        return '🌧️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Weather Alerts</Text>
        <Text style={styles.countText}>{alerts.length}</Text>
      </View>
      <ScrollView style={styles.scrollView} horizontal showsHorizontalScrollIndicator={false}>
        {alerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertCard,
              { borderLeftColor: getSeverityColor(alert.severity) }
            ]}
          >
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>{getSeverityIcon(alert.severity)}</Text>
              <Text style={styles.alertSeverity} numberOfLines={1}>
                {alert.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.alertCondition} numberOfLines={1}>
              {alert.condition}
            </Text>
            <Text style={styles.alertDescription} numberOfLines={2}>
              {alert.description}
            </Text>
            <View style={styles.alertDetails}>
              <Text style={styles.alertDetailText}>
                🌡️ {Math.round(alert.temp)}°C
              </Text>
              {alert.precip > 0 && (
                <Text style={styles.alertDetailText}>
                  💧 {alert.precip.toFixed(1)}mm
                </Text>
              )}
              {alert.wind > 15 && (
                <Text style={styles.alertDetailText}>
                  💨 {alert.wind.toFixed(1)} m/s
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Determine severity level based on weather conditions
 */
function getSeverity(weather) {
  const condition = weather.condition.toLowerCase();
  const precip = weather.precip || 0;
  const wind = weather.wind || 0;

  // Severe conditions
  if (
    condition.includes('storm') ||
    condition.includes('thunder') ||
    wind > 20 ||
    precip > 10
  ) {
    return 'severe';
  }

  // Moderate conditions
  if (
    condition.includes('rain') ||
    condition.includes('snow') ||
    wind > 15 ||
    precip > 5
  ) {
    return 'moderate';
  }

  // Minor conditions
  if (
    condition.includes('fog') ||
    condition.includes('mist') ||
    wind > 10 ||
    precip > 0
  ) {
    return 'minor';
  }

  return 'none';
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    maxHeight: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  scrollView: {
    paddingHorizontal: 10,
  },
  alertCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    marginVertical: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  alertSeverity: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  alertCondition: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  alertDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertDetailText: {
    fontSize: 10,
    color: '#4B5563',
  },
});

export default AlertsPanel;

