import { Share, Linking, Alert, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const MARKER_RE = /<handoff_android>([\s\S]*?)<\/handoff_android>/g;

export type HandoffAction =
  | { action: 'send_sms'; phone_number?: string; message?: string }
  | { action: 'open_app'; app_package?: string }
  | { action: 'share_sheet'; text?: string };

export function extractHandoffs(text: string): { clean: string; actions: HandoffAction[] } {
  const actions: HandoffAction[] = [];
  let clean = text.replace(MARKER_RE, (_, raw: string) => {
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed?.action) actions.push(parsed);
    } catch {}
    return '';
  });
  const openIdx = clean.lastIndexOf('<handoff_android');
  if (openIdx !== -1) clean = clean.slice(0, openIdx);
  return { clean, actions };
}

export async function executeHandoff(action: HandoffAction): Promise<{ ok: boolean; label: string }> {
  try {
    switch (action.action) {
      case 'send_sms': {
        const phone = (action.phone_number || '').replace(/[^+\d]/g, '');
        const body = encodeURIComponent(action.message || '');
        const url = Platform.select({
          android: body ? `sms:${phone}?body=${body}` : `sms:${phone}`,
          default: body ? `sms:${phone}&body=${body}` : `sms:${phone}`,
        });
        if (!phone) throw new Error('No phone number provided');
        await Linking.openURL(url!);
        return { ok: true, label: `SMS to ${phone}` };
      }
      case 'open_app': {
        const pkg = action.app_package || '';
        if (!pkg) throw new Error('No app package provided');
        await IntentLauncher.openApplication(pkg);
        return { ok: true, label: `Opened ${pkg}` };
      }
      case 'share_sheet': {
        const result = await Share.share({ message: action.text || '' });
        return {
          ok: result.action === Share.sharedAction,
          label: result.action === Share.sharedAction ? 'Shared' : 'Share cancelled',
        };
      }
      default:
        throw new Error(`Unknown handoff action: ${(action as any).action}`);
    }
  } catch (e: any) {
    Alert.alert('Phone action failed', e?.message ?? 'Unknown error');
    return { ok: false, label: 'Failed' };
  }
}
