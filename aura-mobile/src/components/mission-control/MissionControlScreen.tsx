import { useCallback, useMemo, useState, useRef } from 'react';
import {
  View, Pressable, StyleSheet, SafeAreaView, PanResponder, Text,
  Dimensions, StatusBar,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Atmosphere from './Atmosphere';
import PresenceBar from './PresenceBar';
import IntelligenceCards from './IntelligenceCards';
import SmartActions from './SmartActions';
import QuickActionsPanel from './QuickActionsPanel';
import OrbContainer from '../OrbContainer';
import Icon from '../Icon';
import { text, glass, accent, semantic } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { spacing, iconSize } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { duration } from '../../tokens/animation';
import { haptic } from '../../motion/haptics';
import { useWs } from '../../stores/wsStore';
import { triggerBriefing } from '../../api/aura';
import { useAmbient, AmbientOrbReactor } from '../../ambient';
import { useDesktopPresence } from '../../desktop';
import type { OrbState } from '../orb/OrbTypes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_UP_THRESHOLD = 60;

type CardData = {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  type: 'info' | 'warning' | 'success';
};

export default function MissionControlScreen() {
  const router = useRouter();
  const wsState = useWs((s) => s.state);
  const wsConnected = useWs((s) => s.connected);
  const insets = useSafeAreaInsets();

  const [hasError, setHasError] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { latestOrbReaction } = useAmbient();
  const { state: presence, refresh } = useDesktopPresence();
  const quickActionsY = useRef(0);

  const orbState: OrbState = wsConnected ? wsState : 'disconnected';

  const cards: CardData[] = useMemo(() => {
    const result: CardData[] = [];
    if (presence.media?.title) {
      result.push({
        icon: 'music-note',
        title: presence.media.title,
        subtitle: presence.media.app || 'Now Playing',
        color: accent.cyan,
        type: 'info',
      });
    }
    if (presence.focus) {
      result.push({
        icon: 'terminal',
        title: presence.focus.app,
        subtitle: presence.focus.window_title || 'Foreground app',
        color: accent.cyan,
        type: 'info',
      });
    }
    if (presence.system && presence.system.cpu_percent > 80) {
      result.push({
        icon: 'memory',
        title: `CPU at ${presence.system.cpu_percent}%`,
        subtitle: 'High usage detected',
        color: semantic.error,
        type: 'warning',
      });
    }
    if (presence.battery && presence.battery.percent <= 20 && !presence.battery.charging) {
      result.push({
        icon: 'battery-full',
        title: `Battery at ${presence.battery.percent}%`,
        subtitle: 'Low battery — plug in soon',
        color: semantic.warning,
        type: 'warning',
      });
    }
    return result.slice(0, 3);
  }, [presence.media, presence.focus, presence.system, presence.battery]);

  const goToChat = useCallback(() => {
    router.push('/(tabs)/chat');
  }, [router]);

  const handleBriefing = useCallback(async () => {
    try {
      await triggerBriefing();
      goToChat();
    } catch {
      goToChat();
    }
  }, [goToChat]);

  const handleGoChat = useCallback(() => {
    haptic.press();
    goToChat();
  }, [goToChat]);

  const handleRefresh = useCallback(() => {
    haptic.press();
    refresh();
  }, [refresh]);

  const handleQuickActions = useCallback(() => {
    haptic.press();
    setShowQuickActions(true);
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 15 && Math.abs(gs.dy) > Math.abs(gs.dx) * 2,
    onPanResponderMove: (_, gs) => {
      quickActionsY.current = gs.dy;
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy < -SWIPE_UP_THRESHOLD) {
        haptic.press();
        setShowQuickActions(true);
      } else if (gs.dy > SWIPE_UP_THRESHOLD * 2 && showQuickActions) {
        setShowQuickActions(false);
      }
    },
  }), [showQuickActions]);

  const hasContent = cards.length > 0 || hasError;
  const errorMessage = !wsConnected
    ? 'Server offline — check connection'
    : presence.syncStatus === 'error'
    ? 'Sync error'
    : 'Could not load data';

  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const orbTop = Math.max(insets.top + statusBarHeight + spacing.space16,
    SCREEN_HEIGHT * 0.08);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Atmosphere />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Animated.View
            entering={FadeIn.duration(duration.normal).delay(100)}
            style={[styles.orbSection, { paddingTop: orbTop }]}
          >
            <AmbientOrbReactor reaction={latestOrbReaction} size={120}>
              <OrbContainer state={orbState} size="xlarge" />
            </AmbientOrbReactor>

            <View style={styles.presenceArea}>
              <PresenceBar orbState={orbState} connected={wsConnected} />
            </View>
          </Animated.View>

          <View style={styles.lowerSection}>
            {hasError && (
              <Animated.View
                entering={FadeInDown.duration(duration.normal).delay(350)}
                exiting={FadeOut.duration(duration.fast)}
                style={styles.errorBar}
              >
                <Icon name="error-outline" size={iconSize.inline} color={semantic.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable onPress={handleRefresh} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </Animated.View>
            )}

            <IntelligenceCards cards={cards} />

            <SmartActions
              actions={[
                { icon: 'chat', label: 'Chat', onPress: handleGoChat },
                { icon: 'campaign', label: 'Brief', onPress: handleBriefing },
                { icon: 'restart-alt', label: 'Sync', onPress: handleRefresh },
                { icon: 'bolt', label: 'Actions', onPress: handleQuickActions },
              ]}
            />

            <Animated.View
              entering={FadeIn.duration(duration.slow).delay(800)}
              style={styles.swipeHint}
            >
              <Icon name="arrow-upward" size={14} color={text.secondary} />
              <Text style={styles.swipeLabel}>
                Swipe up for Quick Actions
              </Text>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>

      {showQuickActions && (
        <QuickActionsPanel onClose={() => setShowQuickActions(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.space12,
  },
  presenceArea: {
    marginTop: spacing.space20,
  },
  lowerSection: {
    paddingBottom: spacing.space32,
    gap: spacing.space16,
    paddingHorizontal: spacing.space20,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
    paddingVertical: spacing.space8,
    paddingHorizontal: spacing.space16,
    borderRadius: radius.sm,
    backgroundColor: `${semantic.error}10`,
  },
  errorText: {
    ...typography.caption,
    color: semantic.error,
  },
  retryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: `${semantic.error}15`,
  },
  retryText: {
    ...typography.caption,
    color: semantic.error,
    fontWeight: '700',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.space4,
  },
  swipeLabel: {
    ...typography.caption,
    color: text.secondary,
    letterSpacing: 0.5,
  },
});
