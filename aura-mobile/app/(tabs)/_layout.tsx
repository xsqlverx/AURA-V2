import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from 'expo-router/drawer';
import { colors, typography, spacing, radius } from '../../src/theme';
import { Bot } from 'lucide-react-native';

function CustomDrawerContent(props: any) {
  return (
    <View style={styles.container}>
      {/* Header Profile Section */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Bot size={28} color={colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>AURA</Text>
          <Text style={styles.subtitle}>Neural Interface</Text>
        </View>
      </View>

      {/* Navigation Items */}
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    </View>
  );
}

export default function Layout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bgDeep },
        headerTintColor: colors.onSurface,
        drawerStyle: {
          backgroundColor: colors.bgDeep,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.onSurface,
        drawerActiveBackgroundColor: colors.glassBg,
        drawerLabelStyle: {
          ...typography.bodyMd,
          marginLeft: -16, // Fixes the awkward default spacing between icon and text
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.card,
    backgroundColor: colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerTextContainer: {
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.primary,
    opacity: 0.8,
  },
  scrollContainer: {
    paddingTop: 0,
  },
});