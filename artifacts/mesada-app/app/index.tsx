import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function IndexScreen() {
  const { currentRole, isLoading, family } = useApp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isLoading) return;
    if (currentRole === 'parent') router.replace('/(parent)');
    else if (currentRole === 'child') router.replace('/(child)');
  }, [currentRole, isLoading]);

  if (isLoading || currentRole) {
    return (
      <View style={[styles.loading, { backgroundColor: '#00C472' }]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#00C472', '#00855B']} style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20) }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🐷</Text>
        </View>
        <Text style={styles.appName}>Caixinha</Text>
        <Text style={styles.tagline}>Sua mesada, seu futuro.</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 40 }]}>
        {family && (
          <View style={styles.familyTag}>
            <Ionicons name="home" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.familyTagText}>Família {family.name}</Text>
          </View>
        )}

        <TouchableOpacity
          testID="parent-btn"
          style={styles.primaryBtn}
          onPress={() => router.push('/parent-login')}
          activeOpacity={0.85}
        >
          <View style={styles.btnIcon}>
            <Ionicons name="person" size={20} color="#00C472" />
          </View>
          <View style={styles.btnContent}>
            <Text style={styles.primaryBtnTitle}>Sou Responsável</Text>
            <Text style={styles.primaryBtnSub}>Gerenciar tarefas e validações</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#00C472" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="child-btn"
          style={styles.secondaryBtn}
          onPress={() => router.push('/child-pairing')}
          activeOpacity={0.85}
        >
          <View style={styles.btnIconSecondary}>
            <Ionicons name="star" size={20} color="#ffffff" />
          </View>
          <View style={styles.btnContent}>
            <Text style={styles.secondaryBtnTitle}>Sou Adolescente</Text>
            <Text style={styles.secondaryBtnSub}>Completar missões e ganhar</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 30, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  logoEmoji: { fontSize: 52 },
  appName: { fontSize: 42, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_400Regular', textAlign: 'center' },
  bottom: { paddingHorizontal: 20, gap: 12 },
  familyTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 4,
  },
  familyTagText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Inter_500Medium' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 20, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    padding: 16, gap: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  btnIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E6F9F1', alignItems: 'center', justifyContent: 'center' },
  btnIconSecondary: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  btnContent: { flex: 1 },
  primaryBtnTitle: { fontSize: 16, fontWeight: '700' as const, color: '#1A2433', fontFamily: 'Inter_700Bold' },
  primaryBtnSub: { fontSize: 12, color: '#8A94A6', fontFamily: 'Inter_400Regular', marginTop: 2 },
  secondaryBtnTitle: { fontSize: 16, fontWeight: '700' as const, color: '#ffffff', fontFamily: 'Inter_700Bold' },
  secondaryBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', marginTop: 2 },
});
