import React, { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { TaskCard } from '@/components/TaskCard';
import { StreakBadge } from '@/components/StreakBadge';
import { Cofri, CofriState } from '@/components/Cofri';
import { formatCurrency } from '@/types';
import { bottomInset, topInset } from '@/constants/layout';

function getCofriState(completed: number, total: number): CofriState {
  if (total === 0) return 'neutral';
  if (completed === total) return 'celebrating';
  if (completed > total / 2) return 'happy';
  return 'charging';
}

export default function ChildMissionsScreen() {
  const {
    getCurrentChild, getTodaysMissions, getChildStreak, getChildXP,
    getChildLevel, getChildBalance, currentRole, currentChildId, isLoading,
  } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && currentRole !== 'child') router.replace('/welcome');
  }, [currentRole, isLoading]);

  const child = getCurrentChild();
  const missions = getTodaysMissions();
  const streak = getChildStreak(currentChildId ?? '');
  const xp = getChildXP(currentChildId ?? '');
  const level = getChildLevel(currentChildId ?? '');
  const balance = getChildBalance(currentChildId ?? '');

  const completed = missions.filter(m => m.submission?.status === 'approved' || m.submission?.status === 'partial').length;
  const total = missions.length;
  const progress = total > 0 ? completed / total : 0;
  const cofriState = getCofriState(completed, total);

  const topPad = topInset(insets.top);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={missions}
        keyExtractor={item => item.task.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomInset(insets.bottom) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <LinearGradient colors={[colors.primary, '#00855B']} style={[styles.header, { paddingTop: topPad + 12 }]}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.greeting}>Olá, {child?.name ?? 'Aventureiro'}!</Text>
                  <Text style={styles.subtitle}>Suas missões de hoje</Text>
                </View>
                <View style={styles.headerRight}>
                  <StreakBadge streak={streak} />
                </View>
              </View>

              {/* Cofri mascot */}
              <View style={styles.cofriContainer}>
                <Cofri state={cofriState} streak={streak} size={88} />
              </View>

              {/* XP + Balance row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(balance)}</Text>
                  <Text style={styles.statLabel}>Saldo do ciclo</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{xp} XP</Text>
                  <Text style={styles.statLabel}>Nível {level}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{completed}/{total}</Text>
                  <Text style={styles.statLabel}>Hoje</Text>
                </View>
              </View>

              {/* Daily progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                </View>
                <Text style={styles.progressText}>
                  {total === 0 ? 'Nenhuma tarefa' : completed === total ? '🎉 Dia completo!' : `${completed} de ${total} concluídas`}
                </Text>
              </View>
            </LinearGradient>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {missions.length > 0 ? 'Missões de hoje' : 'Sem missões hoje'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐷</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem missões!</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              O responsável ainda não criou tarefas. Aguarde!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            mission={item}
            onPress={() => router.push(`/submit/${item.task.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {},
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 22, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cofriContainer: { alignItems: 'center', paddingVertical: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 18, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  progressSection: { gap: 6 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F6C90E', borderRadius: 4 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium' },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', paddingHorizontal: 16, paddingTop: 20, marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
