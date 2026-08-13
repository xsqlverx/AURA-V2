import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { typography } from '../../src/tokens/typography';
import { GLANCE_META } from '../../src/components/glances';
import Icon from '../../src/components/Icon';
import { text as tx } from '../../src/tokens/colors';

type NavItem = { label: string; icon: string; route: string };

const SECTION_AURA: NavItem[] = [
  { label: 'Home', icon: 'home', route: 'index' },
  { label: 'Chat', icon: 'chat', route: 'chat' },
];

const SECTION_CONTROL: NavItem[] = [
  { label: 'Actions', icon: 'bolt', route: 'actions' },
  { label: 'Presets', icon: 'bookmark', route: 'presets' },
];

const SECTION_KNOWLEDGE: NavItem[] = [
  { label: 'Memory', icon: GLANCE_META.memory.icon, route: 'memory' },
  { label: 'Notes', icon: GLANCE_META.notes.icon, route: 'notes' },
  { label: 'Files', icon: GLANCE_META.files.icon, route: 'files' },
];

const SECTION_SYSTEM: NavItem[] = [
  { label: 'Desktop Status', icon: GLANCE_META.desktop.icon, route: 'desktop' },
  { label: 'Processes', icon: GLANCE_META.processes.icon, route: 'processes' },
  { label: 'Activity', icon: GLANCE_META.activity.icon, route: 'activity' },
  { label: 'Health', icon: GLANCE_META.health.icon, route: 'health' },
  { label: 'Media', icon: GLANCE_META.media.icon, route: 'media' },
  { label: 'Stats', icon: 'bar-chart', route: 'stats' },
  { label: 'Settings', icon: 'settings', route: 'settings' },
];

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  { label: 'AURA', items: SECTION_AURA },
  { label: 'CONTROL', items: SECTION_CONTROL },
  { label: 'KNOWLEDGE', items: SECTION_KNOWLEDGE },
  { label: 'SYSTEM', items: SECTION_SYSTEM },
];

function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const navigate = (route: string) => {
    router.push(`/(tabs)/${route}` as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarInner}>
            <Icon name="bolt" size={24} color={colors.primary} />
          </View>
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
              const focused = props.state?.index === props.state?.routes?.findIndex((r: any) => r.name === item.route);
              return (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [styles.navItem, focused && styles.navItemActive, pressed && { opacity: 0.85 }]}
                  onPress={() => navigate(item.route)}
                >
                  {focused && <View style={styles.navRail} />}
                  <Icon name={item.icon} size={18} color={focused ? colors.primary : tx.secondary} />
                  <Text style={[styles.navLabel, focused && { color: colors.primary }]}>{item.label}</Text>
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

export default function Layout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgDeep, height: 80 },
        headerStatusBarHeight: 8,
        headerTintColor: colors.onSurface,
        drawerStyle: {
          backgroundColor: colors.bgDeep,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.onSurface,
        sceneStyle: { backgroundColor: colors.bgDeep },
        swipeEnabled: true,
        swipeMinDistance: 10,
        swipeEdgeWidth: 60,
        drawerType: 'slide',
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ headerShown: true, headerTitle: 'Home', headerTitleStyle: { fontWeight: '600' } }}
      />
      <Drawer.Screen
        name="chat"
        options={{ headerShown: true, headerStyle: { backgroundColor: colors.bgDeep, height: 64 }, headerTintColor: colors.onSurface, headerTitle: 'Chat', drawerLabel: 'Chat' }}
      />
      <Drawer.Screen name="actions" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="desktop" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="files" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="memory" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="notes" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="processes" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="stats" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="media" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="activity" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="health" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="presets" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 48, height: 48, borderRadius: radius.card,
    backgroundColor: colors.glassBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  avatarInner: {
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextContainer: { marginLeft: spacing.md, justifyContent: 'center' },
  title: { ...typography.heading2, color: colors.onSurface },
  subtitle: { ...typography.caption, color: colors.primary },
  body: { flex: 1 },
  bodyContent: { paddingBottom: spacing.xl, flexGrow: 1 },
  sectionLabel: {
    ...typography.label, color: tx.tertiary,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.sm, borderRadius: radius.card,
    position: 'relative',
  },
  navItemActive: { backgroundColor: 'rgba(0,229,242,0.06)' },
  navRail: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  navDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginLeft: 'auto',
  },
  navLabel: { ...typography.bodySmall, color: tx.secondary },
});
