import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs, useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

function NativeParentTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Início</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasks">
        <Icon sf={{ default: 'checklist', selected: 'checklist' }} />
        <Label>Tarefas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cycle">
        <Icon sf={{ default: 'arrow.clockwise.circle', selected: 'arrow.clockwise.circle.fill' }} />
        <Label>Ciclo</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="logout">
        <Icon sf={{ default: 'rectangle.portrait.and.arrow.right', selected: 'rectangle.portrait.and.arrow.right' }} />
        <Label>Sair</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicParentTabs() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const { logout } = useApp();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="checklist" tintColor={color} size={24} /> : <Feather name="check-square" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cycle"
        options={{
          title: 'Ciclo',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="arrow.clockwise.circle" tintColor={color} size={24} /> : <Feather name="refresh-cw" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logout"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            logout();
            router.replace('/');
          },
        }}
        options={{
          title: 'Sair',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="rectangle.portrait.and.arrow.right" tintColor={color} size={24} /> : <Feather name="log-out" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function ParentTabLayout() {
  return isLiquidGlassAvailable() ? <NativeParentTabs /> : <ClassicParentTabs />;
}
