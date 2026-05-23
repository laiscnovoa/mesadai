import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { CycleLength } from '@/types';

const CYCLE_OPTIONS: { label: string; value: CycleLength }[] = [
  { label: '7 dias', value: 7 },
  { label: '14 dias', value: 14 },
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
];

export default function ParentLoginScreen() {
  const { family, loginAsParent, setupParent } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [parentName, setParentName] = useState('');
  const [cycleLength, setCycleLength] = useState<CycleLength>(7);
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
    setLoading(true);
    try {
      await setupParent({ familyName, parentName, cycleLength, childName, childNickname });
      router.replace('/(parent)');
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24;

  // Existing family — just log in
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
              <Ionicons name="home" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.familyName, { color: colors.foreground }]}>{family.name}</Text>
            <Text style={[styles.familySub, { color: colors.mutedForeground }]}>Olá, {family.parentName}!</Text>
            <View style={[styles.pinBox, { backgroundColor: colors.muted }]}>
              <Text style={[styles.pinLabel, { color: colors.mutedForeground }]}>PIN do adolescente</Text>
              <Text style={[styles.pin, { color: colors.primary }]}>{family.pin}</Text>
            </View>
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Criar Família</Text>
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
            <Ionicons name="people" size={48} color={colors.primary} style={styles.stepIcon} />
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Quem é você?</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Vamos configurar a família.</Text>
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
            <Ionicons name="calendar" size={48} color={colors.primary} style={styles.stepIcon} />
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Duração do ciclo</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Por quanto tempo as tarefas valem?</Text>
            {CYCLE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.cycleOption, {
                  backgroundColor: cycleLength === opt.value ? colors.primary : colors.card,
                  borderColor: cycleLength === opt.value ? colors.primary : colors.border,
                }]}
                onPress={() => setCycleLength(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cycleLabel, { color: cycleLength === opt.value ? '#ffffff' : colors.foreground }]}>{opt.label}</Text>
                {cycleLength === opt.value && <Ionicons name="checkmark-circle" size={22} color="#ffffff" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextStep} activeOpacity={0.85}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Próximo</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Ionicons name="person-add" size={48} color={colors.primary} style={styles.stepIcon} />
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
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Criar família</Text>
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
  stepIcon: { alignSelf: 'center', marginBottom: 8 },
  stepTitle: { fontSize: 24, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  stepSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  cycleOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, borderWidth: 1.5,
  },
  cycleLabel: { fontSize: 16, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  centerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  familyCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1 },
  familyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  familyName: { fontSize: 24, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  familySub: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  pinBox: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  pinLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  pin: { fontSize: 32, fontWeight: '700' as const, fontFamily: 'Inter_700Bold', letterSpacing: 6 },
});
