import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';
import GlanceHeader from '../../src/components/glances/GlanceHeader';
import ActivityLog from '../../src/components/ActivityLog';

export default function ActivityPage() {
  return (
    <SafeAreaView style={styles.container}>
      <GlanceHeader icon="activity" title="PC Activity" subtitle="boot, apps, web" />
      <ActivityLog />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
});