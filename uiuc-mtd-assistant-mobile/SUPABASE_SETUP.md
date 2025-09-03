# Supabase Setup Instructions

## 1. Database Schema Setup

The database schema is defined in `supabase/migrations/001_initial_schema.sql`. You need to run this in your Supabase project.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://risfpuuodmoyrwwvgmip.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor and click **Run**

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:
```bash
supabase db push
```

## 2. Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure **Site URL** to: `uiucmtd://`
4. Add **Redirect URLs**: `uiucmtd://auth/callback`

## 3. Test the Setup

1. Run the app: `npm start`
2. Scan the QR code with Expo Go
3. Go to the **Dashboard** tab
4. Enter your email address
5. Click "Sign In with Email"
6. Check your email for the magic link

## 4. Verify Database Tables

After running the migration, you should see these tables in your Supabase dashboard:
- `profiles`
- `user_settings`
- `calendars`
- `events`
- `routes_plans`
- `push_tokens`
- `metrics`

## 5. Next Steps

Once authentication is working, we'll move on to:
- Push notification setup
- Calendar integration
- CUMTD API proxy implementation
