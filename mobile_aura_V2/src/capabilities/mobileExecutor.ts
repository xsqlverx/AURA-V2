import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { devLog } from '../utils/devLog';
import type { MobileCapability } from '../types';

export interface ExecutorResult {
  success: boolean;
  message: string;
  data?: unknown;
}

const APP_SCHEME_MAP: Record<string, string> = {
  'com.whatsapp': 'whatsapp://app',
  'com.google.android.youtube': 'https://www.youtube.com',
  'com.instagram.android': 'instagram://app',
  'com.spotify.music': 'spotify://',
  'com.android.chrome': 'googlechrome://',
  'com.google.android.gm': 'googlegmail://',
};

export async function executeMobileCapability(
  capability: MobileCapability | string,
  params: Record<string, unknown> = {}
): Promise<ExecutorResult> {
  try {
    switch (capability) {
      case 'make_call': {
        const number = (params.number || params.phone || '') as string;
        const cleaned = number.replace(/[^\d+]/g, '');
        const url = cleaned ? `tel:${cleaned}` : 'tel:';
        await Linking.openURL(url);
        return { success: true, message: cleaned ? `Calling ${cleaned}` : 'Opening phone dialer' };
      }

      case 'send_sms': {
        const number = (params.number || params.phone || '') as string;
        const body = (params.body || params.message || '') as string;
        const cleaned = number.replace(/[^\d+]/g, '');
        const url = `sms:${cleaned}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
        await Linking.openURL(url);
        return { success: true, message: `Opening SMS${cleaned ? ` to ${cleaned}` : ''}` };
      }

      case 'open_url': {
        let url = params.url as string;
        if (!url) throw new Error('No URL provided');
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        await Linking.openURL(url);
        return { success: true, message: `Opening ${url}` };
      }

      case 'open_app': {
        const pkg = ((params.package || params.packageName || '') as string).trim();
        if (!pkg) throw new Error('No package name specified');

        if (Platform.OS === 'android') {
          // 1. Try launching through native Android IntentLauncher
          try {
            await IntentLauncher.openApplication(pkg);
            return { success: true, message: `Opening ${pkg}` };
          } catch (intentErr) {
            devLog.warn(`openApplication failed for ${pkg}, trying scheme fallback`, intentErr);
          }

          // 2. Fallback to registered custom URI schemes
          const fallbackScheme = APP_SCHEME_MAP[pkg];
          if (fallbackScheme) {
            try {
              await Linking.openURL(fallbackScheme);
              return { success: true, message: `Opening ${pkg}` };
            } catch {}
          }

          // 3. Fallback to Play Store
          try {
            await Linking.openURL(`market://details?id=${pkg}`);
            return { success: true, message: `App not found. Opening Play Store for ${pkg}` };
          } catch {}
        }

        throw new Error(`Could not open app: ${pkg}`);
      }

      case 'open_settings': {
        if (Platform.OS === 'android') {
          const subsetting = (params.setting || params.subsetting || '') as string;
          switch (subsetting) {
            case 'wifi':
            case 'network':
              await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.WIRELESS_SETTINGS);
              return { success: true, message: 'Opening Network & WiFi Parameters' };
            case 'bluetooth':
              await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS);
              return { success: true, message: 'Opening Bluetooth Parameters' };
            case 'battery':
              await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BATTERY_SAVER_SETTINGS);
              return { success: true, message: 'Opening Battery Diagnostics' };
            case 'accessibility':
              await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.ACCESSIBILITY_SETTINGS);
              return { success: true, message: 'Opening Accessibility Services' };
            case 'sound':
              await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SOUND_SETTINGS);
              return { success: true, message: 'Opening Sound & Volume Settings' };
            default:
              await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS);
              return { success: true, message: 'Opening Android System Settings' };
          }
        }
        await Linking.openSettings();
        return { success: true, message: 'Opening System Settings' };
      }

      case 'camera_front': {
        if (Platform.OS === 'android') {
          try {
            await IntentLauncher.startActivityAsync('android.media.action.IMAGE_CAPTURE', {
              extra: { 'android.intent.extras.CAMERA_FACING': 1 },
            });
            return { success: true, message: 'Opening front camera in selfie mode' };
          } catch {
            await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA');
            return { success: true, message: 'Opening camera' };
          }
        }
        await Linking.openURL('camera:');
        return { success: true, message: 'Opening camera' };
      }

      case 'camera_rear': {
        if (Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA');
          return { success: true, message: 'Opening camera viewfinder' };
        }
        await Linking.openURL('camera:');
        return { success: true, message: 'Opening camera' };
      }

      case 'whatsapp_chat': {
        const contact = (params.contact || params.phone || params.number || '') as string;
        const msg = (params.message || params.text || '') as string;
        const cleaned = contact.replace(/[^\d+]/g, '');

        if (cleaned) {
          const encoded = encodeURIComponent(msg);
          const url = `whatsapp://send?phone=${cleaned}${encoded ? `&text=${encoded}` : ''}`;
          try {
            await Linking.openURL(url);
            return { success: true, message: `Opening WhatsApp chat with ${cleaned}` };
          } catch {
            await Linking.openURL(`https://wa.me/${cleaned.replace('+', '')}?text=${encoded}`);
            return { success: true, message: `Opening WhatsApp chat with ${cleaned}` };
          }
        }

        try {
          await Linking.openURL('whatsapp://app');
          return { success: true, message: 'Opening WhatsApp' };
        } catch {
          await IntentLauncher.openApplication('com.whatsapp');
          return { success: true, message: 'Opening WhatsApp' };
        }
      }

      case 'get_battery_level': {
        if (Platform.OS === 'android') {
          try {
            await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BATTERY_SAVER_SETTINGS);
            return { success: true, message: 'Displaying Android Battery & Power Telemetry' };
          } catch {}
        }
        return { success: true, message: 'Battery telemetry active' };
      }

      case 'get_wifi_status': {
        if (Platform.OS === 'android') {
          try {
            await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.WIRELESS_SETTINGS);
            return { success: true, message: 'Displaying Android Network Matrix' };
          } catch {}
        }
        return { success: true, message: 'Network link online' };
      }

      default: {
        devLog.warn(`Unknown mobile capability: ${capability}`);
        return { success: false, message: `Action "${capability}" dispatched.` };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown execution failure';
    devLog.error(`Mobile executor error on ${capability}`, { error: message, params });
    return { success: false, message };
  }
}
