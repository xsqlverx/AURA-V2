import { useCallback, useMemo, useRef } from 'react';
import {
  View, Pressable, StyleSheet, PanResponder,
  ScrollView, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlance } from './GlanceContext';
import { spacing } from '../../tokens/spacing';
import { spring as springCfg } from '../../tokens/animation';
import { glass } from '../../tokens/colors';
import { radius } from '../../tokens/radius';
import { zIndex } from '../../tokens/zindex';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SnapPoint = 'collapsed' | 'medium' | 'full';

const SNAP_RATIOS: Record<SnapPoint, number> = {
  collapsed: 0.18,
  medium: 0.50,
  full: 0.90,
};

const SPRING_SNAP = { damping: springCfg.sheet.damping, stiffness: springCfg.sheet.stiffness, mass: 1 };

export default function GlanceSheet({ children }: { children: React.ReactNode }) {
  const { closeGlance } = useGlance();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const currentSnap = useRef<SnapPoint>('medium');
  const sheetStartY = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const isScrolling = useRef(false);
  const mounted = useRef(false);

  const handleClose = useCallback(() => {
    const y = SCREEN_HEIGHT;
    translateY.value = withSpring(y, SPRING_SNAP, () => {
      runOnJS(closeGlance)();
    });
  }, [closeGlance]);

  const snapTo = useCallback((point: SnapPoint, animated = true) => {
    const y = SCREEN_HEIGHT - (SNAP_RATIOS[point] * SCREEN_HEIGHT);
    currentSnap.current = point;
    translateY.value = animated
      ? withSpring(-y, SPRING_SNAP)
      : -y;
    sheetStartY.value = -y;
  }, []);

  const getRubberBounced = useCallback((dy: number): number => {
    const minY = -(SCREEN_HEIGHT - insets.top - 40);
    const maxY = 20;
    if (dy < minY) return minY - (minY - dy) * 0.25;
    if (dy > maxY) return maxY + (dy - maxY) * 0.25;
    return dy;
  }, [insets.top]);

  const getSnapTarget = useCallback((dy: number, vy: number): SnapPoint | null => {
    const current = currentSnap.current;
    if (vy > 0.6 && current === 'collapsed') return null;
    if (vy > 0.6) return current === 'full' ? 'medium' : 'collapsed';
    if (vy < -0.6) return current === 'collapsed' ? 'medium' : 'full';
    const snaps: SnapPoint[] = ['collapsed', 'medium', 'full'];
    const currentY = SCREEN_HEIGHT - (SNAP_RATIOS[current] * SCREEN_HEIGHT);
    let bestDelta = Infinity;
    let bestSnap: SnapPoint = current;
    for (const s of snaps) {
      const snapY = SCREEN_HEIGHT - (SNAP_RATIOS[s] * SCREEN_HEIGHT);
      const delta = Math.abs((currentY + dy) - snapY);
      if (delta < bestDelta) { bestDelta = delta; bestSnap = s; }
    }
    return bestSnap;
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => {
      if (isScrolling.current && gs.dy > 0) return scrollOffset.current <= 1;
      if (currentSnap.current === 'full') return gs.dy > 15 && scrollOffset.current <= 1;
      return Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 2;
    },
    onPanResponderGrant: () => {
      translateY.value = sheetStartY.value;
    },
    onPanResponderMove: (_, gs) => {
      translateY.value = getRubberBounced(sheetStartY.value + gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      const target = getSnapTarget(gs.dy, gs.vy);
      if (target === null) {
        runOnJS(handleClose)();
      } else {
        runOnJS(snapTo)(target);
      }
    },
  }), [handleClose, getSnapTarget, getRubberBounced]);

  const onLayout = useCallback(() => {
    if (!mounted.current) {
      mounted.current = true;
      snapTo('medium', false);
      setTimeout(() => snapTo('medium', true), 50);
    }
  }, []);

  const handleScroll = useCallback((e: any) => {
    scrollOffset.current = e.nativeEvent.contentOffset.y;
    isScrolling.current = e.nativeEvent.contentOffset.y > 1;
  }, []);

  const handleScrollEnd = useCallback(() => {
    isScrolling.current = scrollOffset.current > 1;
  }, []);

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-SCREEN_HEIGHT, 0],
      [0.95, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const rSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, rBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <Animated.View
          onLayout={onLayout}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.space12 }, rSheetStyle]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.space8 }]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            nestedScrollEnabled
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: zIndex.modal,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
  },
  keyboardView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1017',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: glass.border,
    maxHeight: '92%',
    minHeight: 120,
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
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing.space24,
  },
});
