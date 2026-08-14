import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';
import { HealthGlance } from '../../src/components/glances/glances';

export default function HealthPage() {
  return (
    <SafeAreaView style={styles.container}>
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