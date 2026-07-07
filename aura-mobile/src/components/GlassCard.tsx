import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  glow?: 'cyan' | 'purple' | 'none';
};

export default function GlassCard({
  children,
  style,
  intensity = 40,
  glow = 'none',
}: Props) {
  return (
    <View style={[styles.outer, style]}>
      {glow !== 'none' && (
        <View
          style={[
            styles.glow,
            { backgroundColor: glow === 'cyan' ? colors.glowCyan : colors.glowPurple },
          ]}
        />
      )}
      <BlurView intensity={intensity} tint="dark" style={styles.blur}>
        <View style={styles.overlay}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.5,
  },
  blur: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: colors.glassBg,
    padding: 16,
  },
});
