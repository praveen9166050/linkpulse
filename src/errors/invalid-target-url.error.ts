/** Which target-URL rule was broken. One variant per rule. */
export type TargetUrlViolation =
    | { readonly kind: "too_long"; readonly max: number; readonly actual: number }
    | { readonly kind: "malformed" }
    | { readonly kind: "unsupported_scheme"; readonly scheme: string }
    | { readonly kind: "credentials_not_allowed" };

/**
 * Thrown by `TargetUrl.create` when a string breaks a target-URL rule.
 * `reason` says which rule, for code; the message says it for people.
 */
export class InvalidTargetUrlError extends Error {
    readonly reason: TargetUrlViolation;

    constructor(reason: TargetUrlViolation) {
        super(messageFor(reason));
        this.name = "InvalidTargetUrlError";
        this.reason = reason;
    }
}

/** Exhaustive: a new violation kind won't compile until it has a message. */
function messageFor(reason: TargetUrlViolation): string {
    switch (reason.kind) {
        case "too_long":
            return `Must be at most ${String(reason.max)} characters long (got ${String(reason.actual)}).`;
        case "malformed":
            return "Must be an absolute URL, such as https://example.com/page.";
        case "unsupported_scheme":
            return `Must start with http:// or https:// (got "${reason.scheme}:").`;
        case "credentials_not_allowed":
            return "Must not contain a username or password.";
    }
}
