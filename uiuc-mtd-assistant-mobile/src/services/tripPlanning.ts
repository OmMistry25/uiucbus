import { UserSettingsService, HomePoint } from './userSettings';
import { TransitApi } from './transitApi';

export interface CalendarEvent {
  id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  location_text?: string;
  destination_point?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface TripPlan {
  tripId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  origin: {
    name: string;
    latitude: number;
    longitude: number;
    type: 'current_location' | 'home' | 'custom';
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  legs: Array<{
    startTime: string;
    endTime: string;
    mode: string;
    routeId?: string;
    routeName?: string;
    from: {
      name: string;
      latitude: number;
      longitude: number;
    };
    to: {
      name: string;
      latitude: number;
      longitude: number;
    };
  }>;
}

export class TripPlanningService {
  /**
   * Plan trip from current location (or home) to next calendar event
   */
  static async planTripToNextEvent(
    currentLocation?: {latitude: number, longitude: number},
    calendarEvents?: CalendarEvent[]
  ): Promise<{
    success: boolean;
    tripPlan?: TripPlan;
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🗺️ ===== TRIP PLANNING TO NEXT EVENT =====');
      
      // Step 1: Get origin point (current location or home)
      const originPoint = await UserSettingsService.getTripOriginPoint(currentLocation);
      if (!originPoint) {
        return {
          success: false,
          error: 'No origin point available',
          message: 'Please set your home location or enable location services'
        };
      }

      // Step 2: Find next calendar event
      const nextEvent = this.findNextEvent(calendarEvents);
      if (!nextEvent) {
        return {
          success: false,
          error: 'No upcoming events',
          message: 'No calendar events found for trip planning'
        };
      }

      // Step 3: Get destination coordinates
      const destinationPoint = this.getEventLocation(nextEvent);
      if (!destinationPoint) {
        return {
          success: false,
          error: 'No event location',
          message: `Event "${nextEvent.title}" has no location information`
        };
      }

      console.log('🗺️ Planning trip:', {
        from: `${originPoint.label} (${originPoint.latitude.toFixed(6)}, ${originPoint.longitude.toFixed(6)})`,
        to: `${nextEvent.title} (${destinationPoint.latitude.toFixed(6)}, ${destinationPoint.longitude.toFixed(6)})`,
        eventTime: new Date(nextEvent.start_ts).toLocaleString()
      });

      // Step 4: Find nearest stops for origin and destination
      const originStop = await this.findNearestStop(originPoint.latitude, originPoint.longitude);
      const destinationStop = await this.findNearestStop(destinationPoint.latitude, destinationPoint.longitude);

      if (!originStop || !destinationStop) {
        return {
          success: false,
          error: 'No nearby stops',
          message: 'Could not find bus stops near your location or event location'
        };
      }

      console.log('🚏 Found stops:', {
        origin: originStop.stop_id,
        destination: destinationStop.stop_id
      });

      // Step 5: Plan trip using transit API
      const tripResult = await TransitApi.planTrip(
        originStop.stop_id,
        destinationStop.stop_id,
        {
          arriveBy: nextEvent.start_ts // Arrive by event start time
        }
      );

      if (!tripResult.success || !tripResult.data?.trips?.length) {
        return {
          success: false,
          error: 'Trip planning failed',
          message: tripResult.error || 'No trip options available'
        };
      }

      // Step 6: Convert to our trip plan format
      const tripPlan = this.convertToTripPlan(
        tripResult.data.trips[0], // Use first trip option
        originPoint,
        destinationPoint,
        nextEvent
      );

      console.log('✅ Trip planned successfully:', {
        duration: tripPlan.durationMinutes,
        legs: tripPlan.legs.length,
        origin: tripPlan.origin.type
      });

      return {
        success: true,
        tripPlan,
        message: `Trip planned from ${tripPlan.origin.type === 'current_location' ? 'current location' : 'home'} to "${nextEvent.title}"`
      };

    } catch (error) {
      console.error('💥 Error in planTripToNextEvent:', error);
      return {
        success: false,
        error: 'Unexpected error',
        message: 'An unexpected error occurred while planning your trip'
      };
    }
  }

  /**
   * Find the next upcoming calendar event
   */
  private static findNextEvent(events?: CalendarEvent[]): CalendarEvent | null {
    if (!events || events.length === 0) {
      return null;
    }

    const now = new Date();
    const upcomingEvents = events
      .filter(event => new Date(event.start_ts) > now)
      .sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime());

    return upcomingEvents[0] || null;
  }

  /**
   * Get location coordinates from calendar event
   */
  private static getEventLocation(event: CalendarEvent): {latitude: number, longitude: number} | null {
    if (event.destination_point?.coordinates) {
      // PostGIS format: [longitude, latitude]
      const [longitude, latitude] = event.destination_point.coordinates;
      return { latitude, longitude };
    }

    // TODO: If no coordinates, could geocode location_text here
    return null;
  }

  /**
   * Find nearest bus stop to given coordinates
   */
  private static async findNearestStop(latitude: number, longitude: number): Promise<{stop_id: string, stop_name: string} | null> {
    try {
      // For now, return a default stop ID
      // TODO: Implement actual nearest stop finding using CUMTD API
      console.log('🚏 Finding nearest stop to:', latitude, longitude);
      
      // This is a placeholder - in a real implementation, you'd call the CUMTD stops API
      // and find the closest stop to the given coordinates
      return {
        stop_id: '1STGRG', // Default stop for testing
        stop_name: 'First and Gregory'
      };
    } catch (error) {
      console.error('Error finding nearest stop:', error);
      return null;
    }
  }

  /**
   * Convert API trip result to our TripPlan format
   */
  private static convertToTripPlan(
    apiTrip: any,
    originPoint: HomePoint,
    destinationPoint: {latitude: number, longitude: number},
    event: CalendarEvent
  ): TripPlan {
    return {
      tripId: apiTrip.tripId || `trip-${Date.now()}`,
      startTime: apiTrip.startTime || new Date().toISOString(),
      endTime: apiTrip.endTime || new Date(Date.now() + (apiTrip.durationMinutes || 30) * 60000).toISOString(),
      durationMinutes: apiTrip.durationMinutes || 30,
      origin: {
        name: originPoint.label || 'Origin',
        latitude: originPoint.latitude,
        longitude: originPoint.longitude,
        type: originPoint.label === 'Current Location' ? 'current_location' : 'home'
      },
      destination: {
        name: event.title,
        latitude: destinationPoint.latitude,
        longitude: destinationPoint.longitude
      },
      legs: apiTrip.legs || [{
        startTime: apiTrip.startTime || new Date().toISOString(),
        endTime: apiTrip.endTime || new Date(Date.now() + 30 * 60000).toISOString(),
        mode: 'bus',
        routeName: 'Bus Route',
        from: {
          name: originPoint.label || 'Origin',
          latitude: originPoint.latitude,
          longitude: originPoint.longitude
        },
        to: {
          name: event.title,
          latitude: destinationPoint.latitude,
          longitude: destinationPoint.longitude
        }
      }]
    };
  }
}
