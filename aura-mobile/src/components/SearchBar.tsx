import { View, StyleSheet } from 'react-native';
import Icon from './Icon';
import GlassInput from './GlassInput';
import { text } from '../tokens/colors';
import { spacing } from '../tokens/spacing';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <Icon name="search" size={16} color={text.tertiary} />
        </View>
        <GlassInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.space8,
    margin: spacing.space16,
    alignItems: 'center',
  },
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  iconWrap: {
    paddingLeft: spacing.space12,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
});
