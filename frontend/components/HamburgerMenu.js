import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Platform } from 'react-native';
import TermsModal from './TermsModal';
import PrivacyModal from './PrivacyModal';
import AboutModal from './AboutModal';
import ContactModal from './ContactModal';

const HamburgerMenu = ({ temperatureUnit, setTemperatureUnit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300)); // Start off-screen to the left

  const toggleMenu = () => {
    if (isOpen) {
      // Close menu - slide out to the left
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setIsOpen(false));
    } else {
      // Open menu - slide in from the left
      setIsOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => setIsOpen(false));
  };

  const menuItems = [
    { label: 'About RoadWeather', url: null, action: 'about' },
    { label: 'Terms of Use', url: null, action: 'terms' },
    { label: 'Privacy Policy', url: null, action: 'privacy' },
    { label: 'Contact/Support', url: null, action: 'contact' },
  ];

  const handleMenuClick = (item) => {
    if (item.action === 'about') {
      // Open About modal
      closeMenu();
      setShowAbout(true);
    } else if (item.action === 'terms') {
      // Open Terms modal
      closeMenu();
      setShowTerms(true);
    } else if (item.action === 'privacy') {
      // Open Privacy modal
      closeMenu();
      setShowPrivacy(true);
    } else if (item.action === 'contact') {
      // Open Contact modal
      closeMenu();
      setShowContact(true);
    } else if (item.url) {
      // Open URL in new tab/window
      if (typeof window !== 'undefined') {
        window.open(item.url, '_blank');
      }
      closeMenu();
    }
  };

  const handleTempUnitChange = (unit) => {
    if (setTemperatureUnit) {
      setTemperatureUnit(unit);
    }
    closeMenu();
  };

  return (
    <>
      {/* Hamburger Button */}
      <TouchableOpacity style={styles.hamburgerButton} onPress={toggleMenu}>
        <View style={styles.hamburgerIcon}>
          <View style={[styles.hamburgerLine, isOpen && styles.hamburgerLineTop]} />
          <View style={[styles.hamburgerLine, styles.hamburgerLineMiddle, isOpen && styles.hamburgerLineMiddleHidden]} />
          <View style={[styles.hamburgerLine, isOpen && styles.hamburgerLineBottom]} />
        </View>
      </TouchableOpacity>

      {/* Overlay */}
      {isOpen && (
        <Modal
          transparent={true}
          visible={isOpen}
          animationType="none"
          onRequestClose={closeMenu}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={closeMenu}
          >
            <Animated.View
              style={[
                styles.menuPanel,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Menu</Text>
                  <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.menuItems}>
                  {/* Temperature Unit Toggle - First Item */}
                  <View style={styles.tempUnitMenuContainer}>
                    <Text style={styles.tempUnitMenuLabel}>Temperature Unit:</Text>
                    <View style={styles.tempUnitMenuButtons}>
                      <TouchableOpacity
                        style={[
                          styles.tempUnitMenuButton,
                          temperatureUnit === 'C' && styles.tempUnitMenuButtonActive
                        ]}
                        onPress={() => handleTempUnitChange('C')}
                      >
                        <Text style={[
                          styles.tempUnitMenuText,
                          temperatureUnit === 'C' && styles.tempUnitMenuTextActive
                        ]}>
                          °C
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.tempUnitMenuButton,
                          temperatureUnit === 'F' && styles.tempUnitMenuButtonActive
                        ]}
                        onPress={() => handleTempUnitChange('F')}
                      >
                        <Text style={[
                          styles.tempUnitMenuText,
                          temperatureUnit === 'F' && styles.tempUnitMenuTextActive
                        ]}>
                          °F
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Menu Items */}
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.menuItem}
                      onPress={() => handleMenuClick(item)}
                    >
                      <Text style={styles.menuItemText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* About RoadWeather Modal */}
      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />

      {/* Terms of Use Modal */}
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />

      {/* Privacy Policy Modal */}
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* Contact/Support Modal */}
      <ContactModal visible={showContact} onClose={() => setShowContact(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  hamburgerLineMiddle: {
    marginVertical: 6,
  },
  hamburgerLineTop: {
    transform: [{ rotate: '45deg' }, { translateY: 8 }],
  },
  hamburgerLineMiddleHidden: {
    opacity: 0,
  },
  hamburgerLineBottom: {
    transform: [{ rotate: '-45deg' }, { translateY: -8 }],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  menuPanel: {
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  menuTitle: {
    fontSize: 20,
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
  menuItems: {
    paddingTop: 8,
  },
  tempUnitMenuContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  tempUnitMenuLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tempUnitMenuButtons: {
    flexDirection: 'row',
  },
  tempUnitMenuButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    minWidth: 60,
    alignItems: 'center',
  },
  tempUnitMenuButtonActive: {
    backgroundColor: '#1976d2',
  },
  tempUnitMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tempUnitMenuTextActive: {
    color: '#fff',
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default HamburgerMenu;

