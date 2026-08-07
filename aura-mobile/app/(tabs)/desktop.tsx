import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';
import GlanceHeader from '../../src/components/glances/GlanceHeader';
import { DesktopGlance } from '../../src/components/glances/glances';

export default function DesktopPage() {
  return (
    <SafeAreaView style={styles.container}>
      <GlanceHeader icon="monitor" title="Desktop Status" subtitle="Live PC stats" />
      <DesktopGlance />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
});