import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { glass, glow as glowColors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { duration, stagger, spring } from '../tokens/animation';
import { blurIntensity } from '../tokens/blur';
import { spacing } from '../tokens/spacing';
import { zIndex } from '../tokens/zindex';

type GlassVariant = 'default' | 'elevated' | 'active' | 'memory' | 'error' | 'glowCyan';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  glow?: 'cyan' | 'purple' | 'none';
  intensity?: number;
  blur?: number;
  index?: number;
  noPadding?: boolean;
  onPress?: () => void;
};

const VARIANT_CONFIG: Record<GlassVariant, { border: string; blur: number; glowColor: string | null; glowSize: number }> = {
  default: { border: glass.border, blur: blurIntensity.subtle, glowColor: null, glowSize: 0 },
  elevated: { border: glass.borderStrong, blur: blurIntensity.standard, glowColor: glowColors.subtle, glowSize: 120 },
  active: { border: 'rgba(0,242,255,0.4)', blur: blurIntensity.standard, glowColor: glowColors.active, glowSize: 120 },
  memory: { border: 'rgba(188,140,255,0.3)', blur: blurIntensity.standard, glowColor: glowColors.memory, glowSize: 120 },
  error: { border: 'rgba(255,69,58,0.3)', blur: blurIntensity.standard, glowColor: null, glowSize: 0 },
  glowCyan: { border: glass.border, blur: blurIntensity.standard, glowColor: glowColors.active, glowSize: 120 },
};

const GLOW_MAP: Record<string, string> = {
  cyan: glowColors.subtle,
  purple: glowColors.memory,
  none: '',
};

export default function GlassCard({
  children,
  style,
  variant,
  glow = 'none',
  intensity,
  blur,
  index = 0,
  noPadding = false,
  onPress,
}: Props) {
  const resolvedVariant: GlassVariant = variant || (glow !== 'none' ? (glow === 'cyan' ? 'glowCyan' : 'memory') : 'default');
  const config = VARIANT_CONFIG[resolvedVariant];
  const blurAmount = blur ?? intensity ?? config.blur;
  const glowBg = config.glowColor || (glow !== 'none' ? GLOW_MAP[glow] : null);
  const glowSize = config.glowSize || 120;

  const cardInner = (
    <View style={[styles.outer, { borderColor: config.border }, style]}>
      {glowBg && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: glowBg,
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
            },
          ]}
        />
      )}
      <BlurView intensity={blurAmount} tint="dark" style={styles.blur}>
        <View style={[styles.overlay, noPadding && { padding: 0 }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.slow).delay(Math.min(index * stagger.normal, 300)).springify().damping(spring.default.damping).stiffness(spring.default.stiffness)}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }}
        >
          {cardInner}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.slow).delay(Math.min(index * stagger.normal, 300)).springify().damping(spring.default.damping).stiffness(spring.default.stiffness)}
    >
      {cardInner}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    opacity: 0.5,
    zIndex: zIndex.background,
  },
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: glass.bg,
    padding: spacing.space16,
  },
});
