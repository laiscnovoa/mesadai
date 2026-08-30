import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { cardShadow, layout } from '@/constants/layout';

interface Props {
  xp: number;
  level: number;
}

export function XPBar({ xp, level }: Props) {
  const colors = useColors();
  const xpInLevel = xp % 50;
  const progress = xpInLevel / 50;

  return (
    <View style={[styles.container, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.levelBadge, { backgroundColor: colors.xp }]}>
        <Text style={[styles.levelText, { color: colors.xpForeground }]}>Nv {level}</Text>
      </View>
      <View style={styles.barSection}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>XP</Text>
          <Text style={[styles.xpText, { color: colors.xp }]}>{xp} XP</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: colors.xp }]} />
        </View>
        <Text style={[styles.nextLevel, { color: colors.mutedForeground }]}>
          {50 - xpInLevel} XP para nível {level + 1}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: layout.radius.card,
    marginHorizontal: 16, marginVertical: 6, borderWidth: 1, gap: 14,
  },
  levelBadge: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  levelText: { fontSize: 13, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  barSection: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  xpText: { fontSize: 13, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  nextLevel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
