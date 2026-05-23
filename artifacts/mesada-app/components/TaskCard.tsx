import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Mission, formatCurrency, SubmissionStatus } from '@/types';

interface Props {
  mission: Mission;
  onPress: () => void;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Enviar', color: '#3182CE', icon: 'arrow-forward-circle' },
  approved: { label: 'Aprovada', color: '#38A169', icon: 'checkmark-circle' },
  partial: { label: 'Parcial', color: '#ED8936', icon: 'remove-circle' },
  rejected: { label: 'Rejeitada', color: '#E53E3E', icon: 'close-circle' },
  appealed: { label: 'Em recurso', color: '#7C3AED', icon: 'alert-circle' },
  appeal_rejected: { label: 'Encerrada', color: '#8A94A6', icon: 'ban' },
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
  const isCompleted = status === 'approved' || status === 'partial';
  const canSubmit = !submission || status === 'rejected' || status === 'appeal_rejected';

  const handlePress = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: isCompleted ? 0.7 : 1 }]}
      onPress={handlePress}
      activeOpacity={canSubmit ? 0.75 : 1}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Ionicons name="checkmark-done" size={24} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{task.title}</Text>
        <View style={styles.meta}>
          <Text style={[styles.freq, { color: colors.mutedForeground }]}>{FREQ_LABEL[task.frequency]}</Text>
          <View style={[styles.reward, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="cash" size={12} color="#F6C90E" />
            <Text style={styles.rewardText}>{formatCurrency(task.rewardCents)}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
    marginHorizontal: 16, marginVertical: 6, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freq: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rewardText: { fontSize: 12, fontWeight: '600' as const, color: '#B7860B', fontFamily: 'Inter_600SemiBold' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
});
