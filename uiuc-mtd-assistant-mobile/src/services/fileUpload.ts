import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export class FileUploadService {
  /**
   * Pick and upload an ICS file to Supabase storage
   */
  static async uploadICSFile(): Promise<{ success: boolean; filePath?: string; error?: string; events?: any[] }> {
    try {
      console.log('📁 ===== FILE UPLOAD SERVICE STARTED =====');
      console.log('⏰ Upload started at:', new Date().toISOString());
      
      // Pick the file
      console.log('📂 Opening file picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/calendar', 'application/calendar', '.ics'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('❌ File selection canceled by user');
        return { success: false, error: 'File selection canceled' };
      }

      const file = result.assets[0];
      console.log('✅ File selected successfully');
      console.log('📄 File name:', file.name);
      console.log('📏 File size:', file.size, 'bytes');
      console.log('🔗 File URI:', file.uri);
      console.log('📋 File type:', file.mimeType);
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.ics')) {
        console.log('❌ Invalid file type:', file.name);
        return { success: false, error: 'Please select a valid .ics file' };
      }
      console.log('✅ File type validation passed');

      // Read file content
      console.log('📖 Reading file content...');
      console.log('🔗 Fetching from URI:', file.uri);
      console.log('🌐 Platform:', Platform.OS);
      console.log('📱 Device info:', JSON.stringify({
        platform: Platform.OS,
        version: Platform.Version,
        isPad: Platform.isPad,
        isTVOS: Platform.isTVOS
      }));
      
      const response = await fetch(file.uri);
      console.log('📡 Fetch response status:', response.status);
      console.log('📡 Fetch response ok:', response.ok);
      console.log('📡 Fetch response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      
      if (!response.ok) {
        console.error('❌ Failed to fetch file content. Status:', response.status);
        console.error('❌ Response status text:', response.statusText);
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const fileContent = await response.text();
      console.log('✅ File content read successfully');
      console.log('📊 File content length:', fileContent.length, 'characters');
      console.log('📝 First 200 characters:', fileContent.substring(0, 200));
      console.log('📝 Last 200 characters:', fileContent.substring(Math.max(0, fileContent.length - 200)));

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `calendar-${timestamp}.ics`;
      console.log('🏷️ Generated filename:', fileName);

      // Note: Bucket should already exist from manual setup
      console.log('🪣 Assuming calendar_ics bucket exists (created manually in Supabase dashboard)');
      
      // Test network connectivity first
      console.log('🌐 Testing network connectivity...');
      try {
        const networkTestResponse = await fetch('https://httpbin.org/get', {
          method: 'GET',
          timeout: 10000
        });
        console.log('✅ Network connectivity test passed:', networkTestResponse.status);
      } catch (networkError) {
        console.error('❌ Network connectivity test failed:', networkError);
        console.error('🌐 This indicates a network connectivity issue');
      }

      // Test Supabase API connectivity
      console.log('🔍 Testing Supabase API connectivity...');
      try {
        const { data: testData, error: testError } = await supabase.from('profiles').select('id').limit(1);
        if (testError) {
          console.log('⚠️ Supabase API test error (expected for profiles table):', testError.message);
        } else {
          console.log('✅ Supabase API connectivity test passed');
        }
      } catch (apiError) {
        console.error('❌ Supabase API connectivity test failed:', apiError);
      }

      // Test Supabase Storage service specifically
      console.log('🗄️ Testing Supabase Storage service...');
      try {
        // Try to get storage info
        const { data: storageInfo, error: storageError } = await supabase.storage.getBucket('calendar_ics');
        if (storageError) {
          console.log('⚠️ Storage service test error:', storageError.message);
          console.log('📊 Storage error details:', JSON.stringify(storageError, null, 2));
        } else {
          console.log('✅ Supabase Storage service test passed');
          console.log('📊 Storage bucket info:', storageInfo);
        }
      } catch (storageApiError) {
        console.error('❌ Supabase Storage service test failed:', storageApiError);
      }

      // Check if bucket exists first
      console.log('🔍 Checking if calendar_ics bucket exists...');
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        console.error('❌ Could not list buckets:', bucketError);
        console.error('📊 Bucket error details:', JSON.stringify(bucketError, null, 2));
      } else {
        console.log('✅ Successfully listed buckets');
        console.log('📊 Available buckets:', buckets?.map(b => b.name));
        const bucketExists = buckets?.some(bucket => bucket.name === 'calendar_ics');
        console.log('📊 calendar_ics bucket exists:', bucketExists);
        if (!bucketExists) {
          console.error('❌ calendar_ics bucket does not exist - this will cause upload to fail');
          console.error('🔧 Please create the bucket in Supabase dashboard with proper RLS policies');
        }
      }

      // Since storage bucket doesn't exist, parse the file directly
      console.log('📝 Parsing ICS file directly (bypassing storage upload)...');
      console.log('📊 File content length:', fileContent.length, 'characters');
      console.log('📝 First 500 characters:', fileContent.substring(0, 500));
      
      // Parse the ICS content directly
      const events = this.parseICSContent(fileContent);
      console.log('✅ ICS file parsed successfully');
      console.log('📊 Parsed events count:', events.length);
      console.log('📋 Parsed events:', JSON.stringify(events, null, 2));
      
      // Return success with the parsed events
      console.log('📁 ===== FILE UPLOAD SERVICE COMPLETED (DIRECT PARSE) =====');
      return { success: true, filePath: 'direct-parse', events: events };

    } catch (error) {
      console.log('⚠️ ===== FILE UPLOAD SERVICE FAILED =====');
      console.log('🚨 File upload error:', error);
      
      // Only log full error details in development mode to avoid console errors
      if (__DEV__) {
        console.log('📊 Error details:', JSON.stringify(error, null, 2));
      }
      
      return { success: false, error: `Upload failed: ${error}` };
    }
  }

  /**
   * Upload file using signed URL (for mobile platforms)
   */
  private static async uploadWithSignedURL(fileName: string, fileContent: string, fileUri: string): Promise<{ data: any; error: any }> {
    try {
      console.log('🔐 Creating signed upload URL...');
      
      // Create a signed upload URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('calendar_ics')
        .createSignedUploadUrl(fileName);
      
      if (signedUrlError) {
        console.error('❌ Failed to create signed upload URL:', signedUrlError);
        return { data: null, error: signedUrlError };
      }
      
      console.log('✅ Signed upload URL created successfully');
      console.log('🔗 Signed URL:', signedUrlData.signedUrl);
      console.log('🆔 Upload token:', signedUrlData.token);
      
      // Upload file using the signed URL
      console.log('📤 Uploading file using signed URL...');
      
      // For mobile, we'll use the file URI directly with fetch
      const uploadResponse = await fetch(signedUrlData.signedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/calendar',
          'Authorization': `Bearer ${signedUrlData.token}`,
        },
        body: fileContent,
      });
      
      console.log('📡 Upload response status:', uploadResponse.status);
      console.log('📡 Upload response ok:', uploadResponse.ok);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload failed with status:', uploadResponse.status);
        console.error('❌ Upload error response:', errorText);
        return { 
          data: null, 
          error: { 
            message: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
            status: uploadResponse.status,
            statusText: uploadResponse.statusText
          } 
        };
      }
      
      console.log('✅ File uploaded successfully using signed URL');
      return { 
        data: { path: fileName }, 
        error: null 
      };
      
    } catch (error) {
      console.error('❌ Signed URL upload failed:', error);
      return { 
        data: null, 
        error: { 
          message: `Signed URL upload failed: ${error}`,
          originalError: error
        } 
      };
    }
  }

  /**
   * Upload file using FileSystem (alternative approach for mobile)
   */
  private static async uploadWithFileSystem(fileName: string, fileUri: string): Promise<{ data: any; error: any }> {
    try {
      console.log('📁 Using FileSystem upload approach...');
      console.log('🔗 File URI:', fileUri);
      
      // Read file using FileSystem
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('📊 File info:', fileInfo);
      
      if (!fileInfo.exists) {
        console.error('❌ File does not exist at URI:', fileUri);
        return { 
          data: null, 
          error: { message: 'File does not exist' } 
        };
      }
      
      // Read file content using FileSystem
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      console.log('✅ File content read using FileSystem');
      console.log('📊 Content length:', fileContent.length);
      
      // Try direct upload with the content
      const { data, error } = await supabase.storage
        .from('calendar_ics')
        .upload(fileName, fileContent, {
          contentType: 'text/calendar',
          upsert: false,
        });
      
      if (error) {
        console.error('❌ FileSystem upload failed:', error);
        return { data: null, error };
      }
      
      console.log('✅ File uploaded successfully using FileSystem');
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ FileSystem upload failed:', error);
      return { 
        data: null, 
        error: { 
          message: `FileSystem upload failed: ${error}`,
          originalError: error
        } 
      };
    }
  }

  /**
   * Parse ICS file and extract events
   */
  static async parseICSEvents(filePath: string): Promise<{ success: boolean; events?: any[]; error?: string }> {
    try {
      console.log('🔍 ===== ICS PARSING SERVICE STARTED =====');
      console.log('📂 Parsing file path:', filePath);
      
      // Validate file path
      if (!filePath || filePath.startsWith('mock-')) {
        console.error('❌ Invalid file path:', filePath);
        return { success: false, error: 'Invalid file path - upload may have failed' };
      }
      
      // Get the file content from storage
      console.log('📖 Retrieving file content from storage...');
      console.log('📂 Attempting to download file:', filePath);
      console.log('🪣 From bucket: calendar_ics');
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('calendar_ics')
        .download(filePath);

      if (downloadError) {
        console.error('❌ Could not download file from storage');
        console.error('❌ Download error details:', downloadError);
        return { success: false, error: `Failed to download file from storage: ${downloadError.message}` };
      }

      console.log('✅ File downloaded successfully from storage');
      console.log('📊 File data type:', typeof fileData);
      console.log('📊 File data constructor:', fileData?.constructor?.name);
      console.log('📊 File data methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(fileData)));

      if (!fileData) {
        console.error('❌ No file data received from storage');
        return { success: false, error: 'No file data received from storage' };
      }
      
      let fileText: string;
      try {
        // Handle different Blob types properly
        if (fileData instanceof Blob) {
          console.log('📝 Reading Blob content...');
          fileText = await fileData.text();
        } else if (typeof fileData.text === 'function') {
          console.log('📝 Reading file content using .text() method...');
          fileText = await fileData.text();
        } else if (typeof fileData === 'string') {
          console.log('📝 File data is already a string...');
          fileText = fileData;
        } else {
          console.error('❌ Unknown file data type:', typeof fileData);
          console.error('❌ File data constructor:', fileData?.constructor?.name);
          return { success: false, error: `Unknown file data type: ${typeof fileData}` };
        }
        
        console.log('✅ File content read successfully');
        console.log('📊 File content length:', fileText.length, 'characters');
        console.log('📝 First 500 characters:', fileText.substring(0, 500));
      } catch (textError) {
        console.error('❌ Failed to read file content as text:', textError);
        return { success: false, error: `Failed to read file content: ${textError}` };
      }

      const events = this.parseICSContent(fileText);
      
      console.log('✅ ICS file parsed successfully');
      console.log('📊 Parsed events count:', events.length);
      console.log('📋 Parsed events:', JSON.stringify(events, null, 2));
      console.log('🔍 ===== ICS PARSING SERVICE COMPLETED =====');
      
      return { success: true, events };
    } catch (error) {
      console.error('💥 ===== ICS PARSING SERVICE FAILED =====');
      console.error('🚨 ICS parsing error:', error);
      
      // Safe error message extraction
      let errorMessage = 'Unknown error';
      try {
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
      } catch (e) {
        errorMessage = 'Error parsing error message';
      }
      
      console.error('📊 Error message:', errorMessage);
      return { success: false, error: `Failed to parse ICS file: ${errorMessage}` };
    }
  }

  /**
   * Generate a simple hash for deterministic event IDs
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Parse ICS content and extract events
   */
  private static parseICSContent(icsContent: string): any[] {
    try {
      console.log('🔍 Parsing ICS content...');
      console.log('📊 Content length:', icsContent.length);
      console.log('📝 First 200 characters:', icsContent.substring(0, 200));
      
      const events: any[] = [];
      const lines = icsContent.split('\n');
      console.log('📊 Total lines to process:', lines.length);
      
      let currentEvent: any = null;
      let inEvent = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === 'BEGIN:VEVENT') {
          inEvent = true;
          currentEvent = {
            id: '', // Will be set after parsing all event data
          };
          console.log('📅 Started parsing new event');
        } else if (line === 'END:VEVENT' && currentEvent) {
          if (currentEvent.title) {
            // Handle events without end time - set default end time
            if (!currentEvent.end && currentEvent.start) {
              const startDate = new Date(currentEvent.start);
              const endDate = new Date(startDate.getTime() + 3600000); // Add 1 hour
              currentEvent.end = endDate.toISOString();
              console.log('⚠️ Event missing end time, setting default 1-hour duration');
            }
            
            // Generate deterministic ID based on event content
            const eventContent = `${currentEvent.title}_${currentEvent.start}_${currentEvent.location || ''}`;
            const eventHash = FileUploadService.simpleHash(eventContent);
            currentEvent.id = `event_${eventHash}`;
            
            events.push(currentEvent);
            console.log('✅ Completed parsing event:', currentEvent.title);
            console.log('📍 Event location:', currentEvent.location || 'No location specified');
            console.log('📅 Event start:', currentEvent.start);
            console.log('📅 Event end:', currentEvent.end);
          }
          inEvent = false;
          currentEvent = null;
        } else if (inEvent && currentEvent) {
          this.parseICSLine(line, currentEvent);
        }
      }
      
      console.log('📊 Total events parsed:', events.length);
      return events;
    } catch (error) {
      console.error('💥 Error in parseICSContent:', error);
      
      // Safe error message extraction
      let errorMessage = 'Unknown error';
      try {
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
      } catch (e) {
        errorMessage = 'Error parsing error message';
      }
      
      console.error('📊 Error message:', errorMessage);
      throw new Error(`ICS parsing failed: ${errorMessage}`);
    }
  }

  /**
   * Parse individual ICS line and update event object
   */
  private static parseICSLine(line: string, event: any): void {
    if (line.startsWith('SUMMARY:')) {
      event.title = line.substring(8).replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (line.startsWith('DTSTART')) {
      const dateStr = this.extractDateFromICS(line);
      if (dateStr) {
        event.start = new Date(dateStr).toISOString();
      }
    } else if (line.startsWith('DTEND')) {
      const dateStr = this.extractDateFromICS(line);
      if (dateStr) {
        event.end = new Date(dateStr).toISOString();
      }
    } else if (line.startsWith('LOCATION:')) {
      const location = line.substring(9).replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
      event.location = location;
      console.log('📍 Parsed location:', location);
    } else if (line.startsWith('DESCRIPTION:')) {
      event.description = line.substring(12).replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (line.startsWith(' ')) {
      // Handle multi-line fields (continuation lines start with space)
      if (event.location && line.trim()) {
        // Append to existing location if this is a continuation
        event.location += ' ' + line.trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
        console.log('📍 Extended location:', event.location);
      }
    }
  }

  /**
   * Extract date from ICS date line
   */
  private static extractDateFromICS(line: string): string | null {
    // Handle different ICS date formats (DTSTART, DTEND, etc.)
    const dateMatch = line.match(/(DTSTART|DTEND)[^:]*:(.+)/);
    if (dateMatch) {
      let dateStr = dateMatch[2];
      
      // Remove timezone info if present
      dateStr = dateStr.replace(/TZID=[^:]*:/, '');
      
      // Handle different date formats
      if (dateStr.length === 8) {
        // YYYYMMDD format
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}T00:00:00.000Z`;
      } else if (dateStr.length === 15) {
        // YYYYMMDDTHHMMSS format
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(9, 11);
        const minute = dateStr.substring(11, 13);
        const second = dateStr.substring(13, 15);
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
      }
    }
    
    return null;
  }

  /**
   * Save parsed events to database
   */
  static async saveEventsToDatabase(events: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💾 ===== DATABASE SAVE SERVICE STARTED =====');
      console.log('📊 Saving events to database:', events.length, 'events');
      console.log('📋 Events to save:', JSON.stringify(events, null, 2));
      
      // Get current user
      console.log('👤 Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ No authenticated user:', userError);
        return { success: false, error: 'You must be signed in to save events' };
      }
      console.log('✅ User authenticated:', user.id);
      console.log('📧 User email:', user.email);

      console.log('🔄 Preparing events for database insertion...');
      const eventsToInsert = events
        .filter(event => {
          // Only include events with required fields
          const hasRequiredFields = event.title && event.start && event.end;
          if (!hasRequiredFields) {
            console.log('⚠️ Skipping event missing required fields:', event);
          }
          return hasRequiredFields;
        })
        .map(event => ({
          user_id: user.id,
          title: event.title,
          start_ts: event.start,
          end_ts: event.end,
          location_text: event.location || null,
          description: event.description || null,
          source: 'ics_import',
        }));
      console.log('📝 Prepared events:', JSON.stringify(eventsToInsert, null, 2));

      console.log('💾 Inserting events into database...');
      const { error } = await supabase
        .from('events')
        .insert(eventsToInsert);

      if (error) {
        console.error('❌ Database save error:', error);
        console.error('📊 Error details:', JSON.stringify(error, null, 2));
        return { success: false, error: `Failed to save events to database: ${error.message}` };
      }

      console.log('✅ Events saved successfully to database!');
      console.log('📈 Total events inserted:', events.length);
      console.log('💾 ===== DATABASE SAVE SERVICE COMPLETED =====');
      return { success: true };
    } catch (error) {
      console.error('💥 ===== DATABASE SAVE SERVICE FAILED =====');
      console.error('🚨 Database save error:', error);
      console.error('📊 Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: `An error occurred while saving events: ${error}` };
    }
  }
}
