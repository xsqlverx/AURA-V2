import { Linking, Platform, Alert } from 'react-native';

const ANDROID_APP_SCHEMES: Record<string, string> = {
  settings: 'com.android.settings',
  wifi: 'com.android.settings/.wifi.WifiSettings',
  bluetooth: 'com.android.settings/.bluetooth.BluetoothSettings',
  display: 'com.android.settings/.DisplaySettings',
  sound: 'com.android.settings/.SoundSettings',
  battery: 'com.android.settings/.fuelgauge.BatteryUsageSettings',
  storage: 'com.android.settings/.deviceinfo.StorageSettings',
  apps: 'com.android.settings/.applications.ManageApplications',
  security: 'com.android.settings/.SecuritySettings',
  location: 'com.android.settings/.location.LocationSettings',
  developer: 'com.android.settings/.DevelopmentSettingsDashboardActivity',
  about: 'com.android.settings/.DeviceInfoSettings',
  network: 'com.android.settings/.NetworkDashboardActivity',
  airplane: 'com.android.settings/.WirelessSettings',
  nfc: 'com.android.settings/.nfc.NfcSettings',
  camera: 'android.media.action.STILL_IMAGE_CAMERA',
  gallery: 'com.google.android.apps.photos',
  chrome: 'com.android.chrome',
  maps: 'com.google.android.apps.maps',
  youtube: 'com.google.android.youtube',
  calculator: 'com.google.android.calculator',
  calendar: 'com.google.android.calendar',
  clock: 'com.google.android.deskclock',
  files: 'com.google.android.apps.files',
  phone: 'com.android.dialer',
  contacts: 'com.google.android.contacts',
  messaging: 'com.google.android.apps.messaging',
  gmail: 'com.google.android.gm',
  drive: 'com.google.android.apps.docs',
  keep: 'com.google.android.apps.keep',
  photos: 'com.google.android.apps.photos',
  playstore: 'com.android.vending',
  twitter: 'com.twitter.android',
  instagram: 'com.instagram.android',
  telegram: 'org.telegram.messenger',
  discord: 'com.discord',
  spotify: 'com.spotify.music',
  netflix: 'com.netflix.mediaclient',
  whatsapp: 'com.whatsapp',
};

export async function openApp(packageName: string): Promise<boolean> {
  try {
    const scheme = ANDROID_APP_SCHEMES[packageName.toLowerCase()] || packageName;
    if (Platform.OS === 'android') {
      await Linking.openURL(`package:${scheme}`);
    } else {
      await Linking.openURL(`${scheme}://`);
    }
    return true;
  } catch {
    try {
      await Linking.openURL(`market://details?id=${packageName}`);
      return true;
    } catch {
      Alert.alert('App Not Found', `Could not open "${packageName}". Make sure it's installed.`);
      return false;
    }
  }
}

export async function openSettings(subsetting?: string): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const target = subsetting ? ANDROID_APP_SCHEMES[subsetting] : 'com.android.settings';
      await Linking.openURL(`package:${target}`);
    } else {
      await Linking.openURL('app-settings:');
    }
    return true;
  } catch {
    Alert.alert('Error', 'Could not open settings');
    return false;
  }
}

export async function sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(message);
  const url = `whatsapp://send?phone=${cleaned}&text=${encoded}`;
  const fallback = `https://wa.me/${cleaned.replace('+', '')}?text=${encoded}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    await Linking.openURL(fallback);
    return true;
  } catch {
    Alert.alert('WhatsApp Not Found', 'Install WhatsApp to send messages.');
    return false;
  }
}

export async function sendSms(phoneNumber: string, message: string): Promise<boolean> {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${cleaned}${separator}body=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Error', 'Could not open messaging app.');
    return false;
  }
}

export async function makeCall(phoneNumber: string): Promise<boolean> {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  try {
    await Linking.openURL(`tel:${cleaned}`);
    return true;
  } catch {
    Alert.alert('Error', 'Could not open phone app.');
    return false;
  }
}

export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Error', `Could not open "${url}"`);
    return false;
  }
}

export function parsePhoneControl(message: string): { action: string; target: string; message?: string } | null {
  const lower = message.toLowerCase();

  const openMatch = lower.match(/(?:open|launch|start|go to|show)\s+(.+)/i);
  if (openMatch) {
    return { action: 'open_app', target: openMatch[1].trim() };
  }

  const waMatch = lower.match(/(?:send|text|whatsapp)\s+(?:a\s+)?(?:message\s+)?(?:to\s+)?(.+?)(?:\s+(?:saying|that|with message|message|text)\s+(.+))?$/i);
  if (waMatch || lower.includes('whatsapp')) {
    return { action: 'whatsapp', target: waMatch?.[1]?.trim() || '', message: waMatch?.[2]?.trim() };
  }

  const smsMatch = lower.match(/(?:send|text)\s+(?:an?\s+)?(?:sms|text message)\s+(?:to\s+)?(.+?)(?:\s+(?:saying|that|with message|message|text)\s+(.+))?$/i);
  if (smsMatch) {
    return { action: 'sms', target: smsMatch[1].trim(), message: smsMatch[2]?.trim() };
  }

  const callMatch = lower.match(/(?:call|phone|dial)\s+(.+)/i);
  if (callMatch) {
    return { action: 'call', target: callMatch[1].trim() };
  }

  if (lower.includes('open settings') || lower.includes('show settings')) {
    return { action: 'open_settings', target: '' };
  }

  if (lower.match(/open\s+(?:wifi|bluetooth|display|sound|battery|storage|apps|security|location|developer|about|network|airplane|nfc)/i)) {
    const setting = lower.match(/open\s+(wifi|bluetooth|display|sound|battery|storage|apps|security|location|developer|about|network|airplane|nfc)/i)?.[1] || '';
    return { action: 'open_settings', target: setting };
  }

  return null;
}
