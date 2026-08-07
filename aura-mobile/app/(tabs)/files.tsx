import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';
import GlanceHeader from '../../src/components/glances/GlanceHeader';
import { FilesGlance } from '../../src/components/glances/glances';

export default function FilesPage() {
  return (
    <SafeAreaView style={styles.container}>
      <GlanceHeader icon="folder" title="Files" subtitle="Browse PC files" />
      <FilesGlance />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
});