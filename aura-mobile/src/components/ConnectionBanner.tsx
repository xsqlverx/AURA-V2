import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { semantic } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { zIndex } from '../tokens/zindex';
import { useWs } from '../stores/wsStore';
import { useSettings } from '../stores/settingsStore';

export default function ConnectionBanner() {
  const connected = useWs((s) => s.connected);
  const failed = useWs((s) => s.failed);
  const everConnected = useWs((s) => s.everConnected);
  const isLoaded = useSettings((s) => s.isLoaded);
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (connected) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [connected]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!isLoaded || connected || (!failed && !everConnected)) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + spacing.space8, paddingBottom: spacing.space8 },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Icon name="cloud-off" size={14} color="#fff" />
      <Text style={styles.text}>BACKEND OFFLINE — PC actions unavailable</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,90,97,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
    paddingHorizontal: spacing.space16,
    zIndex: zIndex.overlay,
    elevation: 10,
  },
  text: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});