import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

const TimelineSlider = ({ value, onValueChange, maxHours = 48 }) => {
  const formatTimeLabel = (hours) => {
    if (hours === 0) return 'Now';
    if (hours === 1) return '+1 hour';
    return `+${hours} hours`;
  };

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={maxHours}
        value={value}
        onValueChange={onValueChange}
        step={1}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#007AFF"
      />
      <View style={styles.labels}>
        <Text style={styles.label}>Now</Text>
        <Text style={styles.valueLabel}>{formatTimeLabel(Math.round(value))}</Text>
        <Text style={styles.label}>+{maxHours}h</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

export default TimelineSlider;

