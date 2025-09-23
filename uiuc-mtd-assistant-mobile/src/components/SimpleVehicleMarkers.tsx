import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { vehicleTracker, Vehicle, VehicleUpdate } from '../services/vehicleTracker';

interface SimpleVehicleMarkersProps {
  /** Whether to show vehicle markers */
  visible?: boolean;
}

export const SimpleVehicleMarkers: React.FC<SimpleVehicleMarkersProps> = ({
  visible = true,
}) => {
  const [vehicles, setVehicles] = useState<Map<string, Vehicle>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Handle vehicle updates
  const handleVehicleUpdate = useCallback((update: VehicleUpdate) => {
    console.log('🚌 Received vehicle update for route', update.routeId, ':', update.vehicles.length, 'vehicles');
    
    setVehicles(prevVehicles => {
      const newVehicles = new Map(prevVehicles);
      
      // Remove old vehicles for this route
      for (const [vehicleId, vehicle] of newVehicles) {
        if (vehicle.routeId === update.routeId) {
          newVehicles.delete(vehicleId);
        }
      }
      
      // Add new vehicles for this route
      update.vehicles.forEach(vehicle => {
        newVehicles.set(vehicle.id, vehicle);
      });
      
      console.log('🚌 Total vehicles on map:', newVehicles.size);
      return newVehicles;
    });
    
    setLastUpdate(update.timestamp);
  }, []);

  // Set up vehicle tracking
  useEffect(() => {
    if (!visible) {
      return;
    }

    console.log('🚌 Setting up simple vehicle markers');
    
    // Add callback for vehicle updates
    vehicleTracker.addUpdateCallback(handleVehicleUpdate);
    
    // Start tracking if not already started
    if (!vehicleTracker.getStatus().isTracking) {
      vehicleTracker.startTracking();
    }

    return () => {
      console.log('🚌 Cleaning up simple vehicle markers');
      vehicleTracker.removeUpdateCallback(handleVehicleUpdate);
    };
  }, [visible, handleVehicleUpdate]);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  const vehicleArray = Array.from(vehicles.values());

  return (
    <View style={styles.container}>
      {vehicleArray.map(vehicle => (
        <Marker
          key={`${vehicle.routeId}-${vehicle.id}`}
          coordinate={{
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
          }}
          title={`Route ${vehicle.routeId}${vehicle.routeName ? ` - ${vehicle.routeName}` : ''}`}
          description={`Vehicle ${vehicle.id}${vehicle.speed ? ` - ${Math.round(vehicle.speed)} mph` : ''}`}
          pinColor={getRouteColor(vehicle.routeId)}
        />
      ))}
    </View>
  );
};

/**
 * Get color for a route based on route ID
 */
function getRouteColor(routeId: string): string {
  const routeColors: { [key: string]: string } = {
    '1': 'red', // Teal -> Red
    '2': 'blue', // Red -> Blue  
    '3': 'green', // Green
    '4': 'purple', // Blue -> Purple
    '5': 'orange', // Yellow -> Orange
    '6': 'red', // Orange -> Red
    '7': 'blue', // Silver -> Blue
    '8': 'purple', // Pink -> Purple
    '9': 'green', // Brown -> Green
    '10': 'red', // Gold -> Red
  };

  return routeColors[routeId] || 'red';
}

const styles = StyleSheet.create({
  container: {
    // Container for vehicle markers - no styling needed as markers are positioned absolutely
  },
});

export default SimpleVehicleMarkers;
