/**
 * Pure parsing of Needle's response envelope. Kept free of any React Native
 * import so it can be unit-tested in plain Node against real captured output.
 */
/** The envelope Needle emits. Fields beyond these exist but are advisory. */
export interface NeedleCall {
    type?: string;
    function_calls?: Array<{
        name?: string;
        arguments?: Record<string, unknown>;
    }>;
    reasoning?: string | null;
    confidence?: number;
    peak_ram_mb?: number;
    validation?: {
        ungrounded?: string[];
        negation?: boolean;
    };
}
/** Pull the first JSON object out of a response, tolerating surrounding prose. */
export declare function parseEnvelope(raw: string | null | undefined): NeedleCall | null;
/**
 * The arguments of the first tool call, or null.
 *
 * Null covers two different things the caller treats the same way: the model
 * declined (it answers with an empty `function_calls` array and a reason), and
 * the output could not be parsed at all.
 */
export declare function extractArguments<T = Record<string, unknown>>(raw: string | null | undefined): T | null;
/** Field paths the model itself reports as not grounded in the input. */
export declare function ungroundedFields(raw: string | null | undefined): string[];
//# sourceMappingURL=parseToolCall.d.ts.map