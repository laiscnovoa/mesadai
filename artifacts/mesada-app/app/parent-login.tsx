import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

function parseDateBR(value: string): string | null {
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  const day = parseInt(clean.slice(0, 2), 10);
  const month = parseInt(clean.slice(2, 4), 10);
  const year = parseInt(clean.slice(4, 8), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2024) return null;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const d = new Date(iso + 'T00:00:00');
  if (d.getDate() !== day || d.getMonth() + 1 !== month) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d <= today) return null;
  return iso;
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function ParentLoginScreen() {
  const { family, loginAsParent, setupParent } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [parentName, setParentName] = useState('');
  const [cycleDateInput, setCycleDateInput] = useState('');
  const [childName, setChildName] = useState('');
  const [childNickname, setChildNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExistingLogin = () => {
    loginAsParent();
    router.replace('/(parent)');
  };

  const nextStep = () => {
    if (step === 1 && (!familyName.trim() || !parentName.trim())) {
      Alert.alert('Atenção', 'Preencha o nome da família e seu nome.');
      return;
    }
    if (step === 2) {
      const iso = parseDateBR(cycleDateInput.replace(/\D/g, '').slice(0, 8));
      if (!iso) {
        Alert.alert('Data inválida', 'Informe uma data futura válida no formato DD/MM/AAAA.');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSetup = async () => {
    if (!childName.trim() || !childNickname.trim()) {
      Alert.alert('Atenção', 'Preencha o nome e apelido do(a) filho(a).');
      return;
    }
    if (childNickname.trim().length < 3) {
      Alert.alert('Atenção', 'O apelido deve ter pelo menos 3 caracteres.');
      return;
    }
    const cycleEndDate = parseDateBR(cycleDateInput.replace(/\D/g, '').slice(0, 8));
    if (!cycleEndDate) {
      Alert.alert('Data inválida', 'Volte e informe uma data futura válida.');
      return;
    }
    setLoading(true);
    try {
      await setupParent({ familyName, parentName, cycleEndDate, childName, childNickname });
      router.replace('/(parent)');
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24;

  if (family) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Entrar</Text>
        </View>
        <View style={styles.centerContent}>
          <View style={[styles.familyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.familyIcon, { backgroundColor: colors.secondary }]}>
              <Text style={styles.familyEmoji}>🐷</Text>
            </View>
            <Text style={[styles.familyName, { color: colors.foreground }]}>{family.name}</Text>
            <Text style={[styles.familySub, { color: colors.mutedForeground }]}>Olá, {family.parentName}!</Text>
            <TouchableOpacity
              style={[styles.pinBox, { backgroundColor: colors.muted }]}
              onPress={async () => {
                await Clipboard.setStringAsync(family.pin);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('PIN copiado!', 'Cole onde precisar compartilhar com o adolescente.');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.pinLabel, { color: colors.mutedForeground }]}>PIN do adolescente</Text>
              <Text style={[styles.pin, { color: colors.primary }]}>{family.pin}</Text>
              <View style={styles.copyRow}>
                <Ionicons name="copy-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.copyText, { color: colors.mutedForeground }]}>Toque para copiar</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            testID="login-parent-btn"
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleExistingLogin}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Entrar como Responsável</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Criar Caixinha</Text>
        <Text style={[styles.stepIndicator, { color: colors.mutedForeground }]}>{step}/3</Text>
      </View>

      <View style={[styles.stepDots, { borderBottomColor: colors.border }]}>
        {[1, 2, 3].map(s => (
          <View key={s} style={[styles.dot, { backgroundColor: s <= step ? colors.primary : colors.muted }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad }]} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🏠</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Quem é você?</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Vamos criar a Caixinha da sua família.</Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Nome da família</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Família Silva"
              placeholderTextColor={colors.mutedForeground}
              value={familyName}
              onChangeText={setFamilyName}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>Seu nome</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Maria"
              placeholderTextColor={colors.mutedForeground}
              value={parentName}
              onChangeText={setParentName}
            />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextStep} activeOpacity={0.85}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Próximo</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>📅</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Quando encerra?</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Escolha a data de encerramento deste ciclo de tarefas.
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Data de encerramento</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.mutedForeground}
              value={cycleDateInput}
              onChangeText={v => setCycleDateInput(formatDateInput(v))}
              keyboardType="number-pad"
              maxLength={10}
            />
            <View style={[styles.dateHint, { backgroundColor: colors.secondary }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.dateHintText, { color: colors.mutedForeground }]}>
                Dica: semana (~7d), quinzena (~15d), mês (~30d) — você decide!
              </Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextStep} activeOpacity={0.85}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Próximo</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>👦</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Adicionar filho(a)</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>O apelido será usado para fazer login.</Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Nome completo</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: João"
              placeholderTextColor={colors.mutedForeground}
              value={childName}
              onChangeText={setChildName}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>Apelido (para login)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: joaozinho"
              placeholderTextColor={colors.mutedForeground}
              value={childNickname}
              onChangeText={setChildNickname}
              autoCapitalize="none"
            />
            <TouchableOpacity
              testID="create-family-btn"
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSetup}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#ffffff" size="small" /> : (
                <>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Criar Caixinha</Text>
                  <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  stepIndicator: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 24, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: 24 },
  stepContent: { gap: 12 },
  stepEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  stepTitle: { fontSize: 24, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  stepSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
  dateHint: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  dateHintText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  centerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  familyCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1 },
  familyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  familyEmoji: { fontSize: 36 },
  familyName: { fontSize: 24, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  familySub: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  pinBox: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  pinLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  pin: { fontSize: 32, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', letterSpacing: 6 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  copyText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
