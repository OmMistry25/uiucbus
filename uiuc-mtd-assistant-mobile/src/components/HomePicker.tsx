import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { UserSettingsService, HomePoint } from '../services/userSettings';
import { supabase } from '../services/supabase';

interface HomePickerProps {
  visible: boolean;
  onClose: () => void;
  onHomeSet: (homePoint: HomePoint) => void;
  selectedLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const HomePicker: React.FC<HomePickerProps> = ({
  visible,
  onClose,
  onHomeSet,
  selectedLocation
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentHome, setCurrentHome] = useState<HomePoint | null>(null);

  // Load current home point when component mounts
  useEffect(() => {
    if (visible) {
      loadCurrentHome();
    }
  }, [visible]);

  const loadCurrentHome = async () => {
    try {
      const home = await UserSettingsService.getHomePoint();
      setCurrentHome(home);
    } catch (error) {
      console.error('Error loading current home:', error);
    }
  };

  const handleSetHome = async () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'No location selected');
      return;
    }

    setIsLoading(true);
    try {
      const homePoint: HomePoint = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        label: 'Home'
      };

      const success = await UserSettingsService.setHomePoint(homePoint);
      
      if (success) {
        setCurrentHome(homePoint);
        onHomeSet(homePoint);
        Alert.alert(
          'Home Set! 🏠',
          `Your home location has been set successfully.`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Error', 'Failed to set home location. Please try again.');
      }
    } catch (error) {
      console.error('Error setting home:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHome = async () => {
    Alert.alert(
      'Clear Home Location',
      'Are you sure you want to clear your home location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Set home point to null by updating with empty geometry
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase
                  .from('user_settings')
                  .upsert({
                    user_id: user.id,
                    home_point: null,
                    home_label: 'Home'
                  });

                if (!error) {
                  setCurrentHome(null);
                  Alert.alert('Home Cleared', 'Your home location has been cleared.');
                }
              }
            } catch (error) {
              console.error('Error clearing home:', error);
              Alert.alert('Error', 'Failed to clear home location.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Home Location</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {currentHome ? (
            <View style={styles.currentHomeSection}>
              <Text style={styles.sectionTitle}>Current Home Location</Text>
              <View style={styles.homeInfo}>
                <Text style={styles.homeLabel}>🏠 {currentHome.label}</Text>
                <Text style={styles.homeCoordinates}>
                  {currentHome.latitude.toFixed(6)}, {currentHome.longitude.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={handleClearHome}
                disabled={isLoading}
              >
                <Text style={styles.clearButtonText}>Clear Home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noHomeSection}>
              <Text style={styles.sectionTitle}>No Home Location Set</Text>
              <Text style={styles.description}>
                Tap on the map to select a location, then tap "Set as Home" to save it.
              </Text>
            </View>
          )}

          {selectedLocation && (
            <View style={styles.selectedLocationSection}>
              <Text style={styles.sectionTitle}>Selected Location</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.coordinates}>
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.setHomeButton]}
                onPress={handleSetHome}
                disabled={isLoading}
              >
                <Text style={styles.setHomeButtonText}>
                  {isLoading ? 'Setting...' : 'Set as Home'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>How to set your home:</Text>
            <Text style={styles.instructionText}>
              1. Tap anywhere on the map to select a location{'\n'}
              2. Tap "Set as Home" to save it{'\n'}
              3. Your home will be used for trip planning
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentHomeSection: {
    marginBottom: 30,
  },
  noHomeSection: {
    marginBottom: 30,
  },
  selectedLocationSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  homeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  homeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  homeCoordinates: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  locationInfo: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  coordinates: {
    fontSize: 14,
    color: '#1976d2',
    fontFamily: 'monospace',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  setHomeButton: {
    backgroundColor: '#4caf50',
  },
  setHomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
