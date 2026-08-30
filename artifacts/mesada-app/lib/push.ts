import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '@workspace/api-client-react';

// Foreground behavior: show alerts + play sound even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Padrão',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#00C472',
  });
}

function resolveProjectId(): string | undefined {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return fromExpoConfig ?? fromEasConfig ?? undefined;
}

// Requests permission, obtains the Expo push token, and registers it with the
// backend for the authenticated device. Returns false (never throws) when the
// environment can't deliver push (web, simulator, Expo Go, denied permission).
export async function registerForPushNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    if (!Device.isDevice) return false;

    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return false;

    const projectId = resolveProjectId();
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const pushToken = tokenResult.data;
    if (!pushToken) return false;

    await registerPushToken({ pushToken });
    return true;
  } catch (err) {
    console.warn('Push registration skipped', err);
    return false;
  }
}
