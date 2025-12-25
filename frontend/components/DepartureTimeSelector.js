import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const DepartureTimeSelector = ({ departureTimeOffset, onDepartureTimeChange }) => {
  // Generate options: NOW, +30min, +1h, +1.5h, ... +24h
  const generateOptions = () => {
    const options = [{ label: 'NOW', value: 0 }];
    
    // Add 30-minute intervals up to 24 hours
    for (let minutes = 30; minutes <= 24 * 60; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours === 0) {
        options.push({ label: `+${minutes}min`, value: minutes });
      } else if (mins === 0) {
        options.push({ label: `+${hours}h`, value: minutes });
      } else {
        options.push({ label: `+${hours}h ${mins}min`, value: minutes });
      }
    }
    
    return options;
  };

  const options = generateOptions();
  const [isOpen, setIsOpen] = React.useState(false);

  const formatCurrentTime = (offsetMinutes) => {
    if (offsetMinutes === 0) return 'NOW';
    
    const now = new Date();
    const departureTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);
    const hours = departureTime.getHours();
    const minutes = departureTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Departure Time:</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.selectedText}>
          {formatCurrentTime(departureTimeOffset)}
        </Text>
        <Text style={styles.arrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                departureTimeOffset === option.value && styles.selectedOption
              ]}
              onPress={() => {
                onDepartureTimeChange(option.value);
                setIsOpen(false);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  departureTimeOffset === option.value && styles.selectedOptionText
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minWidth: 150,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  arrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  option: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#1976d2',
  },
});

export default DepartureTimeSelector;

