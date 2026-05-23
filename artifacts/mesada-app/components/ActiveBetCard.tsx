import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { StreakBet, formatCurrency, formatDate } from '@/types';

interface Props {
  bet: StreakBet;
  currentStreak: number;
  currentBalance: number;
}

export function ActiveBetCard({ bet, currentStreak, currentBalance }: Props) {
  const colors = useColors();
  const daysCompleted = Math.min(Math.max(0, currentStreak - bet.startStreak), bet.durationDays);
  const progress = daysCompleted / bet.durationDays;
  const progressPct = Math.round(progress * 100);
  const bonusCentsEstimate = Math.round(currentBalance * bet.bonusPercent / 100);
  const daysLeft = Math.max(0, bet.durationDays - daysCompleted);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.streak }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: colors.streak + '18' }]}>
          <Ionicons name="flame" size={22} color={colors.streak} />
        </View>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>Aposta Ativa</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {daysLeft === 0 ? 'Objetivo alcançado!' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={[styles.bonusBadge, { backgroundColor: colors.success + '18' }]}>
          <Text style={[styles.bonusBadgeText, { color: colors.success }]}>+{bet.bonusPercent}%</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[
            styles.progressFill,
            {
              width: `${progressPct}%` as any,
              backgroundColor: progressPct >= 100 ? colors.success : colors.streak,
            }
          ]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
          {daysCompleted} / {bet.durationDays} dias
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Início</Text>
          <Text style={[styles.footerValue, { color: colors.foreground }]}>{formatDate(bet.startDate)}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Bônus potencial</Text>
          <Text style={[styles.footerValue, { color: colors.success }]}>{formatCurrency(bonusCentsEstimate)}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Streak atual</Text>
          <Text style={[styles.footerValue, { color: colors.streak }]}>🔥 {currentStreak}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginVertical: 6, borderRadius: 16,
    borderWidth: 1.5, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleSection: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  bonusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  bonusBadgeText: { fontSize: 13, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  progressSection: { gap: 6 },
  progressBar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerItem: { flex: 1, alignItems: 'center', gap: 2 },
  footerLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  footerValue: { fontSize: 13, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  footerDivider: { width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.08)' },
});
