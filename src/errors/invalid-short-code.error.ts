/** Which short-code rule was broken. One variant per rule. */
export type ShortCodeViolation =
    | { readonly kind: "too_short"; readonly min: number; readonly actual: number }
    | { readonly kind: "too_long"; readonly max: number; readonly actual: number }
    | { readonly kind: "invalid_characters"; readonly invalid: readonly string[] }
    | { readonly kind: "invalid_hyphen_placement" }
    | { readonly kind: "reserved"; readonly word: string };

/**
 * Thrown by `ShortCode.create` when a string breaks a short-code rule.
 * `reason` says which rule, for code; the message says it for people.
 */
export class InvalidShortCodeError extends Error {
    readonly reason: ShortCodeViolation;

    constructor(reason: ShortCodeViolation) {
        super(messageFor(reason));
        this.name = "InvalidShortCodeError";
        this.reason = reason;
    }
}

/** Exhaustive: a new violation kind won't compile until it has a message. */
function messageFor(reason: ShortCodeViolation): string {
    switch (reason.kind) {
        case "too_short":
            return `Must be at least ${String(reason.min)} characters long (got ${String(reason.actual)}).`;
        case "too_long":
            return `Must be at most ${String(reason.max)} characters long (got ${String(reason.actual)}).`;
        case "invalid_characters":
            return `Only letters, digits and hyphens are allowed (found ${reason.invalid.map((c) => JSON.stringify(c)).join(", ")}).`;
        case "invalid_hyphen_placement":
            return "Hyphens can't be at the start or end, or next to each other.";
        case "reserved":
            return `"${reason.word}" is reserved and cannot be used as a short code.`;
    }
}
