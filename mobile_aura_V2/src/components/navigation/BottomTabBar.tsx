import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

interface TabItem {
  key: string;
  label: string;
  icon: string;
  route: '/' | '/chat' | '/automation' | '/settings';
}

const TABS: TabItem[] = [
  { key: 'home', label: 'HOME', icon: '⬡', route: '/' },
  { key: 'chat', label: 'CHAT', icon: '◎', route: '/chat' },
  { key: 'automation', label: 'AUTOMATE', icon: '⚡', route: '/automation' },
  { key: 'settings', label: 'SYSTEM', icon: '⚙', route: '/settings' },
];

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handlePress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace(route as any);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.glassPlate}>
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.route ||
            (tab.route === '/' && (pathname === '' || pathname === '/index'));

          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tabItem,
                isActive && styles.tabItemActive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handlePress(tab.route)}
            >
              {isActive && <View style={styles.activeGlowBar} />}
              <Text
                style={[
                  styles.tabIcon,
                  {
                    color: isActive ? Colors.cyan.primary : Colors.text.dim,
                    textShadowColor: isActive ? Colors.cyan.glowStrong : 'transparent',
                    textShadowRadius: isActive ? 8 : 0,
                  },
                ]}
              >
                {tab.icon}
              </Text>
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
              {isActive && <View style={styles.activeIndicatorDot} />}
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
    justifyContent: 'space-around',
    backgroundColor: 'rgba(17, 16, 24, 0.88)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: Colors.purple.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 16,
    position: 'relative',
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: 'rgba(106, 83, 153, 0.16)',
  },
  activeGlowBar: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2,
    backgroundColor: Colors.cyan.primary,
    borderRadius: 1,
    shadowColor: Colors.cyan.primary,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  tabIcon: {
    fontSize: 17,
  },
  tabLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.cyan.primary,
  },
});
