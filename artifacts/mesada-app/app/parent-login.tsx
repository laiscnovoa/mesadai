import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { bottomInset, layout, topInset } from '@/constants/layout';

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
  const { setupParent, recoverParent } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [parentName, setParentName] = useState('');
  const [cycleDateInput, setCycleDateInput] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [parentPinConfirm, setParentPinConfirm] = useState('');
  const [childName, setChildName] = useState('');
  const [childNickname, setChildNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPin, setRecoveryPin] = useState('');

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
    if (step === 3) {
      if (parentPin.length !== 6) {
        Alert.alert('Atenção', 'O PIN do responsável deve ter 6 dígitos.');
        return;
      }
      if (parentPin !== parentPinConfirm) {
        Alert.alert('Atenção', 'Os PINs não conferem.');
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
    if (parentPin.length !== 6) {
      Alert.alert('Atenção', 'Volte e defina o PIN do responsável.');
      return;
    }
    setLoading(true);
    try {
      await setupParent({ familyName, parentName, parentPin, cycleEndDate, childName, childNickname });
      router.replace('/(parent)');
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        Alert.alert('Escolha outro PIN', 'Este PIN já está em uso por outra família. Volte e escolha outro PIN de 6 dígitos.');
      } else {
        Alert.alert('Não foi possível criar a família', 'Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (recoveryPin.length !== 6) {
      Alert.alert('Confira o PIN', 'Digite o PIN de 6 dígitos do responsável.');
      return;
    }
    setLoading(true);
    try {
      const ok = await recoverParent(recoveryPin);
      if (ok) {
        router.replace('/(parent)');
      } else {
        Alert.alert('Não foi possível recuperar', 'PIN inválido ou acesso temporariamente indisponível.');
      }
    } finally {
      setLoading(false);
    }
  };

  const topPad = topInset(insets.top);
  const botPad = bottomInset(insets.bottom) + 24;

  if (recoveryMode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => setRecoveryMode(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Recuperar acesso</Text>
        </View>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
        >
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🔑</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Voltar para sua família</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Digite o PIN de seis dígitos criado pelo responsável.
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>PIN do responsável</Text>
            <TextInput
              testID="parent-recovery-pin-input"
              style={[styles.pinSetupInput, { backgroundColor: colors.card, borderColor: recoveryPin.length === 6 ? colors.primary : colors.border, color: colors.foreground }]}
              placeholder="••••••"
              placeholderTextColor={colors.mutedForeground}
              value={recoveryPin}
              onChangeText={v => setRecoveryPin(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              textAlign="center"
            />
            <TouchableOpacity
              testID="recover-parent-btn"
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleRecovery}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
                <>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Recuperar acesso</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>
    );
  }

  // === New family setup (4 steps) ===
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.replace('/welcome')} style={styles.backBtn}>
          <Ionicons name={step > 1 ? 'arrow-back' : 'home'} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Configurar MesadAI</Text>
        <Text style={[styles.stepIndicator, { color: colors.mutedForeground }]}>{step}/4</Text>
      </View>

      <View style={[styles.stepDots, { borderBottomColor: colors.border }]}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.dot, { backgroundColor: s <= step ? colors.primary : colors.muted }]} />
        ))}
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🏠</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Quem é você?</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Vamos configurar o MesadAI da sua família.</Text>
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
            <TouchableOpacity
              testID="open-parent-recovery-btn"
              style={styles.linkBtn}
              onPress={() => setRecoveryMode(true)}
            >
              <Ionicons name="key-outline" size={18} color={colors.primary} />
              <Text style={[styles.linkBtnText, { color: colors.primary }]}>Já tenho uma família — recuperar acesso</Text>
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
            <Text style={styles.stepEmoji}>🔐</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Crie seu PIN</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Um PIN de 6 dígitos para você (responsável) entrar. Não compartilhe com o(a) adolescente.
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Seu PIN (6 dígitos)</Text>
            <TextInput
              style={[styles.pinSetupInput, {
                backgroundColor: colors.card,
                color: colors.foreground,
                borderColor: parentPin.length === 6 ? colors.primary : colors.border,
              }]}
              placeholder="••••"
              placeholderTextColor={colors.mutedForeground}
              value={parentPin}
              onChangeText={v => setParentPin(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              textAlign="center"
            />
            <Text style={[styles.label, { color: colors.foreground }]}>Confirme o PIN</Text>
            <TextInput
              style={[styles.pinSetupInput, {
                backgroundColor: colors.card,
                color: colors.foreground,
                borderColor: parentPinConfirm.length === 6 && parentPinConfirm === parentPin ? colors.primary : colors.border,
              }]}
              placeholder="••••"
              placeholderTextColor={colors.mutedForeground}
              value={parentPinConfirm}
              onChangeText={v => setParentPinConfirm(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              textAlign="center"
            />
            <View style={[styles.dateHint, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="warning-outline" size={16} color="#B7860B" />
              <Text style={[styles.dateHintText, { color: '#B7860B' }]}>
                Guarde bem! Sem esse PIN você não conseguirá aprovar tarefas.
              </Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextStep} activeOpacity={0.85}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Próximo</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
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
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Configurar MesadAI</Text>
                  <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAwareScrollViewCompat>
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
  input: { borderWidth: 1, borderRadius: layout.radius.medium, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
  pinSetupInput: {
    borderWidth: 2, borderRadius: layout.radius.medium, paddingVertical: 16,
    fontSize: 28, fontWeight: '700' as const, fontFamily: 'Inter_700Bold',
    letterSpacing: 12,
  },
  dateHint: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  dateHintText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: layout.radius.card, paddingVertical: 16, marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  linkBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 24, gap: 16 },
  familyCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1 },
  familyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  familyEmoji: { fontSize: 32 },
  familyName: { fontSize: 22, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  familySub: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  loginCard: { borderRadius: 20, padding: 20, gap: 12, borderWidth: 1 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginLabel: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  pinInput: {
    borderWidth: 2, borderRadius: 14, paddingVertical: 18,
    fontSize: 32, fontWeight: '700' as const, fontFamily: 'Inter_700Bold',
    letterSpacing: 14,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  errorText: { fontSize: 13, flex: 1, fontFamily: 'Inter_400Regular' },
  hintText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  childPinHint: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  childPinLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  childPinValue: { fontSize: 18, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', letterSpacing: 4 },
});
