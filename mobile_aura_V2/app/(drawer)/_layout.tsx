import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Theme } from '../../src/constants/theme';

type NavItem = { label: string; icon: string; route: string };

const SECTION_AURA: NavItem[] = [
  { label: 'Home', icon: '⬡', route: '/' },
  { label: 'Chat', icon: '◎', route: '/chat' },
];

const SECTION_KNOWLEDGE: NavItem[] = [
  { label: 'Notes', icon: '📋', route: '/notes' },
];

const SECTION_SYSTEM: NavItem[] = [
  { label: 'Desktop Status', icon: '📊', route: '/desktop' },
  { label: 'Settings', icon: '⚙', route: '/settings' },
];

const NAV_SECTIONS = [
  { label: 'AURA', items: SECTION_AURA },
  { label: 'KNOWLEDGE', items: SECTION_KNOWLEDGE },
  { label: 'SYSTEM', items: SECTION_SYSTEM },
];

function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (route: string) => {
    router.navigate(route);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarIcon}>⚡</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>AURA</Text>
          <Text style={styles.subtitle}>Neural Interface</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {NAV_SECTIONS.map((section) => (
          <View key={section.label}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            {section.items.map((item) => {
              const focused = pathname === item.route;
              return (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [
                    styles.navItem,
                    focused && styles.navItemActive,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => navigate(item.route)}
                >
                  {focused && <View style={styles.navRail} />}
                  <Text style={[styles.navIcon, focused && { color: Colors.cyan.primary }]}>{item.icon}</Text>
                  <Text style={[styles.navLabel, focused && { color: Colors.cyan.primary }]}>{item.label}</Text>
                  {focused && <View style={styles.navDot} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background, height: 56 },
        headerStatusBarHeight: 0,
        headerTintColor: Colors.text.primary,
        drawerStyle: {
          backgroundColor: Colors.background,
          width: 280,
        },
        drawerActiveTintColor: Colors.cyan.primary,
        drawerInactiveTintColor: Colors.text.primary,
        sceneStyle: { backgroundColor: Colors.background },
        swipeEnabled: true,
        swipeMinDistance: 10,
        swipeEdgeWidth: 60,
        drawerType: 'slide',
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerShown: false,
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="desktop"
        options={{
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="notes"
        options={{
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          headerShown: false,
          drawerItemStyle: { display: 'none' },
        }}
      />
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
    marginBottom: 8,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  avatarIcon: {
    fontSize: 22,
  },
  headerTextContainer: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.cyan.primary,
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.dim,
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 8,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
  },
  navRail: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
    backgroundColor: Colors.cyan.primary,
  },
  navIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  navDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.cyan.primary,
    marginLeft: 'auto',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
});
