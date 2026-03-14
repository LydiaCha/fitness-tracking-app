import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GRAD: [string, string, string] = ['#a855f7', '#7c3aed', '#22d3ee'];

interface Props {
  size?: number; // controls overall scale
}

/**
 * PeakRoutine logo mark — mountain peak chevron in brand gradient.
 * Pure RN + expo-linear-gradient, no SVG dependency.
 * Default size 64 (good for headers); use 120+ for splash/welcome.
 */
export function Logo({ size = 64 }: Props) {
  const s = size;

  // Chevron geometry (proportional to size):
  //  - Two rectangular legs that meet at a pointed apex via rotation
  const legW   = s * 0.175;  // width of each leg
  const legH   = s * 0.68;   // height of each leg
  const spread = s * 0.22;   // horizontal offset of each leg from center

  // Rotation angle so legs converge at top (approx)
  const angleDeg = 21;

  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {/* Subtle glow */}
      <View style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: s / 2,
          backgroundColor: '#7c3aed',
          opacity: 0.08,
          transform: [{ scaleY: 0.6 }, { translateY: s * 0.1 }],
        },
      ]} />

      {/* Left leg */}
      <LinearGradient
        colors={GRAD}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          bottom: s * 0.04,
          left: s / 2 - spread - legW,
          width: legW,
          height: legH,
          borderRadius: legW * 0.25,
          transform: [{ rotate: `${angleDeg}deg` }],
          transformOrigin: 'top center',
        }}
      />

      {/* Right leg */}
      <LinearGradient
        colors={GRAD}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          bottom: s * 0.04,
          left: s / 2 + spread,
          width: legW,
          height: legH,
          borderRadius: legW * 0.25,
          transform: [{ rotate: `-${angleDeg}deg` }],
          transformOrigin: 'top center',
        }}
      />

      {/* Three routine dots */}
      {[-1, 0, 1].map((offset, i) => (
        <LinearGradient
          key={offset}
          colors={GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: s / 2 + offset * s * 0.22 - s * 0.036,
            width: s * 0.072,
            height: s * 0.072,
            borderRadius: s * 0.036,
            opacity: i === 1 ? 0.85 : 0.45,
          }}
        />
      ))}
    </View>
  );
}
