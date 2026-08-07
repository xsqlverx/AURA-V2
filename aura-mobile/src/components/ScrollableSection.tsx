import { View, ScrollView, StyleSheet } from 'react-native';
import { spacing } from '../tokens/spacing';

type Props = {
  children: React.ReactNode;
  horizontal?: boolean;
  showsScrollIndicator?: boolean;
  style?: any;
};

export default function ScrollableSection({ children, horizontal = false, showsScrollIndicator = false, style }: Props) {
  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={showsScrollIndicator}
        contentContainerStyle={[styles.horizontal, style]}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={showsScrollIndicator}
      contentContainerStyle={[styles.vertical, style]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontal: {
    gap: spacing.space12,
    paddingHorizontal: spacing.space20,
  },
  vertical: {
    padding: spacing.space20,
    gap: spacing.space12,
  },
});
