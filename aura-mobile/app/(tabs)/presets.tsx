import { View, Text, Pressable, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { colors } from '../../src/theme';
import { typography } from '../../src/tokens/typography';
import { glass, text } from '../../src/tokens/colors';
import { radius } from '../../src/tokens/radius';
import Icon from '../../src/components/Icon';
import SpeakSection from '../../src/components/mission-control/SpeakSection';

export default function PresetsPage() {
  const navigation = useNavigation<DrawerNavigationProp<{}>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Icon name="menu" size={20} color={text.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Presets</Text>
          <Text style={styles.headerSub}>Quick phrases for Aura to speak</Text>
        </View>
      </View>
      <View style={styles.content}>
        <SpeakSection />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: glass.bg, borderWidth: 1, borderColor: glass.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.onSurface,
    fontSize: 18,
    letterSpacing: 1,
  },
  headerText: { flex: 1 },
  headerSub: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
