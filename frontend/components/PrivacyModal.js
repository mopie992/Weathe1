import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, ScrollView, Platform } from 'react-native';

const PrivacyModal = ({ visible, onClose }) => {
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

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
              <Text style={styles.title}>Privacy Policy</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.lastUpdated}>Last updated: {currentDate}</Text>

              <Text style={styles.intro}>
                This Privacy Policy explains how information is handled when you use the RoadWeather application and related services ("Service"), operated by Audiospoons LLC ("we," "us," or "our").
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Information We Collect</Text>
                <Text style={styles.sectionText}>
                  RoadWeather is designed to collect minimal information.
                </Text>
                <Text style={styles.sectionText}>
                  Depending on how you use the Service, we may collect:
                </Text>
                <Text style={styles.bulletPoint}>• Route or location information you voluntarily enter to generate weather predictions</Text>
                <Text style={styles.bulletPoint}>• General usage data (such as app interactions, performance, or error data)</Text>
                <Text style={styles.bulletPoint}>• Device information (such as device type or operating system)</Text>
                <Text style={styles.sectionText}>
                  We do not knowingly collect sensitive personal information.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. How Information Is Used</Text>
                <Text style={styles.sectionText}>Information is used only to:</Text>
                <Text style={styles.bulletPoint}>• Provide route-based weather information</Text>
                <Text style={styles.bulletPoint}>• Improve app performance and reliability</Text>
                <Text style={styles.bulletPoint}>• Monitor usage trends and fix issues</Text>
                <Text style={styles.sectionText}>
                  We do not use your information for advertising purposes unless explicitly stated.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Location Information</Text>
                <Text style={styles.sectionText}>
                  If you provide location or route data, it is used solely to display weather conditions you may encounter along your route. Location data is not used to track you outside the functionality of the Service.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
                <Text style={styles.sectionText}>
                  The Service may use third-party services for:
                </Text>
                <Text style={styles.bulletPoint}>• Weather data</Text>
                <Text style={styles.bulletPoint}>• Maps or routing</Text>
                <Text style={styles.bulletPoint}>• Analytics or diagnostics</Text>
                <Text style={styles.sectionText}>
                  These third parties may process data in accordance with their own privacy policies. We do not control how third-party services handle data.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>5. Data Retention</Text>
                <Text style={styles.sectionText}>
                  We retain information only as long as necessary to operate and improve the Service. Data may be aggregated or anonymized for analysis purposes.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>6. Data Security</Text>
                <Text style={styles.sectionText}>
                  We take reasonable measures to protect information from unauthorized access, loss, or misuse. However, no system can be guaranteed to be 100% secure.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
                <Text style={styles.sectionText}>
                  The Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
                <Text style={styles.sectionText}>
                  We may update this Privacy Policy from time to time. Continued use of the Service after changes are posted means you accept the updated policy.
                </Text>
              </View>

              <View style={styles.disclaimerSection}>
                <Text style={styles.disclaimerText}>
                  RoadWeather collects minimal data needed to provide weather and routing features.
                </Text>
              </View>
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
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginLeft: 16,
    marginBottom: 4,
  },
  disclaimerSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1565c0',
    fontStyle: 'italic',
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

export default PrivacyModal;

