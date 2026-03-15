import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#00C7BE', '#30B0C7', '#32ADE6', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#A2845E',
  '#ffffff', '#FFD60A', '#BF5AF2', '#FF6961',
];

const COUNT = 120;

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function randInt(a: number, b: number) { return Math.floor(rand(a, b)); }

type Shape = 'circle' | 'ribbon' | 'square';

interface Piece {
  y:       Animated.Value;
  x:       Animated.Value;
  rotate:  Animated.Value;
  opacity: Animated.Value;
  color:   string;
  width:   number;
  height:  number;
  startX:  number;
  shape:   Shape;
  delay:   number;
}

function makePieces(): Piece[] {
  return Array.from({ length: COUNT }, () => {
    const r = Math.random();
    const shape: Shape = r < 0.35 ? 'circle' : r < 0.65 ? 'ribbon' : 'square';
    const size = rand(6, 13);
    return {
      y:       new Animated.Value(0),
      x:       new Animated.Value(0),
      rotate:  new Animated.Value(0),
      opacity: new Animated.Value(0),
      color:   COLORS[randInt(0, COLORS.length)],
      width:   shape === 'ribbon' ? rand(3, 5) : size,
      height:  shape === 'ribbon' ? rand(10, 18) : size,
      startX:  rand(-10, SW + 10),
      shape,
      delay:   rand(0, 2200),
    };
  });
}

export function Confetti({ visible }: { visible: boolean }) {
  const pieces = useRef<Piece[]>(makePieces()).current;
  const animsRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      animsRef.current?.stop();
      pieces.forEach(p => {
        p.y.setValue(0);
        p.x.setValue(0);
        p.rotate.setValue(0);
        p.opacity.setValue(0);
      });
      return;
    }

    pieces.forEach(p => {
      p.y.setValue(0);
      p.x.setValue(0);
      p.rotate.setValue(0);
      p.opacity.setValue(0);
    });

    const animations = pieces.map(p => {
      const fallDuration = rand(3000, 4800);
      const swayAmp      = rand(18, 48);
      const swayPeriod   = rand(600, 1100);
      const spins        = rand(2, 5);

      // Pendulum sway: alternate left/right over the fall duration
      const swaySteps    = Math.ceil(fallDuration / swayPeriod);
      const swaySequence = Array.from({ length: swaySteps }, (_, i) =>
        Animated.timing(p.x, {
          toValue: i % 2 === 0 ? swayAmp : -swayAmp,
          duration: swayPeriod,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      );

      return Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          // Fade in quickly then stay visible
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.delay(fallDuration * 0.75),
            Animated.timing(p.opacity, { toValue: 0, duration: fallDuration * 0.25, useNativeDriver: true }),
          ]),
          // Fall with gentle ease
          Animated.timing(p.y, {
            toValue: SH + 40,
            duration: fallDuration,
            easing: Easing.in(Easing.poly(1.4)),
            useNativeDriver: true,
          }),
          // Pendulum sway
          Animated.sequence(swaySequence),
          // Spin
          Animated.timing(p.rotate, {
            toValue: spins,
            duration: fallDuration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    animsRef.current = Animated.parallel(animations);
    animsRef.current.start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map((p, i) => {
        const rotate = p.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        const borderRadius =
          p.shape === 'circle' ? p.width / 2 :
          p.shape === 'ribbon' ? 2 : 2;

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: -p.height,
              left: p.startX - p.width / 2,
              width: p.width,
              height: p.height,
              borderRadius,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateY: p.y },
                { translateX: p.x },
                { rotate },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
