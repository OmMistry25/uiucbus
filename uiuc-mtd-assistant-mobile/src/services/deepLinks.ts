import { Linking } from 'react-native';
import { supabase } from './supabase';

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
  }

  // Handle incoming URLs
  private static handleUrl(url: string) {
    console.log('Deep link received:', url);
    
    if (url.startsWith('uiucmtd://')) {
      // Handle our app's deep links
      this.handleAppDeepLink(url);
    } else if (url.includes('supabase.co')) {
      // Handle Supabase auth redirects
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
      // Extract the hash fragment from the URL
      const hash = url.split('#')[1];
      if (!hash) return;

      // Parse the hash parameters
      const params = new URLSearchParams(hash);
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        console.error('Supabase auth error:', error, errorDescription);
        // TODO: Show error message to user
        return;
      }

      // Handle successful authentication
      console.log('Supabase auth redirect handled');
      
    } catch (error) {
      console.error('Error handling Supabase redirect:', error);
    }
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
