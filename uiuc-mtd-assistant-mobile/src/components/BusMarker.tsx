import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface BusMarkerProps {
  /** Rotation angle in degrees (0-360) */
  rotation?: number;
  /** Size of the marker in pixels */
  size?: number;
  /** Color of the bus marker */
  color?: string;
  /** Test mode - shows rotation angle text */
  testMode?: boolean;
}

export const BusMarker: React.FC<BusMarkerProps> = ({
  rotation = 0,
  size = 24,
  color = '#FF6B35', // Orange color for bus
  testMode = false,
}) => {
  // Bus arrow SVG path - pointing upward by default
  const arrowPath = "M12 2 L20 18 L16 18 L16 22 L8 22 L8 18 L4 18 Z";
  
  // Calculate rotation center (middle of the marker)
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G
          transform={`translate(${centerX}, ${centerY}) rotate(${rotation}) translate(-${centerX}, -${centerY})`}
        >
          {/* Bus body (main rectangle) */}
          <Path
            d={`M${size * 0.2} ${size * 0.3} L${size * 0.8} ${size * 0.3} L${size * 0.8} ${size * 0.7} L${size * 0.2} ${size * 0.7} Z`}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
          
          {/* Bus windows */}
          <Path
            d={`M${size * 0.25} ${size * 0.35} L${size * 0.75} ${size * 0.35} L${size * 0.75} ${size * 0.5} L${size * 0.25} ${size * 0.5} Z`}
            fill="#87CEEB"
            stroke="#FFFFFF"
            strokeWidth="0.5"
          />
          
          {/* Direction arrow */}
          <Path
            d={`M${size * 0.5} ${size * 0.1} L${size * 0.6} ${size * 0.25} L${size * 0.55} ${size * 0.25} L${size * 0.55} ${size * 0.3} L${size * 0.45} ${size * 0.3} L${size * 0.45} ${size * 0.25} L${size * 0.4} ${size * 0.25} Z`}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="0.5"
          />
          
          {/* Wheels */}
          <Path
            d={`M${size * 0.3} ${size * 0.7} A${size * 0.05} ${size * 0.05} 0 1 1 ${size * 0.3} ${size * 0.8} A${size * 0.05} ${size * 0.05} 0 1 1 ${size * 0.3} ${size * 0.7} Z`}
            fill="#333333"
          />
          <Path
            d={`M${size * 0.7} ${size * 0.7} A${size * 0.05} ${size * 0.05} 0 1 1 ${size * 0.7} ${size * 0.8} A${size * 0.05} ${size * 0.05} 0 1 1 ${size * 0.7} ${size * 0.7} Z`}
            fill="#333333"
          />
        </G>
      </Svg>
      
      {/* Test mode - show rotation angle */}
      {testMode && (
        <View style={styles.testLabel}>
          <View style={styles.testLabelBackground}>
            <View style={styles.testLabelText}>
              {Math.round(rotation)}°
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  testLabel: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  testLabelBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  testLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default BusMarker;
