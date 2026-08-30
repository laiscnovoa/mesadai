import { Platform, type ViewStyle } from 'react-native';

export const layout = {
  radius: {
    small: 10,
    medium: 14,
    card: 16,
    large: 20,
    sheet: 24,
  },
  icon: {
    tab: 24,
    action: 22,
    card: 44,
  },
  spacing: {
    screen: 16,
    card: 16,
    headerHorizontal: 20,
    headerBottom: 16,
  },
  tabBar: {
    nativeHeight: 50,
    webHeight: 84,
  },
} as const;

export const cardShadow: ViewStyle = Platform.select({
  android: {
    elevation: 2,
    shadowColor: '#000000',
  },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
}) ?? {};

export const elevatedShadow: ViewStyle = Platform.select({
  android: {
    elevation: 8,
    shadowColor: '#000000',
  },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
}) ?? {};

export function topInset(inset: number): number {
  return inset + (Platform.OS === 'web' ? 67 : 0);
}

export function bottomInset(inset: number): number {
  return inset + (Platform.OS === 'web' ? 34 : 0);
}
