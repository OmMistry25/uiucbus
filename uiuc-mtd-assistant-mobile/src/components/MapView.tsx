import React from 'react';
import { View, Text, Platform, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import * as Location from 'expo-location';
import { APP_CONFIG } from '../constants/env';
import { BusMarkerDemo } from './BusMarkerDemo';

export const MapScreen = () => {
  const [locationPermission, setLocationPermission] = React.useState<Location.LocationPermissionResponse | null>(null);
  const [userLocation, setUserLocation] = React.useState<Location.LocationObject | null>(null);
  const [showBusMarkerDemo, setShowBusMarkerDemo] = React.useState(false);

  // UIUC campus coordinates (Main Quad) with appropriate zoom level
  const campusCenter = {
    latitude: APP_CONFIG.MAP_CENTER.latitude,
    longitude: APP_CONFIG.MAP_CENTER.longitude,
    latitudeDelta: 0.02, // Slightly wider view to show more of campus
    longitudeDelta: 0.02,
  };

  // Request location permissions and get user location
  React.useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        console.log('🗺️ Requesting location permissions...');
        
        // Request foreground location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('🗺️ Location permission status:', status);
        
        if (status !== 'granted') {
          console.warn('🗺️ Location permission denied');
          Alert.alert(
            'Location Permission Required',
            'This app needs location access to show your position on the map and help you find nearby bus stops.',
            [{ text: 'OK' }]
          );
          return;
        }

        console.log('🗺️ Location permission granted, getting current location...');
        
        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        console.log('🗺️ User location:', location);
        setUserLocation(location);
        setLocationPermission({ status: 'granted' } as Location.LocationPermissionResponse);
        console.log('🗺️ Location permission state updated to granted');
        
      } catch (error) {
        console.error('🗺️ Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. The map will show the UIUC campus area.',
          [{ text: 'OK' }]
        );
      }
    };

    requestLocationPermission();
  }, []);

  // Show placeholder on web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webPlaceholder}>
        <Text style={styles.webTitle}>
          🗺️ Map View
        </Text>
        <Text style={styles.webSubtitle}>
          Interactive map will be available on mobile devices
        </Text>
        <Text style={styles.webHint}>
          Scan the QR code with Expo Go to see the full map experience
        </Text>
      </View>
    );
  }

  // For native platforms, dynamically import and render the map
  const [MapComponent, setMapComponent] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      import('react-native-maps').then((Maps) => {
        setMapComponent(() => {
          const MapView = Maps.default;
          const Marker = Maps.Marker;
          
          return () => {
            console.log('🗺️ Rendering MapView with:', {
              hasUserLocation: !!userLocation,
              locationPermission: locationPermission?.status,
              showsUserLocation: locationPermission?.status === 'granted',
              showsMyLocationButton: locationPermission?.status === 'granted'
            });
            
            return (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={userLocation ? {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  } : campusCenter}
                  showsUserLocation={locationPermission?.status === 'granted'}
                  showsMyLocationButton={locationPermission?.status === 'granted'}
                  showsCompass={true}
                  showsScale={true}
                  showsBuildings={true}
                  showsIndoors={false}
                  showsTraffic={false}
                  showsPointsOfInterest={true}
                  mapType="standard"
                  userInterfaceStyle="light"
                  followsUserLocation={false}
                  userLocationAnnotationTitle="Your Location"
                  userLocationPriority="high"
                  userLocationUpdateInterval={5000}
                >
                </MapView>
                
                {/* BusMarker Demo Button */}
                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => setShowBusMarkerDemo(true)}
                >
                  <Text style={styles.demoButtonText}>🚌 Test BusMarker</Text>
                </TouchableOpacity>
              </View>
            );
          };
        });
      }).catch((error) => {
        console.warn('Failed to load react-native-maps:', error);
      });
    }
  }, [userLocation, locationPermission]); // Re-render when location or permission changes

  if (!MapComponent) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading map...
        </Text>
        {locationPermission?.status === 'granted' && (
          <Text style={styles.locationStatus}>
            ✅ Location access granted
          </Text>
        )}
        {locationPermission?.status === 'denied' && (
          <Text style={styles.locationError}>
            ❌ Location access denied
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      <MapComponent />
      
      {/* BusMarker Demo Modal */}
      <Modal
        visible={showBusMarkerDemo}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBusMarkerDemo(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>BusMarker Demo</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBusMarkerDemo(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <BusMarkerDemo />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  webTitle: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
  webSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  webHint: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    marginTop: 10,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
  },
  locationStatus: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4CAF50',
    marginTop: 10,
  },
  locationError: {
    fontSize: 14,
    textAlign: 'center',
    color: '#F44336',
    marginTop: 10,
  },
  demoButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  demoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
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
    fontWeight: 'bold',
  },
});
