import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  device_id: string;
  created_at: string;
  updated_at: string;
}

export class PushNotificationService {
  /**
   * Register device for push notifications
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('📱 Registering for push notifications...');

      // Check if device is physical (not simulator)
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return null;
      }

      console.log('✅ Push notification permission granted');

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // This needs to be set in app.json
      });

      console.log('📱 Expo push token:', token.data);

      // Save token to database
      await this.savePushToken(token.data);

      return token.data;

    } catch (error) {
      console.error('💥 Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to database
   */
  static async savePushToken(token: string): Promise<void> {
    try {
      console.log('💾 Saving push token to database...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ No authenticated user found');
        return;
      }

      const deviceId = await Device.getDeviceIdAsync();
      const platform = Platform.OS;

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token', token)
        .single();

      if (existingToken) {
        console.log('📱 Push token already exists, updating...');
        const { error } = await supabase
          .from('push_tokens')
          .update({
            device_id: deviceId,
            platform: platform,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('❌ Error updating push token:', error);
        } else {
          console.log('✅ Push token updated successfully');
        }
      } else {
        console.log('📱 Creating new push token...');
        const { error } = await supabase
          .from('push_tokens')
          .insert({
            user_id: user.id,
            token: token,
            platform: platform,
            device_id: deviceId
          });

        if (error) {
          console.error('❌ Error saving push token:', error);
        } else {
          console.log('✅ Push token saved successfully');
        }
      }

    } catch (error) {
      console.error('💥 Error saving push token:', error);
    }
  }

  /**
   * Get user's push tokens
   */
  static async getUserPushTokens(): Promise<PushToken[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error fetching push tokens:', error);
        return [];
      }

      return tokens || [];

    } catch (error) {
      console.error('💥 Error getting push tokens:', error);
      return [];
    }
  }

  /**
   * Delete push token
   */
  static async deletePushToken(tokenId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) {
        console.error('❌ Error deleting push token:', error);
      } else {
        console.log('✅ Push token deleted successfully');
      }

    } catch (error) {
      console.error('💥 Error deleting push token:', error);
    }
  }

  /**
   * Test push notification (for development)
   */
  static async sendTestNotification(): Promise<void> {
    try {
      console.log('📱 Sending test notification...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: 'This is a test notification from UIUC MTD Assistant!',
          data: { test: true },
        },
        trigger: { seconds: 1 },
      });

      console.log('✅ Test notification scheduled');

    } catch (error) {
      console.error('💥 Error sending test notification:', error);
    }
  }

  /**
   * Handle notification received
   */
  static setupNotificationHandlers(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      if (data?.notificationId) {
        // Handle navigation based on notification type
        this.handleNotificationNavigation(data);
      }
    });
  }

  /**
   * Handle navigation based on notification data
   */
  private static handleNotificationNavigation(data: any): void {
    try {
      console.log('🧭 Handling notification navigation:', data);

      // TODO: Implement navigation logic based on notification type
      // For now, just log the data
      switch (data.type) {
        case 'departure_reminder':
          console.log('🚌 Departure reminder notification tapped');
          // Navigate to map or trip details
          break;
        case 'delay_alert':
          console.log('⏰ Delay alert notification tapped');
          // Navigate to trip details or alternative routes
          break;
        case 'route_update':
          console.log('🔄 Route update notification tapped');
          // Navigate to updated route information
          break;
        default:
          console.log('📱 Unknown notification type:', data.type);
      }

    } catch (error) {
      console.error('💥 Error handling notification navigation:', error);
    }
  }
}
