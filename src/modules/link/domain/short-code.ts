import { err, ok, type Result } from "../../../shared/result.ts";

const MIN_LENGTH = 3;
const MAX_LENGTH = 32;

/** Letters, digits and hyphen: safe in a URL path without encoding. */
const ALLOWED_CHARACTER = /^[A-Za-z0-9-]$/;

/** A hyphen at either end, or two in a row. */
const MISPLACED_HYPHEN = /^-|-$|--/;

/**
 * Paths LinkPulse uses or will use for its own pages and APIs. A short
 * code with one of these names would hijack that route. Compared
 * case-insensitively so `API` and `Admin` are caught too.
 */
const RESERVED_WORDS: ReadonlySet<string> = new Set([
    "admin",
    "api",
    "app",
    "assets",
    "auth",
    "billing",
    "dashboard",
    "docs",
    "health",
    "links",
    "login",
    "logout",
    "settings",
    "signup",
    "static",
]);

/** Why a string is not a valid short code. One variant per rule. */
export type ShortCodeError =
    | { readonly kind: "too_short"; readonly min: number; readonly actual: number }
    | { readonly kind: "too_long"; readonly max: number; readonly actual: number }
    | { readonly kind: "invalid_characters"; readonly invalid: readonly string[] }
    | { readonly kind: "invalid_hyphen_placement" }
    | { readonly kind: "reserved"; readonly word: string };

/**
 * The path segment that identifies a link: `aZ3kP9q` in `lnkp.dev/aZ3kP9q`.
 *
 * A value object: immutable, equal by value, and valid by construction.
 * The only way to get one is `ShortCode.create()`, so any `ShortCode`
 * in the codebase has already passed every rule.
 *
 * Generating codes is a separate responsibility (a `CodeGenerator`);
 * this class only decides what a valid code is.
 */
export class ShortCode {
    readonly #value: string;

    private constructor(value: string) {
        this.#value = value;
    }

    static create(raw: string): Result<ShortCode, ShortCodeError> {
        const violation = findViolation(raw);
        return violation ? err(violation) : ok(new ShortCode(raw));
    }

    get value(): string {
        return this.#value;
    }

    /** Case-sensitive: `Abc` and `abc` are different codes. */
    equals(other: ShortCode): boolean {
        return this.#value === other.#value;
    }

    toString(): string {
        return this.#value;
    }
}

/** Runs the rules in order and returns the first one broken, if any. */
function findViolation(raw: string): ShortCodeError | undefined {
    return checkLength(raw) ?? checkCharacters(raw) ?? checkHyphens(raw) ?? checkNotReserved(raw);
}

function checkLength(raw: string): ShortCodeError | undefined {
    // Spread counts characters (code points), not UTF-16 units, so "😀" is 1.
    const length = [...raw].length;
    if (length < MIN_LENGTH) return { kind: "too_short", min: MIN_LENGTH, actual: length };
    if (length > MAX_LENGTH) return { kind: "too_long", max: MAX_LENGTH, actual: length };
    return undefined;
}

function checkCharacters(raw: string): ShortCodeError | undefined {
    const invalid = [...new Set([...raw].filter((char) => !ALLOWED_CHARACTER.test(char)))];
    return invalid.length > 0 ? { kind: "invalid_characters", invalid } : undefined;
}

function checkHyphens(raw: string): ShortCodeError | undefined {
    return MISPLACED_HYPHEN.test(raw) ? { kind: "invalid_hyphen_placement" } : undefined;
}

function checkNotReserved(raw: string): ShortCodeError | undefined {
    const word = raw.toLowerCase();
    return RESERVED_WORDS.has(word) ? { kind: "reserved", word } : undefined;
}
