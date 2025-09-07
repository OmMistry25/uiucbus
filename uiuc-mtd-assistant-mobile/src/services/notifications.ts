import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { AuthService } from './auth';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  // Register device for push notifications
  static async register(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Must use physical device for push notifications');
        return null;
      }

      // Skip push notifications on web
      if (Platform.OS === 'web') {
        console.log('Push notifications not supported on web');
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
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // This will be set when we configure EAS
      });

      console.log('Push token:', token.data);

      // Save token to database
      await this.saveTokenToDatabase(token.data);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Save push token to Supabase database
  private static async saveTokenToDatabase(expoPushToken: string) {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        console.log('No authenticated user, skipping token save');
        return;
      }

      const deviceId = await this.getDeviceId();
      const platform = Platform.OS as 'ios' | 'android';

      // Upsert the push token
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          device_id: deviceId,
          expo_push_token: expoPushToken,
          platform: platform,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  }

  // Get unique device identifier
  private static async getDeviceId(): Promise<string> {
    // For now, we'll use a simple approach
    // In production, you might want to use a more robust device ID
    return `${Platform.OS}-${Date.now()}`;
  }

  // Send a test notification
  static async sendTestNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "UIUC MTD Assistant",
          body: 'This is a test notification!',
          data: { screen: 'dashboard' },
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  // Handle notification received while app is in foreground
  static addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  // Handle notification tapped
  static addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Remove all listeners
  static removeAllListeners() {
    // Note: In newer versions of expo-notifications, this method might not exist
    // We'll handle listener cleanup individually when needed
  }
}
