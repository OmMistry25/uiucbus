import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { vehicleTracker } from '../services/vehicleTracker';

interface RouteFollowerProps {
  /** Whether the component is visible */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
}

export const RouteFollower: React.FC<RouteFollowerProps> = ({
  visible = false,
  onVisibilityChange,
}) => {
  const [followedRoutes, setFollowedRoutes] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  // Common UIUC routes for quick selection
  const commonRoutes = [
    { id: '1', name: 'Teal', description: 'Campus Loop' },
    { id: '2', name: 'Red', description: 'North-South' },
    { id: '5', name: 'Yellow', description: 'East-West' },
    { id: '3', name: 'Green', description: 'Green Street' },
    { id: '4', name: 'Blue', description: 'Blue Line' },
    { id: '6', name: 'Orange', description: 'Orange Line' },
    { id: '7', name: 'Silver', description: 'Silver Line' },
    { id: '8', name: 'Pink', description: 'Pink Line' },
    { id: '9', name: 'Brown', description: 'Brown Line' },
    { id: '10', name: 'Gold', description: 'Gold Line' },
  ];

  // Update state when vehicle tracker changes
  useEffect(() => {
    const updateStatus = () => {
      const status = vehicleTracker.getStatus();
      setFollowedRoutes(status.followedRoutes);
      setIsTracking(status.isTracking);
    };

    // Initial update
    updateStatus();

    // Set up interval to check status
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleFollowRoute = (routeId: string) => {
    vehicleTracker.followRoute(routeId);
    console.log('🚌 Started following route:', routeId);
  };

  const handleUnfollowRoute = (routeId: string) => {
    vehicleTracker.unfollowRoute(routeId);
    console.log('🚌 Stopped following route:', routeId);
  };

  const handleStartTracking = () => {
    vehicleTracker.startTracking();
    Alert.alert('Vehicle Tracking Started', 'Now tracking live bus positions for followed routes.');
  };

  const handleStopTracking = () => {
    vehicleTracker.stopTracking();
    Alert.alert('Vehicle Tracking Stopped', 'No longer tracking live bus positions.');
  };

  const handleToggleVisibility = () => {
    onVisibilityChange?.(!visible);
  };

  if (!visible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={handleToggleVisibility}
      >
        <Text style={styles.toggleButtonText}>🚌 Routes</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚌 Route Follower</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleToggleVisibility}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isTracking ? '🟢 Tracking' : '🔴 Stopped'}
        </Text>
        <Text style={styles.statusText}>
          Following: {followedRoutes.length} routes
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isTracking ? styles.stopButton : styles.startButton]}
          onPress={isTracking ? handleStopTracking : handleStartTracking}
        >
          <Text style={styles.controlButtonText}>
            {isTracking ? '⏹️ Stop Tracking' : '▶️ Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.routesContainer}>
        <Text style={styles.sectionTitle}>Available Routes:</Text>
        {commonRoutes.map(route => {
          const isFollowing = followedRoutes.includes(route.id);
          return (
            <View key={route.id} style={styles.routeItem}>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>
                  Route {route.id} - {route.name}
                </Text>
                <Text style={styles.routeDescription}>{route.description}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing ? styles.unfollowButton : styles.followButtonActive
                ]}
                onPress={() => isFollowing ? handleUnfollowRoute(route.id) : handleFollowRoute(route.id)}
              >
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {followedRoutes.length > 0 && (
        <View style={styles.followedContainer}>
          <Text style={styles.sectionTitle}>Currently Following:</Text>
          <View style={styles.followedRoutes}>
            {followedRoutes.map(routeId => {
              const route = commonRoutes.find(r => r.id === routeId);
              return (
                <View key={routeId} style={styles.followedRoute}>
                  <Text style={styles.followedRouteText}>
                    {routeId} - {route?.name || 'Unknown'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  toggleButton: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
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
  statusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routesContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  routeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  routeDescription: {
    fontSize: 12,
    color: '#666',
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  followButtonActive: {
    backgroundColor: '#007AFF',
  },
  unfollowButton: {
    backgroundColor: '#FF3B30',
  },
  followButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  followedContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  followedRoutes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  followedRoute: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  followedRouteText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});

export default RouteFollower;
