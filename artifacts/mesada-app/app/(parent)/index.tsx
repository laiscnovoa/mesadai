import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { SubmissionCard } from '@/components/SubmissionCard';
import { formatDate, formatCurrency } from '@/types';

export default function ParentDashboard() {
  const {
    family, children, getPendingSubmissions, getChildBalance,
    getCycleDay, getCycleEndDate, logout, currentRole,
  } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (currentRole !== 'parent') router.replace('/');
  }, [currentRole]);

  const pending = getPendingSubmissions();
  const cycleDay = getCycleDay();
  const cycleEnd = getCycleEndDate();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Olá, {family?.parentName ?? 'Responsável'}</Text>
            <Text style={styles.headerFamily}>{family?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => { logout(); router.replace('/'); }} style={styles.logoutBtn} testID="parent-home-btn">
            <Ionicons name="home" size={18} color="#ffffff" />
            <Text style={styles.logoutText}>Início</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cycleDay}</Text>
            <Text style={styles.statLabel}>Dia do ciclo</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {cycleEnd ? Math.max(0, Math.ceil((cycleEnd.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))) : '-'}
            </Text>
            <Text style={styles.statLabel}>Dias restantes</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pending.length}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        {cycleEnd && (
          <Text style={styles.cycleEnd}>Ciclo termina em {formatDate(cycleEnd.toISOString().split('T')[0])}</Text>
        )}
      </View>

      {/* Saldo por filho */}
      {children.length > 0 && (
        <View style={[styles.balanceRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {children.map(child => (
            <View key={child.id} style={styles.balanceItem}>
              <Text style={[styles.balanceName, { color: colors.mutedForeground }]} numberOfLines={1}>{child.name}</Text>
              <Text style={[styles.balanceValue, { color: colors.primary }]}>
                {formatCurrency(getChildBalance(child.id))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Pending list */}
      <FlatList
        data={pending}
        keyExtractor={item => item.submission.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100 },
        ]}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {pending.length > 0 ? `Para validar (${pending.length})` : 'Nada para validar'}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Tudo em dia!</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Nenhuma tarefa aguardando validação.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SubmissionCard
            item={item}
            onPress={() => router.push(`/review/${item.submission.id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  headerFamily: { fontSize: 22, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoutText: { color: '#ffffff', fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 12 },
  statCard: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 22, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular' },
  cycleEnd: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
  balanceRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, gap: 16,
  },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceName: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  balanceValue: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  list: { paddingTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', paddingHorizontal: 16, marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
