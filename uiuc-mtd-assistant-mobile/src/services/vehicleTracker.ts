import { TransitApiService } from './transitApi';

export interface Vehicle {
  id: string;
  routeId: string;
  routeName?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  lastUpdated: string;
}

export interface VehicleUpdate {
  vehicles: Vehicle[];
  timestamp: string;
  routeId: string;
}

export type VehicleUpdateCallback = (update: VehicleUpdate) => void;

class VehicleTrackerService {
  private followedRoutes: Set<string> = new Set();
  private updateCallbacks: Set<VehicleUpdateCallback> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private isTracking = false;
  private readonly UPDATE_INTERVAL = 60000; // 60 seconds

  /**
   * Start tracking vehicles for followed routes
   */
  startTracking(): void {
    if (this.isTracking) {
      console.log('🚌 Vehicle tracking already started');
      return;
    }

    if (this.followedRoutes.size === 0) {
      console.log('🚌 No routes to track, vehicle tracking will be inactive until routes are added');
      // Don't start with hardcoded routes - let the system determine which routes to track
      // based on actual trip planning needs
    }

    this.isTracking = true;
    console.log('🚌 Starting vehicle tracking for routes:', Array.from(this.followedRoutes));
    
    // Start immediate update
    this.updateVehicles();
    
    // Set up interval for regular updates
    this.updateInterval = setInterval(() => {
      this.updateVehicles();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop tracking vehicles
   */
  stopTracking(): void {
    if (!this.isTracking) {
      console.log('🚌 Vehicle tracking not started');
      return;
    }

    this.isTracking = false;
    console.log('🚌 Stopping vehicle tracking');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Follow a specific route
   */
  followRoute(routeId: string): void {
    if (this.followedRoutes.has(routeId)) {
      console.log('🚌 Already following route:', routeId);
      return;
    }

    this.followedRoutes.add(routeId);
    console.log('🚌 Now following route:', routeId);
    console.log('🚌 Total followed routes:', this.followedRoutes.size);

    // If tracking is active, immediately fetch vehicles for this route
    if (this.isTracking) {
      this.fetchVehiclesForRoute(routeId);
    }
  }

  /**
   * Stop following a specific route
   */
  unfollowRoute(routeId: string): void {
    if (!this.followedRoutes.has(routeId)) {
      console.log('🚌 Not following route:', routeId);
      return;
    }

    this.followedRoutes.delete(routeId);
    console.log('🚌 Stopped following route:', routeId);
    console.log('🚌 Total followed routes:', this.followedRoutes.size);
  }

  /**
   * Get list of followed routes
   */
  getFollowedRoutes(): string[] {
    return Array.from(this.followedRoutes);
  }

  /**
   * Check if tracking a specific route
   */
  isFollowingRoute(routeId: string): boolean {
    return this.followedRoutes.has(routeId);
  }

  /**
   * Add callback for vehicle updates
   */
  addUpdateCallback(callback: VehicleUpdateCallback): void {
    this.updateCallbacks.add(callback);
    console.log('🚌 Added vehicle update callback, total callbacks:', this.updateCallbacks.size);
  }

  /**
   * Remove callback for vehicle updates
   */
  removeUpdateCallback(callback: VehicleUpdateCallback): void {
    this.updateCallbacks.delete(callback);
    console.log('🚌 Removed vehicle update callback, total callbacks:', this.updateCallbacks.size);
  }

  /**
   * Update vehicles for all followed routes
   */
  private async updateVehicles(): Promise<void> {
    if (!this.isTracking || this.followedRoutes.size === 0) {
      return;
    }

    console.log('🚌 Updating vehicles for routes:', Array.from(this.followedRoutes));
    
    const updatePromises = Array.from(this.followedRoutes).map(routeId => 
      this.fetchVehiclesForRoute(routeId)
    );

    try {
      await Promise.all(updatePromises);
      console.log('🚌 Vehicle update cycle completed');
    } catch (error) {
      console.error('🚌 Error during vehicle update cycle:', error);
    }
  }

  /**
   * Fetch vehicles for a specific route
   */
  private async fetchVehiclesForRoute(routeId: string): Promise<void> {
    try {
      console.log('🚌 Fetching vehicles for route:', routeId);
      
      const result = await TransitApiService.getVehiclesByRoute(routeId);
      
      if (!result.success) {
        console.error('🚌 Failed to fetch vehicles for route', routeId, ':', result.error);
        return;
      }

      const vehicles: Vehicle[] = (result.data?.vehicles || []).map((vehicle: any) => ({
        id: vehicle.vehicleId || vehicle.id,
        routeId: routeId,
        routeName: vehicle.routeName,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        heading: vehicle.heading,
        speed: vehicle.speed,
        lastUpdated: new Date().toISOString(),
      }));

      console.log('🚌 Found', vehicles.length, 'vehicles for route', routeId);

      // Notify all callbacks
      const update: VehicleUpdate = {
        vehicles,
        timestamp: new Date().toISOString(),
        routeId,
      };

      this.updateCallbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('🚌 Error in vehicle update callback:', error);
        }
      });

    } catch (error) {
      console.error('🚌 Error fetching vehicles for route', routeId, ':', error);
    }
  }

  /**
   * Get current tracking status
   */
  getStatus(): {
    isTracking: boolean;
    followedRoutes: string[];
    updateInterval: number;
  } {
    return {
      isTracking: this.isTracking,
      followedRoutes: Array.from(this.followedRoutes),
      updateInterval: this.UPDATE_INTERVAL,
    };
  }
}

// Export singleton instance
export const vehicleTracker = new VehicleTrackerService();
export default vehicleTracker;
