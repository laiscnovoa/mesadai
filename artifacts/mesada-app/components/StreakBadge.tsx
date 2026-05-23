import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  streak: number;
  large?: boolean;
}

export function StreakBadge({ streak, large }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.badge, large && styles.badgeLarge, { backgroundColor: colors.streak + '18' }]}>
      <Ionicons name="flame" size={large ? 22 : 16} color={colors.streak} />
      <Text style={[styles.text, large && styles.textLarge, { color: colors.streak }]}>
        {streak}
      </Text>
      {large && <Text style={[styles.label, { color: colors.streak + 'CC' }]}>dias</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeLarge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  text: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  textLarge: { fontSize: 24 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
