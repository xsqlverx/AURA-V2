import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, PanResponder,
  ScrollView, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
  interpolate, Extrapolation, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backgrounds, glass, text } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { opacity as opacityValues } from '../tokens/opacity';
import { zIndex } from '../tokens/zindex';
import { spring as springCfg } from '../tokens/animation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SnapPoint = 'collapsed' | 'medium' | 'full';
type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  initialSnap?: SnapPoint;
};

const SNAP_RATIOS: Record<SnapPoint, number> = {
  collapsed: 0.18,
  medium: 0.5,
  full: 0.9,
};

export default function BottomSheet({ visible, onClose, title, children, initialSnap = 'medium' }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const currentSnap = useRef<SnapPoint>(initialSnap);
  const sheetStartY = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const isScrolling = useRef(false);

  const snapTo = useCallback((point: SnapPoint, animated = true) => {
    const y = SCREEN_HEIGHT - (SNAP_RATIOS[point] * SCREEN_HEIGHT);
    currentSnap.current = point;
    translateY.value = animated
      ? withSpring(-y, { damping: springCfg.default.damping, stiffness: springCfg.default.stiffness, mass: 1 })
      : -y;
    sheetStartY.value = -y;
  }, []);

  const getRubberBounced = useCallback((dy: number): number => {
    const minY = -(SCREEN_HEIGHT - insets.top - 20);
    const maxY = 0;
    if (dy < minY) return minY - (minY - dy) * 0.3;
    if (dy > maxY) return maxY + (dy - maxY) * 0.3;
    return dy;
  }, [insets.top]);

  const getSnapTarget = useCallback((dy: number, vy: number): SnapPoint => {
    const current = currentSnap.current;
    if (vy > 0.5) return current === 'full' ? 'medium' : 'collapsed';
    if (vy < -0.5) return current === 'collapsed' ? 'medium' : 'full';
    const snaps: SnapPoint[] = ['collapsed', 'medium', 'full'];
    const currentY = SCREEN_HEIGHT - (SNAP_RATIOS[current] * SCREEN_HEIGHT);
    let bestDelta = Infinity;
    let bestSnap: SnapPoint = current;
    for (const s of snaps) {
      const snapY = SCREEN_HEIGHT - (SNAP_RATIOS[s] * SCREEN_HEIGHT);
      const delta = Math.abs((currentY + dy) - snapY);
      if (delta < bestDelta) { bestDelta = delta; bestSnap = s; }
    }
    if (bestSnap === 'collapsed' && current === 'collapsed' && vy > 0.3) runOnJS(onClose)();
    return bestSnap;
  }, [onClose]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => {
      if (isScrolling.current && gs.dy < 0) return false;
      if (currentSnap.current === 'full') return gs.dy > 15 && scrollOffset.current <= 1;
      return Math.abs(gs.dy) > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 2;
    },
    onPanResponderGrant: () => { translateY.value = sheetStartY.value; },
    onPanResponderMove: (_, gs) => { translateY.value = getRubberBounced(sheetStartY.value + gs.dy); },
    onPanResponderRelease: (_, gs) => {
      runOnJS(snapTo)(getSnapTarget(gs.dy, gs.vy));
    },
  }), [getRubberBounced, getSnapTarget]);

  const rBackdrop = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SCREEN_HEIGHT, 0], [0.7, 0], Extrapolation.CLAMP),
  }));

  const rSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, rBackdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.space12 }, rSheet]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          {title && <Text style={styles.title}>{title}</Text>}
          <ScrollView
            ref={scrollRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; isScrolling.current = e.nativeEvent.contentOffset.y > 1; }}
            onScrollEndDrag={() => { isScrolling.current = scrollOffset.current > 1; }}
            onMomentumScrollEnd={() => { isScrolling.current = scrollOffset.current > 1; }}
            scrollEventThrottle={16}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: zIndex.modal,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  keyboardView: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0, top: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: backgrounds.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
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
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: glass.border,
  },
  title: {
    ...typography.heading2,
    color: text.primary,
    paddingHorizontal: spacing.space20,
    paddingVertical: spacing.space8,
  },
  content: {
    flexGrow: 0,
    paddingHorizontal: spacing.space20,
    paddingTop: spacing.space8,
  },
});
