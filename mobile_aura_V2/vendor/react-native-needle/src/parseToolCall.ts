/**
 * Pure parsing of Needle's response envelope. Kept free of any React Native
 * import so it can be unit-tested in plain Node against real captured output.
 */

/** The envelope Needle emits. Fields beyond these exist but are advisory. */
export interface NeedleCall {
  type?: string;
  function_calls?: Array<{ name?: string; arguments?: Record<string, unknown> }>;
  reasoning?: string | null;
  confidence?: number;
  peak_ram_mb?: number;
  validation?: { ungrounded?: string[]; negation?: boolean };
}

/** Pull the first JSON object out of a response, tolerating surrounding prose. */
export function parseEnvelope(raw: string | null | undefined): NeedleCall | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NeedleCall;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as NeedleCall;
    } catch {
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
export function extractArguments<T = Record<string, unknown>>(
  raw: string | null | undefined
): T | null {
  const envelope = parseEnvelope(raw);
  if (!envelope) return null;

  const calls = envelope.function_calls;
  if (Array.isArray(calls)) {
    // An empty array is an explicit decline, not a malformed response.
    return (calls[0]?.arguments as T) ?? null;
  }

  // Older/looser shapes put the arguments at the top level.
  const loose = envelope as Record<string, unknown>;
  return ((loose.arguments ?? loose.parameters ?? loose) as T) ?? null;
}

/** Field paths the model itself reports as not grounded in the input. */
export function ungroundedFields(raw: string | null | undefined): string[] {
  return parseEnvelope(raw)?.validation?.ungrounded ?? [];
}
