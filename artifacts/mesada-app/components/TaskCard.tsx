import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { cardShadow, layout } from '@/constants/layout';
import { Mission, formatCurrency, SubmissionStatus } from '@/types';

interface Props {
  mission: Mission;
  onPress: () => void;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; colorKey: 'info' | 'success' | 'warning' | 'destructive' | 'appealed' | 'mutedForeground'; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Enviar', colorKey: 'info', icon: 'arrow-forward-circle' },
  approved: { label: 'Aprovada', colorKey: 'success', icon: 'checkmark-circle' },
  partial: { label: 'Parcial', colorKey: 'warning', icon: 'remove-circle' },
  rejected: { label: 'Rejeitada', colorKey: 'destructive', icon: 'close-circle' },
  appealed: { label: 'Em recurso', colorKey: 'appealed', icon: 'alert-circle' },
  appeal_rejected: { label: 'Encerrada', colorKey: 'mutedForeground', icon: 'ban' },
};

const FREQ_LABEL: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  once: 'Uma vez',
};

export function TaskCard({ mission, onPress }: Props) {
  const colors = useColors();
  const { task, submission } = mission;
  const status = submission?.status ?? 'pending';
  const config = STATUS_CONFIG[status];
  const statusColor = colors[config.colorKey];
  const statusBackground = status === 'approved'
    ? colors.successBackground
    : status === 'rejected'
      ? colors.destructiveBackground
      : `${statusColor}20`;
  const isCompleted = status === 'approved' || status === 'partial';
  const canSubmit = !submission || status === 'rejected' || status === 'appeal_rejected';

  const handlePress = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.card, cardShadow, { backgroundColor: colors.card, borderColor: colors.border, opacity: isCompleted ? 0.7 : 1 }]}
      onPress={handlePress}
      activeOpacity={canSubmit ? 0.75 : 1}
      disabled={!canSubmit}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${config.label}, recompensa ${formatCurrency(task.rewardCents)}`}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Ionicons name="checkmark-done" size={24} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{task.title}</Text>
        <View style={styles.meta}>
          <Text style={[styles.freq, { color: colors.mutedForeground }]}>{FREQ_LABEL[task.frequency]}</Text>
          <View style={[styles.reward, { backgroundColor: colors.rewardBackground }]}>
            <Ionicons name="cash" size={12} color={colors.rewardForeground} />
            <Text style={[styles.rewardText, { color: colors.rewardForeground }]}>{formatCurrency(task.rewardCents)}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: statusBackground }]}>
        <Ionicons name={config.icon} size={20} color={statusColor} />
        <Text style={[styles.badgeText, { color: statusColor }]}>{config.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: layout.spacing.card, borderRadius: layout.radius.card,
    marginHorizontal: layout.spacing.screen, marginVertical: 6, borderWidth: 1,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  freq: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rewardText: { fontSize: 12, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  badge: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
});
