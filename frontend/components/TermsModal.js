import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, ScrollView, Platform } from 'react-native';

const TermsModal = ({ visible, onClose }) => {
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
              <Text style={styles.title}>Terms of Use</Text>
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
                These Terms govern your use of the RoadWeather application and related services ("Service"), operated by Audiospoons LLC ("we," "us," or "our"). By using the Service, you agree to these Terms.
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Informational Use Only</Text>
                <Text style={styles.sectionText}>
                  RoadWeather provides route-based and weather-related information for informational purposes only. It does not provide driving, safety, professional, or legal advice. You are responsible for your own travel decisions.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Weather Is Predictive</Text>
                <Text style={styles.sectionText}>
                  Weather data shown in the Service is predictive and estimated. Forecasts represent conditions you may encounter, not conditions you will encounter.
                </Text>
                <Text style={styles.sectionText}>
                  Actual conditions can change rapidly and may differ from what is displayed. Always use your own judgment and observe real-world conditions.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Accuracy and Availability</Text>
                <Text style={styles.sectionText}>
                  We do not guarantee that the Service or its information will be accurate, complete, current, or available at all times. Interruptions, delays, errors, or outages may occur.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. User Responsibility</Text>
                <Text style={styles.sectionText}>You agree that:</Text>
                <Text style={styles.bulletPoint}>• You are responsible for complying with all applicable laws and traffic regulations.</Text>
                <Text style={styles.bulletPoint}>• You will not use the Service in a distracting or unsafe manner while driving.</Text>
                <Text style={styles.bulletPoint}>• You assume all risks related to travel and weather conditions.</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>5. Third-Party Data</Text>
                <Text style={styles.sectionText}>
                  The Service may use third-party weather, mapping, or data providers. We do not control these providers and are not responsible for their accuracy, availability, or reliability.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
                <Text style={styles.sectionText}>
                  To the fullest extent permitted by law, Audiospoons LLC is not liable for any damages arising from your use of, or inability to use, the Service, including delays, losses, property damage, or personal injury.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>7. No Warranties</Text>
                <Text style={styles.sectionText}>
                  The Service is provided "as is" and "as available," without warranties of any kind, express or implied.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>8. Changes to These Terms</Text>
                <Text style={styles.sectionText}>
                  We may update these Terms from time to time. Continued use of the Service after changes are posted means you accept the updated Terms.
                </Text>
              </View>

              <View style={styles.disclaimerSection}>
                <Text style={styles.disclaimerTitle}>Disclaimer</Text>
                <Text style={styles.disclaimerText}>
                  Predictive weather information only. Conditions may vary.
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
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#856404',
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

export default TermsModal;

