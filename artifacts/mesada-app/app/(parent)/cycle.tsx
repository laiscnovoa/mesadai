import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { formatCurrency, formatDate } from '@/types';

export default function CycleScreen() {
  const {
    family, children, submissions, tasks,
    getChildBalance, getCycleDay, getCycleEndDate,
    closeCycle, addChild,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildNickname, setNewChildNickname] = useState('');

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const cycleDay = getCycleDay();
  const cycleEnd = getCycleEndDate();
  const cycleProgress = family ? Math.min(1, cycleDay / family.cycleLength) : 0;

  const handleCloseCycle = () => {
    Alert.alert(
      'Fechar ciclo',
      'Isso encerrará o ciclo atual e iniciará um novo. O histórico será mantido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar ciclo',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            closeCycle();
          },
        },
      ]
    );
  };

  const handleAddChild = () => {
    if (!newChildName.trim() || !newChildNickname.trim()) {
      Alert.alert('Atenção', 'Preencha nome e apelido.');
      return;
    }
    const exists = children.find(c => c.nickname === newChildNickname.toLowerCase().trim());
    if (exists) {
      Alert.alert('Atenção', 'Já existe um(a) filho(a) com esse apelido.');
      return;
    }
    addChild(newChildName, newChildNickname);
    setNewChildName('');
    setNewChildNickname('');
    setShowAddChild(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ciclo</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cycle Progress Card */}
        <View style={[styles.card, { backgroundColor: colors.primary }]}>
          <Text style={styles.cardTitle}>Ciclo atual</Text>
          {family && (
            <Text style={styles.cardDates}>
              {formatDate(family.cycleStartDate)} → {cycleEnd ? formatDate(cycleEnd.toISOString().split('T')[0]) : '-'}
            </Text>
          )}
          <View style={styles.cycleProgress}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(cycleProgress * 100)}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>
              Dia {cycleDay} de {family?.cycleLength ?? '-'}
            </Text>
          </View>
          <Text style={styles.durationLabel}>{family?.cycleLength} dias de duração</Text>
        </View>

        {/* Crianças e saldos */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saldo por filho(a)</Text>
        {children.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum filho cadastrado.</Text>
          </View>
        ) : (
          children.map(child => {
            const balance = getChildBalance(child.id);
            const approved = submissions.filter(s => s.childId === child.id && (s.status === 'approved' || s.status === 'partial')).length;
            return (
              <View key={child.id} style={[styles.childCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.childAvatar, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                </View>
                <View style={styles.childInfo}>
                  <Text style={[styles.childName, { color: colors.foreground }]}>{child.name}</Text>
                  <Text style={[styles.childNick, { color: colors.mutedForeground }]}>@{child.nickname}</Text>
                </View>
                <View style={styles.childStats}>
                  <Text style={[styles.childBalance, { color: colors.primary }]}>{formatCurrency(balance)}</Text>
                  <Text style={[styles.childTasks, { color: colors.mutedForeground }]}>{approved} tarefa{approved !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* Add child */}
        {children.length < 3 && (
          showAddChild ? (
            <View style={[styles.addChildCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome completo</Text>
              <View style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddChild}
              >
                <Text style={styles.confirmBtnText}>Adicionar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddChild(false)}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addChildBtn, { borderColor: colors.primary }]}
              onPress={() => setShowAddChild(true)}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={[styles.addChildText, { color: colors.primary }]}>Adicionar filho(a)</Text>
            </TouchableOpacity>
          )
        )}

        {/* PIN Info */}
        {family && (
          <View style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="key" size={22} color={colors.accent} />
            <View style={styles.pinInfo}>
              <Text style={[styles.pinLabel, { color: colors.foreground }]}>PIN do adolescente</Text>
              <Text style={[styles.pinValue, { color: colors.primary }]}>{family.pin}</Text>
            </View>
          </View>
        )}

        {/* Close cycle button */}
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}
          onPress={handleCloseCycle}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle" size={22} color={colors.destructive} />
          <Text style={[styles.closeBtnText, { color: colors.destructive }]}>Fechar ciclo e iniciar novo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 20, padding: 20, gap: 8 },
  cardTitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_500Medium' },
  cardDates: { fontSize: 16, fontWeight: '600' as const, color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  cycleProgress: { gap: 8 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 4 },
  progressLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_500Medium' },
  durationLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', marginTop: 4 },
  emptyCard: { borderRadius: 14, padding: 20, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  childCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  childAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  childNick: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  childStats: { alignItems: 'flex-end', gap: 2 },
  childBalance: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  childTasks: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  addChildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
  },
  addChildText: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  addChildCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, borderWidth: 1, gap: 8 },
  confirmBtn: { borderRadius: 12, padding: 12, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  cancelText: { textAlign: 'center', fontSize: 14, fontFamily: 'Inter_400Regular' },
  pinCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  pinInfo: { flex: 1 },
  pinLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  pinValue: { fontSize: 28, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', letterSpacing: 6 },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 8,
  },
  closeBtnText: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
});
