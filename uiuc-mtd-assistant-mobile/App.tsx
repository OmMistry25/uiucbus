import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { AuthService } from './src/services/auth';
import { DeepLinkService } from './src/services/deepLinks';
import { NotificationService } from './src/services/notifications';
import { CalendarService } from './src/services/calendar';
import { FileUploadService } from './src/services/fileUpload';
import { TransitService } from './src/services/transit';
import { TransitApiService } from './src/services/transitApi';
import { supabase } from './src/services/supabase';
import { APP_CONFIG, ENV } from './src/constants/env';
import { MapScreen } from './src/components/MapView';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Placeholder screen components
const DashboardScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [uploadingICS, setUploadingICS] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.signUp(email, password);
      if (result.user && !result.user.email_confirmed_at) {
        Alert.alert(
          'Account Created!', 
          'Please check your email and click the confirmation link to activate your account. Then you can sign in.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        // Switch to sign in mode after successful sign up
        setIsSignUp(false);
        setPassword(''); // Clear password field
      } else {
        Alert.alert('Success', 'Account created and signed in!');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signInWithEmail(email, password);
      Alert.alert('Success', 'Signed in successfully!');
    } catch (error: any) {
      if (error?.message?.includes('Invalid login credentials')) {
        Alert.alert(
          'Sign In Failed', 
          'Invalid email or password. If you just created an account, please check your email and click the confirmation link first.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert('Error', error?.message || 'An error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await AuthService.resendConfirmation(email);
      Alert.alert('Success', 'Confirmation email sent! Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to resend confirmation email');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await NotificationService.sendTestNotification();
      Alert.alert('Success', 'Test notification sent! Check your device in 2 seconds.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send test notification');
    }
  };

  const handleTestTransit = async () => {
    try {
      console.log('🚌 ===== COMPREHENSIVE TRANSIT API TEST STARTED =====');
      console.log('🚌 Testing all CUMTD API endpoints...');
      console.log('🚌 Current user:', user?.id);
      
      let totalResults = {
        departures: 0,
        vehicles: 0,
        routes: 0,
        stops: 0,
        tripPlans: 0
      };

      // Test 1: Get all routes and stops from CUMTD
      console.log('🚌 ===== TEST 1: GETTING ALL ROUTES AND STOPS FROM CUMTD =====');
      let realRoutes: string[] = [];
      let realStops: string[] = [];
      
      try {
        // Test routes endpoint
        const routesResponse = await fetch(`${ENV.SUPABASE_URL}/functions/v1/transit-routes`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (routesResponse.ok) {
          const routesData = await routesResponse.json();
          console.log('✅ Routes API Response:', routesData);
          totalResults.routes = routesData.routes?.length || 0;
          console.log(`✅ Found ${totalResults.routes} routes`);
          
          // Extract real route IDs for testing - prioritize main routes over alternates
          if (routesData.routes && Array.isArray(routesData.routes)) {
            // Filter for main routes (not alternates) and take first 10
            const mainRoutes = routesData.routes.filter((route: any) => 
              !route.route_id.includes('ALT') && 
              !route.route_id.includes('EVENING') && 
              !route.route_id.includes('SATURDAY') && 
              !route.route_id.includes('SUNDAY') &&
              !route.route_id.includes('LATE NIGHT')
            );
            realRoutes = mainRoutes.slice(0, 10).map((route: any) => route.route_id);
            console.log('🚌 Main route IDs for testing:', realRoutes);
          }
        } else {
          console.log('⚠️ Routes API not available, using fallback route names...');
          realRoutes = ['GREEN', 'BLUE', 'RED', 'YELLOW', 'ORANGE'];
        }

        // Test stops endpoint
        const stopsResponse = await fetch(`${ENV.SUPABASE_URL}/functions/v1/transit-stops`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (stopsResponse.ok) {
          const stopsData = await stopsResponse.json();
          console.log('✅ Stops API Response:', stopsData);
          totalResults.stops = stopsData.stops?.length || 0;
          console.log(`✅ Found ${totalResults.stops} stops`);
          
          // Extract real stop IDs for testing - prioritize stops with departures
          if (stopsData.stops && Array.isArray(stopsData.stops)) {
            // Filter for stops that are likely to have active service
            const activeStops = stopsData.stops.filter((stop: any) => 
              stop.stop_name && 
              (stop.stop_name.includes('University') || 
               stop.stop_name.includes('First') || 
               stop.stop_name.includes('Green') ||
               stop.stop_name.includes('Wright') ||
               stop.stop_name.includes('Lincoln'))
            );
            realStops = activeStops.slice(0, 10).map((stop: any) => stop.stop_id);
            console.log('🚌 Active stop IDs for testing:', realStops);
          }
        } else {
          console.log('⚠️ Stops API not available, using fallback stop IDs...');
          realStops = ['WLNTUNI', 'ILLINI', 'UNION', 'CAMPUS', 'MAIN'];
        }
      } catch (error) {
        console.log('⚠️ Routes/Stops API test failed:', error);
        // Use fallback data - main routes only
        realRoutes = ['GREEN', 'BLUE', 'RED', 'YELLOW', 'ORANGE', 'ILLINI', 'SILVER', 'TEAL', 'PINK', 'BROWN'];
        realStops = ['WLNTUNI', 'UNIGWN', 'UNILNCLN', 'UNIMCLGH', 'UNINEIL', 'UNI2ND', 'UNI4TH', 'UNI6TH', 'UNICENT', 'UNICTGRV'];
      }

      // Test 2: Get vehicles for real CUMTD routes
      console.log('🚌 ===== TEST 2: GETTING VEHICLES FOR REAL CUMTD ROUTES =====');
      // Use real route IDs from CUMTD API or fallback to common route names
      const testRoutes = realRoutes.length > 0 ? realRoutes : ['GREEN', 'BLUE', 'RED', 'YELLOW', 'ORANGE', 'ILLINI', 'SILVER', 'TEAL', 'PINK', 'BROWN'];
      
      for (const routeId of testRoutes) {
        try {
          console.log(`🚌 Testing route ${routeId}...`);
          const vehiclesResult = await TransitApiService.getVehiclesByRoute(routeId);
          
          if (vehiclesResult.success && vehiclesResult.data?.vehicles) {
            const vehicleCount = vehiclesResult.data.vehicles.length;
            totalResults.vehicles += vehicleCount;
            console.log(`✅ Route ${routeId}: ${vehicleCount} vehicles`);
            if (vehicleCount > 0) {
              console.log(`🚌 Route ${routeId} vehicles:`, vehiclesResult.data.vehicles.slice(0, 3)); // Show first 3
            }
          } else {
            console.log(`⚠️ Route ${routeId}: No vehicles or error`);
          }
        } catch (error) {
          console.log(`❌ Route ${routeId} test failed:`, error);
        }
      }

      // Test 3: Get departures for real CUMTD stops
      console.log('🚌 ===== TEST 3: GETTING DEPARTURES FOR REAL CUMTD STOPS =====');
      // Use real stop IDs from CUMTD API or fallback to known working stops
      const testStops = realStops.length > 0 ? realStops : ['WLNTUNI', 'UNIGWN', 'UNILNCLN', 'UNIMCLGH', 'UNINEIL', 'UNI2ND', 'UNI4TH', 'UNI6TH', 'UNICENT', 'UNICTGRV'];
      
      for (const stopId of testStops) {
        try {
          console.log(`🚌 Testing stop ${stopId}...`);
          const departuresResult = await TransitApiService.getDepartures(stopId);
          
          if (departuresResult.success && departuresResult.data?.departures) {
            const departureCount = departuresResult.data.departures.length;
            totalResults.departures += departureCount;
            console.log(`✅ Stop ${stopId}: ${departureCount} departures`);
            if (departureCount > 0) {
              console.log(`🚌 Stop ${stopId} departures:`, departuresResult.data.departures.slice(0, 3)); // Show first 3
            }
          } else {
            console.log(`⚠️ Stop ${stopId}: No departures or error`);
          }
        } catch (error) {
          console.log(`❌ Stop ${stopId} test failed:`, error);
        }
      }

      // Test 4: Test trip planning with real stops
      console.log('🚌 ===== TEST 4: TESTING TRIP PLANNING =====');
      // Use real stop IDs for trip planning - test stops that are likely connected
      const testTrips = realStops.length >= 4 ? [
        { origin: realStops[0], destination: realStops[1] },
        { origin: realStops[2], destination: realStops[3] },
        { origin: realStops[0], destination: realStops[2] }
      ] : [
        { origin: 'WLNTUNI', destination: 'UNIGWN' },
        { origin: 'UNILNCLN', destination: 'UNIMCLGH' },
        { origin: 'UNINEIL', destination: 'UNI2ND' },
        { origin: '1STGRG', destination: '1STARY' },
        { origin: '1STDAN', destination: '1STGTY' }
      ];

      for (const trip of testTrips) {
        try {
          console.log(`🚌 Testing trip: ${trip.origin} → ${trip.destination}`);
          const tripResult = await TransitApiService.planTrip(trip.origin, trip.destination);
          
          if (tripResult.success && tripResult.data?.trips) {
            const tripCount = tripResult.data.trips.length;
            totalResults.tripPlans += tripCount;
            console.log(`✅ Trip ${trip.origin} → ${trip.destination}: ${tripCount} trip options`);
            if (tripCount > 0) {
              console.log(`🚌 Trip details:`, tripResult.data.trips[0]); // Show first trip
            }
          } else {
            console.log(`⚠️ Trip ${trip.origin} → ${trip.destination}: No trips or error`);
          }
        } catch (error) {
          console.log(`❌ Trip ${trip.origin} → ${trip.destination} test failed:`, error);
        }
      }

      // Summary
      console.log('🚌 ===== COMPREHENSIVE TEST SUMMARY =====');
      console.log(`📊 Total Results:`);
      console.log(`   🚌 Vehicles: ${totalResults.vehicles}`);
      console.log(`   🚏 Departures: ${totalResults.departures}`);
      console.log(`   🛣️ Routes: ${totalResults.routes}`);
      console.log(`   🚏 Stops: ${totalResults.stops}`);
      console.log(`   🗺️ Trip Plans: ${totalResults.tripPlans}`);
      
      const summaryMessage = `API Test Results:
🚌 Vehicles: ${totalResults.vehicles}
🚏 Departures: ${totalResults.departures}
🛣️ Routes: ${totalResults.routes}
🗺️ Trip Plans: ${totalResults.tripPlans}

Check console for detailed logs.`;
      
      Alert.alert('Comprehensive Transit API Test', summaryMessage);
      console.log('🚌 ===== COMPREHENSIVE TRANSIT API TEST COMPLETED =====');
      
    } catch (error) {
      console.error('❌ ===== COMPREHENSIVE TRANSIT TEST ERROR =====');
      console.error('❌ Comprehensive test error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Comprehensive transit test failed: ${error}`);
    }
  };

  const checkAuthState = async () => {
    try {
      console.log('🔍 Checking initial auth state...');
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        console.log('✅ Initial auth check: User found:', currentUser.email);
        setUser(currentUser);
        setIsSignedIn(true);
        setEmail(currentUser.email || '');
      } else {
        console.log('❌ Initial auth check: No user found');
        setIsSignedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.log('❌ Initial auth check failed:', error);
      setIsSignedIn(false);
      setUser(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      setIsSignedIn(false);
      setUser(null);
      setEmail('');
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to sign out');
    }
  };

  const handleConnectCalendar = async () => {
    setLoadingCalendar(true);
    try {
      await CalendarService.connectGoogleCalendar();
      Alert.alert('Success', 'Google Calendar connected! Check your email for the OAuth link.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to connect calendar');
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleLoadEvents = async () => {
    setLoadingCalendar(true);
    try {
      const nextEvents = await CalendarService.getNextEvents(10);
      setEvents(nextEvents);
      Alert.alert('Success', `Loaded ${nextEvents.length} upcoming events!`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load events');
    } finally {
      setLoadingCalendar(false);
    }
  };

  const checkCalendarConnection = async () => {
    try {
      const calendar = await CalendarService.getCalendarConnection();
      setCalendarConnected(!!calendar);
    } catch (error) {
      console.log('No calendar connected');
      setCalendarConnected(false);
    }
  };

  const handleUploadICS = async () => {
    setUploadingICS(true);
    setUploadStatus('Starting upload...');
    try {
      console.log('🚀 ===== ICS UPLOAD PROCESS STARTED =====');
      console.log('📅 Current time:', new Date().toISOString());
      console.log('🌐 Platform:', Platform.OS);
      console.log('📱 Device info:', JSON.stringify({
        platform: Platform.OS,
        version: Platform.Version,
        isPad: Platform.OS === 'ios' ? (Platform as any).isPad : false,
        isTV: Platform.OS === 'ios' ? (Platform as any).isTV : false
      }));
      console.log('👤 User authenticated:', !!user);
      console.log('👤 User email:', user?.email);
      console.log('🔑 User ID:', user?.id);
      
      // Upload and parse the ICS file
      setUploadStatus('Step 1: Processing ICS file...');
      console.log('📁 Step 1: Starting file processing...');
      const uploadResult = await FileUploadService.uploadICSFile();
      
      if (!uploadResult.success) {
        console.error('❌ Processing failed:', uploadResult.error);
        setUploadStatus(`❌ Processing failed: ${uploadResult.error}`);
        Alert.alert('Processing Failed', uploadResult.error || 'Failed to process ICS file');
        return;
      }
      
      let events;
      
      // Check if events were parsed directly (new approach)
      if (uploadResult.events) {
        console.log('✅ Step 1 completed: File processed and parsed directly');
        console.log('📊 Parsed events count:', uploadResult.events.length);
        console.log('📋 Parsed events:', uploadResult.events);
        setUploadStatus(`✅ Parsed ${uploadResult.events.length} events directly`);
        
        // Skip to database save
        events = uploadResult.events;
      } else {
        // Fallback to old approach (parse from storage)
        console.log('✅ Step 1 completed: File uploaded successfully');
        console.log('📂 Uploaded file path:', uploadResult.filePath);
        setUploadStatus('✅ File uploaded successfully');

        // Parse the ICS file
        setUploadStatus('Step 2: Parsing ICS file...');
        console.log('🔍 Step 2: Starting ICS parsing...');
        const parseResult = await FileUploadService.parseICSEvents(uploadResult.filePath!);
        
        if (!parseResult.success) {
          console.error('❌ Parse failed:', parseResult.error);
          setUploadStatus(`❌ Parse failed: ${parseResult.error}`);
          Alert.alert('Parse Failed', parseResult.error || 'Failed to parse ICS file');
          return;
        }
        console.log('✅ Step 2 completed: ICS parsed successfully');
        console.log('📊 Parsed events count:', parseResult.events?.length);
        console.log('📋 Parsed events:', parseResult.events);
        setUploadStatus(`✅ Parsed ${parseResult.events?.length} events`);
        
        events = parseResult.events;
      }

      // Save events to database
      setUploadStatus('Step 3: Saving to database...');
      console.log('💾 Step 3: Starting database save...');
      const saveResult = await FileUploadService.saveEventsToDatabase(events!);
      
      if (!saveResult.success) {
        console.error('❌ Save failed:', saveResult.error);
        setUploadStatus(`❌ Save failed: ${saveResult.error}`);
        Alert.alert('Save Failed', saveResult.error || 'Failed to save events');
        return;
      }
      console.log('✅ Step 3 completed: Events saved to database successfully');

      console.log('🎉 ===== ICS UPLOAD PROCESS COMPLETED SUCCESSFULLY =====');
      console.log('📈 Total events imported:', events!.length);
      setUploadStatus(`🎉 Success! Imported ${events!.length} events`);
      Alert.alert('Success', `Successfully imported ${events!.length} events from ICS file!`);
      
      // Refresh events if calendar is connected
      if (calendarConnected) {
        console.log('🔄 Refreshing calendar events...');
        setUploadStatus('Refreshing calendar...');
        await handleLoadEvents();
        console.log('✅ Calendar events refreshed');
        setUploadStatus(`🎉 Success! Imported ${events!.length} events and refreshed calendar`);
      }
      
    } catch (error) {
      console.error('💥 ===== ICS UPLOAD PROCESS FAILED =====');
      console.error('🚨 Unexpected error:', error);
      console.error('📊 Error details:', JSON.stringify(error, null, 2));
      setUploadStatus(`💥 Error: ${error}`);
      Alert.alert('Error', `An unexpected error occurred during upload: ${error}`);
    } finally {
      setUploadingICS(false);
      console.log('🏁 ICS upload process finished (success or failure)');
    }
  };

  useEffect(() => {
    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (session?.user) {
        console.log('✅ Setting user as signed in:', session.user.email);
        setUser(session.user);
        setIsSignedIn(true);
        setEmail(session.user.email || '');
      } else {
        console.log('❌ Setting user as signed out');
        setUser(null);
        setIsSignedIn(false);
        setEmail('');
      }
    });

    // Then check initial auth state
    checkAuthState();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      checkCalendarConnection();
    }
  }, [isSignedIn]);

  // Debug logging
  console.log('🎯 Dashboard render - isSignedIn:', isSignedIn, 'user:', user?.email);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 30 }}>UIUC MTD Assistant</Text>
      
      {isSignedIn ? (
        // Signed in state
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, marginBottom: 20, color: '#34C759' }}>
            ✅ Signed in as: {user?.email}
          </Text>
          
          <Text style={{ fontSize: 16, marginBottom: 15, color: calendarConnected ? '#34C759' : '#FF9500' }}>
            {calendarConnected ? '📅 Calendar Connected' : '📅 Calendar Not Connected'}
          </Text>
          
          {!calendarConnected && (
            <TouchableOpacity
              onPress={handleConnectCalendar}
              disabled={loadingCalendar}
              style={{
                backgroundColor: '#007AFF',
                padding: 15,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center',
                marginBottom: 15
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loadingCalendar ? 'Connecting...' : 'Connect Google Calendar'}
              </Text>
            </TouchableOpacity>
          )}
          
          {calendarConnected && (
            <TouchableOpacity
              onPress={handleLoadEvents}
              disabled={loadingCalendar}
              style={{
                backgroundColor: '#34C759',
                padding: 15,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center',
                marginBottom: 15
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loadingCalendar ? 'Loading...' : 'Load Next 10 Events'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={handleUploadICS}
            disabled={uploadingICS}
            style={{
              backgroundColor: uploadingICS ? '#FF6B35' : '#FF9500',
              padding: 15,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center',
              marginBottom: 15
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {uploadingICS ? 'Uploading...' : '📁 Upload ICS Calendar File'}
            </Text>
          </TouchableOpacity>
          
          {uploadStatus && (
            <View style={{
              backgroundColor: '#F0F0F0',
              padding: 12,
              borderRadius: 8,
              marginBottom: 15,
              borderLeftWidth: 4,
              borderLeftColor: uploadStatus.includes('❌') || uploadStatus.includes('💥') ? '#FF3B30' : 
                              uploadStatus.includes('🎉') ? '#34C759' : '#FF9500'
            }}>
              <Text style={{ 
                fontSize: 14, 
                color: '#333',
                fontWeight: '500'
              }}>
                📊 Upload Status: {uploadStatus}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            onPress={handleTestNotification}
            style={{
              backgroundColor: '#34C759',
              padding: 15,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center',
              marginBottom: 15
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Test Push Notification
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTestTransit}
            style={{
              backgroundColor: '#FF9500',
              padding: 15,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center',
              marginBottom: 15
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Test All Transit APIs
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: '#FF3B30',
              padding: 15,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Not signed in state
        <View style={{ width: '100%' }}>
          <Text style={{ fontSize: 20, marginBottom: 20, textAlign: 'center', fontWeight: '600' }}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
          
          <TextInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 15,
              width: '100%',
              marginBottom: 15,
              fontSize: 16
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 15,
              width: '100%',
              marginBottom: 20,
              fontSize: 16
            }}
          />
          
          <TouchableOpacity
            onPress={isSignUp ? handleSignUp : handleSignIn}
            disabled={loading}
            style={{
              backgroundColor: '#007AFF',
              padding: 15,
              borderRadius: 8,
              width: '100%',
              alignItems: 'center',
              marginBottom: 15
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            style={{
              padding: 10,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#007AFF', fontSize: 16 }}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
          
          {!isSignUp && (
            <TouchableOpacity
              onPress={handleResendConfirmation}
              disabled={loading}
              style={{
                padding: 10,
                alignItems: 'center',
                marginTop: 10
              }}
            >
              <Text style={{ color: '#FF9500', fontSize: 14 }}>
                Didn't receive confirmation email? Resend
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};


const RoutesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Routes</Text>
  </View>
);

// SettingsScreen is now imported from ./src/screens/SettingsScreen

export default function App() {
  useEffect(() => {
    // Initialize deep link handling
    DeepLinkService.init();
    
    // Initialize push notifications
    NotificationService.register();
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = '';
            
            if (route.name === 'Dashboard') {
              iconName = '🏠';
            } else if (route.name === 'Map') {
              iconName = '🗺️';
            // Routes tab removed for cleaner interface
            } else if (route.name === 'Settings') {
              iconName = '⚙️';
            }
            
            return <Text style={{ fontSize: size, color }}>{iconName}</Text>;
          },
          tabBarActiveTintColor: '#4caf50',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#4caf50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        {/* Routes tab removed for cleaner interface */}
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
