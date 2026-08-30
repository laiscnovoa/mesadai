import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs, useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { layout } from '@/constants/layout';

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
          height: isWeb ? layout.tabBar.webHeight : undefined,
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          !isWeb ? (
            <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={layout.icon.tab} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={layout.icon.tab} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cycle"
        options={{
          title: 'Ciclo',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'sync-circle' : 'sync-circle-outline'} size={layout.icon.tab} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logout"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            logout();
            router.replace('/welcome');
          },
        }}
        options={{
          title: 'Sair',
          tabBarIcon: ({ color }) => <Ionicons name="log-out-outline" size={layout.icon.tab} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function ParentTabLayout() {
  return isLiquidGlassAvailable() ? <NativeParentTabs /> : <ClassicParentTabs />;
}
