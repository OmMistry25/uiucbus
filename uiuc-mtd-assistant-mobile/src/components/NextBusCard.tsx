import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TripPlanningService, TripPlan } from '../services/tripPlanning';
import { UserSettingsService } from '../services/userSettings';

interface NextBusCardProps {
  currentLocation?: {latitude: number, longitude: number};
  calendarEvents?: any[];
  onTripPlan?: (tripPlan: TripPlan) => void;
}

export const NextBusCard: React.FC<NextBusCardProps> = ({
  currentLocation,
  calendarEvents,
  onTripPlan
}) => {
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load trip plan when component mounts or location/events change
  useEffect(() => {
    if (currentLocation && calendarEvents?.length) {
      loadTripPlan();
    }
  }, [currentLocation, calendarEvents]);

  // Update countdown every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updateCountdown();
    }, 30000); // Update every 30 seconds

    updateCountdown(); // Initial update

    return () => clearInterval(interval);
  }, [tripPlan]);

  const loadTripPlan = async () => {
    setIsLoading(true);
    try {
      console.log('🚌 Loading trip plan for next event...');
      
      const result = await TripPlanningService.planTripToNextEvent(
        currentLocation,
        calendarEvents
      );

      if (result.success && result.tripPlan) {
        setTripPlan(result.tripPlan);
        setLastUpdate(new Date());
        onTripPlan?.(result.tripPlan);
        console.log('✅ Trip plan loaded successfully');
      } else {
        console.log('❌ Trip plan failed:', result.message);
        setTripPlan(null);
      }
    } catch (error) {
      console.error('💥 Error loading trip plan:', error);
      setTripPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCountdown = () => {
    if (!tripPlan) return;

    const now = new Date();
    const departureTime = new Date(tripPlan.startTime);
    const timeDiff = departureTime.getTime() - now.getTime();

    if (timeDiff <= 0) {
      setCountdown('Leave now!');
      return;
    }

    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      setCountdown(`${hours}h ${remainingMinutes}m`);
    } else {
      setCountdown(`${minutes}m`);
    }
  };

  const handleRefresh = () => {
    loadTripPlan();
  };

  const handleViewDetails = () => {
    if (!tripPlan) return;

    Alert.alert(
      'Trip Details',
      `From: ${tripPlan.origin.name}\nTo: ${tripPlan.destination.name}\nDuration: ${tripPlan.durationMinutes} minutes\nDeparture: ${new Date(tripPlan.startTime).toLocaleTimeString()}`,
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>🚌 Next Bus</Text>
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Planning...</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Finding your next trip</Text>
      </View>
    );
  }

  if (!tripPlan) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>🚌 Next Bus</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>No upcoming trips found</Text>
        <Text style={styles.description}>
          {!currentLocation ? 'Enable location services' : 
           !calendarEvents?.length ? 'Add calendar events' : 
           'No bus routes available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🚌 Next Bus</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.routeInfo}>
          <Text style={styles.destination}>{tripPlan.destination.name}</Text>
          <Text style={styles.origin}>
            From {tripPlan.origin.type === 'current_location' ? 'current location' : 'home'}
          </Text>
        </View>

        <View style={styles.timingInfo}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Leave in</Text>
            <Text style={styles.countdown}>{countdown}</Text>
          </View>
          
          <View style={styles.departureInfo}>
            <Text style={styles.departureTime}>
              {new Date(tripPlan.startTime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            <Text style={styles.duration}>
              {tripPlan.durationMinutes} min trip
            </Text>
          </View>
        </View>

        <View style={styles.legsInfo}>
          {tripPlan.legs.map((leg, index) => (
            <View key={index} style={styles.leg}>
              <Text style={styles.legMode}>
                {leg.mode === 'bus' ? '🚌' : '🚶'} {leg.routeName || leg.mode}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.detailsButton} onPress={handleViewDetails}>
        <Text style={styles.detailsButtonText}>View Details</Text>
      </TouchableOpacity>

      <Text style={styles.lastUpdate}>
        Updated {lastUpdate.toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  content: {
    marginBottom: 12,
  },
  routeInfo: {
    marginBottom: 12,
  },
  destination: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  origin: {
    fontSize: 14,
    color: '#666',
  },
  timingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  countdown: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  departureInfo: {
    alignItems: 'flex-end',
  },
  departureTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  duration: {
    fontSize: 12,
    color: '#666',
  },
  legsInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  leg: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  legMode: {
    fontSize: 12,
    color: '#333',
  },
  detailsButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#999',
  },
  lastUpdate: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
  },
});
