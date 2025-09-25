import { supabase } from './supabase';

/**
 * Transit API service for communicating with our CUMTD proxy endpoints
 * This service handles all transit-related API calls with proper error handling
 */
export class TransitApiService {
  private static readonly BASE_URL = `${supabase.supabaseUrl}/functions/v1`;

  /**
   * Get departures for a specific stop
   * @param stopId - The stop ID to get departures for
   * @returns Promise with departures data
   */
  static async getDepartures(stopId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    cached?: boolean;
    cacheAge?: number;
  }> {
    try {
      console.log('🚌 Fetching departures for stop:', stopId);
      
      const response = await fetch(`${this.BASE_URL}/transit-departures?stop_id=${encodeURIComponent(stopId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Departures API error:', response.status, errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ Departures fetched successfully');
      console.log('📊 Departures count:', data.departures?.length || 0);
      console.log('💾 Cached:', data.cached || false);
      
      return {
        success: true,
        data: data,
        cached: data.cached,
        cacheAge: data.cacheAge
      };

    } catch (error) {
      console.error('💥 Error fetching departures:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Get vehicles for a specific route
   * @param routeId - The route ID to get vehicles for
   * @returns Promise with vehicles data
   */
  static async getVehicles(routeId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    cached?: boolean;
    cacheAge?: number;
  }> {
    try {
      console.log('🚌 Fetching vehicles for route:', routeId);
      
      const response = await fetch(`${this.BASE_URL}/transit-vehicles?route_id=${encodeURIComponent(routeId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Vehicles API error:', response.status, errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ Vehicles fetched successfully');
      console.log('📊 Vehicles count:', data.vehicles?.length || 0);
      console.log('💾 Cached:', data.cached || false);
      
      return {
        success: true,
        data: data,
        cached: data.cached,
        cacheAge: data.cacheAge
      };

    } catch (error) {
      console.error('💥 Error fetching vehicles:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Plan a trip between two locations
   * @param origin - Starting location
   * @param destination - Destination location
   * @param options - Optional trip planning options
   * @returns Promise with trip planning data
   */
  static async planTrip(
    origin: string, 
    destination: string, 
    options?: {
      arriveBy?: string;
      departAt?: string;
    }
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    cached?: boolean;
    cacheAge?: number;
  }> {
    try {
      console.log('🗺️ Planning trip from:', origin, 'to:', destination);
      
      const requestBody: any = {
        origin: origin,
        destination: destination,
      };

      if (options?.arriveBy) {
        requestBody.arriveBy = options.arriveBy;
      }
      if (options?.departAt) {
        requestBody.departAt = options.departAt;
      }

      const response = await fetch(`${this.BASE_URL}/transit-planner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Trip planner API error:', response.status, errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ Trip planned successfully');
      console.log('📊 Trip options count:', data.trips?.length || 0);
      console.log('💾 Cached:', data.cached || false);
      
      return {
        success: true,
        data: data,
        cached: data.cached,
        cacheAge: data.cacheAge
      };

    } catch (error) {
      console.error('💥 Error planning trip:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Get vehicles for a specific route (alias for getVehicles)
   * @param routeId - The route ID to get vehicles for
   * @returns Promise with vehicles data
   */
  static async getVehiclesByRoute(routeId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    cached?: boolean;
    cacheAge?: number;
  }> {
    return this.getVehicles(routeId);
  }

  /**
   * Get all available routes
   * @returns Promise with routes data
   */
  static async getRoutes(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('🛣️ Fetching all routes');
      
      // Use real CUMTD API via Edge Function
      const response = await fetch(`${this.BASE_URL}/transit-routes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Routes API error:', response.status, errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ Routes fetched successfully');
      console.log('📊 Routes count:', data.routes?.length || 0);
      
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('💥 Error fetching routes:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Get all available stops
   * @returns Promise with stops data
   */
  static async getStops(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('🛑 Fetching all stops');
      
      // For now, we'll use a hardcoded list of common UIUC stops
      // In the future, this could be a separate Edge Function
      const commonStops = [
        { stop_id: 'WLNTUNI', stop_name: 'Wright & Nevada (Union)', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'ILLINI', stop_name: 'Illini Union', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'GREEN', stop_name: 'Green & Wright', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'SIXTH', stop_name: 'Sixth & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'FIFTH', stop_name: 'Fifth & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'FOURTH', stop_name: 'Fourth & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'THIRD', stop_name: 'Third & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'SECOND', stop_name: 'Second & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'FIRST', stop_name: 'First & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'MAIN', stop_name: 'Main & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'RACE', stop_name: 'Race & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'VINE', stop_name: 'Vine & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'WALNUT', stop_name: 'Walnut & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'CHESTNUT', stop_name: 'Chestnut & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'PINE', stop_name: 'Pine & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'OAK', stop_name: 'Oak & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'MAPLE', stop_name: 'Maple & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'ELM', stop_name: 'Elm & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'ASH', stop_name: 'Ash & Green', lat: 40.1096, lon: -88.2272 },
        { stop_id: 'BIRCH', stop_name: 'Birch & Green', lat: 40.1096, lon: -88.2272 },
      ];

      console.log('✅ Stops fetched successfully');
      console.log('📊 Stops count:', commonStops.length);
      
      return {
        success: true,
        data: { stops: commonStops }
      };

    } catch (error) {
      console.error('💥 Error fetching stops:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }
}
