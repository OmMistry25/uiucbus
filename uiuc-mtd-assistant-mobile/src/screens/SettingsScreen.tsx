import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert
} from 'react-native';
import { UserSettingsService, HomePoint } from '../services/userSettings';
import { CronService } from '../services/cronService';

export const SettingsScreen: React.FC = () => {
  const [homePoint, setHomePoint] = useState<HomePoint | null>(null);
  const [settings, setSettings] = useState({
    notify_lead_minutes: 15,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    notifications_enabled: true
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [home, userSettings] = await Promise.all([
        UserSettingsService.getHomePoint(),
        UserSettingsService.getUserSettings()
      ]);

      setHomePoint(home);
      
      if (userSettings) {
        setSettings({
          notify_lead_minutes: userSettings.notify_lead_minutes || 15,
          quiet_hours_start: userSettings.quiet_hours_start || '22:00',
          quiet_hours_end: userSettings.quiet_hours_end || '08:00',
          notifications_enabled: true // Default to enabled
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setIsLoading(true);
    try {
      const success = await UserSettingsService.updateNotificationPreferences({
        notify_lead_minutes: settings.notify_lead_minutes,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end
      });

      if (success) {
        Alert.alert('Settings Saved! 🔔', 'Your notification preferences have been updated.');
      } else {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const incrementLeadMinutes = () => {
    setSettings(prev => ({
      ...prev,
      notify_lead_minutes: Math.min(prev.notify_lead_minutes + 5, 60)
    }));
  };

  const decrementLeadMinutes = () => {
    setSettings(prev => ({
      ...prev,
      notify_lead_minutes: Math.max(prev.notify_lead_minutes - 5, 5)
    }));
  };

  const incrementQuietStart = () => {
    setSettings(prev => {
      const [hours, minutes] = prev.quiet_hours_start.split(':');
      let newHour = parseInt(hours) + 1;
      if (newHour >= 24) newHour = 0;
      return {
        ...prev,
        quiet_hours_start: `${newHour.toString().padStart(2, '0')}:${minutes}`
      };
    });
  };

  const decrementQuietStart = () => {
    setSettings(prev => {
      const [hours, minutes] = prev.quiet_hours_start.split(':');
      let newHour = parseInt(hours) - 1;
      if (newHour < 0) newHour = 23;
      return {
        ...prev,
        quiet_hours_start: `${newHour.toString().padStart(2, '0')}:${minutes}`
      };
    });
  };

  const incrementQuietEnd = () => {
    setSettings(prev => {
      const [hours, minutes] = prev.quiet_hours_end.split(':');
      let newHour = parseInt(hours) + 1;
      if (newHour >= 24) newHour = 0;
      return {
        ...prev,
        quiet_hours_end: `${newHour.toString().padStart(2, '0')}:${minutes}`
      };
    });
  };

  const decrementQuietEnd = () => {
    setSettings(prev => {
      const [hours, minutes] = prev.quiet_hours_end.split(':');
      let newHour = parseInt(hours) - 1;
      if (newHour < 0) newHour = 23;
      return {
        ...prev,
        quiet_hours_end: `${newHour.toString().padStart(2, '0')}:${minutes}`
      };
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Home Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏠 Home Location</Text>
        {homePoint ? (
          <View style={styles.homeInfo}>
            <Text style={styles.homeLabel}> {homePoint.label}</Text>
            <Text style={styles.homeCoordinates}>
              {homePoint.latitude.toFixed(6)}, {homePoint.longitude.toFixed(6)}
            </Text>
            <Text style={styles.homeDescription}>
              Your home location is used as a fallback when current location is unavailable.
            </Text>
          </View>
        ) : (
          <View style={styles.noHomeInfo}>
            <Text style={styles.noHomeText}>No home location set</Text>
            <Text style={styles.noHomeDescription}>
              Set your home location on the map for better trip planning.
            </Text>
          </View>
        )}
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          <Switch
            value={settings.notifications_enabled}
            onValueChange={(value) => setSettings(prev => ({ ...prev, notifications_enabled: value }))}
            trackColor={{ false: '#767577', true: '#4caf50' }}
            thumbColor={settings.notifications_enabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.sectionDescription}>
          Enable or disable all bus departure notifications
        </Text>

        {settings.notifications_enabled && (
          <>
            {/* Lead Time */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Lead Time</Text>
              <Text style={styles.settingDescription}>
                How many minutes before your bus departure should we notify you?
              </Text>
              
              <View style={styles.timeSelector}>
                <TouchableOpacity 
                  style={styles.timeButton} 
                  onPress={decrementLeadMinutes}
                  disabled={settings.notify_lead_minutes <= 5}
                >
                  <Text style={styles.timeButtonText}>-</Text>
                </TouchableOpacity>
                
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeValue}>{settings.notify_lead_minutes}</Text>
                  <Text style={styles.timeUnit}>minutes</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.timeButton} 
                  onPress={incrementLeadMinutes}
                  disabled={settings.notify_lead_minutes >= 60}
                >
                  <Text style={styles.timeButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quiet Hours */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                During these hours, you won't receive notifications (except for urgent alerts)
              </Text>
              
              <View style={styles.quietHoursContainer}>
                <View style={styles.quietHoursItem}>
                  <Text style={styles.quietHoursLabel}>Start</Text>
                  <View style={styles.timeSelector}>
                    <TouchableOpacity style={styles.timeButton} onPress={decrementQuietStart}>
                      <Text style={styles.timeButtonText}>-</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.timeDisplay}>
                      <Text style={styles.timeValue}>{formatTime(settings.quiet_hours_start)}</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.timeButton} onPress={incrementQuietStart}>
                      <Text style={styles.timeButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quietHoursItem}>
                  <Text style={styles.quietHoursLabel}>End</Text>
                  <View style={styles.timeSelector}>
                    <TouchableOpacity style={styles.timeButton} onPress={decrementQuietEnd}>
                      <Text style={styles.timeButtonText}>-</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.timeDisplay}>
                      <Text style={styles.timeValue}>{formatTime(settings.quiet_hours_end)}</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.timeButton} onPress={incrementQuietEnd}>
                      <Text style={styles.timeButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>📱 Preview</Text>
              <Text style={styles.previewText}>
                You'll be notified <Text style={styles.previewHighlight}>{settings.notify_lead_minutes} minutes</Text> before your bus departure.
              </Text>
              <Text style={styles.previewText}>
                Quiet hours: <Text style={styles.previewHighlight}>{formatTime(settings.quiet_hours_start)} - {formatTime(settings.quiet_hours_end)}</Text>
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSaveNotificationSettings}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Notification Settings'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ App Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Transit Data</Text>
          <Text style={styles.infoValue}>CUMTD API</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Last Updated</Text>
          <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
        </View>
        </View>

        {/* Development/Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Development</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              try {
                const result = await CronService.triggerScheduleNotify();
                Alert.alert(
                  'Cron Job Result',
                  `Processed: ${result.processed} users\nNotifications: ${result.notifications}\nTime: ${new Date(result.timestamp).toLocaleString()}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Error', `Failed to trigger cron job: ${error.message}`);
              }
            }}
          >
            <Text style={styles.buttonText}>Test Cron Job</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  homeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  homeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  homeCoordinates: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  homeDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  noHomeInfo: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noHomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#856404',
    marginBottom: 4,
  },
  noHomeDescription: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
  settingItem: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeDisplay: {
    alignItems: 'center',
    marginHorizontal: 15,
    minWidth: 70,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quietHoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  quietHoursItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 140,
  },
  quietHoursLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  previewHighlight: {
    fontWeight: '600',
    color: '#2196f3',
  },
  saveButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
