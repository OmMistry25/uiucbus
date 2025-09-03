export const ENV = {
  SUPABASE_URL: 'https://risfpuuodmoyrwwvgmip.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc2ZwdXVvZG1veXJ3d3ZnbWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTc1NzQsImV4cCI6MjA3MjQ5MzU3NH0.T6Py7ZSHRsZ_kh8PJ4J0foDaGz0TGSgLZmlhpjBfrYo',
  CUMTD_API_KEY: '', // This should be server-side only
};

export const APP_CONFIG = {
  DEEP_LINK_SCHEME: 'uiucmtd',
  MAP_CENTER: {
    latitude: 40.1020, // UIUC campus center
    longitude: -88.2272,
  },
  POLLING_INTERVAL: 60000, // 60 seconds
  CACHE_TTL: 75000, // 75 seconds
};
