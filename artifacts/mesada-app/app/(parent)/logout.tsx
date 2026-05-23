import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function ParentLogoutScreen() {
  const { logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    logout();
    router.replace('/');
  }, []);

  return <View />;
}
