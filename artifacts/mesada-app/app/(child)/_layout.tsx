import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';
import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakBonusCelebration } from '@/components/StreakBonusCelebration';
import { useApp } from '@/context/AppContext';
import { StreakBet } from '@/types';
import { layout } from '@/constants/layout';

function NativeChildTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'star', selected: 'star.fill' }} />
        <Label>Missões</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>Progresso</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicChildTabs() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const isWeb = Platform.OS === 'web';
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
          title: 'Missões',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'star' : 'star-outline'} size={layout.icon.tab} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progresso',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={layout.icon.tab} color={color} />,
        }}
      />
      <Tabs.Screen name="logout" options={{ href: null }} />
    </Tabs>
  );
}

export default function ChildTabLayout() {
  return (
    <>
      {isLiquidGlassAvailable() ? <NativeChildTabs /> : <ClassicChildTabs />}
      <StreakBonusWatcher />
    </>
  );
}

const LAST_SEEN_BONUS_KEY = 'mesada_lastSeenBonusId';

function StreakBonusWatcher() {
  const {
    streakBets, family, currentChildId, currentRole, isLoading,
  } = useApp();
  const [bonusToCelebrate, setBonusToCelebrate] = useState<StreakBet | null>(null);
  const [dismissedBonusId, setDismissedBonusId] = useState<string | null>(null);

  const latestWonBonus = [...streakBets]
    .filter((bet) => (
      bet.childId === currentChildId &&
      bet.status === 'won' &&
      bet.bonusCentsAwarded > 0
    ))
    .sort((a, b) => (
      new Date(b.resolvedAt ?? '').getTime() - new Date(a.resolvedAt ?? '').getTime()
    ))[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    if (
      isLoading ||
      currentRole !== 'child' ||
      !currentChildId ||
      !family?.id ||
      !latestWonBonus
    ) {
      if (!latestWonBonus) setBonusToCelebrate(null);
      return () => { cancelled = true; };
    }

    const storageKey = `${LAST_SEEN_BONUS_KEY}:${family.id}:${currentChildId}`;
    AsyncStorage.getItem(storageKey)
      .then((lastSeenBonusId) => {
        if (
          !cancelled &&
          latestWonBonus.id !== lastSeenBonusId &&
          latestWonBonus.id !== dismissedBonusId
        ) {
          setBonusToCelebrate(latestWonBonus);
        }
      })
      .catch(() => {
        if (!cancelled && latestWonBonus.id !== dismissedBonusId) {
          setBonusToCelebrate(latestWonBonus);
        }
      });

    return () => { cancelled = true; };
  }, [
    currentRole,
    currentChildId,
    dismissedBonusId,
    family?.id,
    isLoading,
    latestWonBonus?.id,
    latestWonBonus?.resolvedAt,
  ]);

  const dismissCelebration = useCallback(() => {
    if (!bonusToCelebrate || !family?.id || !currentChildId) return;

    const storageKey = `${LAST_SEEN_BONUS_KEY}:${family.id}:${currentChildId}`;
    setDismissedBonusId(bonusToCelebrate.id);
    setBonusToCelebrate(null);
    void AsyncStorage.setItem(storageKey, bonusToCelebrate.id);
  }, [bonusToCelebrate, currentChildId, family?.id]);

  return (
    <StreakBonusCelebration
      visible={!!bonusToCelebrate}
      bet={bonusToCelebrate}
      onClose={dismissCelebration}
    />
  );
}
