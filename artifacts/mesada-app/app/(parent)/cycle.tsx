import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { formatCurrency, formatDate } from '@/types';
import { AppSheet } from '@/components/AppSheet';
import { bottomInset, cardShadow, layout, topInset } from '@/constants/layout';

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
    closeCycle, addChild, createPairingCode,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildNickname, setNewChildNickname] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [newEndDateInput, setNewEndDateInput] = useState('');
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string; childName: string } | null>(null);

  const topPad = topInset(insets.top);
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
    void addChild(newChildName, newChildNickname);
    setNewChildName('');
    setNewChildNickname('');
    setShowAddChild(false);
  };

  const generateCodeForChild = async (childId: string, childName: string) => {
    const result = await createPairingCode(childId);
    if (!result) return;
    await Clipboard.setStringAsync(result.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPairing({ ...result, childName });
  };

  const sharePairingCode = async () => {
    if (!pairing) return;
    await Share.share({
      message: `Código de pareamento do MesadAI para ${pairing.childName}: ${pairing.code}\n\nDigite este código no celular do adolescente. Ele expira em alguns minutos.`,
    });
  };

  const handlePairDevice = () => {
    if (children.length === 0) {
      Alert.alert('Atenção', 'Adicione um(a) filho(a) primeiro.');
      return;
    }
    if (children.length === 1) {
      void generateCodeForChild(children[0].id, children[0].name);
      return;
    }
    Alert.alert(
      'Parear dispositivo',
      'Para qual filho(a) você quer gerar o código?',
      [
        ...children.map(c => ({ text: c.name, onPress: () => { void generateCodeForChild(c.id, c.name); } })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ciclo</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset(insets.bottom) + 100 }]}
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
                  <Ionicons name="wallet-outline" size={22} color={colors.secondaryForeground} />
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
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trophy-outline" size={19} color={colors.warning} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bônus Ativos</Text>
              </View>
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
                      <Ionicons name="wallet-outline" size={19} color={colors.secondaryForeground} />
                    </View>
                    <View style={styles.betCardInfo}>
                      <Text style={[styles.betChildName, { color: colors.foreground }]}>{child.name}</Text>
                      <View style={styles.betMetaRow}>
                        <Text style={[styles.betMeta, { color: colors.mutedForeground }]}>
                          {bet.durationDays} dias · +{bet.bonusPercent}% ·
                        </Text>
                        <Ionicons name="flame" size={12} color={colors.streak} />
                        <Text style={[styles.betMeta, { color: colors.mutedForeground }]}>streak {streak}</Text>
                      </View>
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
                  <View style={[styles.resolvedIcon, { backgroundColor: won ? colors.successBackground : colors.destructiveBackground }]}>
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
            <TouchableOpacity
              style={[styles.addChildBtn, { borderColor: colors.primary }]}
              onPress={() => setShowAddChild(true)}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={[styles.addChildText, { color: colors.primary }]}>Adicionar filho(a)</Text>
            </TouchableOpacity>
        )}

        {/* Pair device */}
        {family && (
          <TouchableOpacity
            style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handlePairDevice}
            activeOpacity={0.8}
          >
            <Ionicons name="phone-portrait-outline" size={22} color={colors.accent} />
            <View style={styles.pinInfo}>
              <Text style={[styles.pinLabel, { color: colors.foreground }]}>Parear dispositivo do adolescente</Text>
              <Text style={[styles.pinValue, { color: colors.mutedForeground, fontSize: 13, fontWeight: '400' }]}>
                Gere um código para o celular do(a) filho(a)
              </Text>
            </View>
            <View style={styles.copyChip}>
              <Ionicons name="qr-code-outline" size={16} color={colors.mutedForeground} />
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

      <AppSheet
        visible={pairing !== null}
        title="Parear adolescente"
        onClose={() => setPairing(null)}
      >
          {pairing && (
            <ScrollView contentContainerStyle={styles.pairingModalContent}>
              <Ionicons name="qr-code-outline" size={44} color={colors.primary} />
              <Text style={[styles.pairingTitle, { color: colors.foreground }]}>
                Escaneie este código
              </Text>
              <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
                No celular de {pairing.childName}, abra “Sou Adolescente” e toque em “Ler QR Code”.
              </Text>
              <View style={[styles.qrFrame, { backgroundColor: '#ffffff', borderColor: colors.border }]}>
                <QRCode
                  value={pairing.code}
                  size={210}
                  color="#101820"
                  backgroundColor="#ffffff"
                  ecl="H"
                  quietZone={12}
                />
              </View>
              <Text style={[styles.fallbackLabel, { color: colors.mutedForeground }]}>
                Ou digite o código no outro celular
              </Text>
              <Text style={[styles.pairingCode, { color: colors.primary }]}>{pairing.code}</Text>
              <Text style={[styles.expiryText, { color: colors.mutedForeground }]}>
                O código foi copiado automaticamente e expira em alguns minutos.
              </Text>
              <TouchableOpacity
                style={[styles.sharePairingBtn, { backgroundColor: colors.primary }]}
                onPress={() => { void sharePairingCode(); }}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={20} color="#ffffff" />
                <Text style={styles.sharePairingText}>Compartilhar código</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.copyPairingBtn, { borderColor: colors.border }]}
                onPress={() => {
                  void Clipboard.setStringAsync(pairing.code);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Código copiado', 'O código está pronto para ser enviado.');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="copy-outline" size={19} color={colors.primary} />
                <Text style={[styles.copyPairingText, { color: colors.primary }]}>Copiar novamente</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
      </AppSheet>

      <AppSheet
        visible={showCloseModal}
        title="Novo ciclo"
        onClose={() => setShowCloseModal(false)}
        actionLabel="Confirmar"
        onAction={handleConfirmClose}
      >
          <View style={styles.modalContent}>
            <Ionicons name="refresh-circle-outline" size={48} color={colors.primary} style={styles.modalIcon} />
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
      </AppSheet>

      <AppSheet
        visible={showAddChild}
        title="Adicionar filho(a)"
        onClose={() => setShowAddChild(false)}
        actionLabel="Adicionar"
        onAction={handleAddChild}
      >
        <View style={styles.addChildSheetContent}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome completo</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: João"
            placeholderTextColor={colors.mutedForeground}
            value={newChildName}
            onChangeText={setNewChildName}
            autoFocus
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
        </View>
      </AppSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: layout.radius.large, padding: 20, gap: 10, ...cardShadow },
  cardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_500Medium' },
  cardDates: { fontSize: 16, fontWeight: '600' as const, color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 4 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  progressDay: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium' },
  progressLeft: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', marginTop: 4 },
  emptyCard: { borderRadius: layout.radius.card, padding: 20, borderWidth: 1, alignItems: 'center', ...cardShadow },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  childCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: layout.radius.card, borderWidth: 1,
    ...cardShadow,
  },
  childAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  childNick: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  childStats: { alignItems: 'flex-end', gap: 2 },
  childBalance: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  childTasks: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  betSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  betNone: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  betCard: {
    borderRadius: layout.radius.card, borderWidth: 1.5, padding: 14, gap: 10,
    ...cardShadow,
  },
  betCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  betAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  betCardInfo: { flex: 1 },
  betChildName: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  betMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  betMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  betCardRight: { alignItems: 'flex-end', gap: 2 },
  betBonus: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  betDaysLeft: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  betProgressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  betProgressFill: { height: '100%', borderRadius: 4 },
  betProgressLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  betHistToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  resolvedBetCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: layout.radius.card, borderWidth: 1.5, gap: 10,
    ...cardShadow,
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
    gap: 8, padding: 14, borderRadius: layout.radius.card, borderWidth: 1.5, borderStyle: 'dashed',
  },
  addChildText: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  addChildSheetContent: { padding: 20, paddingBottom: 28, gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  pinCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: layout.radius.card, borderWidth: 1, gap: 14,
    ...cardShadow,
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
    gap: 10, padding: 16, borderRadius: layout.radius.card, borderWidth: 1.5, marginTop: 8,
  },
  closeBtnText: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modalContent: { padding: 24, gap: 12, alignItems: 'stretch' },
  modalIcon: { alignSelf: 'center' },
  modalDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  pairingModalContent: { alignItems: 'center', padding: 24, gap: 12 },
  pairingTitle: { fontSize: 24, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  qrFrame: { padding: 18, borderRadius: 20, borderWidth: 1, marginVertical: 8 },
  fallbackLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 },
  pairingCode: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 8, fontFamily: 'Inter_700Bold' },
  expiryText: { fontSize: 12, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  sharePairingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, marginTop: 8, width: '100%',
  },
  sharePairingText: { color: '#ffffff', fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  copyPairingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1.5, width: '100%',
  },
  copyPairingText: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
});
