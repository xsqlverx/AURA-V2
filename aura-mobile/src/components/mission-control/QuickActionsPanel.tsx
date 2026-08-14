import { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, PanResponder, ScrollView,
  Dimensions, Platform, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
  interpolate, Extrapolation, FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { text, glass, accent, semantic } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { spring } from '../../tokens/animation';
import { haptic } from '../../motion/haptics';
import Icon from '../Icon';
import {
  systemLock, systemSleep, systemShutdown, systemRestart, systemCancelShutdown,
  setVolume, muteAudio, getVolume,
  launchApp, clipboardCopy, clipboardPaste, inputHotkey,
} from '../../api/aura';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  onClose: () => void;
};

type ActionGroup = {
  id: string;
  label: string;
  icon: string;
  items: ActionItem[];
};

type ActionItem = {
  label: string;
  icon: string;
  color?: string;
  onPress: () => void | Promise<void>;
};

export default function QuickActionsPanel({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const [volume, setVolState] = useState(50);
  const [muted, setMuted] = useState(false);

  const SNAP_POINT = SCREEN_HEIGHT * 0.6;
  const START_Y = SCREEN_HEIGHT;

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, []);

  const handleClose = useCallback(() => {
    translateY.value = withSpring(START_Y, { damping: 20, stiffness: 200 }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
    onPanResponderMove: (_, gs) => {
      const raw = gs.dy;
      if (raw > 0) {
        translateY.value = raw * 0.5;
      } else {
        translateY.value = raw;
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 60 || gs.vy > 0.5) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    },
  }), [handleClose]);

  const rPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SNAP_POINT], [1, 0], Extrapolation.CLAMP),
  }));

  const exec = useCallback(async (fn: () => Promise<any>) => {
    haptic.press();
    try { await fn(); } catch (e: any) { Alert.alert('Error', e.message || 'Action failed'); }
    setTimeout(handleClose, 300);
  }, [handleClose]);

  const handleVolumeChange = useCallback(async (delta: number) => {
    const next = Math.max(0, Math.min(100, volume + delta));
    setVolState(next);
    try { await setVolume(next); } catch (e: any) { Alert.alert('Error', e.message || 'Volume failed'); }
  }, [volume]);

  const handleMute = useCallback(async () => {
    haptic.toggle();
    const next = !muted;
    setMuted(next);
    try { await muteAudio(next); } catch (e: any) { Alert.alert('Error', e.message || 'Mute failed'); }
  }, [muted]);

  const groups: ActionGroup[] = [
    {
      id: 'power',
      label: 'Power',
      icon: 'power-settings-new',
      items: [
        { label: 'Lock', icon: 'lock', onPress: () => exec(systemLock) },
        { label: 'Sleep', icon: 'bedtime', onPress: () => exec(systemSleep) },
        { label: 'Restart', icon: 'restart-alt', color: semantic.warning, onPress: () => exec(() => systemRestart(10)) },
        { label: 'Shutdown', icon: 'power-settings-new', color: semantic.error, onPress: () => exec(() => systemShutdown(10)) },
      ],
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: 'volume-up',
      items: [
        {
          label: muted ? 'Unmute' : 'Mute',
          icon: muted ? 'volume-up' : 'volume-off',
          color: muted ? semantic.success : semantic.error,
          onPress: handleMute,
        },
        {
          label: 'Vol Down',
          icon: 'volume-down',
          onPress: () => handleVolumeChange(-10),
        },
        {
          label: 'Vol Up',
          icon: 'volume-up',
          onPress: () => handleVolumeChange(10),
        },
      ],
    },
    {
      id: 'clipboard',
      label: 'Clipboard',
      icon: 'content-copy',
      items: [
        {
          label: 'PC → Phone',
          icon: 'content-paste',
          onPress: () => exec(() => clipboardPaste()),
        },
        {
          label: 'Phone → PC',
          icon: 'content-copy',
          onPress: () => exec(() => clipboardCopy('')),
        },
      ],
    },
    {
      id: 'apps',
      label: 'Applications',
      icon: 'grid-view',
      items: [
        { label: 'Browser', icon: 'language', onPress: () => exec(() => launchApp('browser')) },
        { label: 'Terminal', icon: 'terminal', onPress: () => exec(() => launchApp('terminal')) },
        { label: 'Code', icon: 'code', onPress: () => exec(() => launchApp('code')) },
        { label: 'Spotify', icon: 'music-note', onPress: () => exec(() => launchApp('spotify')) },
      ],
    },
    {
      id: 'desktop',
      label: 'Desktop',
      icon: 'monitor',
      items: [
        { label: 'Show Desktop', icon: 'minimize', onPress: () => exec(() => inputHotkey(['win', 'd'])) },
        { label: 'Screenshot', icon: 'screenshot', onPress: () => exec(() => inputHotkey(['win', 'shift', 's'])) },
        { label: 'Focus Mode', icon: 'focus-mode', onPress: () => exec(() => inputHotkey(['alt', 'f11'])) },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, rBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[styles.panel, { paddingBottom: insets.bottom + spacing.space16 }, rPanelStyle]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        <View style={styles.panelHeader}>
          <Icon name="bolt" size={18} color={accent.cyan} />
          <Text style={styles.panelTitle}>Quick Actions</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Icon name="close" size={16} color={text.secondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {groups.map((group) => (
            <View key={group.id} style={styles.group}>
              <View style={styles.groupHeader}>
                <Icon name={group.icon} size={14} color={text.secondary} />
                <Text style={styles.groupLabel}>{group.label}</Text>
              </View>
              <View style={styles.actionGrid}>
                {group.items.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      styles.actionItem,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: `${item.color || accent.cyan}15` }]}>
                      <Icon name={item.icon} size={18} color={item.color || accent.cyan} />
                    </View>
                    <Text style={styles.actionLabel} numberOfLines={1}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 200,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    backgroundColor: '#0B1017',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: glass.border,
  },
  handleRow: {
    paddingTop: spacing.space12,
    paddingBottom: spacing.space4,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space20,
    paddingBottom: spacing.space12,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
  },
  panelTitle: {
    ...typography.heading2,
    color: text.primary,
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
    paddingHorizontal: spacing.space20,
  },
  group: {
    paddingTop: spacing.space12,
    paddingBottom: spacing.space8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingBottom: spacing.space8,
  },
  groupLabel: {
    ...typography.caption,
    color: text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space8,
  },
  actionItem: {
    width: '22%',
    minWidth: 70,
    alignItems: 'center',
    gap: spacing.space8,
    backgroundColor: glass.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing.space12,
    paddingHorizontal: spacing.space8,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.caption,
    color: text.primary,
    fontSize: 10,
    textAlign: 'center',
  },
});
