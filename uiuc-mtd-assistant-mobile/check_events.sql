-- Query to check imported events in Supabase
-- Run this in your Supabase SQL Editor

-- Check all events in the database
SELECT 
  id,
  title,
  start_ts,
  end_ts,
  location_text,
  description,
  source,
  created_at
FROM events 
ORDER BY created_at DESC;

-- Check events by source
SELECT 
  source,
  COUNT(*) as event_count
FROM events 
GROUP BY source;

-- Check recent events (last 24 hours)
SELECT 
  title,
  start_ts,
  end_ts,
  source,
  created_at
FROM events 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
