import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { AppSheet } from '@/components/AppSheet';
import { ProofPhoto } from '@/components/ProofPhoto';
import { bottomInset, cardShadow, layout, topInset } from '@/constants/layout';
import { formatCurrency, formatDate } from '@/types';

export default function ReviewSubmissionScreen() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const { submissions, tasks, children, reviewSubmission, reviewAppeal } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [partialAmount, setPartialAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const submission = submissions.find(s => s.id === submissionId);
  const task = tasks.find(t => t.id === submission?.taskId);
  const child = children.find(c => c.id === submission?.childId);

  const isAppeal = submission?.status === 'appealed';
  const isResolved = submission?.status === 'approved' || submission?.status === 'partial' ||
    submission?.status === 'rejected' || submission?.status === 'appeal_rejected';

  const topPad = topInset(insets.top);
  const botPad = bottomInset(insets.bottom);

  const handleApprove = async () => {
    if (!submissionId || !task) return;
    setLoading(true);
    try {
      if (isAppeal) {
        await reviewAppeal(submissionId, true);
      } else {
        await reviewSubmission(submissionId, 'approved', task.rewardCents);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      // error already surfaced by context
    } finally {
      setLoading(false);
    }
  };

  const handlePartialApprove = async () => {
    if (!submissionId) return;
    const amount = Math.round(parseFloat(partialAmount.replace(',', '.')) * 100);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Atenção', 'Digite um valor válido.'); return; }
    setLoading(true);
    try {
      await reviewSubmission(submissionId, 'partial', amount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPartialModal(false);
      router.back();
    } catch {
      // error already surfaced by context
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!submissionId) return;
    setLoading(true);
    try {
      if (isAppeal) {
        await reviewAppeal(submissionId, false, rejectNote);
      } else {
        await reviewSubmission(submissionId, 'rejected', 0, rejectNote);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowRejectModal(false);
      router.back();
    } catch {
      // error already surfaced by context
    } finally {
      setLoading(false);
    }
  };

  if (!submission || !task || !child) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Submissão não encontrada.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isAppeal ? 'Avaliar Recurso' : 'Validar Tarefa'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 120 }]}>
        {/* Photo */}
        <ProofPhoto
          uri={submission.photoUri}
          style={styles.photo}
          accessibilityLabel="Foto de comprovação da tarefa"
          emptyLabel={submission.photoUri ? 'Não foi possível carregar a foto' : 'Sem foto'}
          iconSize={48}
        />

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-done" size={18} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Tarefa</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{task.title}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Quem</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{child.name}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Data</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDate(submission.submittedForDate)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={18} color={colors.accent} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Valor</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>{formatCurrency(task.rewardCents)}</Text>
          </View>
        </View>

        {/* Appeal info */}
        {isAppeal && submission.appealText && (
          <View style={[styles.appealCard, { backgroundColor: colors.muted, borderColor: colors.xp }]}>
            <View style={styles.appealHeader}>
              <Ionicons name="alert-circle" size={18} color={colors.xp} />
              <Text style={[styles.appealTitle, { color: colors.xp }]}>Recurso do(a) adolescente</Text>
            </View>
            <Text style={[styles.appealText, { color: colors.foreground }]}>{submission.appealText}</Text>
          </View>
        )}

        {/* Review note */}
        {submission.reviewNote && !isAppeal && (
          <View style={[styles.noteCard, { backgroundColor: colors.muted }]}>
            <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>Observação anterior:</Text>
            <Text style={[styles.noteText, { color: colors.foreground }]}>{submission.reviewNote}</Text>
          </View>
        )}

        {/* Already resolved */}
        {isResolved && !isAppeal && (
          <View style={[styles.resolvedBadge, { backgroundColor: colors.successBackground }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.resolvedText, { color: colors.success }]}>Esta tarefa já foi avaliada.</Text>
          </View>
        )}
      </ScrollView>

      {/* Action buttons (fixed bottom) */}
      {(!isResolved || isAppeal) && (
        <View style={[styles.actions, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 16 }]}>
          {!isAppeal && (
            <TouchableOpacity
              style={[styles.partialBtn, { borderColor: colors.warning }]}
              onPress={() => setShowPartialModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="remove-circle" size={20} color={colors.warning} />
              <Text style={[styles.partialText, { color: colors.warning }]}>Parcial</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
              style={[styles.rejectBtn, { backgroundColor: colors.destructiveBackground, borderColor: colors.destructive }]}
            onPress={() => setShowRejectModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={20} color={colors.destructive} />
            <Text style={[styles.rejectText, { color: colors.destructive }]}>Reprovar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: colors.success }]}
            onPress={handleApprove}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.approveText}>{formatCurrency(task.rewardCents)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Sheet */}
      <AppSheet
        visible={showRejectModal}
        title="Reprovar"
        onClose={() => setShowRejectModal(false)}
        actionLabel="Confirmar"
        actionColor={colors.destructive}
        actionDisabled={loading}
        onAction={handleReject}
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Motivo (opcional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: A louça ainda estava suja..."
              placeholderTextColor={colors.mutedForeground}
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              numberOfLines={4}
            />
        </ScrollView>
      </AppSheet>

      {/* Partial Sheet */}
      <AppSheet
        visible={showPartialModal}
        title="Aprovação Parcial"
        onClose={() => setShowPartialModal(false)}
        actionLabel="Aprovar"
        actionColor={colors.warning}
        actionDisabled={loading}
        onAction={handlePartialApprove}
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Valor a pagar (R$)</Text>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
              Valor total: {formatCurrency(task.rewardCents)}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: 2,50"
              placeholderTextColor={colors.mutedForeground}
              value={partialAmount}
              onChangeText={setPartialAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
        </ScrollView>
      </AppSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.spacing.screen,
    paddingBottom: layout.spacing.headerBottom, borderBottomWidth: 1, gap: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  content: { gap: 12 },
  photo: { width: '100%', height: 300 },
  infoCard: { marginHorizontal: 16, borderRadius: layout.radius.card, borderWidth: 1, overflow: 'hidden', ...cardShadow },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  infoLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', width: 52 },
  infoValue: { flex: 1, fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  divider: { height: 1, marginHorizontal: 14 },
  appealCard: { marginHorizontal: 16, borderRadius: layout.radius.medium, borderWidth: 1.5, padding: 14, gap: 8, ...cardShadow },
  appealHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appealTitle: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  appealText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  noteCard: { marginHorizontal: 16, borderRadius: layout.radius.medium, padding: 14, gap: 4, ...cardShadow },
  noteLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  noteText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  resolvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16,
    padding: 14, borderRadius: layout.radius.medium,
  },
  resolvedText: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, paddingTop: 12, gap: 10, borderTopWidth: 1,
  },
  partialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  partialText: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  rejectText: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  approveBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
  },
  approveText: { fontSize: 15, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  sheetContent: { padding: layout.spacing.headerHorizontal, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  fieldHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  textArea: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: 'Inter_400Regular', minHeight: 120, textAlignVertical: 'top',
  },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
});
