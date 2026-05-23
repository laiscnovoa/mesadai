import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Image, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { formatCurrency } from '@/types';

export default function SubmitTaskScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { tasks, submitTask } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const task = tasks.find(t => t.id === taskId);

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      pickFromGallery();
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Câmera bloqueada', 'Permita o acesso à câmera nas configurações.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    if (!mediaPermission?.granted && Platform.OS !== 'web') {
      const result = await requestMediaPermission();
      if (!result.granted) {
        Alert.alert('Galeria bloqueada', 'Permita o acesso às fotos nas configurações.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!photoUri) { Alert.alert('Atenção', 'Tire ou selecione uma foto como comprovação.'); return; }
    if (!taskId) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    submitTask(taskId, photoUri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    router.back();
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

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
        <View style={[styles.taskInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.taskIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="checkmark-done" size={28} color={colors.primary} />
          </View>
          <View style={styles.taskDetails}>
            <Text style={[styles.taskTitle, { color: colors.foreground }]}>{task.title}</Text>
            {task.description ? (
              <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
            ) : null}
            <View style={[styles.rewardBadge, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="cash" size={14} color="#F6C90E" />
              <Text style={styles.rewardText}>{formatCurrency(task.rewardCents)}</Text>
            </View>
          </View>
        </View>

        {/* Photo section */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Foto de comprovação</Text>

        {photoUri ? (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <TouchableOpacity style={[styles.changePhotoBtn, { backgroundColor: colors.card }]} onPress={takePhoto}>
              <Ionicons name="camera" size={18} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Trocar foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: colors.primary }]}
              onPress={takePhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={28} color="#ffffff" />
              <Text style={styles.photoBtnText}>Tirar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]}
              onPress={pickFromGallery}
              activeOpacity={0.85}
            >
              <Ionicons name="images" size={28} color={colors.primary} />
              <Text style={[styles.photoBtnText, { color: colors.primary }]}>Da galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.hint, { backgroundColor: colors.muted }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            A foto será enviada ao responsável para aprovação.
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
    borderRadius: 16, borderWidth: 1, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  taskIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  taskDetails: { flex: 1, gap: 6 },
  taskTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  taskDesc: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  rewardText: { fontSize: 14, fontWeight: '700' as const, color: '#B7860B', fontFamily: 'Inter_700Bold' },
  sectionLabel: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  photoActions: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 32, borderRadius: 20,
  },
  photoBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  photoPreviewContainer: { gap: 10 },
  photoPreview: { width: '100%', height: 240, borderRadius: 20 },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
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
