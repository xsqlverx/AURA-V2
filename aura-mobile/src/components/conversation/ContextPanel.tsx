import { View, Text, Pressable, ScrollView, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import Animated, { SlideInRight, SlideOutRight, useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { useCallback, useRef } from 'react';
import Icon from '../Icon';
import { text, glass, accent } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing, iconSize } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { duration } from '../../tokens/animation';
import { useWs } from '../../stores/wsStore';
import { useSettings } from '../../stores/settingsStore';
import { useDesktopPresence } from '../../desktop';
import type { ConversationPhase } from './types';

type Props = {
  visible: boolean;
  onClose: () => void;
  phase: ConversationPhase;
};

const SWIPE_THRESHOLD = 80;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 1 };

const PHASE_LABELS: Record<ConversationPhase, { label: string; icon: string }> = {
  idle: { label: 'Awaiting input', icon: 'circle' },
  listening: { label: 'Listening', icon: 'mic' },
  processing: { label: 'Processing', icon: 'hourglass-empty' },
  searching_desktop: { label: 'Searching desktop', icon: 'monitor-heart' },
  searching_memory: { label: 'Searching memory', icon: 'psychology' },
  executing_tool: { label: 'Executing tool', icon: 'bolt' },
  generating: { label: 'Generating response', icon: 'psychology' },
  streaming: { label: 'Streaming', icon: 'chat' },
  speaking: { label: 'Speaking', icon: 'campaign' },
  error: { label: 'Error', icon: 'error-outline' },
};

export default function ContextPanel({ visible, onClose, phase }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const wsConnected = useWs((s) => s.connected);
  const profileName = useSettings((s) => (s as any).profileName);
  const { state: desktop } = useDesktopPresence();
  const translateX = useSharedValue(0);
  const hasClosedRef = useRef(false);

  const handleClose = useCallback(() => {
    if (!hasClosedRef.current) {
      hasClosedRef.current = true;
      onClose();
    }
  }, [onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        translateX.value = Math.max(0, gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD || gs.vx > 0.5) {
          runOnJS(handleClose)();
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
      },
    })
  ).current;

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  hasClosedRef.current = false;

  if (!visible) return null;

  const phaseInfo = PHASE_LABELS[phase];

  return (
    <Animated.View
      entering={SlideInRight.duration(duration.modal)}
      exiting={SlideOutRight.duration(duration.fast)}
      style={[styles.panel, panelStyle]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>Context</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={iconSize.list} color={text.secondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Section label="Status">
          <InfoRow label="Phase" value={phaseInfo.label} icon={phaseInfo.icon} />
          <InfoRow label="Connection" value={wsConnected ? 'Connected' : 'Disconnected'} icon={wsConnected ? 'check-circle' : 'error-outline'} color={wsConnected ? undefined : '#FF453A'} />
        </Section>

        <Section label="Profile">
          <InfoRow label="User" value={profileName || 'You'} icon="person" />
        </Section>

        <Section label="Desktop">
          {desktop.focus && (
            <InfoRow label="Focus" value={desktop.focus.app} icon="terminal" color={accent.cyan} />
          )}
          {desktop.system && (
            <InfoRow label="CPU" value={`${desktop.system.cpu_percent}%`} icon="cpu" color={desktop.system.cpu_percent > 80 ? '#FF453A' : undefined} />
          )}
          {desktop.media && desktop.media.is_playing && (
            <InfoRow label="Media" value={desktop.media.title} icon="music-note" color={accent.cyan} />
          )}
        </Section>

        <Section label="Capabilities">
          {CAPABILITIES.map((cap, i) => (
            <View key={i} style={styles.capRow}>
              <View style={[styles.capDot, { backgroundColor: cap.active ? accent.cyan : text.tertiary }]} />
              <Text style={[styles.capLabel, !cap.active && { color: text.tertiary }]}>{cap.label}</Text>
            </View>
          ))}
        </Section>
      </ScrollView>
    </Animated.View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={iconSize.inline} color={color || text.tertiary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const CAPABILITIES = [
  { label: 'Smart conversation', active: true },
  { label: 'Tool execution', active: true },
  { label: 'Memory (ChromaDB)', active: true },
  { label: 'Browser automation', active: true },
  { label: 'Web search', active: true },
  { label: 'Voice interaction', active: true },
  { label: 'Discord integration', active: false },
];

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 260,
    backgroundColor: '#0B1017',
    borderLeftWidth: 1,
    borderLeftColor: glass.border,
    zIndex: 100,
    paddingTop: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: text.tertiary,
    alignSelf: 'center',
    marginBottom: spacing.space16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space16,
    marginBottom: spacing.space16,
  },
  title: {
    ...typography.heading3,
    color: text.primary,
  },
  closeBtn: {
    padding: spacing.space4,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.space16,
  },
  section: {
    marginBottom: spacing.space24,
  },
  sectionLabel: {
    ...typography.label,
    color: text.tertiary,
    marginBottom: spacing.space8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    marginBottom: spacing.space8,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: text.secondary,
    flex: 1,
  },
  infoValue: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: '600',
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    marginBottom: 6,
  },
  capDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  capLabel: {
    ...typography.bodySmall,
    color: text.secondary,
  },
});
