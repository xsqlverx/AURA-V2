import { Linking, Platform } from 'react-native';
import { devLog } from '../utils/devLog';
import type { MobileCapability } from '../types';

export interface ExecutorResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function executeMobileCapability(
  capability: MobileCapability,
  params: Record<string, unknown>
): Promise<ExecutorResult> {
  try {
    switch (capability) {
      case 'make_call': {
        const number = params.number as string;
        if (!number) throw new Error('No phone number provided');
        const url = `tel:${number}`;
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) throw new Error('Cannot open phone dialer');
        await Linking.openURL(url);
        return { success: true, message: `Calling ${number}` };
      }

      case 'send_sms': {
        const number = params.number as string;
        const body = params.body as string ?? '';
        const url = `sms:${number}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
        await Linking.openURL(url);
        return { success: true, message: `Opening SMS to ${number}` };
      }

      case 'open_url': {
        const url = params.url as string;
        if (!url) throw new Error('No URL provided');
        await Linking.openURL(url);
        return { success: true, message: `Opening ${url}` };
      }

      case 'open_app': {
        const packageName = params.packageName as string;
        if (!packageName) throw new Error('No package name provided');
        if (Platform.OS === 'android') {
          const url = `android-app://${packageName}`;
          await Linking.openURL(url);
          return { success: true, message: `Opening ${packageName}` };
        }
        throw new Error('open_app only supported on Android');
      }

      case 'open_settings': {
        await Linking.openSettings();
        return { success: true, message: 'Opening settings' };
      }

      case 'get_battery_level': {
        return { success: true, message: 'Battery info requires expo-battery (Tier 2)', data: null };
      }

      case 'get_wifi_status': {
        return { success: true, message: 'WiFi status requires expo-network (Tier 2)', data: null };
      }

      case 'set_volume': {
        return { success: false, message: 'Volume control requires native module (Tier 2)' };
      }

      default: {
        devLog.warn(`Unknown mobile capability: ${capability}`);
        return { success: false, message: `Unknown capability: ${capability}` };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    devLog.error(`Mobile executor failed: ${capability}`, { error: message, params });
    return { success: false, message };
  }
}
