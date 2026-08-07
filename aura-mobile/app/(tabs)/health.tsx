import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';
import GlanceHeader from '../../src/components/glances/GlanceHeader';
import { HealthGlance } from '../../src/components/glances/glances';

export default function HealthPage() {
  return (
    <SafeAreaView style={styles.container}>
      <GlanceHeader icon="heart" title="Health" subtitle="System status" />
      <HealthGlance />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
});