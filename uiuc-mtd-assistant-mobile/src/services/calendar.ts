import { supabase } from './supabase';
import { AuthService } from './auth';
import { Calendar, Event } from './supabase';

export class CalendarService {
  // Connect Google Calendar via OAuth
  static async connectGoogleCalendar() {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        throw new Error('User must be signed in to connect calendar');
      }

      // For now, we'll use a simple approach with Supabase's built-in Google OAuth
      // In a real implementation, you'd use the Google Calendar API
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'exp://10.33.177.245:8081/--/auth/callback',
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      throw error;
    }
  }

  // Save calendar connection to database
  static async saveCalendarConnection(provider: 'google' | 'ics', additionalData?: any) {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        throw new Error('User must be signed in');
      }

      const calendarData: Partial<Calendar> = {
        user_id: user.id,
        provider,
        ...additionalData,
      };

      const { data, error } = await supabase
        .from('calendars')
        .upsert(calendarData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving calendar connection:', error);
      throw error;
    }
  }

  // Get user's calendar connection
  static async getCalendarConnection(): Promise<Calendar | null> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      console.error('Error getting calendar connection:', error);
      return null;
    }
  }

  // Mock function to get next 10 events (placeholder for Google Calendar API)
  static async getNextEvents(limit: number = 10): Promise<Event[]> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        throw new Error('User must be signed in');
      }

      // For now, return mock events
      // In a real implementation, this would call the Google Calendar API
      const mockEvents: Event[] = [
        {
          id: '1',
          user_id: user.id,
          title: 'CS 225 Lecture',
          start_ts: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          end_ts: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
          location_text: 'Siebel Center for Computer Science',
          destination_point: { type: 'Point', coordinates: [-88.2256, 40.1135] },
          source_point: { type: 'Point', coordinates: [-88.2272, 40.1020] },
          last_routed_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: user.id,
          title: 'MATH 241 Discussion',
          start_ts: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          end_ts: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          location_text: 'Altgeld Hall',
          destination_point: { type: 'Point', coordinates: [-88.2272, 40.1020] },
          source_point: { type: 'Point', coordinates: [-88.2256, 40.1135] },
          last_routed_at: new Date().toISOString(),
        },
      ];

      return mockEvents.slice(0, limit);
    } catch (error) {
      console.error('Error getting next events:', error);
      throw error;
    }
  }

  // Save events to database
  static async saveEvents(events: Omit<Event, 'id' | 'user_id'>[]) {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        throw new Error('User must be signed in');
      }

      const eventsWithUserId = events.map(event => ({
        ...event,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('events')
        .upsert(eventsWithUserId, { onConflict: 'id' })
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving events:', error);
      throw error;
    }
  }

  // Get user's events from database
  static async getUserEvents(limit: number = 10): Promise<Event[]> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_ts', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user events:', error);
      return [];
    }
  }
}
