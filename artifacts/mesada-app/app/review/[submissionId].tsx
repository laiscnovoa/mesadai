import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Image, ScrollView, TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
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

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const handleApprove = async () => {
    if (!submissionId || !task) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    if (isAppeal) {
      reviewAppeal(submissionId, true);
    } else {
      reviewSubmission(submissionId, 'approved', task.rewardCents);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    router.back();
  };

  const handlePartialApprove = async () => {
    if (!submissionId) return;
    const amount = Math.round(parseFloat(partialAmount.replace(',', '.')) * 100);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Atenção', 'Digite um valor válido.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    reviewSubmission(submissionId, 'partial', amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    setShowPartialModal(false);
    router.back();
  };

  const handleReject = async () => {
    if (!submissionId) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    if (isAppeal) {
      reviewAppeal(submissionId, false, rejectNote);
    } else {
      reviewSubmission(submissionId, 'rejected', 0, rejectNote);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setLoading(false);
    setShowRejectModal(false);
    router.back();
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
        {submission.photoUri ? (
          <Image source={{ uri: submission.photoUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="image-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.noPhotoText, { color: colors.mutedForeground }]}>Sem foto</Text>
          </View>
        )}

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
            <Ionicons name="cash" size={18} color="#F6C90E" />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Valor</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>{formatCurrency(task.rewardCents)}</Text>
          </View>
        </View>

        {/* Appeal info */}
        {isAppeal && submission.appealText && (
          <View style={[styles.appealCard, { backgroundColor: '#F5F3FF', borderColor: colors.xp }]}>
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
          <View style={[styles.resolvedBadge, { backgroundColor: colors.success + '20' }]}>
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
            style={[styles.rejectBtn, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive }]}
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

      {/* Reject Modal */}
      <Modal visible={showRejectModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRejectModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowRejectModal(false)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Reprovar</Text>
            <TouchableOpacity onPress={handleReject} disabled={loading}>
              <Text style={[styles.confirmText, { color: colors.destructive }]}>Confirmar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>

      {/* Partial Modal */}
      <Modal visible={showPartialModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPartialModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPartialModal(false)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Aprovação Parcial</Text>
            <TouchableOpacity onPress={handlePartialApprove} disabled={loading}>
              <Text style={[styles.confirmText, { color: colors.warning }]}>Aprovar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingBottom: 14, borderBottomWidth: 1, gap: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  content: { gap: 12 },
  photo: { width: '100%', height: 300 },
  photoPlaceholder: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noPhotoText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  infoCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  infoLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', width: 52 },
  infoValue: { flex: 1, fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  divider: { height: 1, marginHorizontal: 14 },
  appealCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 8 },
  appealHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appealTitle: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  appealText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  noteCard: { marginHorizontal: 16, borderRadius: 12, padding: 14, gap: 4 },
  noteLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  noteText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  resolvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16,
    padding: 14, borderRadius: 14,
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
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20, borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  confirmText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modalContent: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  fieldHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  textArea: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: 'Inter_400Regular', minHeight: 120, textAlignVertical: 'top',
  },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
});
