import { Linking, Platform } from 'react-native';
import { executeMobileCapability } from '../capabilities/mobileExecutor';
import { sendToPc, speakOnPc } from '../api/client';
import { devLog } from '../utils/devLog';

export interface FastPathResult {
  handled: boolean;
  isCompound: boolean;
  target: 'MOBILE' | 'PC' | 'LLM_PLANNER' | 'CHAT';
  message: string;
  actionTaken?: string;
}

// Common app packages on Android
const APP_PACKAGE_MAP: Record<string, string> = {
  whatsapp: 'com.whatsapp',
  youtube: 'com.google.android.youtube',
  instagram: 'com.instagram.android',
  spotify: 'com.spotify.music',
  camera: 'com.sec.android.app.camera',
  settings: 'com.android.settings',
  chrome: 'com.android.chrome',
  maps: 'com.google.android.apps.maps',
  telegram: 'org.telegram.messenger',
  gmail: 'com.google.android.gm',
  photos: 'com.google.android.apps.photos',
  calculator: 'com.sec.android.app.popupcalculator',
  clock: 'com.sec.android.app.clockpackage',
};

// Check if a prompt contains multi-step sequence markers
export function isCompoundDirective(text: string): boolean {
  const lower = text.toLowerCase();
  const sequenceMarkers = [
    ' then ',
    ' afterwards ',
    ' after that ',
    ' and then ',
    ' and afterwards ',
    ' also then ',
    ' first ',
    ' next ',
    ' copy the ',
    ' send it to ',
    ' click record ',
  ];

  const matchCount = sequenceMarkers.filter((marker) => lower.includes(marker)).length;
  // If text has sequence words or has multiple action verbs chained
  if (matchCount >= 1) return true;
  if ((lower.includes('open ') || lower.includes('launch ')) && lower.includes(' and send ')) return true;
  return false;
}

export async function tryFastPath(text: string, pcConnected: boolean = false): Promise<FastPathResult> {
  const query = text.trim();
  const lower = query.toLowerCase();

  // 1. If it's a compound / multi-step directive, delegate to LLM planner
  if (isCompoundDirective(lower)) {
    devLog.info('FastPath detected compound directive — routing to LLM Planner');
    return {
      handled: false,
      isCompound: true,
      target: 'LLM_PLANNER',
      message: 'Synthesizing multi-step action plan...',
    };
  }

  // 2. Camera Specific Modes
  if (
    lower.includes('front camera') ||
    lower.includes('selfie') ||
    lower.includes('front view') ||
    (lower.includes('camera') && (lower.includes('front') || lower.includes('selfie')))
  ) {
    const res = await executeMobileCapability('camera_front', {});
    return {
      handled: true,
      isCompound: false,
      target: 'MOBILE',
      actionTaken: 'CAMERA_FRONT',
      message: res.message || 'Opening front camera in selfie mode.',
    };
  }

  if (lower.startsWith('open camera') || lower === 'camera' || lower.includes('launch camera')) {
    const res = await executeMobileCapability('camera_rear', {});
    return {
      handled: true,
      isCompound: false,
      target: 'MOBILE',
      actionTaken: 'CAMERA',
      message: res.message || 'Launching camera viewfinder.',
    };
  }

  // 3. WhatsApp Direct Intent Parsing
  // Example: "open chat with mom on whatsapp" or "whatsapp call alex"
  if (lower.includes('whatsapp')) {
    // Check for call
    if (lower.includes('call ')) {
      const contactMatch = query.match(/(?:call\s+)(.*?)(?:\s+on whatsapp|$)/i);
      const contactName = contactMatch?.[1]?.trim() || 'contact';
      // Attempt WhatsApp call intent
      await Linking.openURL(`whatsapp://app`).catch(() => {});
      return {
        handled: true,
        isCompound: false,
        target: 'MOBILE',
        actionTaken: 'WHATSAPP_CALL',
        message: `Opening WhatsApp to call ${contactName}.`,
      };
    }

    // Check for chat
    if (lower.includes('chat') || lower.includes('message') || lower.includes('send')) {
      const contactMatch = query.match(/(?:chat with|message|to)\s+([^on\s]+)/i);
      const contactName = contactMatch?.[1]?.trim();
      await Linking.openURL('whatsapp://app').catch(() => {});
      return {
        handled: true,
        isCompound: false,
        target: 'MOBILE',
        actionTaken: 'WHATSAPP_CHAT',
        message: contactName
          ? `Opening WhatsApp conversation with ${contactName}.`
          : 'Launching WhatsApp.',
      };
    }

    // Default open whatsapp
    await executeMobileCapability('open_app', { package: 'com.whatsapp' });
    return {
      handled: true,
      isCompound: false,
      target: 'MOBILE',
      actionTaken: 'WHATSAPP_OPEN',
      message: 'Launching WhatsApp.',
    };
  }

  // 4. Direct Phone Calls & Dialing
  // Example: "call 9876543210" or "call mom"
  const phoneCallMatch = query.match(/^(?:call|dial)\s+([\d\s+()-]+|[a-zA-Z\s]+)$/i);
  if (phoneCallMatch && !lower.includes('whatsapp') && !lower.includes('pc')) {
    const target = phoneCallMatch[1].trim();
    const isDigits = /^[\d\s+()-]+$/.test(target);
    if (isDigits) {
      const cleanedNumber = target.replace(/[^\d+]/g, '');
      await Linking.openURL(`tel:${cleanedNumber}`).catch(() => {});
      return {
        handled: true,
        isCompound: false,
        target: 'MOBILE',
        actionTaken: 'PHONE_CALL',
        message: `Dialing ${cleanedNumber}...`,
      };
    } else {
      await Linking.openURL(`tel:`).catch(() => {});
      return {
        handled: true,
        isCompound: false,
        target: 'MOBILE',
        actionTaken: 'PHONE_CALL',
        message: `Opening phone dialer for ${target}.`,
      };
    }
  }

  // 5. System Controls & Hardware
  if (lower.includes('battery') || lower.includes('battery level') || lower.includes('battery percentage')) {
    const res = await executeMobileCapability('get_battery_level', {});
    return {
      handled: true,
      isCompound: false,
      target: 'MOBILE',
      actionTaken: 'BATTERY_CHECK',
      message: res.message,
    };
  }

  if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('network status')) {
    const res = await executeMobileCapability('get_wifi_status', {});
    return {
      handled: true,
      isCompound: false,
      target: 'MOBILE',
      actionTaken: 'WIFI_CHECK',
      message: res.message,
    };
  }

  if (lower.includes('settings') && (lower.startsWith('open ') || lower.startsWith('launch '))) {
    await executeMobileCapability('open_settings', {});
    return {
      handled: true,
      isCompound: false,
      target: 'MOBILE',
      actionTaken: 'OPEN_SETTINGS',
      message: 'Opening system settings.',
    };
  }

  // 6. Direct App Launches
  for (const [appName, pkg] of Object.entries(APP_PACKAGE_MAP)) {
    if (
      lower === `open ${appName}` ||
      lower === `launch ${appName}` ||
      lower === `start ${appName}` ||
      lower === appName
    ) {
      await executeMobileCapability('open_app', { package: pkg });
      return {
        handled: true,
        isCompound: false,
        target: 'MOBILE',
        actionTaken: `OPEN_${appName.toUpperCase()}`,
        message: `Launching ${appName.charAt(0).toUpperCase() + appName.slice(1)}.`,
      };
    }
  }

  // 7. Direct PC Quick Actions (if explicitly targeting PC)
  if (lower.startsWith('speak on pc') || lower.startsWith('pc speak') || lower.startsWith('say on pc')) {
    const textToSpeak = query.replace(/^(?:speak on pc|pc speak|say on pc)[:\s]*/i, '').trim();
    if (textToSpeak && pcConnected) {
      await speakOnPc(textToSpeak);
      return {
        handled: true,
        isCompound: false,
        target: 'PC',
        actionTaken: 'SPEAK_ON_PC',
        message: `Broadcasting on PC speakers: "${textToSpeak}"`,
      };
    }
  }

  if (lower === 'lock pc' || lower === 'lock my pc') {
    if (pcConnected) {
      await sendToPc('lock_pc', {});
      return {
        handled: true,
        isCompound: false,
        target: 'PC',
        actionTaken: 'LOCK_PC',
        message: 'PC workstation locked.',
      };
    }
  }

  if (lower === 'mute pc' || lower === 'unmute pc') {
    if (pcConnected) {
      await sendToPc('mute_audio', {});
      return {
        handled: true,
        isCompound: false,
        target: 'PC',
        actionTaken: 'MUTE_PC',
        message: 'Toggled PC master audio mute.',
      };
    }
  }

  // Not a single-shot fast path intent -> allow SLM / LLM to handle
  return {
    handled: false,
    isCompound: false,
    target: 'CHAT',
    message: '',
  };
}
