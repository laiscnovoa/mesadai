import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { AppSheet } from '@/components/AppSheet';
import { cardShadow, layout, topInset } from '@/constants/layout';

function normalizePairingCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export default function ChildPairingScreen() {
  const { redeemPairingCode } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerLocked, setScannerLocked] = useState(false);

  const connectWithCode = async (value: string) => {
    const normalized = normalizePairingCode(value);
    if (normalized.length !== 6) {
      setError('O código deve ter 6 números.');
      return;
    }
    setLoading(true);
    setError('');
    const ok = await redeemPairingCode(normalized);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(child)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Código inválido ou expirado. Peça um novo ao seu responsável.');
    }
    setLoading(false);
  };

  const handleRedeem = async () => {
    await connectWithCode(code);
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') {
      setError('O leitor de QR Code funciona no aplicativo do celular. Digite o código nesta tela.');
      return;
    }
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) {
        setError(
          nextPermission.canAskAgain
            ? 'Permita o acesso à câmera para ler o QR Code.'
            : 'A câmera está bloqueada. Libere o acesso nas configurações do Android.',
        );
        return;
      }
    }
    setScannerLocked(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scannerLocked || loading) return;
    const scannedCode = normalizePairingCode(data);
    if (scannedCode.length !== 6) {
      setError('Esse QR Code não é um código de pareamento válido.');
      return;
    }
    setScannerLocked(true);
    setScannerVisible(false);
    setCode(scannedCode);
    void connectWithCode(scannedCode);
  };

  const topPad = topInset(insets.top);

  return (
    <LinearGradient colors={[colors.primary, '#00855B']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.topSection, { paddingTop: topPad + 20 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <Ionicons name="star" size={48} color="#F6C90E" />
            </View>
            <Text style={styles.title}>Parear dispositivo</Text>
            <Text style={styles.subtitle}>Escaneie o QR Code ou digite o código que seu responsável gerou</Text>
          </View>

          <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              testID="scan-pairing-btn"
              style={[styles.scanBtn, { backgroundColor: colors.primary }]}
              onPress={() => { void openScanner(); }}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Ionicons name="qr-code-outline" size={22} color="#ffffff" />
              <Text style={styles.scanBtnText}>Ler QR Code</Text>
            </TouchableOpacity>
            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.mutedForeground }]}>ou digite o código</Text>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>Código de 6 números</Text>
            <TextInput
              testID="pairing-code-input"
              style={[styles.codeInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: code.length === 6 ? colors.primary : colors.border }]}
              placeholder="123456"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={v => {
                setCode(normalizePairingCode(v));
                setError('');
              }}
              maxLength={6}
              keyboardType="number-pad"
              inputMode="numeric"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
              textAlign="center"
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              testID="child-pair-btn"
              style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleRedeem}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>{loading ? 'Conectando...' : 'Conectar'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            O código é temporário, vale uma vez e expira após alguns minutos.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppSheet
        visible={scannerVisible}
        title="Ler QR Code"
        onClose={() => setScannerVisible(false)}
        fullScreen
        closeButtonTestID="close-scanner-btn"
      >
        <View style={[styles.scannerModal, { backgroundColor: '#10131A' }]}>
          {permission?.granted ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View pointerEvents="none" style={styles.scannerOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scannerHint}>Aponte para o QR Code mostrado pelo responsável</Text>
              </View>
            </View>
          ) : permission?.canAskAgain === false ? (
            <View style={styles.permissionState}>
              <Ionicons name="camera-outline" size={42} color="#ffffff" />
              <Text style={styles.scannerHint}>Libere o acesso à câmera nas configurações do celular.</Text>
              <TouchableOpacity
                style={[styles.settingsBtn, { backgroundColor: colors.primary }]}
                onPress={() => { void Linking.openSettings(); }}
              >
                <Text style={styles.settingsBtnText}>Abrir configurações</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.permissionState}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.scannerHint}>Solicitando acesso à câmera...</Text>
            </View>
          )}
        </View>
      </AppSheet>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  topSection: { alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingBottom: 32 },
  backBtn: { alignSelf: 'flex-start', padding: 8 },
  logoBox: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', textAlign: 'center' },
  card: { marginHorizontal: 20, borderRadius: layout.radius.sheet, padding: 24, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16 },
  scanBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  codeInput: {
    borderWidth: 2, borderRadius: 14, paddingVertical: 16,
    fontSize: 28, fontWeight: '700' as const, fontFamily: 'Inter_700Bold',
    letterSpacing: 8,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  errorText: { fontSize: 13, flex: 1, fontFamily: 'Inter_400Regular' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginTop: 24, paddingHorizontal: 32, fontFamily: 'Inter_400Regular' },
  scannerModal: { flex: 1 },
  cameraContainer: { flex: 1, overflow: 'hidden' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scanFrame: { width: 250, height: 250, borderWidth: 3, borderColor: '#ffffff', borderRadius: 24, backgroundColor: 'transparent' },
  scannerHint: { color: 'rgba(255,255,255,0.9)', fontSize: 15, textAlign: 'center', fontFamily: 'Inter_500Medium', marginTop: 26 },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  settingsBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  settingsBtnText: { color: '#ffffff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
