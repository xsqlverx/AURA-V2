"use strict";
/**
 * Pure parsing of Needle's response envelope. Kept free of any React Native
 * import so it can be unit-tested in plain Node against real captured output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnvelope = parseEnvelope;
exports.extractArguments = extractArguments;
exports.ungroundedFields = ungroundedFields;
/** Pull the first JSON object out of a response, tolerating surrounding prose. */
function parseEnvelope(raw) {
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m)
            return null;
        try {
            return JSON.parse(m[0]);
        }
        catch {
            return null;
        }
    }
}
/**
 * The arguments of the first tool call, or null.
 *
 * Null covers two different things the caller treats the same way: the model
 * declined (it answers with an empty `function_calls` array and a reason), and
 * the output could not be parsed at all.
 */
function extractArguments(raw) {
    const envelope = parseEnvelope(raw);
    if (!envelope)
        return null;
    const calls = envelope.function_calls;
    if (Array.isArray(calls)) {
        // An empty array is an explicit decline, not a malformed response.
        return calls[0]?.arguments ?? null;
    }
    // Older/looser shapes put the arguments at the top level.
    const loose = envelope;
    return (loose.arguments ?? loose.parameters ?? loose) ?? null;
}
/** Field paths the model itself reports as not grounded in the input. */
function ungroundedFields(raw) {
    return parseEnvelope(raw)?.validation?.ungrounded ?? [];
}
//# sourceMappingURL=parseToolCall.js.map