import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { HomePoint } from '../services/userSettings';

interface HomeMarkerProps {
  homePoint: HomePoint;
  onPress?: () => void;
}

export const HomeMarker: React.FC<HomeMarkerProps> = ({ homePoint, onPress }) => {
  return (
    <Marker
      coordinate={{
        latitude: homePoint.latitude,
        longitude: homePoint.longitude,
      }}
      title={homePoint.label || 'Home'}
      description="Your home location"
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.markerContainer}>
        <View style={styles.marker}>
          <Text style={styles.markerText}>🏠</Text>
        </View>
        <View style={styles.markerShadow} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4caf50',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    fontSize: 20,
  },
  markerShadow: {
    width: 20,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    marginTop: -2,
  },
});
