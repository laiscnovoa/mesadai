import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { formatCurrency } from '@/types';
import { prepareProofPhoto, uploadProofPhoto } from '@/lib/object-storage';
import { ProofPhoto } from '@/components/ProofPhoto';
import { bottomInset, cardShadow, layout, topInset } from '@/constants/layout';

export default function SubmitTaskScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { tasks, submitTask } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();

  const task = tasks.find(t => t.id === taskId);

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Câmera necessária', 'Use o aplicativo no celular para tirar a foto de comprovação.');
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Câmera bloqueada', 'Permita o acesso à câmera nas configurações do celular.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    });
    if (!result.canceled) {
      try {
        const normalizedUri = await prepareProofPhoto(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPhotoUri(normalizedUri);
      } catch {
        Alert.alert('Não foi possível preparar a foto', 'Tire a foto novamente e tente outra vez.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!photoUri) { Alert.alert('Atenção', 'Tire uma foto como comprovação antes de enviar.'); return; }
    if (!taskId) return;
    setLoading(true);
    try {
      const photoUrl = await uploadProofPhoto(photoUri);
      await submitTask(taskId, photoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert(
        'Não foi possível enviar',
        'Verifique sua conexão e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  const topPad = topInset(insets.top);
  const botPad = bottomInset(insets.bottom);

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Tarefa não encontrada.</Text>
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{task.title}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]} keyboardShouldPersistTaps="handled">
        {/* Task details */}
        <View style={[styles.taskInfo, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.taskIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="checkmark-done" size={28} color={colors.primary} />
          </View>
          <View style={styles.taskDetails}>
            <Text style={[styles.taskTitle, { color: colors.foreground }]}>{task.title}</Text>
            {task.description ? (
              <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
            ) : null}
            <View style={[styles.rewardBadge, { backgroundColor: colors.rewardBackground }]}>
              <Ionicons name="cash" size={14} color={colors.accent} />
              <Text style={[styles.rewardText, { color: colors.rewardForeground }]}>{formatCurrency(task.rewardCents)}</Text>
            </View>
          </View>
        </View>

        {/* Photo section */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Foto de comprovação</Text>

        {photoUri ? (
          <View style={styles.photoPreviewContainer}>
            <ProofPhoto
              uri={photoUri}
              style={styles.photoPreview}
              accessibilityLabel="Prévia da foto de comprovação"
              emptyLabel="Não foi possível carregar a foto"
              iconSize={44}
            />
            <TouchableOpacity style={[styles.changePhotoBtn, cardShadow, { backgroundColor: colors.card }]} onPress={takePhoto}>
              <Ionicons name="camera" size={18} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Tirar outra foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.primary }]}
            onPress={takePhoto}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={36} color="#ffffff" />
            <Text style={styles.photoBtnTitle}>Tirar foto agora</Text>
            <Text style={styles.photoBtnSub}>Mostre que você fez a tarefa!</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.hint, { backgroundColor: colors.muted }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Somente fotos tiradas agora são aceitas — galeria e corte não são permitidos.
          </Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          testID="submit-btn"
          style={[styles.submitBtn, { backgroundColor: photoUri ? colors.primary : colors.muted, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!photoUri || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color={photoUri ? '#ffffff' : colors.mutedForeground} />
              <Text style={[styles.submitBtnText, { color: photoUri ? '#ffffff' : colors.mutedForeground }]}>
                Enviar para aprovação
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 20, gap: 16 },
  taskInfo: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderRadius: layout.radius.card, borderWidth: 1, gap: 14,
  },
  taskIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  taskDetails: { flex: 1, gap: 6 },
  taskTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  taskDesc: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  rewardText: { fontSize: 14, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  sectionLabel: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  photoBtn: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 40, borderRadius: 20,
  },
  photoBtnTitle: { fontSize: 18, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  photoBtnSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  photoPreviewContainer: { gap: 10 },
  photoPreview: { width: '100%', height: 240, borderRadius: layout.radius.large },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: layout.radius.medium,
  },
  changePhotoText: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  hintText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 18, paddingVertical: 18,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
});
