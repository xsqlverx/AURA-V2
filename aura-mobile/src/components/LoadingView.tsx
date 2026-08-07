import { View, StyleSheet } from 'react-native';
import OrbContainer from './OrbContainer';
import { spacing } from '../tokens/spacing';
import type { OrbState } from '../stores/wsStore';

type Props = {
  state?: OrbState;
  label?: string;
};

export default function LoadingView({ state = 'thinking', label = 'Processing...' }: Props) {
  return (
    <View style={styles.container}>
      <OrbContainer state={state} size={60} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.space48,
  },
});
