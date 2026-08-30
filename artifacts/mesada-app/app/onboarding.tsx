import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { bottomInset, elevatedShadow, layout, topInset } from '@/constants/layout';
import { useApp } from '@/context/AppContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface OnboardingSlide {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 'welcome',
    icon: 'sparkles',
    title: 'Mesada com propósito',
    description: 'Você organiza a rotina, orienta seu filho e transforma cada missão cumprida em aprendizado.',
  },
  {
    id: 'family',
    icon: 'people',
    title: 'Monte sua família',
    description: 'O responsável cria a família, cadastra a criança e mostra como entrar pelo convite ou QR Code.',
  },
  {
    id: 'missions',
    icon: 'checkbox',
    title: 'Crie missões claras',
    description: 'Defina tarefas e valores. Depois, explique à criança o que fazer e como enviar a conclusão.',
  },
  {
    id: 'validation',
    icon: 'shield-checkmark',
    title: 'Acompanhe e valide',
    description: 'A criança conclui as missões e envia a comprovação. O responsável confere e aprova o resultado.',
  },
  {
    id: 'reward',
    icon: 'wallet',
    title: 'Recompensa no cofre',
    description: 'Depois da aprovação, o valor vai para o cofre da criança — tornando esforço e recompensa fáceis de entender.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const finish = useCallback(async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    await completeOnboarding();
    router.replace('/welcome');
  }, [completeOnboarding, isFinishing, router]);

  const goNext = useCallback(() => {
    if (currentIndex === slides.length - 1) {
      void finish();
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, finish]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(Math.max(0, Math.min(nextIndex, slides.length - 1)));
  }, [width]);

  return (
    <LinearGradient colors={[colors.light.primary, colors.light.secondaryForeground]} style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset(insets.top) + 8 }]}>
        <Text style={styles.brand}>MesadAI</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Pular apresentação"
          onPress={() => void finish()}
          disabled={isFinishing}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.illustration, elevatedShadow]}>
              <View style={styles.iconHalo}>
                <Ionicons name={item.icon} size={64} color={colors.light.primary} />
              </View>
              <View style={styles.smallBadge}>
                <Ionicons name="checkmark" size={22} color={colors.light.primaryForeground} />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomInset(insets.bottom) + 24 }]}>
        <View style={styles.dots} accessibilityLabel={`Página ${currentIndex + 1} de ${slides.length}`}>
          {slides.map((slide, index) => (
            <View key={slide.id} style={[styles.dot, index === currentIndex && styles.activeDot]} />
          ))}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={goNext}
          disabled={isFinishing}
          activeOpacity={0.85}
          style={styles.nextButton}
        >
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'Começar' : 'Próximo'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={22}
            color={colors.light.primary}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.spacing.headerHorizontal,
  },
  brand: {
    color: colors.light.primaryForeground,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  skipText: {
    color: colors.light.primaryForeground,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  illustration: {
    width: 190,
    height: 190,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.card,
    marginBottom: 38,
  },
  iconHalo: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.secondary,
  },
  smallBadge: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.primary,
    borderWidth: 3,
    borderColor: colors.light.card,
  },
  title: {
    color: colors.light.primaryForeground,
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    maxWidth: 360,
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: layout.spacing.headerHorizontal,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  activeDot: {
    width: 28,
    backgroundColor: colors.light.primaryForeground,
  },
  nextButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: layout.radius.large,
    backgroundColor: colors.light.card,
    ...elevatedShadow,
  },
  nextText: {
    color: colors.light.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
});