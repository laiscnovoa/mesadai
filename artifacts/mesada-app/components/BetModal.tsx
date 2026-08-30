import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppSheet } from '@/components/AppSheet';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { cardShadow, layout } from '@/constants/layout';
import { StreakBetDuration, STREAK_BET_BONUS, formatCurrency } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  childId: string;
}

const BET_OPTIONS: { days: StreakBetDuration; label: string; emoji: string }[] = [
  { days: 7, label: '1 semana', emoji: '🌱' },
  { days: 14, label: '2 semanas', emoji: '💪' },
  { days: 20, label: '20 dias', emoji: '🏆' },
];

export function BetModal({ visible, onClose, childId }: Props) {
  const { placeBet, getActiveBet, getChildBalance } = useApp();
  const colors = useColors();
  const [selected, setSelected] = useState<StreakBetDuration | null>(null);

  const activeBet = getActiveBet(childId);
  const balance = getChildBalance(childId);
  const hasActiveBet = !!activeBet;

  const handleConfirm = () => {
    if (!selected) {
      Alert.alert('Atenção', 'Escolha uma duração para o bônus.');
      return;
    }
    const bonusPct = STREAK_BET_BONUS[selected];
    const bonusEstimate = Math.round(balance * bonusPct / 100);
    Alert.alert(
      'Confirmar bônus',
      `Manter ${selected} dias consecutivos de streak?\n\nSe conseguir, você ganha +${bonusPct}% do seu saldo atual (≈ ${formatCurrency(bonusEstimate)}) como bônus!`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ativar!',
          onPress: async () => {
            const ok = await placeBet(childId, selected);
            if (ok) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSelected(null);
              onClose();
            } else {
              Alert.alert('Erro', 'Não foi possível ativar o bônus. Pode já existir um bônus ativo ou você está sem conexão.');
            }
          },
        },
      ]
    );
  };

  return (
    <AppSheet
      visible={visible}
      title="Ativar Bônus"
      onClose={onClose}
      actionLabel="Ativar!"
      onAction={handleConfirm}
      actionDisabled={hasActiveBet || !selected}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.heroRow}>
            <Text style={styles.heroEmoji}>🔥</Text>
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>Garanta seu bônus de streak!</Text>
              <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
                Mantenha dias consecutivos e ganhe um bônus sobre seu saldo atual.
              </Text>
            </View>
          </View>

          {hasActiveBet && (
            <View style={[styles.activeBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={[styles.activeBannerText, { color: colors.warning }]}>
                Você já tem um bônus ativo. Complete o streak para recebê-lo!
              </Text>
            </View>
          )}

          {BET_OPTIONS.map(opt => {
            const bonusPct = STREAK_BET_BONUS[opt.days];
            const bonusEstimate = Math.round(balance * bonusPct / 100);
            const isSelected = selected === opt.days;
            return (
              <TouchableOpacity
                key={opt.days}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? colors.secondary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  cardShadow,
                ]}
                onPress={() => !hasActiveBet && setSelected(opt.days)}
                activeOpacity={hasActiveBet ? 1 : 0.7}
                disabled={hasActiveBet}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: hasActiveBet }}
                accessibilityLabel={`${opt.days} dias, bônus de ${bonusPct}%`}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionDays, { color: colors.foreground }]}>{opt.days} dias</Text>
                  <Text style={[styles.optionLabel, { color: colors.mutedForeground }]}>{opt.label}</Text>
                </View>
                <View style={styles.optionBonus}>
                  <Text style={[styles.bonusPct, { color: colors.success }]}>+{bonusPct}%</Text>
                  {balance > 0 && (
                    <Text style={[styles.bonusEst, { color: colors.mutedForeground }]}>≈ {formatCurrency(bonusEstimate)}</Text>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            O bônus é calculado sobre o saldo do ciclo quando você completar o streak.
          </Text>
      </ScrollView>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.spacing.screen, gap: 12, paddingBottom: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  heroEmoji: { fontSize: 40 },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  heroDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 18 },
  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  activeBannerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 18 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: layout.radius.card, borderWidth: 1.5, gap: 12,
  },
  optionEmoji: { fontSize: 28 },
  optionInfo: { flex: 1, minWidth: 0 },
  optionDays: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  optionLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  optionBonus: { alignItems: 'flex-end', gap: 2, flexShrink: 1 },
  bonusPct: { fontSize: 18, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  bonusEst: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  checkIcon: { marginLeft: 4 },
  disclaimer: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
