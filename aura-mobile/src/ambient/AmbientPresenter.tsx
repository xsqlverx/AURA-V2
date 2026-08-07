import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import type { AmbientEvent, AmbientSurface } from './types';
import { colors, typography, spacing, radius } from '../theme';
import { zIndex } from '../tokens/zindex';
import { semantic } from '../tokens/colors';
import Icon from '../components/Icon';
import { getEventMeta } from './AmbientRegistry';

const { error: errColor, warning: warnColor } = semantic;

type SurfaceProps = {
  event: AmbientEvent;
  onDismiss: (id: string) => void;
};

function AmbientPill({ event, onDismiss }: SurfaceProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    if (event.ttl && event.ttl > 0) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 300, useNativeDriver: true }),
        ]).start(() => onDismiss(event.id));
      }, event.ttl);
      return () => clearTimeout(timer);
    }
  }, []);

  const meta = getEventMeta(event.type);
  const borderColor = event.priority === 'critical'
    ? errColor
    : event.priority === 'important'
      ? warnColor
      : colors.glassBorder;

  return (
    <Animated.View style={[styles.pill, { opacity, transform: [{ translateY }], borderColor }]}>
      <Pressable onPress={() => onDismiss(event.id)} style={styles.pillContent}>
        <Icon name={meta.icon} size={14} color={colors.onSurface} />
        <Text style={styles.pillTitle} numberOfLines={1}>{event.title}</Text>
        {event.description ? (
          <Text style={styles.pillDesc} numberOfLines={1}>{event.description}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function AmbientBanner({ event, onDismiss }: SurfaceProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const meta = getEventMeta(event.type);
  const isCritical = event.priority === 'critical';

  return (
    <Animated.View style={[styles.banner, { opacity, transform: [{ translateY }] }]}>
      <Pressable onPress={() => onDismiss(event.id)} style={styles.bannerContent}>
        <Icon name={meta.icon} size={18} color={isCritical ? errColor : colors.onSurface} />
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, isCritical && { color: errColor }]}>
            {event.title}
          </Text>
          {event.description ? (
            <Text style={styles.bannerDesc}>{event.description}</Text>
          ) : null}
        </View>
        {event.metadata?.action ? (
          <Text style={styles.bannerAction}>{event.metadata.action}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function AmbientToast({ event, onDismiss }: SurfaceProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (event.ttl && event.ttl > 0) {
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
          .start(() => onDismiss(event.id));
      }, event.ttl);
      return () => clearTimeout(timer);
    }
  }, []);

  const meta = getEventMeta(event.type);

  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Pressable onPress={() => onDismiss(event.id)} style={styles.toastContent}>
        <Icon name={meta.icon} size={12} color={colors.onSurfaceSecondary} />
        <Text style={styles.toastText} numberOfLines={1}>{event.title}</Text>
      </Pressable>
    </Animated.View>
  );
}

function AmbientChip({ event }: SurfaceProps) {
  const meta = getEventMeta(event.type);
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: meta.orbColor }]} />
      <Text style={styles.chipText} numberOfLines={1}>{event.title}</Text>
    </View>
  );
}

const SURFACE_MAP: Record<AmbientSurface, React.ComponentType<SurfaceProps>> = {
  pill: AmbientPill,
  banner: AmbientBanner,
  toast: AmbientToast,
  chip: AmbientChip,
  orb: AmbientPill,
  none: () => null,
};

type Props = {
  event: AmbientEvent;
  surface: AmbientSurface;
  onDismiss: (id: string) => void;
};

export function AmbientSurfaceRenderer({ event, surface, onDismiss }: Props) {
  const Component = SURFACE_MAP[surface] || AmbientToast;
  return <Component event={event} onDismiss={onDismiss} />;
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: 80,
    right: spacing.lg,
    zIndex: zIndex.toast,
    maxWidth: 280,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: radius.button,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  pillTitle: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
    flexShrink: 0,
  },
  pillDesc: {
    ...typography.labelSm,
    color: colors.onSurfaceSecondary,
    flexShrink: 1,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.modal,
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerTextContainer: { flex: 1 },
  bannerTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  bannerDesc: {
    ...typography.labelSm,
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },
  bannerAction: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: zIndex.toast,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    ...typography.labelSm,
    color: colors.onSurfaceSecondary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...typography.labelSm,
    color: colors.onSurfaceSecondary,
  },
});
