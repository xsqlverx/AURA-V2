import { Platform } from 'react-native';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function triggerHaptic(type: HapticType = 'light') {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    const map: Record<HapticType, any> = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    };
    if (['success', 'warning', 'error'].includes(type)) {
      Haptics.notificationAsync(map[type]);
    } else {
      Haptics.impactAsync(map[type]);
    }
  } catch {}
}

export const haptic = {
  press: () => triggerHaptic('light'),
  toggle: () => triggerHaptic('light'),
  longPress: () => triggerHaptic('medium'),
  error: () => triggerHaptic('error'),
  success: () => triggerHaptic('success'),
};
