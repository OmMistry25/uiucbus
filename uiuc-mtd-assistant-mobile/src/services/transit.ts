import { supabase } from './supabase';

export interface Departure {
  stopId: string;
  stopName: string;
  routeId: string;
  routeName: string;
  direction: string;
  destination: string;
  scheduledTime: string;
  expectedTime: string;
  delayMinutes: number;
  vehicleId?: string;
}

export interface Vehicle {
  vehicleId: string;
  routeId: string;
  routeName: string;
  direction: string;
  destination: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  lastUpdated: string;
}

export interface TripLeg {
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
}

export interface TripPlan {
  tripId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  legs: TripLeg[];
}

export class TransitService {
  /**
   * Get departures for a specific stop
   */
  static async getDepartures(stopId: string): Promise<{ success: boolean; departures?: Departure[]; error?: string }> {
    try {
      console.log(`🚌 Fetching departures for stop: ${stopId}`);
      
      const { data, error } = await supabase.functions.invoke('transit-departures', {
        body: { stop_id: stopId }
      });

      if (error) {
        console.error('Error calling departures function:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Retrieved ${data.departures?.length || 0} departures`);
      return { success: true, departures: data.departures };

    } catch (error) {
      console.error('Error fetching departures:', error);
      return { success: false, error: `Failed to fetch departures: ${error}` };
    }
  }

  /**
   * Get vehicles for a specific route
   */
  static async getVehiclesByRoute(routeId: string): Promise<{ success: boolean; vehicles?: Vehicle[]; error?: string }> {
    try {
      console.log(`🚌 Fetching vehicles for route: ${routeId}`);
      
      const { data, error } = await supabase.functions.invoke('transit-vehicles', {
        body: { route_id: routeId }
      });

      if (error) {
        console.error('Error calling vehicles function:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Retrieved ${data.vehicles?.length || 0} vehicles`);
      return { success: true, vehicles: data.vehicles };

    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return { success: false, error: `Failed to fetch vehicles: ${error}` };
    }
  }

  /**
   * Plan a trip from origin to destination
   */
  static async planTrip(
    origin: string, 
    destination: string, 
    arriveBy?: string, 
    departAt?: string
  ): Promise<{ success: boolean; trips?: TripPlan[]; error?: string }> {
    try {
      console.log(`🗺️ Planning trip from ${origin} to ${destination}`);
      
      const requestBody: any = {
        origin,
        destination
      };

      if (arriveBy) {
        requestBody.arrive_by = arriveBy;
      } else if (departAt) {
        requestBody.depart_at = departAt;
      }

      const { data, error } = await supabase.functions.invoke('transit-planner', {
        body: requestBody
      });

      if (error) {
        console.error('Error calling planner function:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Retrieved ${data.trips?.length || 0} trip options`);
      return { success: true, trips: data.trips };

    } catch (error) {
      console.error('Error planning trip:', error);
      return { success: false, error: `Failed to plan trip: ${error}` };
    }
  }

  /**
   * Get departures for multiple stops
   */
  static async getDeparturesForStops(stopIds: string[]): Promise<{ success: boolean; departures?: Departure[]; error?: string }> {
    try {
      console.log(`🚌 Fetching departures for ${stopIds.length} stops`);
      
      const allDepartures: Departure[] = [];
      
      // Fetch departures for each stop in parallel
      const promises = stopIds.map(stopId => this.getDepartures(stopId));
      const results = await Promise.all(promises);
      
      // Combine results
      for (const result of results) {
        if (result.success && result.departures) {
          allDepartures.push(...result.departures);
        } else {
          console.warn(`Failed to fetch departures for stop: ${result.error}`);
        }
      }

      // Sort by expected time
      allDepartures.sort((a, b) => new Date(a.expectedTime).getTime() - new Date(b.expectedTime).getTime());

      console.log(`✅ Retrieved ${allDepartures.length} total departures`);
      return { success: true, departures: allDepartures };

    } catch (error) {
      console.error('Error fetching departures for multiple stops:', error);
      return { success: false, error: `Failed to fetch departures: ${error}` };
    }
  }

  /**
   * Get vehicles for multiple routes
   */
  static async getVehiclesForRoutes(routeIds: string[]): Promise<{ success: boolean; vehicles?: Vehicle[]; error?: string }> {
    try {
      console.log(`🚌 Fetching vehicles for ${routeIds.length} routes`);
      
      const allVehicles: Vehicle[] = [];
      
      // Fetch vehicles for each route in parallel
      const promises = routeIds.map(routeId => this.getVehiclesByRoute(routeId));
      const results = await Promise.all(promises);
      
      // Combine results
      for (const result of results) {
        if (result.success && result.vehicles) {
          allVehicles.push(...result.vehicles);
        } else {
          console.warn(`Failed to fetch vehicles for route: ${result.error}`);
        }
      }

      console.log(`✅ Retrieved ${allVehicles.length} total vehicles`);
      return { success: true, vehicles: allVehicles };

    } catch (error) {
      console.error('Error fetching vehicles for multiple routes:', error);
      return { success: false, error: `Failed to fetch vehicles: ${error}` };
    }
  }
}
