import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export type CofriState = 'happy' | 'neutral' | 'charging' | 'celebrating';

interface CofriProps {
  state?: CofriState;
  size?: number;
}

const EXPRESSIONS: Record<CofriState, { eyes: string; mouth: string; bubble: string; bg: string; cheek: string }> = {
  happy: {
    eyes: '^^',
    mouth: '‿',
    bubble: 'Arrasou! 🌟',
    bg: '#00C472',
    cheek: '#FF9EB5',
  },
  neutral: {
    eyes: '• •',
    mouth: '‿',
    bubble: 'Vamos lá! 💪',
    bg: '#7C3AED',
    cheek: '#FFB3C6',
  },
  charging: {
    eyes: '>  <',
    mouth: '—',
    bubble: 'Ei, falta tarefa! 👀',
    bg: '#FF6B00',
    cheek: '#FFB3C6',
  },
  celebrating: {
    eyes: '★ ★',
    mouth: 'D',
    bubble: 'INCRÍVEL!! 🎉🎊',
    bg: '#F6C90E',
    cheek: '#FF9EB5',
  },
};

export function Cofri({ state = 'neutral', size = 100 }: CofriProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const expr = EXPRESSIONS[state];

  useEffect(() => {
    if (state === 'celebrating') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -14, duration: 250, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'charging') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -5, duration: 900, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => {
      bounceAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [state]);

  const s = size;

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bounceAnim }, { scale: scaleAnim }] }}>
      <View style={{ width: s, height: s * 1.05, alignItems: 'center' }}>
        {/* Ears */}
        <View style={[styles.earsRow, { top: s * 0.02 }]}>
          <View style={[styles.ear, { width: s * 0.22, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: expr.bg }]} />
          <View style={{ width: s * 0.3 }} />
          <View style={[styles.ear, { width: s * 0.22, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: expr.bg }]} />
        </View>

        {/* Head */}
        <View style={[styles.head, {
          width: s * 0.86, height: s * 0.86, borderRadius: s * 0.43,
          backgroundColor: expr.bg, marginTop: s * 0.08,
        }]}>
          {/* Eyes */}
          <Text style={[styles.eyes, { fontSize: s * 0.16, marginTop: s * 0.16 }]}>{expr.eyes}</Text>

          {/* Cheeks */}
          <View style={styles.cheeksRow}>
            <View style={[styles.cheek, { width: s * 0.18, height: s * 0.12, borderRadius: s * 0.06, backgroundColor: expr.cheek, opacity: 0.6 }]} />
            <View style={{ flex: 1 }} />
            <View style={[styles.cheek, { width: s * 0.18, height: s * 0.12, borderRadius: s * 0.06, backgroundColor: expr.cheek, opacity: 0.6 }]} />
          </View>

          {/* Snout */}
          <View style={[styles.snout, {
            width: s * 0.38, height: s * 0.24, borderRadius: s * 0.12,
            backgroundColor: 'rgba(255,255,255,0.25)', marginTop: s * 0.02,
          }]}>
            <Text style={[styles.mouth, { fontSize: s * 0.14 }]}>{expr.mouth}</Text>
          </View>
        </View>
      </View>

      {/* Speech bubble */}
      <View style={[styles.bubble, { backgroundColor: expr.bg, marginTop: 8 }]}>
        <Text style={[styles.bubbleText, { color: state === 'celebrating' ? '#333' : '#fff' }]}>{expr.bubble}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  earsRow: { flexDirection: 'row', position: 'absolute', left: 0, right: 0, justifyContent: 'center', zIndex: 0 },
  ear: {},
  head: { alignItems: 'center', zIndex: 1, overflow: 'hidden' },
  eyes: { color: '#fff', fontWeight: '700', textAlign: 'center', letterSpacing: 4 },
  cheeksRow: { flexDirection: 'row', paddingHorizontal: '12%', width: '100%', marginTop: 2 },
  cheek: {},
  snout: { alignItems: 'center', justifyContent: 'center' },
  mouth: { color: '#fff', fontWeight: '700' },
  bubble: {
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  bubbleText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
