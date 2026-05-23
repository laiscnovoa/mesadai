import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { GoalCard } from '@/components/GoalCard';
import { XPBar } from '@/components/XPBar';
import { StreakBadge } from '@/components/StreakBadge';
import { formatCurrency, formatDate } from '@/types';

export default function ProgressScreen() {
  const {
    getCurrentChild, currentChildId, children, goals, submissions, tasks,
    getChildBalance, getChildStreak, getChildXP, getChildLevel,
    addGoal, deleteGoal, submitAppeal,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  const child = getCurrentChild();
  const childId = currentChildId ?? '';
  const balance = getChildBalance(childId);
  const streak = getChildStreak(childId);
  const xp = getChildXP(childId);
  const level = getChildLevel(childId);

  const myGoals = goals.filter(g => g.childId === childId);
  const recentApproved = submissions
    .filter(s => s.childId === childId && (s.status === 'approved' || s.status === 'partial'))
    .sort((a, b) => new Date(b.reviewedAt ?? b.submittedAt).getTime() - new Date(a.reviewedAt ?? a.submittedAt).getTime())
    .slice(0, 5);

  const rejectedWithAppeal = submissions.filter(
    s => s.childId === childId && s.status === 'rejected' &&
      !s.appealText &&
      (Date.now() - new Date(s.reviewedAt ?? s.submittedAt).getTime()) < 48 * 3600 * 1000
  );

  const handleAddGoal = () => {
    if (!goalTitle.trim()) { Alert.alert('Atenção', 'Digite um nome para a meta.'); return; }
    const amount = Math.round(parseFloat(goalAmount.replace(',', '.')) * 100);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Atenção', 'Digite um valor válido.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addGoal(goalTitle.trim(), amount);
    setGoalTitle('');
    setGoalAmount('');
    setShowGoalModal(false);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={[styles.headerGrad, { paddingTop: topPad + 12 }]}>
          <Text style={styles.headerTitle}>Meu Progresso</Text>

          {/* Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo do ciclo</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </View>

          {/* Streak */}
          <View style={styles.streakRow}>
            <StreakBadge streak={streak} large />
            {streak > 0 && <Text style={styles.streakMsg}>Você está em chama!</Text>}
          </View>
        </LinearGradient>

        {/* XP Bar */}
        <XPBar xp={xp} level={level} />

        {/* Streaks da família */}
        {children.length > 1 && (
          <>
            <View style={[styles.sectionHeader, { paddingTop: 16 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🔥 Streaks da família</Text>
            </View>
            <View style={[styles.familyStreaksCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
              {children.map((c, idx) => {
                const s = getChildStreak(c.id);
                const isMe = c.id === childId;
                return (
                  <View key={c.id} style={[styles.siblingStreakRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={styles.streakChildEmoji}>🐷</Text>
                    <Text style={[styles.streakChildName, { color: colors.foreground }]}>
                      {c.name}{isMe ? ' (eu)' : ''}
                    </Text>
                    <View style={styles.streakBadgeRow}>
                      <Text style={[styles.streakCount, { color: s > 0 ? '#FF6B00' : colors.mutedForeground }]}>
                        {s > 0 ? '🔥' : '💤'} {s} dia{s !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Goals section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Metas de poupança</Text>
          <TouchableOpacity
            style={[styles.addGoalBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowGoalModal(true)}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {myGoals.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="star-outline" size={32} color={colors.accent} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Defina uma meta e acompanhe seu progresso!
            </Text>
          </View>
        ) : (
          myGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentBalance={balance}
              onDelete={() => {
                Alert.alert('Remover meta', `Remover "${goal.title}"?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Remover', style: 'destructive', onPress: () => deleteGoal(goal.id) },
                ]);
              }}
            />
          ))
        )}

        {/* Appeals section */}
        {rejectedWithAppeal.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 16, marginTop: 8 }]}>
              Recorrer ({rejectedWithAppeal.length})
            </Text>
            {rejectedWithAppeal.map(sub => {
              const task = tasks.find(t => t.id === sub.taskId);
              return (
                <View key={sub.id} style={[styles.appealCard, { backgroundColor: colors.card, borderColor: colors.rejected }]}>
                  <View style={styles.appealInfo}>
                    <Text style={[styles.appealTask, { color: colors.foreground }]}>{task?.title ?? 'Tarefa'}</Text>
                    <Text style={[styles.appealNote, { color: colors.mutedForeground }]}>{sub.reviewNote ?? 'Sem observação'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.appealBtn, { backgroundColor: colors.xp }]}
                    onPress={() => {
                      Alert.prompt(
                        'Recorrer',
                        'Explique por que merece uma nova avaliação:',
                        (text) => {
                          if (text?.trim()) {
                            submitAppeal(sub.id, text.trim());
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }
                        },
                        'plain-text'
                      );
                    }}
                  >
                    <Text style={styles.appealBtnText}>Recorrer</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Recent approved */}
        {recentApproved.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 16, marginTop: 8 }]}>
              Atividade recente
            </Text>
            {recentApproved.map(sub => {
              const task = tasks.find(t => t.id === sub.taskId);
              return (
                <View key={sub.id} style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.histIcon, { backgroundColor: sub.status === 'approved' ? '#F0FFF4' : '#FFF8E1' }]}>
                    <Ionicons
                      name={sub.status === 'approved' ? 'checkmark-circle' : 'remove-circle'}
                      size={22}
                      color={sub.status === 'approved' ? colors.success : colors.warning}
                    />
                  </View>
                  <View style={styles.histInfo}>
                    <Text style={[styles.histTask, { color: colors.foreground }]} numberOfLines={1}>{task?.title ?? 'Tarefa'}</Text>
                    <Text style={[styles.histDate, { color: colors.mutedForeground }]}>
                      {formatDate(sub.submittedForDate)}
                    </Text>
                  </View>
                  <Text style={[styles.histReward, { color: colors.success }]}>
                    +{formatCurrency(sub.rewardCentsAwarded)}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGoalModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowGoalModal(false)}>
              <Text style={[styles.cancelText, { color: colors.destructive }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nova Meta</Text>
            <TouchableOpacity onPress={handleAddGoal}>
              <Text style={[styles.saveText, { color: colors.primary }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome da meta</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Novo tênis"
              placeholderTextColor={colors.mutedForeground}
              value={goalTitle}
              onChangeText={setGoalTitle}
            />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Valor alvo (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: 200,00"
              placeholderTextColor={colors.mutedForeground}
              value={goalAmount}
              onChangeText={setGoalAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  headerGrad: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  balanceCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular' },
  balanceValue: { fontSize: 38, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold', marginTop: 4 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakMsg: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  addGoalBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyCard: {
    marginHorizontal: 16, borderRadius: 14, padding: 24, borderWidth: 1,
    alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  appealCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 5,
    padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12,
  },
  appealInfo: { flex: 1 },
  appealTask: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  appealNote: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  appealBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  appealBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 4,
    padding: 12, borderRadius: 14, borderWidth: 1, gap: 12,
  },
  histIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  histInfo: { flex: 1 },
  histTask: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  histDate: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  histReward: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20, borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  saveText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modalContent: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
  familyStreaksCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  siblingStreakRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  streakChildEmoji: { fontSize: 22 },
  streakChildName: { flex: 1, fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  streakBadgeRow: {},
  streakCount: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
});
