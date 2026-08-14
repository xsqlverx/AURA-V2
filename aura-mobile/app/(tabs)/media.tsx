import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';
import { MediaGlance } from '../../src/components/glances/glances';

export default function MediaPage() {
  return (
    <SafeAreaView style={styles.container}>
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