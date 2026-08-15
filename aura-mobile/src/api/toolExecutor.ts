import { openApp, openSettings, sendWhatsApp, sendSms, makeCall, openUrl } from '../services/phoneControl';
import { speakConfirmation } from '../services/tts';

export interface ToolCall {
  name: string;
  args: Record<string, string>;
}

const DANGEROUS_TOOLS = new Set(['send_whatsapp', 'send_sms', 'make_call']);

export function requiresConfirmation(call: ToolCall): boolean {
  return DANGEROUS_TOOLS.has(call.name);
}

export async function executeToolCall(call: ToolCall): Promise<boolean> {
  let ok = false;
  switch (call.name) {
    case 'open_app': ok = await openApp(call.args.package || ''); break;
    case 'open_settings': ok = await openSettings(call.args.target || ''); break;
    case 'send_whatsapp': ok = await sendWhatsApp(call.args.phone || '', call.args.message || ''); break;
    case 'send_sms': ok = await sendSms(call.args.phone || '', call.args.message || ''); break;
    case 'make_call': ok = await makeCall(call.args.phone || ''); break;
    case 'open_url': ok = await openUrl(call.args.url || ''); break;
    default: return false;
  }
  if (ok) speakConfirmation(call.name);
  return ok;
}
