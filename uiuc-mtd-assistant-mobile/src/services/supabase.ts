import { createClient } from '@supabase/supabase-js';
import { ENV } from '../constants/env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);

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
