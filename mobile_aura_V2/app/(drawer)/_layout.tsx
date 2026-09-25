import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';

type NavItem = { label: string; icon: string; route: string; sub?: string };

const SECTION_AURA: NavItem[] = [
  { label: 'Home Matrix', icon: '⬡', route: '/', sub: 'Orb & Dashboard' },
  { label: 'Chat Interface', icon: '◎', route: '/chat', sub: 'Neural Streaming' },
  { label: 'Automation Hub', icon: '⚡', route: '/automation', sub: 'Phone & PC Actions' },
];

const SECTION_TELEMETRY: NavItem[] = [
  { label: 'PC Live Telemetry', icon: '📊', route: '/desktop', sub: 'CPU, RAM & Media' },
  { label: 'Knowledge Vault', icon: '📋', route: '/notes', sub: 'Obsidian Notes' },
];

const SECTION_SYSTEM: NavItem[] = [
  { label: 'Core Settings', icon: '⚙', route: '/settings', sub: 'LLM & Voice Config' },
];

const NAV_SECTIONS = [
  { label: 'CORE AGENT', items: SECTION_AURA },
  { label: 'DESKTOP LINK', items: SECTION_TELEMETRY },
  { label: 'SYSTEM', items: SECTION_SYSTEM },
];

function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { pcConnected, orbState } = useAppStore();

  const navigate = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.navigate(route as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      {/* Header Profile */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarIcon}>🟣</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>AURA V2</Text>
          <Text style={styles.subtitle}>NEURAL COPILOT</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: pcConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(101, 96, 119, 0.15)' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: pcConnected ? Colors.green.primary : Colors.text.dim },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: pcConnected ? Colors.green.bright : Colors.text.dim },
            ]}
          >
            {pcConnected ? 'ONLINE' : 'LOCAL'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {NAV_SECTIONS.map((section) => (
          <View key={section.label} style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            {section.items.map((item) => {
              const focused =
                pathname === item.route ||
                (item.route === '/' && (pathname === '' || pathname === '/index'));
              return (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [
                    styles.navItem,
                    focused && styles.navItemActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => navigate(item.route)}
                >
                  {focused && <View style={styles.navRail} />}
                  <Text
                    style={[
                      styles.navIcon,
                      focused && { color: Colors.cyan.primary },
                    ]}
                  >
                    {item.icon}
                  </Text>
                  <View style={styles.navTextCol}>
                    <Text
                      style={[
                        styles.navLabel,
                        focused && { color: Colors.text.primary, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.sub ? <Text style={styles.navSub}>{item.sub}</Text> : null}
                  </View>
                  {focused && <View style={styles.navDot} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>AURA HYBRID // SAMSUNG GALAXY</Text>
        <Text style={styles.footerSub}>STATE: {orbState.toUpperCase()}</Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: Colors.background,
          width: 300,
          borderRightWidth: 1,
          borderRightColor: Colors.surfaceBorder,
        },
        sceneStyle: { backgroundColor: Colors.background },
        swipeEnabled: true,
        swipeMinDistance: 15,
        swipeEdgeWidth: 80,
        drawerType: 'slide',
        overlayColor: 'rgba(5, 4, 8, 0.75)',
      }}
    >
      <Drawer.Screen name="index" options={{ headerShown: false }} />
      <Drawer.Screen name="chat" options={{ headerShown: false }} />
      <Drawer.Screen name="automation" options={{ headerShown: false }} />
      <Drawer.Screen name="desktop" options={{ headerShown: false }} />
      <Drawer.Screen name="notes" options={{ headerShown: false }} />
      <Drawer.Screen name="settings" options={{ headerShown: false }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    marginBottom: 10,
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(106, 83, 153, 0.25)',
    borderWidth: 1,
    borderColor: Colors.purple.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 18,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    color: Colors.cyan.primary,
    letterSpacing: 1,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 20,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.dim,
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginHorizontal: 10,
    borderRadius: 12,
    position: 'relative',
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(106, 83, 153, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(106, 83, 153, 0.35)',
  },
  navRail: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.cyan.primary,
  },
  navIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  navTextCol: {
    flex: 1,
  },
  navLabel: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  navSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    color: Colors.text.dim,
    marginTop: 2,
  },
  navDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.cyan.primary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    gap: 2,
  },
  footerText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    letterSpacing: 1,
    color: Colors.text.dim,
  },
  footerSub: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    letterSpacing: 1,
    color: Colors.purple.light,
  },
});
