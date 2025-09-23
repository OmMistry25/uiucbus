import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { vehicleTracker, Vehicle, VehicleUpdate } from '../services/vehicleTracker';
import { BusMarker } from './BusMarker';

interface LiveVehicleMarkersProps {
  /** Whether to show vehicle markers */
  visible?: boolean;
  /** Custom marker size */
  markerSize?: number;
}

export const LiveVehicleMarkers: React.FC<LiveVehicleMarkersProps> = ({
  visible = true,
  markerSize = 24,
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

    console.log('🚌 Setting up live vehicle markers');
    
    // Add callback for vehicle updates
    vehicleTracker.addUpdateCallback(handleVehicleUpdate);
    
    // Start tracking if not already started
    if (!vehicleTracker.getStatus().isTracking) {
      vehicleTracker.startTracking();
    }

    return () => {
      console.log('🚌 Cleaning up live vehicle markers');
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
        >
          <BusMarker
            rotation={vehicle.heading || 0}
            size={markerSize}
            color={getRouteColor(vehicle.routeId)}
            testMode={false}
          />
        </Marker>
      ))}
    </View>
  );
};

/**
 * Get color for a route based on route ID
 */
function getRouteColor(routeId: string): string {
  const routeColors: { [key: string]: string } = {
    '1': '#00CED1', // Teal
    '2': '#FF6B6B', // Red
    '3': '#4ECDC4', // Turquoise
    '4': '#45B7D1', // Blue
    '5': '#FFA07A', // Light Salmon (Yellow)
    '6': '#98D8C8', // Mint
    '7': '#F7DC6F', // Yellow
    '8': '#BB8FCE', // Purple
    '9': '#85C1E9', // Light Blue
    '10': '#F8C471', // Orange
    '11': '#82E0AA', // Light Green
    '12': '#F1948A', // Light Red
    '13': '#D7BDE2', // Light Purple
    '14': '#85C1E9', // Light Blue
    '15': '#F9E79F', // Light Yellow
    '16': '#AED6F1', // Very Light Blue
    '17': '#A9DFBF', // Light Green
    '18': '#FADBD8', // Very Light Red
    '19': '#D5DBDB', // Light Gray
    '20': '#D2B4DE', // Light Purple
    '21': '#A3E4D7', // Light Teal
    '22': '#FCF3CF', // Very Light Yellow
    '23': '#D6EAF8', // Very Light Blue
    '24': '#D5F4E6', // Very Light Green
    '25': '#FAD7A0', // Light Orange
    '26': '#E8DAEF', // Very Light Purple
    '27': '#D1F2EB', // Very Light Teal
    '28': '#FEF9E7', // Very Light Yellow
    '29': '#EBF5FB', // Very Light Blue
    '30': '#E8F8F5', // Very Light Green
  };

  return routeColors[routeId] || '#FF6B35'; // Default orange
}

const styles = StyleSheet.create({
  container: {
    // Container for vehicle markers - no styling needed as markers are positioned absolutely
  },
});

export default LiveVehicleMarkers;
