import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItem {
  key: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  route: '/' | '/chat' | '/automation' | '/settings';
}

const TABS: TabItem[] = [
  { key: 'home', label: 'MATRIX', iconName: 'planet-outline', route: '/' },
  { key: 'chat', label: 'CHAT', iconName: 'chatbubble-ellipses-outline', route: '/chat' },
  { key: 'automation', label: 'AUTOMATE', iconName: 'flash-outline', route: '/automation' },
  { key: 'settings', label: 'SYSTEM', iconName: 'hardware-chip-outline', route: '/settings' },
];

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Find active tab index
  const getActiveIndex = () => {
    if (pathname === '/chat') return 1;
    if (pathname === '/automation') return 2;
    if (pathname === '/settings') return 3;
    return 0; // Default to Home
  };

  const activeIndex = getActiveIndex();
  const tabWidth = (SCREEN_WIDTH - 32 - 16) / TABS.length; // Container margin: 16 each side, padding: 8 each side
  const pillTranslateX = useSharedValue(activeIndex * tabWidth);

  useEffect(() => {
    pillTranslateX.value = withSpring(activeIndex * tabWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  }, [activeIndex, tabWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillTranslateX.value }],
    width: tabWidth,
  }));

  const handlePress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace(route as any);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.glassPlate}>
        {/* Sliding Liquid Glass Pill */}
        <Animated.View style={[styles.slidingPill, pillStyle]}>
          <View style={styles.pillGlowBorder} />
        </Animated.View>

        {/* Tab Buttons */}
        {TABS.map((tab, idx) => {
          const isActive = activeIndex === idx;

          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handlePress(tab.route)}
            >
              <Ionicons
                name={tab.iconName}
                size={18}
                color={isActive ? Colors.cyan.primary : Colors.text.dim}
                style={isActive ? styles.activeIconGlow : undefined}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? Colors.text.primary : Colors.text.dim,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  glassPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 14, 22, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(106, 83, 153, 0.35)',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    position: 'relative',
    shadowColor: Colors.purple.glowStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 20,
  },
  slidingPill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(106, 83, 153, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.45)',
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  pillGlowBorder: {
    position: 'absolute',
    top: 0,
    left: '30%',
    right: '30%',
    height: 2,
    backgroundColor: Colors.cyan.primary,
    borderRadius: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
    zIndex: 2,
  },
  activeIconGlow: {
    shadowColor: Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  tabLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    letterSpacing: 0.8,
  },
});
