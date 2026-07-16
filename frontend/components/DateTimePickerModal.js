import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';

const DateTimePickerModal = ({ visible, onClose, onApply, initialDate = null }) => {
  const initDate = initialDate || new Date();
  const initHour24 = initDate.getHours();
  const initHour12 = initHour24 === 0 ? 12 : (initHour24 > 12 ? initHour24 - 12 : initHour24);
  const initMinute = initDate.getMinutes();
  // Round minute to nearest quarter (0, 15, 30, 45)
  const initMinuteRounded = Math.round(initMinute / 15) * 15;

  const [selectedDate, setSelectedDate] = useState(initDate);
  const [selectedHour, setSelectedHour] = useState(initHour12);
  const [selectedMinute, setSelectedMinute] = useState(initMinuteRounded > 45 ? 45 : initMinuteRounded);
  const [selectedAmPm, setSelectedAmPm] = useState(initHour24 >= 12 ? 'PM' : 'AM');

  // Generate hours (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate minutes (0, 15, 30, 45 - quarterly intervals)
  const minutes = [0, 15, 30, 45];

  // Generate dates for today + 7 days (8 days total)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day

  const availableDates = [];
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    availableDates.push(date);
  }

  // Format date for display
  const formatDateDisplay = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateToCheck.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
    }
  };

  // Check if a date is selected
  const isDateSelected = (date) => {
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return selected.getTime() === check.getTime();
  };

  // Check if a date is today
  const isDateToday = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check.getTime() === today.getTime();
  };

  const handleApply = () => {
    // Convert 12-hour format to 24-hour format
    let hour24 = selectedHour;
    if (selectedAmPm === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }

    const finalDate = new Date(selectedDate);
    finalDate.setHours(hour24);
    finalDate.setMinutes(selectedMinute);
    finalDate.setSeconds(0);
    finalDate.setMilliseconds(0);

    onApply(finalDate);
    onClose();
  };

  const handleCancel = () => {
    // Reset to initial date
    if (initialDate) {
      setSelectedDate(new Date(initialDate));
      setSelectedHour(initialDate.getHours() % 12 || 12);
      setSelectedMinute(initialDate.getMinutes());
      setSelectedAmPm(initialDate.getHours() >= 12 ? 'PM' : 'AM');
    }
    onClose();
  };

  const selectDate = (date) => {
    const newDate = new Date(date);
    // Preserve the selected time from the time picker (not from selectedDate)
    // Convert 12-hour format to 24-hour format
    let hour24 = selectedHour;
    if (selectedAmPm === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }

    newDate.setHours(hour24);
    newDate.setMinutes(selectedMinute);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    setSelectedDate(newDate);
  };

  // Sync selectedDate whenever time picker values change
  useEffect(() => {
    if (!visible) return; // Only sync when modal is visible

    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      // Convert 12-hour format to 24-hour format
      let hour24 = selectedHour;
      if (selectedAmPm === 'PM' && selectedHour !== 12) {
        hour24 = selectedHour + 12;
      } else if (selectedAmPm === 'AM' && selectedHour === 12) {
        hour24 = 0;
      }

      newDate.setHours(hour24);
      newDate.setMinutes(selectedMinute);
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);

      // Only update if the time actually changed (avoid unnecessary updates)
      if (newDate.getTime() !== prevDate.getTime()) {
        return newDate;
      }
      return prevDate;
    });
  }, [selectedHour, selectedMinute, selectedAmPm, visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Departure Time</Text>
          </View>

          {/* Date Picker Section */}
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Date:</Text>
            <ScrollView
              style={styles.dateColumn}
              showsVerticalScrollIndicator={false}
              horizontal={false}
            >
              {availableDates.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateOption,
                    isDateSelected(date) && styles.selectedDateOption
                  ]}
                  onPress={() => selectDate(date)}
                >
                  <Text style={[
                    styles.dateOptionText,
                    isDateSelected(date) && styles.selectedDateOptionText,
                    isDateToday(date) && !isDateSelected(date) && styles.todayDateText
                  ]}>
                    {formatDateDisplay(date)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Time Picker Section */}
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Time:</Text>
            <View style={styles.timePicker}>
              {/* Hours */}
              <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                {hours.map(hour => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timeOption,
                      selectedHour === hour && styles.selectedTimeOption
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      selectedHour === hour && styles.selectedTimeOptionText
                    ]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minutes */}
              <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                {minutes.map(minute => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.timeOption,
                      selectedMinute === minute && styles.selectedTimeOption
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      selectedMinute === minute && styles.selectedTimeOptionText
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AM/PM */}
              <View style={styles.ampmContainer}>
                <TouchableOpacity
                  style={[
                    styles.ampmButton,
                    selectedAmPm === 'AM' && styles.ampmButtonSelected
                  ]}
                  onPress={() => setSelectedAmPm('AM')}
                >
                  <Text style={[
                    styles.ampmButtonText,
                    selectedAmPm === 'AM' && styles.ampmButtonTextSelected
                  ]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ampmButton,
                    selectedAmPm === 'PM' && styles.ampmButtonSelected
                  ]}
                  onPress={() => setSelectedAmPm('PM')}
                >
                  <Text style={[
                    styles.ampmButtonText,
                    selectedAmPm === 'PM' && styles.ampmButtonTextSelected
                  ]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Buttons - Fixed at bottom */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
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
    borderRadius: 10,
    padding: 12,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  dateColumn: {
    maxHeight: 120,
  },
  dateOption: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 1,
    alignItems: 'center',
  },
  selectedDateOption: {
    backgroundColor: '#1976d2',
  },
  dateOptionText: {
    fontSize: 11,
    color: '#666',
  },
  selectedDateOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayDateText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  timeSection: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 120,
  },
  timeColumn: {
    marginHorizontal: 4,
    maxHeight: 120,
  },
  timeOption: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 1,
    minWidth: 42,
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: '#1976d2',
  },
  timeOptionText: {
    fontSize: 11,
    color: '#666',
  },
  selectedTimeOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeSeparator: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 2,
  },
  ampmContainer: {
    marginLeft: 4,
    height: 120,
    justifyContent: 'center',
    gap: 3,
  },
  ampmButton: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    minWidth: 36,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  ampmButtonSelected: {
    backgroundColor: '#1976d2',
  },
  ampmButtonText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  ampmButtonTextSelected: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 2,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#1976d2',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DateTimePickerModal;

