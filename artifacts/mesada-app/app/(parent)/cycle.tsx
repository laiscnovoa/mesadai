import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { formatCurrency, formatDate } from '@/types';

function parseDateBR(digits: string): string | null {
  if (digits.length !== 8) return null;
  const day = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const year = parseInt(digits.slice(4, 8), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2024) return null;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const d = new Date(iso + 'T00:00:00');
  if (d.getDate() !== day || d.getMonth() + 1 !== month) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d <= today) return null;
  return iso;
}

function fmtDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function CycleScreen() {
  const {
    family, children, submissions, streakBets,
    getChildBalance, getChildStreak, getCycleDay, getCycleEndDate,
    closeCycle, addChild,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildNickname, setNewChildNickname] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [newEndDateInput, setNewEndDateInput] = useState('');
  const [showBetHistory, setShowBetHistory] = useState(false);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const cycleDay = getCycleDay();
  const cycleEnd = getCycleEndDate();

  const totalDays = family && cycleEnd
    ? Math.max(1, Math.ceil((cycleEnd.getTime() - new Date(family.cycleStartDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const daysLeft = cycleEnd
    ? Math.max(0, Math.ceil((cycleEnd.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
    : 0;
  const cycleProgress = totalDays > 0 ? Math.min(1, cycleDay / totalDays) : 0;

  const activeBets = streakBets.filter(b => b.status === 'active');
  const resolvedBets = streakBets.filter(b => b.status !== 'active')
    .sort((a, b) => new Date(b.resolvedAt ?? '').getTime() - new Date(a.resolvedAt ?? '').getTime());

  const handleCloseCycle = () => {
    setNewEndDateInput('');
    setShowCloseModal(true);
  };

  const handleConfirmClose = () => {
    const digits = newEndDateInput.replace(/\D/g, '').slice(0, 8);
    const iso = parseDateBR(digits);
    if (!iso) {
      Alert.alert('Data inválida', 'Informe uma data futura válida no formato DD/MM/AAAA.');
      return;
    }
    Alert.alert(
      'Fechar ciclo',
      'Isso encerrará o ciclo atual e iniciará um novo. O histórico será mantido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            closeCycle(iso);
            setShowCloseModal(false);
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cycle Progress Card */}
        <View style={[styles.card, { backgroundColor: colors.primary }]}>
          <Text style={styles.cardLabel}>Ciclo atual</Text>
          {family && (
            <Text style={styles.cardDates}>
              {formatDate(family.cycleStartDate)} → {cycleEnd ? formatDate(cycleEnd.toISOString().split('T')[0]) : '-'}
            </Text>
          )}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round(cycleProgress * 100)}%` as any }]} />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressDay}>Dia {cycleDay} de {totalDays}</Text>
            <Text style={styles.progressLeft}>
              {daysLeft === 0 ? 'Encerra hoje!' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        {/* Saldo por filho */}
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
                  <Text style={styles.childEmoji}>🐷</Text>
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

        {/* Apostas Ativas */}
        {children.length > 0 && (
          <>
            <View style={styles.betSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🎯 Bônus Ativos</Text>
              {activeBets.length === 0 && (
                <Text style={[styles.betNone, { color: colors.mutedForeground }]}>Nenhum bônus ativo</Text>
              )}
            </View>
            {activeBets.map(bet => {
              const child = children.find(c => c.id === bet.childId);
              if (!child) return null;
              const streak = getChildStreak(child.id);
              const balance = getChildBalance(child.id);
              const daysCompleted = Math.min(Math.max(0, streak - bet.startStreak), bet.durationDays);
              const daysLeft = Math.max(0, bet.durationDays - daysCompleted);
              const bonusEstimate = Math.round(balance * bet.bonusPercent / 100);
              const progress = daysCompleted / bet.durationDays;
              return (
                <View key={bet.id} style={[styles.betCard, { backgroundColor: colors.card, borderColor: colors.streak }]}>
                  <View style={styles.betCardTop}>
                    <View style={[styles.betAvatar, { backgroundColor: colors.secondary }]}>
                      <Text style={styles.betAvatarEmoji}>🐷</Text>
                    </View>
                    <View style={styles.betCardInfo}>
                      <Text style={[styles.betChildName, { color: colors.foreground }]}>{child.name}</Text>
                      <Text style={[styles.betMeta, { color: colors.mutedForeground }]}>
                        {bet.durationDays} dias · +{bet.bonusPercent}% · 🔥 streak {streak}
                      </Text>
                    </View>
                    <View style={styles.betCardRight}>
                      <Text style={[styles.betBonus, { color: colors.success }]}>{formatCurrency(bonusEstimate)}</Text>
                      <Text style={[styles.betDaysLeft, { color: colors.mutedForeground }]}>
                        {daysLeft === 0 ? 'Concluído!' : `${daysLeft}d restantes`}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.betProgressBg, { backgroundColor: colors.muted }]}>
                    <View style={[styles.betProgressFill, {
                      width: `${Math.round(progress * 100)}%` as any,
                      backgroundColor: colors.streak,
                    }]} />
                  </View>
                  <Text style={[styles.betProgressLabel, { color: colors.mutedForeground }]}>
                    {daysCompleted} / {bet.durationDays} dias
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* Histórico de apostas (colapsável) */}
        {resolvedBets.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.betHistToggle}
              onPress={() => setShowBetHistory(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Histórico de Bônus</Text>
              <Ionicons
                name={showBetHistory ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {showBetHistory && resolvedBets.map(bet => {
              const child = children.find(c => c.id === bet.childId);
              const won = bet.status === 'won';
              return (
                <View
                  key={bet.id}
                  style={[styles.resolvedBetCard, {
                    backgroundColor: colors.card,
                    borderColor: won ? colors.success : colors.rejected,
                  }]}
                >
                  <View style={[styles.resolvedIcon, { backgroundColor: won ? '#F0FFF4' : '#FFF0F0' }]}>
                    <Ionicons name={won ? 'trophy' : 'close-circle'} size={18} color={won ? colors.success : colors.destructive} />
                  </View>
                  <View style={styles.resolvedInfo}>
                    <Text style={[styles.resolvedChild, { color: colors.foreground }]}>
                      {child?.name ?? '—'} · {bet.durationDays} dias
                    </Text>
                    <Text style={[styles.resolvedDate, { color: colors.mutedForeground }]}>
                      {bet.resolvedAt ? formatDate(bet.resolvedAt.split('T')[0]) : '—'}
                    </Text>
                  </View>
                  <View style={styles.resolvedRight}>
                    <Text style={[styles.resolvedStatus, { color: won ? colors.success : colors.destructive }]}>
                      {won ? 'Ganhou' : 'Perdeu'}
                    </Text>
                    {won && bet.bonusCentsAwarded > 0 && (
                      <Text style={[styles.resolvedBonus, { color: colors.success }]}>+{formatCurrency(bet.bonusCentsAwarded)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Add child */}
        {children.length < 3 && (
          showAddChild ? (
            <View style={[styles.addChildCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome completo</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Ex: João"
                placeholderTextColor={colors.mutedForeground}
                value={newChildName}
                onChangeText={setNewChildName}
              />
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Apelido (para login)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Ex: joaozinho"
                placeholderTextColor={colors.mutedForeground}
                value={newChildNickname}
                onChangeText={setNewChildNickname}
                autoCapitalize="none"
              />
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
          <TouchableOpacity
            style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={async () => {
              await Clipboard.setStringAsync(family.pin);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('PIN copiado!', 'Cole onde precisar compartilhar com o adolescente ou outro responsável.');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="key" size={22} color={colors.accent} />
            <View style={styles.pinInfo}>
              <Text style={[styles.pinLabel, { color: colors.foreground }]}>PIN do adolescente</Text>
              <Text style={[styles.pinValue, { color: colors.primary }]}>{family.pin}</Text>
            </View>
            <View style={styles.copyChip}>
              <Ionicons name="copy-outline" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
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

      {/* Close Cycle Modal */}
      <Modal visible={showCloseModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCloseModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCloseModal(false)}>
              <Text style={[styles.cancelTxt, { color: colors.mutedForeground }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo ciclo</Text>
            <TouchableOpacity onPress={handleConfirmClose}>
              <Text style={[styles.saveTxt, { color: colors.primary }]}>Confirmar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🔄</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              O ciclo atual será encerrado e um novo começa hoje. Escolha a data de encerramento do próximo ciclo.
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Data de encerramento</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.mutedForeground}
              value={newEndDateInput}
              onChangeText={v => setNewEndDateInput(fmtDateInput(v))}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 20, padding: 20, gap: 10 },
  cardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_500Medium' },
  cardDates: { fontSize: 16, fontWeight: '600' as const, color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 4 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  progressDay: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium' },
  progressLeft: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', marginTop: 4 },
  emptyCard: { borderRadius: 14, padding: 20, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  childCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  childAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  childEmoji: { fontSize: 24 },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  childNick: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  childStats: { alignItems: 'flex-end', gap: 2 },
  childBalance: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  childTasks: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  betSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  betNone: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  betCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  betCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  betAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  betAvatarEmoji: { fontSize: 20 },
  betCardInfo: { flex: 1 },
  betChildName: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  betMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  betCardRight: { alignItems: 'flex-end', gap: 2 },
  betBonus: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  betDaysLeft: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  betProgressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  betProgressFill: { height: '100%', borderRadius: 4 },
  betProgressLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  betHistToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  resolvedBetCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 10,
  },
  resolvedIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resolvedInfo: { flex: 1 },
  resolvedChild: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  resolvedDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  resolvedRight: { alignItems: 'flex-end', gap: 2 },
  resolvedStatus: { fontSize: 13, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  resolvedBonus: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  addChildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
  },
  addChildText: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  addChildCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
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
  copyChip: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 8,
  },
  closeBtnText: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20, borderBottomWidth: 1,
  },
  cancelTxt: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  saveTxt: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modalContent: { padding: 24, gap: 12, alignItems: 'stretch' },
  modalEmoji: { fontSize: 48, textAlign: 'center' },
  modalDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
