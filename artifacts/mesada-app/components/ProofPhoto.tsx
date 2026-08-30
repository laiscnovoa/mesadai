import React, { useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ProofPhotoProps {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  emptyLabel?: string;
  iconSize?: number;
}

export function ProofPhoto({
  uri,
  style,
  accessibilityLabel,
  emptyLabel,
  iconSize = 32,
}: ProofPhotoProps) {
  const colors = useColors();
  const [loadingUri, setLoadingUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const canLoad = !!uri && failedUri !== uri;
  const isLoading = canLoad && loadingUri === uri;

  return (
    <View style={[styles.container, { backgroundColor: colors.muted }, style]}>
      {canLoad ? (
        <Image
          source={uri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityLabel={accessibilityLabel}
          onLoadStart={() => setLoadingUri(uri)}
          onLoad={() => setLoadingUri(null)}
          onError={() => {
            setLoadingUri(null);
            setFailedUri(uri);
          }}
        />
      ) : (
        <View style={styles.placeholder} accessibilityLabel={accessibilityLabel}>
          <Ionicons name="image-outline" size={iconSize} color={colors.mutedForeground} />
          {emptyLabel ? (
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{emptyLabel}</Text>
          ) : null}
        </View>
      )}
      {isLoading ? (
        <View style={[styles.loading, { backgroundColor: colors.muted }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});