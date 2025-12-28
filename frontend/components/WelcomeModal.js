import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const WelcomeModal = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome message before
    if (typeof window !== 'undefined') {
      const hasSeenWelcome = localStorage.getItem('roadweather_welcome_seen');
      if (!hasSeenWelcome) {
        // Small delay to ensure page is loaded
        setTimeout(() => setVisible(true), 500);
      }
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    // Mark as seen so it doesn't show again
    if (typeof window !== 'undefined') {
      localStorage.setItem('roadweather_welcome_seen', 'true');
    }
  };

  // For web, render with HTML img tag; for native, use Image component
  const renderLogo = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Use dangerouslySetInnerHTML to inject HTML img tag for web
      return (
        <div 
          style={{
            marginBottom: 24,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
          }}
          dangerouslySetInnerHTML={{
            __html: `<img src="/favicon-96x96.png" alt="RoadWeather Logo" style="width: 96px; height: 96px; border-radius: 16px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);" onerror="this.style.display='none'" />`
          }}
        />
      );
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Logo/Icon - Web only */}
          {Platform.OS === 'web' && typeof window !== 'undefined' && (
            <View style={styles.logoContainer}>
              {renderLogo()}
            </View>
          )}
          
          {/* Title */}
          <Text style={styles.title}>Welcome to RoadWeather</Text>
          
          {/* Content */}
          <Text style={styles.content}>
            RoadWeather shows you what weather you will encounter along your route, not just at your start or destination. Enter your trip to view predictive weather conditions ahead, helping you anticipate rain, snow, storms, and hazards before you drive into them. Plan smarter routes, adjust departure times, and avoid surprises on the road.
          </Text>
          
          {/* Close Button */}
          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Ok Got it</Text>
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
    padding: 32,
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#1976d2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default WelcomeModal;
