import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { cardShadow, layout } from '@/constants/layout';
import { SubmissionWithTask, formatCurrency } from '@/types';
import { ProofPhoto } from '@/components/ProofPhoto';

interface Props {
  item: SubmissionWithTask;
  onPress: () => void;
}

export function SubmissionCard({ item, onPress }: Props) {
  const colors = useColors();
  const { submission, task, child } = item;
  const isAppeal = submission.status === 'appealed';

  const submittedAgo = (() => {
    const diff = Date.now() - new Date(submission.submittedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  })();

  return (
    <TouchableOpacity
      style={[styles.card, cardShadow, { backgroundColor: colors.card, borderColor: isAppeal ? colors.appealed : colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, enviada por ${child.name}`}
    >
      <ProofPhoto
        uri={submission.photoUri}
        style={styles.photo}
        accessibilityLabel="Miniatura da foto de comprovação"
        iconSize={28}
      />
      <View style={styles.info}>
        <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={1}>{task.title}</Text>
        <Text style={[styles.childName, { color: colors.mutedForeground }]}>{child.name}</Text>
        <View style={styles.row}>
          <View style={[styles.rewardBadge, { backgroundColor: colors.rewardBackground }]}>
            <Ionicons name="cash" size={12} color={colors.rewardForeground} />
            <Text style={[styles.rewardText, { color: colors.rewardForeground }]}>{formatCurrency(task.rewardCents)}</Text>
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{submittedAgo}</Text>
        </View>
        {isAppeal && (
          <View style={[styles.appealBadge, { backgroundColor: colors.appealed + '20' }]}>
            <Ionicons name="alert-circle" size={12} color={colors.appealed} />
            <Text style={[styles.appealText, { color: colors.appealed }]}>Recurso enviado</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: layout.radius.card,
    marginHorizontal: layout.spacing.screen, marginVertical: 6, borderWidth: 1,
  },
  photo: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  info: { flex: 1, minWidth: 0, gap: 4 },
  taskTitle: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  childName: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rewardText: { fontSize: 12, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  time: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  appealBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 2 },
  appealText: { fontSize: 11, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
});
