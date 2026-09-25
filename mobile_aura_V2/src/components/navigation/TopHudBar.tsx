import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';

interface TopHudBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export function TopHudBar({ title = 'AURA', subtitle, showBack = false }: TopHudBarProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const { pcConnected, orbState } = useAppStore();

  const handleMenu = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (showBack) {
      router.back();
    } else {
      navigation.dispatch({ type: 'OPEN_DRAWER' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <Pressable style={styles.menuBtn} onPress={handleMenu}>
          <Text style={styles.menuIcon}>{showBack ? '←' : '☰'}</Text>
        </Pressable>
        <View style={styles.titleCol}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{title}</Text>
            <View
              style={[
                styles.livePulseDot,
                {
                  backgroundColor:
                    orbState === 'listening'
                      ? Colors.cyan.primary
                      : orbState === 'thinking'
                      ? Colors.gold.primary
                      : Colors.purple.light,
                },
              ]}
            />
          </View>
          {subtitle ? (
            <Text style={styles.subtitleText}>{subtitle}</Text>
          ) : (
            <Text style={styles.subtitleText}>COPILOT // STANDALONE</Text>
          )}
        </View>
      </View>

      <View style={styles.rightGroup}>
        <View
          style={[
            styles.pcBadge,
            {
              borderColor: pcConnected ? Colors.green.dim : Colors.surfaceBorder,
              backgroundColor: pcConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(101, 96, 119, 0.1)',
            },
          ]}
        >
          <View
            style={[
              styles.badgeDot,
              { backgroundColor: pcConnected ? Colors.green.primary : Colors.text.dim },
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              { color: pcConnected ? Colors.green.bright : Colors.text.dim },
            ]}
          >
            {pcConnected ? 'PC LINKED' : 'OFFLINE'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 8, 12, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 16,
    color: Colors.cyan.primary,
  },
  titleCol: {
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.text.primary,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: Colors.purple.vibrant,
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  subtitleText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 8.5,
    letterSpacing: 1,
    color: Colors.text.dim,
    marginTop: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontFamily: 'JetBrains Mono, Menlo, monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
