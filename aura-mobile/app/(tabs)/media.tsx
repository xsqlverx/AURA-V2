import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';
import GlanceHeader from '../../src/components/glances/GlanceHeader';
import { MediaGlance } from '../../src/components/glances/glances';

export default function MediaPage() {
  return (
    <SafeAreaView style={styles.container}>
      <GlanceHeader icon="music" title="Media" subtitle="Now playing" />
      <MediaGlance />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
});