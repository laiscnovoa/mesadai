import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function ParentLogoutScreen() {
  const { logout, currentRole } = useApp();
  const router = useRouter();

  useEffect(() => {
    logout();
  }, []);

  useEffect(() => {
    if (currentRole !== 'parent') {
      router.replace('/');
    }
  }, [currentRole]);

  return <View />;
}
