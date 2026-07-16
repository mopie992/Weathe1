import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, ScrollView, Platform } from 'react-native';

const AboutModal = ({ visible, onClose }) => {
  const [slideAnim] = useState(new Animated.Value(400)); // Start off-screen to the right (positive = right side)

  useEffect(() => {
    if (visible) {
      // Open modal - slide in from the right
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      // Close modal - slide out to the right
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.modalPanel,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>About RoadWeather</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.intro}>
                RoadWeather helps you visualize weather you may encounter along your journey, not just at your starting point or destination. By showing predictive conditions along your route, it gives you a clearer picture of potential rain, snow, storms, and other weather impacts ahead.
              </Text>

              <Text style={styles.sectionText}>
                Use the departure-time slider to explore how conditions may change if you leave earlier or later, helping you make more informed travel plans and reduce surprises on the road.
              </Text>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.closeFooterButton} onPress={handleClose}>
                <Text style={styles.closeFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  modalPanel: {
    width: 400,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    position: 'absolute',
    left: 280, // Position it right after the hamburger menu (280px wide)
    top: 0,
  },
  modalContent: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  closeFooterButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AboutModal;



