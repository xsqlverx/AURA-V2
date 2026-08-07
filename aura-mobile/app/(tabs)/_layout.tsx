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

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: 'home', route: 'index' },
  { label: 'Chat', icon: 'chat', route: 'chat' },
];

const GLANCE_ITEMS: NavItem[] = [
  { label: 'Desktop Status', icon: GLANCE_META.desktop.icon, route: 'desktop' },
  { label: 'Memory', icon: GLANCE_META.memory.icon, route: 'memory' },
  { label: 'Files', icon: GLANCE_META.files.icon, route: 'files' },
  { label: 'Processes', icon: GLANCE_META.processes.icon, route: 'processes' },
  { label: 'Notes', icon: GLANCE_META.notes.icon, route: 'notes' },
  { label: 'Media', icon: GLANCE_META.media.icon, route: 'media' },
  { label: 'Activity', icon: GLANCE_META.activity.icon, route: 'activity' },
  { label: 'Health', icon: GLANCE_META.health.icon, route: 'health' },
  { label: 'Presets', icon: GLANCE_META.memory.icon, route: 'presets' },
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
        <Text style={styles.sectionLabel}>SCREENS</Text>
        {NAV_ITEMS.map((item) => {
          const focused = props.state?.index === props.state?.routes?.findIndex((r: any) => r.name === item.route);
          return (
            <Pressable
              key={item.route}
              style={({ pressed }) => [styles.navItem, focused && styles.navItemActive, pressed && { opacity: 0.85 }]}
              onPress={() => navigate(item.route)}
            >
              <Icon name={item.icon} size={18} color={focused ? colors.primary : tx.secondary} />
              <Text style={[styles.navLabel, focused && { color: colors.primary }]}>{item.label}</Text>
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>PAGES</Text>
        <View style={styles.glanceSection}>
          {GLANCE_ITEMS.map((item) => {
            const focused = props.state?.index === props.state?.routes?.findIndex((r: any) => r.name === item.route);
            return (
              <Pressable
                key={item.route}
                style={({ pressed }) => [styles.glanceItem, focused && styles.navItemActive, pressed && { opacity: 0.85 }]}
                onPress={() => navigate(item.route)}
              >
                <Icon name={item.icon} size={18} color={focused ? colors.primary : tx.secondary} />
                <Text style={[styles.glanceLabel, focused && { color: colors.primary }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
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
        swipeEnabled: true,
        swipeMinDistance: 10,
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
    ...typography.label, color: colors.primary,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.sm, borderRadius: radius.card,
  },
  navItemActive: { backgroundColor: colors.glassBg },
  navLabel: { ...typography.bodySmall, color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: spacing.sm, marginHorizontal: spacing.lg },
  glanceSection: { paddingHorizontal: spacing.sm, gap: 2 },
  glanceItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
  },
  glanceItemPressed: { backgroundColor: colors.glassBg, opacity: 0.85 },
  glanceLabel: { color: colors.onSurface, fontSize: 14, fontWeight: '500' },
});
