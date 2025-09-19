import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthService } from './src/services/auth';
import { DeepLinkService } from './src/services/deepLinks';
import { NotificationService } from './src/services/notifications';
import { CalendarService } from './src/services/calendar';
import { FileUploadService } from './src/services/fileUpload';

const Tab = createBottomTabNavigator();

// Placeholder screen components
const DashboardScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [uploadingICS, setUploadingICS] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleSignIn = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signInWithEmail(email);
      await AuthService.signInWithEmail(email);
      Alert.alert('Success', 'Check your email for the magic link!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'An error occurred');
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

  const checkAuthState = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsSignedIn(true);
        setEmail(currentUser.email || '');
      } else {
        setIsSignedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.log('No user signed in');
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
      
      // Upload the ICS file
      setUploadStatus('Step 1: Uploading file...');
      console.log('📁 Step 1: Starting file upload...');
      const uploadResult = await FileUploadService.uploadICSFile();
      
      if (!uploadResult.success) {
        console.error('❌ Upload failed:', uploadResult.error);
        setUploadStatus(`❌ Upload failed: ${uploadResult.error}`);
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload file');
        return;
      }
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

      // Save events to database
      setUploadStatus('Step 3: Saving to database...');
      console.log('💾 Step 3: Starting database save...');
      const saveResult = await FileUploadService.saveEventsToDatabase(parseResult.events!);
      
      if (!saveResult.success) {
        console.error('❌ Save failed:', saveResult.error);
        setUploadStatus(`❌ Save failed: ${saveResult.error}`);
        Alert.alert('Save Failed', saveResult.error || 'Failed to save events');
        return;
      }
      console.log('✅ Step 3 completed: Events saved to database successfully');

      console.log('🎉 ===== ICS UPLOAD PROCESS COMPLETED SUCCESSFULLY =====');
      console.log('📈 Total events imported:', parseResult.events!.length);
      setUploadStatus(`🎉 Success! Imported ${parseResult.events!.length} events`);
      Alert.alert('Success', `Successfully imported ${parseResult.events!.length} events from ICS file!`);
      
      // Refresh events if calendar is connected
      if (calendarConnected) {
        console.log('🔄 Refreshing calendar events...');
        setUploadStatus('Refreshing calendar...');
        await handleLoadEvents();
        console.log('✅ Calendar events refreshed');
        setUploadStatus(`🎉 Success! Imported ${parseResult.events!.length} events and refreshed calendar`);
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
    checkAuthState();
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      checkCalendarConnection();
    }
  }, [isSignedIn]);

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
              marginBottom: 20,
              fontSize: 16
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleSignIn}
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
              {loading ? 'Sending...' : 'Sign In with Email'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const MapScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Map</Text>
  </View>
);

const RoutesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Routes</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Settings</Text>
  </View>
);

export default function App() {
  useEffect(() => {
    // Initialize deep link handling
    DeepLinkService.init();
    
    // Initialize push notifications
    NotificationService.register();
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Routes" component={RoutesScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
