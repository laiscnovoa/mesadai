import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { bottomInset, layout, topInset } from '@/constants/layout';

interface AppSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actionLabel?: string;
  actionColor?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  fullScreen?: boolean;
  testID?: string;
  closeButtonTestID?: string;
}

export function AppSheet({
  visible,
  title,
  onClose,
  children,
  actionLabel,
  actionColor,
  actionDisabled = false,
  onAction,
  fullScreen = false,
  testID,
  closeButtonTestID,
}: AppSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const modalTop = web ? topInset(insets.top) : Math.max(insets.top, 12);
  const modalBottom = bottomInset(insets.bottom);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <View style={[styles.overlay, fullScreen && styles.fullScreenOverlay]}>
          {!fullScreen && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />}
          <View
            testID={testID}
            style={[
              styles.sheet,
              fullScreen && styles.fullScreen,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                paddingBottom: modalBottom,
                paddingTop: modalTop,
              },
            ]}
          >
            {!fullScreen && <View style={[styles.grabber, { backgroundColor: colors.border }]} />}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Pressable
                testID={closeButtonTestID}
                onPress={onClose}
                style={styles.headerAction}
                hitSlop={8}
              >
                <Ionicons name="close" size={layout.icon.action} color={colors.mutedForeground} />
              </Pressable>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
              {actionLabel && onAction ? (
                <Pressable
                  onPress={onAction}
                  disabled={actionDisabled}
                  style={styles.headerAction}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.action,
                      { color: actionDisabled ? colors.mutedForeground : (actionColor ?? colors.primary) },
                    ]}
                  >
                    {actionLabel}
                  </Text>
                </Pressable>
              ) : <View style={styles.headerAction} />}
            </View>
            <View style={[styles.content, fullScreen && styles.fullScreenContent]}>{children}</View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  fullScreenOverlay: { backgroundColor: '#10131A' },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: layout.radius.sheet,
    borderTopRightRadius: layout.radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fullScreen: {
    flex: 1,
    maxHeight: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  grabber: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    minHeight: 54,
    paddingHorizontal: layout.spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  action: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  content: { flexShrink: 1 },
  fullScreenContent: { flex: 1 },
});
