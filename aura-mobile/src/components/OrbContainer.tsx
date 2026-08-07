import { View, Text, StyleSheet } from 'react-native';
import Orb from './orb/Orb';
import { text } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { STATE_LABELS } from './orb/OrbTypes';
import type { OrbState, OrbSizeName } from './orb/OrbTypes';

type Props = {
  state?: OrbState;
  active?: boolean;
  size?: OrbSizeName | number;
  label?: string;
};

export default function OrbContainer({ state, active, size = 'large', label }: Props) {
  const displayLabel = label || (state ? STATE_LABELS[state] : '');

  return (
    <View style={styles.container}>
      <Orb state={state} active={active} size={size} />
      {displayLabel ? (
        <Text style={styles.label}>{displayLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space12,
  },
  label: {
    ...typography.caption,
    color: text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
