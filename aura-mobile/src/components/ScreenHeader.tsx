import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInLeft } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Icon from './Icon';
import StatusChip from './StatusChip';
import { backgrounds, glass, text, accent } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { duration } from '../tokens/animation';

type Variant = 'default' | 'home' | 'modal';

type Props = {
  variant?: Variant;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  action?: React.ReactNode;
  onMenuPress?: () => void;
  statusVariant?: 'online' | 'offline' | 'thinking' | 'speaking';
  statusLabel?: string;
};

export default function ScreenHeader({
  variant = 'default',
  title,
  subtitle,
  showBack = false,
  action,
  onMenuPress,
  statusVariant,
  statusLabel,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {variant === 'home' ? (
        <View style={styles.homeLeft}>
          {onMenuPress && (
            <Pressable onPress={onMenuPress} style={styles.menuBtn}>
              <Icon name="menu" size={20} color={text.primary} />
            </Pressable>
          )}
          <View style={styles.logoWrap}>
            <Icon name="psychology" size={22} color={accent.cyan} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      ) : showBack ? (
        <Animated.View entering={SlideInLeft.duration(duration.normal)} style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-back" size={20} color={accent.cyan} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}

      <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.right}>
        {statusVariant && statusLabel && (
          <StatusChip variant={statusVariant} label={statusLabel} />
        )}
        {action}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
    backgroundColor: backgrounds.deep,
    height: 56,
  },
  homeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,242,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  backBtn: {
    padding: 6,
    borderRadius: radius.sm,
  },
  title: {
    ...typography.heading2,
    color: text.primary,
  },
  subtitle: {
    color: text.secondary,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
});
