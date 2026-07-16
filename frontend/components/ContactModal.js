import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, ScrollView, Linking, Platform } from 'react-native';

const ContactModal = ({ visible, onClose }) => {
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

  const handleEmailPress = () => {
    const email = 'support@roadweather.app';
    const subject = encodeURIComponent('RoadWeather Support Request');
    const mailtoLink = `mailto:${email}?subject=${subject}`;

    Linking.canOpenURL(mailtoLink).then(supported => {
      if (supported) {
        Linking.openURL(mailtoLink);
      } else {
        // Fallback: copy email to clipboard or show it
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(email);
          alert(`Email address copied to clipboard: ${email}`);
        } else {
          alert(`Please contact us at: ${email}`);
        }
      }
    }).catch(err => {
      console.error('Error opening email:', err);
      alert(`Please contact us at: ${email}`);
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
              <Text style={styles.title}>Contact/Support</Text>
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
                Need help or have a question?
              </Text>

              <View style={styles.emailSection}>
                <Text style={styles.emailLabel}>Reach us at:</Text>
                <TouchableOpacity onPress={handleEmailPress} style={styles.emailButton}>
                  <Text style={styles.emailText}>support@roadweather.app</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionText}>
                If you have ideas or suggestions to improve RoadWeather, we'd love to hear them.
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
    fontSize: 18,
    lineHeight: 26,
    color: '#333',
    marginBottom: 24,
    fontWeight: '600',
  },
  emailSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  emailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  emailButton: {
    paddingVertical: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
    textDecorationLine: 'underline',
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

export default ContactModal;



