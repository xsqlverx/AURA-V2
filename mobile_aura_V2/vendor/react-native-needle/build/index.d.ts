import { parseEnvelope, ungroundedFields } from './parseToolCall';
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
/**
 * False on iOS, and on any Android device without arm64 — Cactus's armeabi-v7a
 * archive is built against a newer libc++ than the NDK we compile with, so the
 * engine is 64-bit only for now.
 */
export declare const needleSupported: boolean;
/** Load the `.cact` model from a local file path. */
export declare function loadModel(path: string): Promise<boolean>;
/**
 * Load the model that ships inside the package. This is the usual entry point —
 * it needs no download, no storage permission and works offline on first run.
 */
export declare function loadBundledModel(assetName?: string): Promise<boolean>;
export declare function isModelLoaded(): boolean;
/** Declare the tools (i.e. the extraction schema) the model may call. */
export declare function configure(systemPrompt: string, tools: NeedleTool[]): Promise<void>;
/** Raw completion — returns whatever Needle emitted, usually a JSON tool call. */
export declare function complete(input: string, maxNewTokens?: number): Promise<string | null>;
export declare function reset(): Promise<void>;
/**
 * Run one extraction and hand back the tool call's arguments.
 *
 * Returns null rather than throwing when the model declines or emits something
 * unparseable — a caller pre-filling a form wants "no answer", not an exception.
 * Use `complete()` with `ungroundedFields()` when you need to see which fields
 * the model admits it invented.
 */
export declare function extract<T = Record<string, unknown>>(input: string, maxNewTokens?: number): Promise<T | null>;
//# sourceMappingURL=index.d.ts.map