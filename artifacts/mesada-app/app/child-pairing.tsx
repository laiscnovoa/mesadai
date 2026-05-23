import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function ChildPairingScreen() {
  const { loginAsChild, family } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nicknameRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (pin.length !== 6) {
      setError('O PIN deve ter 6 dígitos.');
      return;
    }
    if (!nickname.trim()) {
      setError('Digite seu apelido.');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 300));
    const ok = loginAsChild(pin, nickname);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(child)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('PIN ou apelido incorretos. Verifique com seu responsável.');
    }
    setLoading(false);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.topSection, { paddingTop: topPad + 20 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <Ionicons name="star" size={48} color="#F6C90E" />
            </View>
            <Text style={styles.title}>Entrar com PIN</Text>
            <Text style={styles.subtitle}>Digite o PIN que seu responsável te passou</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>PIN (6 dígitos)</Text>
            <TextInput
              style={[styles.pinInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: pin.length === 6 ? '#7C3AED' : colors.border }]}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              value={pin}
              onChangeText={v => { setPin(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => nicknameRef.current?.focus()}
              textAlign="center"
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Seu apelido</Text>
            <TextInput
              ref={nicknameRef}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Ex: joaozinho"
              placeholderTextColor={colors.mutedForeground}
              value={nickname}
              onChangeText={v => { setNickname(v); setError(''); }}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            {!family && (
              <View style={[styles.warningBox, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Nenhuma família encontrada. Peça ao responsável para criar a família primeiro.
                </Text>
              </View>
            )}

            <TouchableOpacity
              testID="child-login-btn"
              style={[styles.loginBtn, { backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading || !family}
            >
              <Text style={styles.loginBtnText}>Entrar</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            O PIN é fornecido pelo seu responsável no app.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { marginHorizontal: 20, borderRadius: 24, padding: 24, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  pinInput: {
    borderWidth: 2, borderRadius: 14, paddingVertical: 16,
    fontSize: 28, fontWeight: '700' as const, fontFamily: 'Inter_700Bold',
    letterSpacing: 8,
  },
  input: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: 'Inter_400Regular',
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  errorText: { fontSize: 13, flex: 1, fontFamily: 'Inter_400Regular' },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12 },
  warningText: { fontSize: 13, flex: 1, fontFamily: 'Inter_400Regular' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginTop: 24, paddingHorizontal: 32, fontFamily: 'Inter_400Regular' },
});
