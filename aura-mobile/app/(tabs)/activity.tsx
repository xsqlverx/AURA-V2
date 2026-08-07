import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';
import GlanceHeader from '../../src/components/glances/GlanceHeader';
import { ActivityGlance } from '../../src/components/glances/glances';

export default function ActivityPage() {
  return (
    <SafeAreaView style={styles.container}>
      <GlanceHeader icon="activity" title="Activity" subtitle="Recent actions" />
      <ActivityGlance />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
});