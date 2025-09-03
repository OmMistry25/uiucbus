import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthService } from './src/services/auth';
import { DeepLinkService } from './src/services/deepLinks';

const Tab = createBottomTabNavigator();

// Placeholder screen components
const DashboardScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signInWithEmail(email);
      Alert.alert('Success', 'Check your email for the magic link!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 30 }}>UIUC MTD Assistant</Text>
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
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          {loading ? 'Sending...' : 'Sign In with Email'}
        </Text>
      </TouchableOpacity>
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
