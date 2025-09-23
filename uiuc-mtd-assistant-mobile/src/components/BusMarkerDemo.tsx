import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BusMarker } from './BusMarker';

export const BusMarkerDemo: React.FC = () => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-rotation demo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAnimating) {
      interval = setInterval(() => {
        setRotation(prev => (prev + 5) % 360);
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnimating]);

  const presetRotations = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚌 BusMarker Arrow Component Demo</Text>
      
      {/* Current rotation display */}
      <View style={styles.currentRotation}>
        <Text style={styles.rotationLabel}>Current Rotation:</Text>
        <Text style={styles.rotationValue}>{Math.round(rotation)}°</Text>
      </View>

      {/* Bus marker display */}
      <View style={styles.markerContainer}>
        <BusMarker 
          rotation={rotation} 
          size={60} 
          testMode={true}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, isAnimating && styles.buttonActive]}
          onPress={() => setIsAnimating(!isAnimating)}
        >
          <Text style={styles.buttonText}>
            {isAnimating ? '⏸️ Stop Auto-Rotate' : '▶️ Auto-Rotate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => setRotation(0)}
        >
          <Text style={styles.buttonText}>🔄 Reset to 0°</Text>
        </TouchableOpacity>
      </View>

      {/* Manual rotation slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Manual Rotation:</Text>
        <View style={styles.sliderTrack}>
          {Array.from({ length: 37 }, (_, i) => i * 10).map(angle => (
            <TouchableOpacity
              key={angle}
              style={[
                styles.sliderDot,
                Math.abs(rotation - angle) < 5 && styles.sliderDotActive
              ]}
              onPress={() => setRotation(angle)}
            />
          ))}
        </View>
      </View>

      {/* Preset rotations */}
      <View style={styles.presetsContainer}>
        <Text style={styles.presetsLabel}>Quick Presets:</Text>
        <View style={styles.presetsGrid}>
          {presetRotations.map(angle => (
            <TouchableOpacity
              key={angle}
              style={[
                styles.presetButton,
                Math.abs(rotation - angle) < 5 && styles.presetButtonActive
              ]}
              onPress={() => setRotation(angle)}
            >
              <Text style={styles.presetText}>{angle}°</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Direction labels */}
      <View style={styles.directionsContainer}>
        <Text style={styles.directionsLabel}>Common Directions:</Text>
        <View style={styles.directionsGrid}>
          <View style={styles.directionItem}>
            <Text style={styles.directionText}>North: 0°</Text>
          </View>
          <View style={styles.directionItem}>
            <Text style={styles.directionText}>East: 90°</Text>
          </View>
          <View style={styles.directionItem}>
            <Text style={styles.directionText}>South: 180°</Text>
          </View>
          <View style={styles.directionItem}>
            <Text style={styles.directionText}>West: 270°</Text>
          </View>
        </View>
      </View>

      {/* Multiple markers demo */}
      <View style={styles.multipleMarkersContainer}>
        <Text style={styles.multipleMarkersLabel}>Multiple Markers:</Text>
        <View style={styles.multipleMarkersGrid}>
          {[0, 90, 180, 270].map(angle => (
            <View key={angle} style={styles.multipleMarkerItem}>
              <BusMarker rotation={angle} size={40} />
              <Text style={styles.multipleMarkerLabel}>{angle}°</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  currentRotation: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rotationLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  rotationValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  markerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#E55A2B',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sliderContainer: {
    marginBottom: 30,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  sliderDotActive: {
    backgroundColor: '#FF6B35',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  presetsContainer: {
    marginBottom: 30,
  },
  presetsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetButton: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: '22%',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  presetText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  directionsContainer: {
    marginBottom: 30,
  },
  directionsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  directionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  directionItem: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    minWidth: '22%',
    alignItems: 'center',
  },
  directionText: {
    fontSize: 12,
    color: '#666',
  },
  multipleMarkersContainer: {
    marginBottom: 30,
  },
  multipleMarkersLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  multipleMarkersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  multipleMarkerItem: {
    alignItems: 'center',
  },
  multipleMarkerLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});

export default BusMarkerDemo;
