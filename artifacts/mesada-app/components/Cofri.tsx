import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export type CofriState = 'happy' | 'neutral' | 'charging' | 'celebrating';

interface CofriProps {
  state?: CofriState;
  size?: number;
  streak?: number;
}

interface CoinTier {
  main: string;
  mid: string;
  edge: string;
  shine: string;
  featureColor: string;
  label: string;
  emoji: string;
}

function getCoinTier(streak: number): CoinTier {
  if (streak >= 30) return {
    main: '#FFD700', mid: '#F5C200', edge: '#B8930A',
    shine: 'rgba(255,255,255,0.65)', featureColor: '#7A5C00',
    label: 'Ouro Supremo ✨', emoji: '🏆',
  };
  if (streak >= 21) return {
    main: '#F0C030', mid: '#E0B020', edge: '#A87D10',
    shine: 'rgba(255,255,255,0.55)', featureColor: '#7A5C00',
    label: 'Ouro', emoji: '🥇',
  };
  if (streak >= 14) return {
    main: '#D4A030', mid: '#C49020', edge: '#8B6520',
    shine: 'rgba(255,255,255,0.45)', featureColor: '#6B4800',
    label: 'Ouro Bronze', emoji: '⭐',
  };
  if (streak >= 7) return {
    main: '#C8C8CE', mid: '#B0B0B8', edge: '#808090',
    shine: 'rgba(255,255,255,0.60)', featureColor: '#404050',
    label: 'Prata', emoji: '🥈',
  };
  if (streak >= 4) return {
    main: '#D4943A', mid: '#C08030', edge: '#906020',
    shine: 'rgba(255,255,255,0.35)', featureColor: '#5A3010',
    label: 'Bronze Brilhante', emoji: '🔥',
  };
  if (streak >= 1) return {
    main: '#C8833B', mid: '#B07030', edge: '#885020',
    shine: 'rgba(255,255,255,0.30)', featureColor: '#5A3010',
    label: 'Bronze', emoji: '💪',
  };
  return {
    main: '#CD7F32', mid: '#B06A24', edge: '#8B5220',
    shine: 'rgba(255,255,255,0.25)', featureColor: '#5A3010',
    label: 'Iniciante', emoji: '🪙',
  };
}

interface FaceExpression {
  eyeStyle: 'normal' | 'happy' | 'determined' | 'star';
  mouthStyle: 'smile' | 'grin' | 'flat' | 'open';
  bubble: string;
}

const EXPRESSIONS: Record<CofriState, FaceExpression> = {
  neutral: { eyeStyle: 'normal', mouthStyle: 'smile', bubble: 'Vamos lá! 💪' },
  happy:   { eyeStyle: 'happy',  mouthStyle: 'grin',  bubble: 'Arrasou! 🌟' },
  charging:{ eyeStyle: 'determined', mouthStyle: 'flat', bubble: 'Ei, falta tarefa! 👀' },
  celebrating: { eyeStyle: 'star', mouthStyle: 'open', bubble: 'INCRÍVEL!! 🎉🎊' },
};

function Eye({ style, size, color }: { style: FaceExpression['eyeStyle']; size: number; color: string }) {
  const r = size * 0.065;
  if (style === 'star') {
    return <Text style={{ fontSize: size * 0.13, color, lineHeight: size * 0.14 }}>★</Text>;
  }
  if (style === 'happy') {
    return (
      <View style={{
        width: r * 2.2, height: r * 1.2, borderRadius: r * 0.6,
        borderBottomWidth: r * 0.5, borderColor: color,
        borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0,
      }} />
    );
  }
  if (style === 'determined') {
    return (
      <View style={{ width: r * 2, height: r * 0.5, borderRadius: r * 0.25, backgroundColor: color }} />
    );
  }
  return <View style={{ width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color }} />;
}

function Mouth({ style, size, color }: { style: FaceExpression['mouthStyle']; size: number; color: string }) {
  const w = size * 0.28;
  if (style === 'open') {
    return (
      <View style={{
        width: w, height: w * 0.55, borderRadius: w * 0.28,
        backgroundColor: color, opacity: 0.85,
      }} />
    );
  }
  if (style === 'flat') {
    return (
      <View style={{ width: w * 0.7, height: size * 0.035, borderRadius: size * 0.02, backgroundColor: color }} />
    );
  }
  if (style === 'grin') {
    return (
      <View style={{
        width: w, height: w * 0.5,
        borderBottomLeftRadius: w * 0.5, borderBottomRightRadius: w * 0.5,
        borderLeftWidth: size * 0.04, borderRightWidth: size * 0.04,
        borderBottomWidth: size * 0.04, borderTopWidth: 0,
        borderColor: color,
      }} />
    );
  }
  return (
    <View style={{
      width: w * 0.7, height: w * 0.35,
      borderBottomLeftRadius: w * 0.35, borderBottomRightRadius: w * 0.35,
      borderLeftWidth: size * 0.035, borderRightWidth: size * 0.035,
      borderBottomWidth: size * 0.035, borderTopWidth: 0,
      borderColor: color,
    }} />
  );
}

export function Cofri({ state = 'neutral', size = 100, streak = 0 }: CofriProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;

  const tier = getCoinTier(streak);
  const expr = EXPRESSIONS[state];
  const fc = tier.featureColor;

  useEffect(() => {
    bounceAnim.setValue(0);
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);

    if (state === 'celebrating') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -16, duration: 220, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'charging') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.07, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -5, duration: 950, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 950, useNativeDriver: true }),
        ])
      ).start();
    }

    if (streak >= 21) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.65, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }

    return () => {
      bounceAnim.stopAnimation();
      scaleAnim.stopAnimation();
      rotateAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [state, streak]);

  const rotateDeg = rotateAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });

  const coinOuter = size;
  const coinInner = size * 0.9;
  const eyeGap = size * 0.18;
  const noseSize = size * 0.055;
  const eyeY = coinInner * 0.3;

  return (
    <Animated.View style={{
      alignItems: 'center',
      transform: [{ translateY: bounceAnim }, { scale: scaleAnim }, { rotate: rotateDeg }],
    }}>
      {/* Glow ring for high streaks */}
      {streak >= 14 && (
        <Animated.View style={{
          position: 'absolute',
          width: coinOuter * 1.18, height: coinOuter * 1.18,
          borderRadius: coinOuter * 0.59,
          backgroundColor: tier.main,
          opacity: glowAnim,
          top: -(coinOuter * 0.09), left: -(coinOuter * 0.09),
        }} />
      )}

      {/* Coin edge ring */}
      <View style={{
        width: coinOuter, height: coinOuter, borderRadius: coinOuter / 2,
        backgroundColor: tier.edge,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: tier.edge, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
      }}>
        {/* Coin face (inner) */}
        <View style={{
          width: coinInner, height: coinInner, borderRadius: coinInner / 2,
          backgroundColor: tier.main, alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Metallic mid gradient band */}
          <View style={{
            position: 'absolute', left: 0, right: 0,
            top: coinInner * 0.25, height: coinInner * 0.22,
            backgroundColor: tier.mid, opacity: 0.6,
          }} />

          {/* Shine highlight */}
          <View style={{
            position: 'absolute',
            top: coinInner * 0.06, left: coinInner * 0.12,
            width: coinInner * 0.38, height: coinInner * 0.2,
            borderRadius: coinInner * 0.1,
            backgroundColor: tier.shine,
            transform: [{ rotate: '-25deg' }],
          }} />

          {/* Face */}
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: size * 0.04, marginTop: size * 0.04 }}>
            {/* Eyes */}
            <View style={{ flexDirection: 'row', gap: eyeGap, alignItems: 'center' }}>
              <Eye style={expr.eyeStyle} size={size} color={fc} />
              <Eye style={expr.eyeStyle} size={size} color={fc} />
            </View>

            {/* Nose */}
            <View style={{ width: noseSize, height: noseSize, borderRadius: noseSize / 2, backgroundColor: fc, opacity: 0.55, marginTop: -(size * 0.02) }} />

            {/* Mouth */}
            <View style={{ marginTop: -(size * 0.01) }}>
              <Mouth style={expr.mouthStyle} size={size} color={fc} />
            </View>
          </View>

          {/* Bottom shine */}
          <View style={{
            position: 'absolute',
            bottom: coinInner * 0.05, right: coinInner * 0.1,
            width: coinInner * 0.2, height: coinInner * 0.1,
            borderRadius: coinInner * 0.05,
            backgroundColor: 'rgba(255,255,255,0.2)',
            transform: [{ rotate: '20deg' }],
          }} />
        </View>
      </View>

      {/* Speech bubble */}
      <View style={[styles.bubble, { backgroundColor: tier.edge, marginTop: 8 }]}>
        <Text style={styles.bubbleText}>{expr.bubble}</Text>
      </View>

      {/* Streak tier label */}
      {streak > 0 && (
        <View style={[styles.tierChip, { backgroundColor: tier.main + 'CC', borderColor: tier.edge }]}>
          <Text style={[styles.tierText, { color: tier.featureColor }]}>{tier.emoji} {tier.label}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  bubbleText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#fff' },
  tierChip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    marginTop: 4, borderWidth: 1,
  },
  tierText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
