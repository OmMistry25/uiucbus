# Supabase Storage Setup Guide

## Manual Storage Bucket Creation

Since the app doesn't have permission to create storage buckets automatically, you need to create it manually in your Supabase dashboard.

### Steps:

1. **Go to your Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project: `risfpuuodmoyrwwvgmip`

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "New bucket"

3. **Create the Bucket**
   - **Name**: `calendar_ics`
   - **Public**: No (keep it private)
   - **File size limit**: 50MB (or your preference)
   - **Allowed MIME types**: 
     - `text/calendar`
     - `application/calendar`

4. **Set Up RLS Policies**
   - Go to "Storage" → "Policies"
   - Add the following policies for the `calendar_ics` bucket:

   **Policy 1: Allow authenticated users to upload**
   ```sql
   CREATE POLICY "Users can upload calendar files" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'calendar_ics' AND 
     auth.role() = 'authenticated'
   );
   ```

   **Policy 2: Allow users to view their own files**
   ```sql
   CREATE POLICY "Users can view their own calendar files" ON storage.objects
   FOR SELECT USING (
     bucket_id = 'calendar_ics' AND 
     auth.role() = 'authenticated'
   );
   ```

   **Policy 3: Allow users to delete their own files**
   ```sql
   CREATE POLICY "Users can delete their own calendar files" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'calendar_ics' AND 
     auth.role() = 'authenticated'
   );
   ```

### Alternative: Use SQL Editor

You can also create the bucket using the SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'calendar_ics',
  'calendar_ics', 
  false,
  52428800, -- 50MB
  ARRAY['text/calendar', 'application/calendar']
);

-- Create RLS policies
CREATE POLICY "Users can upload calendar files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'calendar_ics' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own calendar files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'calendar_ics' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own calendar files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'calendar_ics' AND 
  auth.role() = 'authenticated'
);
```

## Testing

After creating the bucket:

1. **Restart the app** to clear any cached errors
2. **Try uploading an ICS file** again
3. **Check the console logs** for detailed progress
4. **The upload should now work** and save events to the database

## Troubleshooting

If you still get errors:

1. **Check bucket permissions** in Supabase dashboard
2. **Verify RLS policies** are correctly set
3. **Check user authentication** - make sure you're signed in
4. **Look at console logs** for specific error messages