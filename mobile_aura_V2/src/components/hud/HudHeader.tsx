import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

interface HudHeaderProps {
  pcConnected: boolean;
  onSettingsPress: () => void;
}

export function HudHeader({ pcConnected, onSettingsPress }: HudHeaderProps) {
  const dotScale = useSharedValue(1);

  React.useEffect(() => {
    dotScale.value = withRepeat(
      withTiming(1.3, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const statusColor = pcConnected ? Colors.status.connected : Colors.status.disconnected;
  const statusLabel = pcConnected ? 'PC ONLINE' : 'PC OFFLINE';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.wordmark}>AURA</Text>
        <View style={styles.statusGroup}>
          <Animated.View style={[styles.statusDot, { backgroundColor: statusColor }, dotStyle]} />
          <Text style={[styles.statusLabel, { color: pcConnected ? Colors.text.secondary : Colors.text.dim }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Pressable onPress={onSettingsPress} style={styles.settingsBtn}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorderGlow,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  wordmark: {
    ...Theme.typography.wordmark,
    color: Colors.cyan.primary,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    ...Theme.typography.hud,
    fontSize: 9,
  },
  settingsBtn: {
    padding: Theme.spacing.sm,
  },
  settingsIcon: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
});
