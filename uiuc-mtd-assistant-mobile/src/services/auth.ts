import { supabase } from './supabase';
import { Profile } from './supabase';

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string) {
    try {
      console.log('Attempting to sign up with email:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase sign up error:', error);
        throw error;
      }
      
      console.log('Sign up successful');
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  static async signInWithEmail(email: string, password: string) {
    try {
      console.log('Attempting to sign in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase sign in error:', error);
        throw error;
      }
      
      console.log('Sign in successful');
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Get current user
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Get user profile
  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  // Create or update user profile
  static async upsertProfile(profile: Partial<Profile> & { id: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Resend confirmation email
  static async resendConfirmation(email: string) {
    try {
      console.log('Resending confirmation email to:', email);
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        console.error('Supabase resend error:', error);
        throw error;
      }
      
      console.log('Confirmation email resent successfully');
      return data;
    } catch (error) {
      console.error('Resend confirmation error:', error);
      throw error;
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
