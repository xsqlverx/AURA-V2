import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';
import { DesktopGlance } from '../../src/components/glances/glances';

export default function DesktopPage() {
  return (
    <SafeAreaView style={styles.container}>
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