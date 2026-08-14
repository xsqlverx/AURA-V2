import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';
import { FilesGlance } from '../../src/components/glances/glances';

export default function FilesPage() {
  return (
    <SafeAreaView style={styles.container}>
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