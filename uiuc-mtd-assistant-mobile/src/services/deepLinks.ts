import { Linking } from 'react-native';
import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

export class DeepLinkService {
  // Initialize deep link handling
  static init() {
    // Handle deep links when app is already running
    const handleDeepLink = (url: string) => {
      this.handleUrl(url);
    };

    // Handle deep links when app is opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleUrl(url);
      }
    });

    // Listen for incoming deep links
    Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleNotificationResponse(response);
    });
  }

  // Handle incoming URLs
  private static handleUrl(url: string) {
    console.log('Deep link received:', url);
    
    if (url.startsWith('uiucmtd://')) {
      // Handle our app's deep links
      this.handleAppDeepLink(url);
    } else if (url.includes('supabase.co') || url.includes('/--/auth/callback')) {
      // Handle Supabase auth redirects (including Expo deep links)
      this.handleSupabaseRedirect(url);
    }
  }

  // Handle app-specific deep links
  private static handleAppDeepLink(url: string) {
    // Parse the URL to extract route and parameters
    const urlObj = new URL(url);
    const route = urlObj.pathname;
    const params = Object.fromEntries(urlObj.searchParams.entries());
    
    console.log('App deep link:', { route, params });
    
    // TODO: Navigate to appropriate screen based on route
    // This will be implemented when we add navigation state management
  }

  // Handle Supabase authentication redirects
  private static async handleSupabaseRedirect(url: string) {
    try {
      console.log('Processing Supabase auth redirect:', url);
      
      // Parse the URL to extract the hash fragment with auth tokens
      const urlObj = new URL(url);
      const hash = urlObj.hash.substring(1); // Remove the # symbol
      
      if (!hash) {
        console.log('No hash fragment found in URL');
        return;
      }

      // Parse the hash parameters
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        console.error('Supabase auth error:', error, errorDescription);
        return;
      }

      if (accessToken && refreshToken) {
        // Set the session manually
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return;
        }

        if (data.session) {
          console.log('✅ Authentication successful! User:', data.session.user?.email);
          // The auth state change will be handled by the auth listener in App.tsx
        }
      } else {
        console.log('No access token or refresh token found in URL');
      }
      
    } catch (error) {
      console.error('Error handling Supabase redirect:', error);
    }
  }

  // Handle notification response (when user taps a notification)
  private static handleNotificationResponse(response: Notifications.NotificationResponse) {
    console.log('Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    if (data && data.screen) {
      // Navigate to the specified screen
      this.navigateToScreen(data.screen as string);
    }
  }

  // Navigate to a specific screen (placeholder for now)
  private static navigateToScreen(screen: string) {
    console.log('Navigating to screen:', screen);
    // TODO: Implement navigation logic when we add navigation state management
    // For now, we'll just log the intended navigation
  }

  // Open a deep link
  static async openDeepLink(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening deep link:', error);
    }
  }
}
