import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { extractArguments, parseEnvelope, ungroundedFields } from './parseToolCall';

export { parseEnvelope, ungroundedFields };
export type { NeedleCall } from './parseToolCall';

/**
 * On-device structured extraction with Cactus's Needle 2 (45M params, ~14MB).
 *
 * Needle is not a chatbot — it emits a schema-conforming tool call or declines.
 * That is exactly what we want for pulling {amount, merchant, date} out of a
 * bank SMS or a receipt: it cannot wander off and invent prose where a number
 * belongs, and the arguments it returns are the extracted fields.
 *
 * Android only for now — Cactus publishes ios-arm64 archives too, so an iOS
 * target is a matter of adding the podspec, not new logic.
 */

export interface NeedleTool {
  name: string;
  description: string;
  /** JSON-Schema-ish parameter object, as Needle expects. */
  parameters: Record<string, unknown>;
}

interface NeedleNativeModule {
  isSupported(): boolean;
  load(path: string): Promise<boolean>;
  loadBundled(assetName: string): Promise<boolean>;
  isLoaded(): boolean;
  init(systemPrompt: string | null, toolsJson: string | null, toolIndexPath: string | null): Promise<number>;
  complete(input: string, maxNewTokens: number): Promise<string | null>;
  reset(): Promise<void>;
}

const native: NeedleNativeModule | null =
  Platform.OS === 'android' ? requireNativeModule('Needle') : null;

/**
 * False on iOS, and on any Android device without arm64 — Cactus's armeabi-v7a
 * archive is built against a newer libc++ than the NDK we compile with, so the
 * engine is 64-bit only for now.
 */
export const needleSupported = native?.isSupported() ?? false;

/** Load the `.cact` model from a local file path. */
export async function loadModel(path: string): Promise<boolean> {
  if (!native) return false;
  return native.load(path);
}

/**
 * Load the model that ships inside the package. This is the usual entry point —
 * it needs no download, no storage permission and works offline on first run.
 */
export async function loadBundledModel(assetName = 'needle2.cact'): Promise<boolean> {
  if (!native) return false;
  return native.loadBundled(assetName);
}

export function isModelLoaded(): boolean {
  return native?.isLoaded() ?? false;
}

/** Declare the tools (i.e. the extraction schema) the model may call. */
export async function configure(systemPrompt: string, tools: NeedleTool[]): Promise<void> {
  if (!native) return;
  await native.init(systemPrompt, JSON.stringify(tools), null);
}

/** Raw completion — returns whatever Needle emitted, usually a JSON tool call. */
export async function complete(input: string, maxNewTokens = 256): Promise<string | null> {
  if (!native) return null;
  return native.complete(input, maxNewTokens);
}

export async function reset(): Promise<void> {
  await native?.reset();
}

/**
 * Run one extraction and hand back the tool call's arguments.
 *
 * Returns null rather than throwing when the model declines or emits something
 * unparseable — a caller pre-filling a form wants "no answer", not an exception.
 * Use `complete()` with `ungroundedFields()` when you need to see which fields
 * the model admits it invented.
 */
export async function extract<T = Record<string, unknown>>(
  input: string,
  maxNewTokens = 256
): Promise<T | null> {
  return extractArguments<T>(await complete(input, maxNewTokens));
}
