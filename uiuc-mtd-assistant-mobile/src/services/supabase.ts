import { createClient } from '@supabase/supabase-js';
import { ENV } from '../constants/env';

// Log Supabase configuration
console.log('🔧 ===== SUPABASE CONFIGURATION =====');
console.log('🌐 Supabase URL:', ENV.SUPABASE_URL);
console.log('🔑 Supabase Key (first 20 chars):', ENV.SUPABASE_ANON_KEY?.substring(0, 20) + '...');
console.log('📊 Key length:', ENV.SUPABASE_ANON_KEY?.length);
console.log('✅ URL valid:', ENV.SUPABASE_URL?.startsWith('https://'));
console.log('✅ Key valid:', ENV.SUPABASE_ANON_KEY?.length > 50);

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  storage: {
    // Add storage-specific configuration
    maxFileSize: 50 * 1024 * 1024, // 50MB
  }
});

// Test Supabase connection
console.log('🧪 Testing Supabase connection...');
supabase.from('_test_connection').select('*').limit(1).then(
  (result) => {
    console.log('✅ Supabase connection test result:', result);
  },
  (error) => {
    console.log('⚠️ Supabase connection test error (expected):', error.message);
  }
);

console.log('🔧 ===== SUPABASE CONFIGURATION COMPLETE =====');

// Database types based on our schema
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  home_point: { type: 'Point'; coordinates: [number, number] };
  home_label: string;
  notify_lead_minutes: number;
  quiet_hours_start: string; // TIME format
  quiet_hours_end: string; // TIME format
  timezone: string;
}

export interface Calendar {
  user_id: string;
  provider: 'google' | 'ics';
  google_refresh_token?: string;
  ics_storage_path?: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  location_text: string;
  destination_point: { type: 'Point'; coordinates: [number, number] };
  source_point: { type: 'Point'; coordinates: [number, number] };
  last_routed_at: string;
}

export interface RoutesPlan {
  id: string;
  user_id: string;
  event_id: string;
  payload: any; // JSONB
  created_at: string;
}

export interface PushToken {
  user_id: string;
  device_id: string;
  expo_push_token?: string;
  fcm_token?: string;
  platform: 'ios' | 'android';
  last_seen_at: string;
}
