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
      
      const params = new URLSearchParams({
        origin: origin,
        destination: destination,
      });

      if (options?.arriveBy) {
        params.append('arrive_by', options.arriveBy);
      }
      if (options?.departAt) {
        params.append('depart_at', options.departAt);
      }

      const response = await fetch(`${this.BASE_URL}/transit-planner?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
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
      
      // For now, we'll use a hardcoded list of common UIUC routes
      // In the future, this could be a separate Edge Function
      const commonRoutes = [
        { route_id: '1', route_name: '1 Yellow', route_color: '#FFD700' },
        { route_id: '2', route_name: '2 Red', route_color: '#FF0000' },
        { route_id: '3', route_name: '3 Green', route_color: '#00FF00' },
        { route_id: '4', route_name: '4 Blue', route_color: '#0000FF' },
        { route_id: '5', route_name: '5 Purple', route_color: '#800080' },
        { route_id: '6', route_name: '6 Orange', route_color: '#FFA500' },
        { route_id: '7', route_name: '7 Silver', route_color: '#C0C0C0' },
        { route_id: '8', route_name: '8 Gold', route_color: '#FFD700' },
        { route_id: '9', route_name: '9 Brown', route_color: '#8B4513' },
        { route_id: '10', route_name: '10 Teal', route_color: '#008080' },
        { route_id: '12', route_name: '12 Navy', route_color: '#000080' },
        { route_id: '13', route_name: '13 Air Bus', route_color: '#87CEEB' },
        { route_id: '14', route_name: '14 Illini', route_color: '#FF6B6B' },
        { route_id: '15', route_name: '15 SafeRides', route_color: '#32CD32' },
        { route_id: '16', route_name: '16 SafeWalks', route_color: '#FF69B4' },
        { route_id: '17', route_name: '17 SafeRides Late Night', route_color: '#9932CC' },
        { route_id: '18', route_name: '18 SafeRides Weekend', route_color: '#FF1493' },
        { route_id: '20', route_name: '20 SafeRides Express', route_color: '#00CED1' },
        { route_id: '21', route_name: '21 SafeRides Express Late Night', route_color: '#FF4500' },
        { route_id: '22', route_name: '22 SafeRides Express Weekend', route_color: '#8A2BE2' },
        { route_id: '23', route_name: '23 SafeRides Express Holiday', route_color: '#DC143C' },
        { route_id: '24', route_name: '24 SafeRides Express Special', route_color: '#B22222' },
        { route_id: '25', route_name: '25 SafeRides Express Limited', route_color: '#228B22' },
        { route_id: '26', route_name: '26 SafeRides Express Limited Late Night', route_color: '#DAA520' },
        { route_id: '27', route_name: '27 SafeRides Express Limited Weekend', route_color: '#CD853F' },
        { route_id: '28', route_name: '28 SafeRides Express Limited Holiday', route_color: '#A0522D' },
        { route_id: '29', route_name: '29 SafeRides Express Limited Special', route_color: '#8B0000' },
        { route_id: '30', route_name: '30 SafeRides Express Limited Limited', route_color: '#2F4F4F' },
      ];

      console.log('✅ Routes fetched successfully');
      console.log('📊 Routes count:', commonRoutes.length);
      
      return {
        success: true,
        data: { routes: commonRoutes }
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
