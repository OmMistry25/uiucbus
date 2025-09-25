import { supabase } from './supabase';
import { UserSettings } from './supabase';

export interface HomePoint {
  latitude: number;
  longitude: number;
  label?: string;
}

export class UserSettingsService {
  /**
   * Get user settings from Supabase
   */
  static async getUserSettings(): Promise<UserSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user for settings');
        return null;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return default
          console.log('No user settings found, returning defaults');
          return null;
        }
        console.error('Error fetching user settings:', error);
        return null;
      }

      console.log('User settings fetched successfully');
      return data;
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      return null;
    }
  }

  /**
   * Set home point for the user
   */
  static async setHomePoint(homePoint: HomePoint): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user for setting home point');
        return false;
      }

      console.log('Setting home point:', homePoint);

      // Convert to PostGIS geometry format
      const homePointGeometry = {
        type: 'Point',
        coordinates: [homePoint.longitude, homePoint.latitude] // PostGIS uses [lng, lat]
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          home_point: homePointGeometry,
          home_label: homePoint.label || 'Home',
          notify_lead_minutes: 15, // Default values
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          timezone: 'America/Chicago'
        });

      if (error) {
        console.error('Error setting home point:', error);
        return false;
      }

      console.log('Home point set successfully');
      return true;
    } catch (error) {
      console.error('Error in setHomePoint:', error);
      return false;
    }
  }

  /**
   * Get home point from user settings
   */
  static async getHomePoint(): Promise<HomePoint | null> {
    try {
      const settings = await this.getUserSettings();
      if (!settings || !settings.home_point) {
        console.log('🏠 No home point set');
        return null;
      }

      // Convert from PostGIS geometry format
      const coordinates = settings.home_point.coordinates;
      return {
        latitude: coordinates[1], // PostGIS uses [lng, lat]
        longitude: coordinates[0],
        label: settings.home_label
      };
    } catch (error) {
      console.error('💥 Error in getHomePoint:', error);
      return null;
    }
  }

  /**
   * Get trip planning origin point based on event timing
   */
  static async getTripOriginPoint(currentLocation?: {latitude: number, longitude: number}, hoursUntilEvent?: number): Promise<HomePoint | null> {
    try {
      // If event is more than 24 hours away, use home location
      if (hoursUntilEvent && hoursUntilEvent > 24) {
        const homePoint = await this.getHomePoint();
        if (homePoint) {
          console.log(`🏠 Event is ${Math.round(hoursUntilEvent)} hours away, using home location as departure point:`, homePoint);
          return homePoint;
        }
      }
      
      // If current location is provided and event is soon, use it
      if (currentLocation) {
        console.log(`📍 Event is ${hoursUntilEvent ? Math.round(hoursUntilEvent) : 'unknown'} hours away, using current location as departure point:`, currentLocation);
        return {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          label: 'Current Location'
        };
      }

      // Fallback to home location
      const homePoint = await this.getHomePoint();
      if (homePoint) {
        console.log('Using home location as trip origin (fallback):', homePoint);
        return homePoint;
      }

      console.log('No origin point available (no current location or home set)');
      return null;
    } catch (error) {
      console.error('Error in getTripOriginPoint:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(preferences: {
    notify_lead_minutes?: number;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  }): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user for updating preferences');
        return false;
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...preferences
        });

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      console.log('Notification preferences updated successfully');
      return true;
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      return false;
    }
  }
}
