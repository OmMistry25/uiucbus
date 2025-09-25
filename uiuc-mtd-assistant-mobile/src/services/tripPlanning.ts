import { UserSettingsService, HomePoint } from './userSettings';
import { TransitApiService } from './transitApi';
import { ENV } from '../constants/env';
import { vehicleTracker } from './vehicleTracker';

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
      
      // Step 1: Find the next event first
      const nextEvent = this.findNextEvent(calendarEvents);
      if (!nextEvent) {
        return {
          success: false,
          error: 'No calendar events found for trip planning',
          message: 'Please upload your calendar or add events to plan trips'
        };
      }

      // Step 2: Calculate time until event to determine origin point
      const eventTime = new Date(nextEvent.start_ts);
      const now = new Date();
      const timeUntilEvent = eventTime.getTime() - now.getTime();
      const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);
      
      const originPoint = await UserSettingsService.getTripOriginPoint(currentLocation, hoursUntilEvent);
      if (!originPoint) {
        return {
          success: false,
          error: 'No origin point available',
          message: 'Please set your home location or enable location services'
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
      let destinationStop = await this.findNearestStop(destinationPoint.latitude, destinationPoint.longitude);

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
      console.log(`🗺️ Planning trip from: ${originStop.stop_id} to: ${destinationStop.stop_id}`);
      
      // If origin and destination are the same stop, find a different route
      if (originStop.stop_id === destinationStop.stop_id) {
        console.log('⚠️ Same stop for origin and destination, finding alternative route...');
        
        // Try to find a different stop near the destination
        const alternativeStops = [
          { id: '1STDAN', name: 'First & Daniel', lat: 40.1020, lon: -88.2272 },
          { id: '1STARY', name: 'First & Armory', lat: 40.1135, lon: -88.2244 },
          { id: 'GREEN', name: 'Green & Wright', lat: 40.1096, lon: -88.2272 },
          { id: 'WRIGHT', name: 'Wright & Green', lat: 40.1096, lon: -88.2272 },
          { id: 'LINCOLN', name: 'Lincoln & Green', lat: 40.1096, lon: -88.2272 },
          { id: 'UNION', name: 'Illini Union', lat: 40.1096, lon: -88.2272 },
          { id: 'LIBRARY', name: 'Main Library', lat: 40.1096, lon: -88.2272 },
          { id: 'ECE', name: 'ECE Building', lat: 40.1096, lon: -88.2272 },
          { id: 'ENGINEERING', name: 'Engineering Hall', lat: 40.1096, lon: -88.2272 },
        ];
        
        // Find closest alternative stop to destination
        let closestAltStop = alternativeStops[0];
        let minAltDistance = this.calculateDistance(
          destinationPoint.latitude, 
          destinationPoint.longitude, 
          closestAltStop.lat, 
          closestAltStop.lon
        );
        
        for (const stop of alternativeStops) {
          const distance = this.calculateDistance(
            destinationPoint.latitude, 
            destinationPoint.longitude, 
            stop.lat, 
            stop.lon
          );
          if (distance < minAltDistance) {
            minAltDistance = distance;
            closestAltStop = stop;
          }
        }
        
        console.log(`🔄 Using alternative destination stop: ${closestAltStop.id} - ${closestAltStop.name}`);
        destinationStop = { stop_id: closestAltStop.id, stop_name: closestAltStop.name };
      }
      
      // Use the already calculated timing
      console.log(`⏰ Event time: ${eventTime.toLocaleString()}`);
      console.log(`⏰ Current time: ${now.toLocaleString()}`);
      console.log(`⏰ Time until event: ${Math.round(hoursUntilEvent)} hours`);
      
      // If event is more than 24 hours away, plan for the day before
      let departureTime = eventTime;
      if (hoursUntilEvent > 24) {
        // Event is more than 24 hours away, plan for 30 minutes before event
        departureTime = new Date(eventTime.getTime() - (30 * 60 * 1000));
        console.log(`📅 Event is far in future, planning departure for: ${departureTime.toLocaleString()}`);
      } else {
        // Event is soon, plan to arrive 10 minutes early
        departureTime = new Date(eventTime.getTime() - (10 * 60 * 1000));
        console.log(`📅 Event is soon, planning to arrive 10 minutes early: ${departureTime.toLocaleString()}`);
      }
      
      const tripResult = await TransitApiService.planTrip(
        originStop.stop_id,
        destinationStop.stop_id,
        {
          arriveBy: eventTime.toISOString() // Plan to arrive at event time
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

      // Start tracking routes from the trip plan
      const tripRoutes = tripPlan.legs
        .filter(leg => leg.mode === 'bus' && leg.routeId)
        .map(leg => leg.routeId);
      
      if (tripRoutes.length > 0) {
        console.log('🚌 Starting vehicle tracking for trip routes:', tripRoutes);
        tripRoutes.forEach(routeId => {
          vehicleTracker.followRoute(routeId);
        });
        vehicleTracker.startTracking();
      }

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
   * Find the next upcoming calendar event (handles recurring events)
   */
  private static findNextEvent(events?: any[]): CalendarEvent | null {
    if (!events || events.length === 0) {
      console.log('❌ No events provided to findNextEvent');
      return null;
    }

    console.log(`🔍 Looking for next event from ${events.length} total events`);
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Time in minutes
    
    // Find the next occurrence of each event based on day of week and time
    const upcomingEvents: Array<{event: any, nextOccurrence: Date}> = [];
    
    for (const event of events) {
             const originalEventTime = new Date(event.start_ts || event.start);
             const eventDay = originalEventTime.getDay();
             
             // Convert UTC time to local time for display and calculations
             // The event is stored as UTC but represents local time
             const localEventTime = new Date(originalEventTime.getTime() + (5 * 60 * 60 * 1000)); // Add 5 hours for CDT
             const eventTime = localEventTime.getHours() * 60 + localEventTime.getMinutes();
      
      // Calculate next occurrence of this event
      let daysUntilNext = (eventDay - currentDay + 7) % 7;
      
      // If it's the same day, check if the time has passed
      if (daysUntilNext === 0 && eventTime <= currentTime) {
        daysUntilNext = 7; // Next week
      }
      
      const nextOccurrence = new Date(now);
      nextOccurrence.setDate(now.getDate() + daysUntilNext);
      nextOccurrence.setHours(localEventTime.getHours(), localEventTime.getMinutes(), 0, 0);
      
             console.log(`📅 Event "${event.title}" (${this.getDayName(eventDay)} ${localEventTime.toLocaleTimeString()}) - Next: ${nextOccurrence.toLocaleString()}`);
      
      upcomingEvents.push({
        event: event,
        nextOccurrence: nextOccurrence
      });
    }

    if (upcomingEvents.length === 0) {
      return null;
    }

    // Sort by next occurrence time and get the earliest
    upcomingEvents.sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
    const nextEventData = upcomingEvents[0];
    
    console.log(`✅ Next event: "${nextEventData.event.title}" at ${nextEventData.nextOccurrence.toLocaleString()}`);
    
    // Convert to our CalendarEvent format with the next occurrence time
    return {
      id: nextEventData.event.id,
      title: nextEventData.event.title,
      start_ts: nextEventData.nextOccurrence.toISOString(),
      end_ts: new Date(nextEventData.nextOccurrence.getTime() + (new Date(nextEventData.event.end_ts || nextEventData.event.end).getTime() - new Date(nextEventData.event.start_ts || nextEventData.event.start).getTime())).toISOString(),
      location_text: nextEventData.event.location_text,
      destination_point: nextEventData.event.destination_point
    };
  }

  /**
   * Get day name from day number
   */
  private static getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  }

  /**
   * Get location coordinates from calendar event
   */
  private static getEventLocation(event: CalendarEvent): {latitude: number, longitude: number} | null {
    if (event.destination_point?.coordinates) {
      // PostGIS format: [longitude, latitude]
      const [longitude, latitude] = event.destination_point.coordinates;
      console.log(`📍 Event location coordinates: ${latitude}, ${longitude}`);
      return { latitude, longitude };
    }

    console.log(`⚠️ No coordinates found for event "${event.title}"`);
    return null;
  }

  /**
   * Find nearest bus stop to given coordinates
   */
  private static async findNearestStop(latitude: number, longitude: number): Promise<{stop_id: string, stop_name: string} | null> {
    try {
      console.log(`🚏 Finding nearest stop to: ${latitude} ${longitude}`);
      
      // Try to use our Edge Function to get stops
      try {
        const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/transit-stops`, {
          headers: {
            'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.stops && data.stops.length > 0) {
            // Find closest stop from the API results
            let closestStop = data.stops[0];
            let minDistance = this.calculateDistance(latitude, longitude, closestStop.lat, closestStop.lon);
            
            for (const stop of data.stops) {
              const distance = this.calculateDistance(latitude, longitude, stop.lat, stop.lon);
              if (distance < minDistance) {
                minDistance = distance;
                closestStop = stop;
              }
            }
            
            console.log(`✅ Found nearest stop via API: ${closestStop.stop_id} - ${closestStop.stop_name}`);
            return {
              stop_id: closestStop.stop_id,
              stop_name: closestStop.stop_name
            };
          }
        }
      } catch (apiError) {
        console.warn('⚠️ Edge Function not available, using fallback stops');
      }
      
      // Fallback to known working stops - include diverse campus and off-campus stops
      const stops = [
        // Campus stops (central area)
        { id: '1STGRG', name: 'First & Gregory', lat: 40.1096, lon: -88.2272 },
        { id: '1STDAN', name: 'First & Daniel', lat: 40.1020, lon: -88.2272 },
        { id: '1STARY', name: 'First & Armory', lat: 40.1135, lon: -88.2244 },
        { id: 'GREEN', name: 'Green & Wright', lat: 40.1096, lon: -88.2272 },
        { id: 'WRIGHT', name: 'Wright & Green', lat: 40.1096, lon: -88.2272 },
        { id: 'LINCOLN', name: 'Lincoln & Green', lat: 40.1096, lon: -88.2272 },
        // Off-campus stops (closer to home areas)
        { id: 'PLAZA', name: 'Transit Plaza', lat: 40.10847, lon: -88.228957 },
        { id: 'PKWRT', name: 'Park & Wright', lat: 40.11738, lon: -88.228677 },
        { id: 'PKRMN', name: 'Park & Romine', lat: 40.11741, lon: -88.227015 },
        { id: '150DALE', name: 'U.S. 150 and Dale', lat: 40.10847, lon: -88.228957 },
        // More diverse stops
        { id: 'UNION', name: 'Illini Union', lat: 40.1096, lon: -88.2272 },
        { id: 'LIBRARY', name: 'Main Library', lat: 40.1096, lon: -88.2272 },
        { id: 'ECE', name: 'ECE Building', lat: 40.1096, lon: -88.2272 },
        { id: 'ENGINEERING', name: 'Engineering Hall', lat: 40.1096, lon: -88.2272 },
      ];
      
      // Find closest stop
      let closestStop = stops[0];
      let minDistance = this.calculateDistance(latitude, longitude, closestStop.lat, closestStop.lon);
      
      for (const stop of stops) {
        const distance = this.calculateDistance(latitude, longitude, stop.lat, stop.lon);
        if (distance < minDistance) {
          minDistance = distance;
          closestStop = stop;
        }
      }
      
      console.log(`📍 Found nearest stop (fallback): ${closestStop.id} - ${closestStop.name} (${minDistance.toFixed(2)}km away)`);
      return {
        stop_id: closestStop.id,
        stop_name: closestStop.name
      };
    } catch (error) {
      console.error('Error finding nearest stop:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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
