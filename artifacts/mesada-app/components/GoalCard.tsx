import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { SavingsGoal, formatCurrency } from '@/types';

interface Props {
  goal: SavingsGoal;
  currentBalance: number;
  onDelete?: () => void;
}

export function GoalCard({ goal, currentBalance, onDelete }: Props) {
  const colors = useColors();
  const progress = Math.min(1, currentBalance / goal.targetCents);
  const progressPct = Math.round(progress * 100);
  const remaining = Math.max(0, goal.targetCents - currentBalance);
  const completed = currentBalance >= goal.targetCents;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: completed ? colors.success : colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: completed ? '#F0FFF4' : '#FFF8E1' }]}>
          <Ionicons name={completed ? 'checkmark-circle' : 'star'} size={22} color={completed ? colors.success : colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{goal.title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {completed ? 'Meta atingida!' : `Faltam ${formatCurrency(remaining)}`}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: completed ? colors.success : colors.accent }]} />
        </View>
        <Text style={[styles.pct, { color: colors.mutedForeground }]}>{progressPct}%</Text>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.current, { color: completed ? colors.success : colors.primary }]}>{formatCurrency(currentBalance)}</Text>
        <Text style={[styles.target, { color: colors.mutedForeground }]}>de {formatCurrency(goal.targetCents)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16, borderRadius: 16, marginHorizontal: 16, marginVertical: 6,
    borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  pct: { fontSize: 12, fontFamily: 'Inter_600SemiBold', minWidth: 32, textAlign: 'right' },
  amounts: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  current: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  target: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
