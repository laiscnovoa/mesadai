import React, { useEffect, useRef } from 'react';
import {
  Animated, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Cofri } from '@/components/Cofri';
import { formatCurrency, StreakBet } from '@/types';
import { useColors } from '@/hooks/useColors';
import { elevatedShadow, layout } from '@/constants/layout';

interface Props {
  visible: boolean;
  bet: StreakBet | null;
  onClose: () => void;
}

const CONFETTI = [
  { color: '#F6C90E', left: '7%', top: '7%', rotate: '-18deg', delay: 0 },
  { color: '#00C472', left: '17%', top: '28%', rotate: '28deg', delay: 80 },
  { color: '#FF6B00', left: '84%', top: '10%', rotate: '22deg', delay: 160 },
  { color: '#7C3AED', left: '91%', top: '32%', rotate: '-30deg', delay: 240 },
  { color: '#E53E3E', left: '5%', top: '57%', rotate: '34deg', delay: 120 },
  { color: '#3182CE', left: '94%', top: '62%', rotate: '-16deg', delay: 200 },
  { color: '#F6C90E', left: '12%', top: '78%', rotate: '14deg', delay: 280 },
  { color: '#00C472', left: '87%', top: '82%', rotate: '-26deg', delay: 40 },
];

export function StreakBonusCelebration({ visible, bet, onClose }: Props) {
  const colors = useColors();
  const cardScale = useRef(new Animated.Value(0.86)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !bet) return;

    cardScale.setValue(0.86);
    cardOpacity.setValue(0);
    confettiProgress.setValue(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const animation = Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 13,
        stiffness: 170,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(confettiProgress, {
            toValue: 1,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(confettiProgress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [visible, bet, cardOpacity, cardScale, confettiProgress]);

  if (!bet) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Animated.View
          style={[
            styles.card,
            elevatedShadow,
            {
              backgroundColor: colors.card,
              borderColor: colors.accent,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
          testID="streak-bonus-celebration"
        >
          <View style={[StyleSheet.absoluteFill, styles.confettiLayer]}>
            {CONFETTI.map((piece) => (
              <Animated.View
                key={`${piece.left}-${piece.top}`}
                style={[
                  styles.confetti,
                  {
                    backgroundColor: piece.color,
                    left: piece.left as `${number}%`,
                    top: piece.top as `${number}%`,
                    transform: [
                      {
                        translateY: confettiProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 16],
                        }),
                      },
                      { rotate: piece.rotate },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          <View style={[styles.trophyBadge, { backgroundColor: colors.rewardBackground }]}>
            <Text style={styles.trophy}>🏆</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Você conseguiu!</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Seu streak de {bet.durationDays} dias rendeu um bônus!
          </Text>

          <View style={styles.cofri}>
            <Cofri
              state="celebrating"
              streak={bet.startStreak + bet.durationDays}
              size={144}
            />
          </View>

          <View style={[styles.rewardCard, { backgroundColor: colors.successBackground }]}>
            <Text style={[styles.rewardLabel, { color: colors.success }]}>BÔNUS CREDITADO</Text>
            <Text style={[styles.rewardValue, { color: colors.success }]}>
              +{formatCurrency(bet.bonusCentsAwarded)}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
            ]}
            onPress={onClose}
            testID="streak-bonus-continue"
            accessibilityRole="button"
          >
            <Text style={[styles.closeButtonText, { color: colors.primaryForeground }]}>Continuar</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    borderRadius: layout.radius.sheet,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 9,
    height: 16,
    borderRadius: 2,
  },
  confettiLayer: { pointerEvents: 'none' },
  trophyBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trophy: { fontSize: 32 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  cofri: { marginTop: 10, marginBottom: 4 },
  rewardCard: {
    alignItems: 'center',
    width: '100%',
    borderRadius: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  rewardLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  rewardValue: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  closeButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});