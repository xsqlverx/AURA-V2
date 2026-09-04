"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needleSupported = exports.ungroundedFields = exports.parseEnvelope = void 0;
exports.loadModel = loadModel;
exports.loadBundledModel = loadBundledModel;
exports.isModelLoaded = isModelLoaded;
exports.configure = configure;
exports.complete = complete;
exports.reset = reset;
exports.extract = extract;
const expo_modules_core_1 = require("expo-modules-core");
const react_native_1 = require("react-native");
const parseToolCall_1 = require("./parseToolCall");
Object.defineProperty(exports, "parseEnvelope", { enumerable: true, get: function () { return parseToolCall_1.parseEnvelope; } });
Object.defineProperty(exports, "ungroundedFields", { enumerable: true, get: function () { return parseToolCall_1.ungroundedFields; } });
const native = react_native_1.Platform.OS === 'android' ? (0, expo_modules_core_1.requireNativeModule)('Needle') : null;
/**
 * False on iOS, and on any Android device without arm64 — Cactus's armeabi-v7a
 * archive is built against a newer libc++ than the NDK we compile with, so the
 * engine is 64-bit only for now.
 */
exports.needleSupported = native?.isSupported() ?? false;
/** Load the `.cact` model from a local file path. */
async function loadModel(path) {
    if (!native)
        return false;
    return native.load(path);
}
/**
 * Load the model that ships inside the package. This is the usual entry point —
 * it needs no download, no storage permission and works offline on first run.
 */
async function loadBundledModel(assetName = 'needle2.cact') {
    if (!native)
        return false;
    return native.loadBundled(assetName);
}
function isModelLoaded() {
    return native?.isLoaded() ?? false;
}
/** Declare the tools (i.e. the extraction schema) the model may call. */
async function configure(systemPrompt, tools) {
    if (!native)
        return;
    await native.init(systemPrompt, JSON.stringify(tools), null);
}
/** Raw completion — returns whatever Needle emitted, usually a JSON tool call. */
async function complete(input, maxNewTokens = 256) {
    if (!native)
        return null;
    return native.complete(input, maxNewTokens);
}
async function reset() {
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
async function extract(input, maxNewTokens = 256) {
    return (0, parseToolCall_1.extractArguments)(await complete(input, maxNewTokens));
}
//# sourceMappingURL=index.js.map