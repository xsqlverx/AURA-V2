import { useState, ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { glass, glow as glowColors, semantic, accent } from '../tokens/colors';
import { radius as radiusTokens } from '../tokens/radius';
import { duration, spring, stagger } from '../tokens/animation';
import { blurIntensity } from '../tokens/blur';
import { spacing } from '../tokens/spacing';
import { zIndex } from '../tokens/zindex';

type GlassVariant = 'default' | 'elevated' | 'interactive' | 'active' | 'memory' | 'error' | 'glowCyan';

type GlowVariant = 'none' | 'cyan' | 'purple' | 'success' | 'error';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  padding?: 12 | 16 | 20;
  radius?: 14 | 20 | 28;
  glow?: GlowVariant;
  intensity?: number;
  index?: number;
  noPadding?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

const VARIANT_CONFIG: Record<GlassVariant, {
  bg: string;
  border: string;
  blur: number;
  glowColor: string | null;
  glowSize: number;
}> = {
  default: { bg: glass.glass0, border: glass.border, blur: blurIntensity.none, glowColor: null, glowSize: 0 },
  elevated: { bg: glass.glass1, border: glass.borderStrong, blur: blurIntensity.glass1, glowColor: null, glowSize: 0 },
  interactive: { bg: glass.glass0, border: glass.border, blur: blurIntensity.none, glowColor: null, glowSize: 0 },
  active: {
    bg: glass.glass1,
    border: 'rgba(0,229,242,0.22)',
    blur: blurIntensity.none,
    glowColor: glowColors.cyan08,
    glowSize: 140,
  },
  memory: { bg: glass.glass1, border: 'rgba(184,140,255,0.24)', blur: blurIntensity.none, glowColor: glowColors.purple08, glowSize: 120 },
  error: { bg: glass.glass1, border: 'rgba(255,90,97,0.24)', blur: blurIntensity.none, glowColor: null, glowSize: 0 },
  glowCyan: { bg: glass.glass1, border: glass.border, blur: blurIntensity.none, glowColor: glowColors.cyan08, glowSize: 120 },
};

const GLOW_MAP: Record<Exclude<GlowVariant, 'none'>, string> = {
  cyan: glowColors.cyan08,
  purple: glowColors.purple08,
  success: glowColors.success16,
  error: glowColors.error16,
};

export default function GlassCard({
  children,
  style,
  variant,
  padding = 16,
  radius = radiusTokens.lg,
  glow = 'none',
  intensity,
  index = 0,
  noPadding = false,
  disabled = false,
  onPress,
}: Props) {
  const resolvedVariant: GlassVariant =
    variant || (glow !== 'none' ? (glow === 'cyan' ? 'glowCyan' : glow === 'purple' ? 'memory' : 'default') : 'default');
  const config = VARIANT_CONFIG[resolvedVariant];
  const glowBg = config.glowColor || (glow !== 'none' ? GLOW_MAP[glow] : null);
  const [pressed, setPressed] = useState(false);

  const cardInner = (
    <View style={[
      styles.outer,
      {
        borderColor: config.border,
        borderRadius: radius,
        backgroundColor: config.bg,
        opacity: disabled ? 0.45 : 1,
      },
      style,
    ]}>
      {glowBg && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: glowBg,
              width: config.glowSize,
              height: config.glowSize,
              borderRadius: config.glowSize / 2,
            },
          ]}
        />
      )}
      {pressed && <View style={[styles.pressOverlay, { borderRadius: radius }]} />}
      {config.blur > 0 && Platform.OS === 'ios' ? (
        <BlurView intensity={config.blur} tint="dark" style={[styles.blur, { borderRadius: radius }]}>
          <View style={[styles.overlay, { padding: noPadding ? 0 : padding }]}>{children}</View>
        </BlurView>
      ) : (
        <View style={[styles.overlay, { padding: noPadding ? 0 : padding }]}>{children}</View>
      )}
    </View>
  );

  const entering = FadeInDown
    .delay(Math.min(stagger.initial + index * stagger.fast, stagger.maxTotal))
    .springify()
    .damping(spring.micro.damping)
    .stiffness(spring.micro.stiffness)
    .mass(spring.micro.mass)
    .withInitialValues({ translateY: 8 });

  if (onPress) {
    return (
      <Animated.View entering={entering}>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          style={({ pressed }) => pressed && { transform: [{ scale: 0.985 }] }}
        >
          {cardInner}
        </Pressable>
      </Animated.View>
    );
  }

  return <Animated.View entering={entering}>{cardInner}</Animated.View>;
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    opacity: 0.6,
    zIndex: zIndex.background,
  },
  pressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.015)',
    zIndex: 1,
  },
  blur: {
    overflow: 'hidden',
  },
  overlay: {},
});
