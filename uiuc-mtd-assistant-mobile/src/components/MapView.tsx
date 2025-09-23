import React from 'react';
import { View, Text, Platform } from 'react-native';
import { APP_CONFIG } from '../constants/env';

export const MapScreen = () => {
  // UIUC campus coordinates (Main Quad)
  const campusCenter = {
    latitude: APP_CONFIG.MAP_CENTER.latitude,
    longitude: APP_CONFIG.MAP_CENTER.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Show placeholder on web
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
          🗺️ Map View
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', color: '#666' }}>
          Interactive map will be available on mobile devices
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#999', marginTop: 10 }}>
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
          
          return () => (
            <View style={{ flex: 1 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={campusCenter}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
              >
                <Marker
                  coordinate={{
                    latitude: APP_CONFIG.MAP_CENTER.latitude,
                    longitude: APP_CONFIG.MAP_CENTER.longitude,
                  }}
                  title="UIUC Main Quad"
                  description="University of Illinois at Urbana-Champaign"
                />
              </MapView>
            </View>
          );
        });
      }).catch((error) => {
        console.warn('Failed to load react-native-maps:', error);
      });
    }
  }, []);

  if (!MapComponent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, textAlign: 'center', color: '#666' }}>
          Loading map...
        </Text>
      </View>
    );
  }

  return <MapComponent />;
};
