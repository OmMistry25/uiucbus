-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  home_point GEOMETRY(POINT, 4326),
  home_label TEXT DEFAULT 'Home',
  notify_lead_minutes INTEGER DEFAULT 15,
  quiet_hours TSRANGE DEFAULT '[22:00:00, 08:00:00]',
  timezone TEXT DEFAULT 'America/Chicago'
);

-- Create calendars table
CREATE TABLE calendars (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  provider TEXT CHECK (provider IN ('google', 'ics')) NOT NULL,
  google_refresh_token TEXT,
  ics_storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  end_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  location_text TEXT,
  destination_point GEOMETRY(POINT, 4326),
  source_point GEOMETRY(POINT, 4326),
  last_routed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create routes_plans table
CREATE TABLE routes_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push_tokens table
CREATE TABLE push_tokens (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  expo_push_token TEXT,
  fcm_token TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, device_id)
);

-- Create metrics table for observability
CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User settings: users can only access their own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Calendars: users can only access their own calendars
CREATE POLICY "Users can view own calendars" ON calendars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own calendars" ON calendars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendars" ON calendars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events: users can only access their own events
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Routes plans: users can only access their own plans
CREATE POLICY "Users can view own routes plans" ON routes_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own routes plans" ON routes_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routes plans" ON routes_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes plans" ON routes_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Push tokens: users can only access their own tokens
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Metrics: read-only for authenticated users
CREATE POLICY "Users can view metrics" ON metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_events_user_start ON events(user_id, start_ts);
CREATE INDEX idx_events_start_ts ON events(start_ts);
CREATE INDEX idx_routes_plans_user_event ON routes_plans(user_id, event_id);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_device ON push_tokens(device_id);
CREATE INDEX idx_metrics_function ON metrics(function_name);
CREATE INDEX idx_metrics_created ON metrics(created_at);

-- Create storage bucket for calendar ICS files
INSERT INTO storage.buckets (id, name, public) VALUES ('calendar_ics', 'calendar_ics', false);

-- Storage policy for calendar ICS files
CREATE POLICY "Users can upload own ICS files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'calendar_ics' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own ICS files" ON storage.objects
  FOR SELECT USING (bucket_id = 'calendar_ics' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own ICS files" ON storage.objects
  FOR DELETE USING (bucket_id = 'calendar_ics' AND auth.uid()::text = (storage.foldername(name))[1]);
