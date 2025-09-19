-- Add missing columns to events table for ICS import functionality
-- This migration adds description and source columns to better support calendar imports

-- Add description column
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;

-- Add source column to track where the event came from
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add index on source for better query performance
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- Add index on user_id and source for user-specific queries
CREATE INDEX IF NOT EXISTS idx_events_user_source ON events(user_id, source);

-- Update RLS policies to include new columns
-- The existing policies should work, but let's make sure they're comprehensive

-- Drop and recreate the events policies to ensure they work with new columns
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Recreate policies
CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Add a comment to document the new columns
COMMENT ON COLUMN events.description IS 'Event description or additional details';
COMMENT ON COLUMN events.source IS 'Source of the event (manual, ics_import, google_calendar, etc.)';
