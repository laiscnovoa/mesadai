import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function IndexScreen() {
  const { currentRole, isLoading, hasSeenOnboarding } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (currentRole === 'parent') router.replace('/(parent)');
    else if (currentRole === 'child') router.replace('/(child)');
    else if (!hasSeenOnboarding) router.replace('/onboarding');
    else router.replace('/welcome');
  }, [isLoading, currentRole, hasSeenOnboarding, router]);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00C472' },
});
