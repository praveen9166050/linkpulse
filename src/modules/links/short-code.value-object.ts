import {
    InvalidShortCodeError,
    type ShortCodeViolation,
} from "#src/errors/invalid-short-code.error.ts";

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

/**
 * VALUE OBJECT: the path segment that identifies a link, `aZ3kP9q` in
 * `lnkp.dev/aZ3kP9q`. Immutable, equal by value, and valid by
 * construction: the only way to get one is `ShortCode.create()`, so any
 * `ShortCode` in the codebase has already passed every rule.
 *
 * Generating codes is a separate job (ShortCodeGeneratorService); this
 * class only decides what a valid code is.
 */
export class ShortCode {
    readonly #value: string;

    private constructor(value: string) {
        this.#value = value;
    }

    /** @throws InvalidShortCodeError when `raw` breaks a rule. */
    static create(raw: string): ShortCode {
        const violation = findViolation(raw);
        if (violation) throw new InvalidShortCodeError(violation);
        return new ShortCode(raw);
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
function findViolation(raw: string): ShortCodeViolation | undefined {
    return checkLength(raw) ?? checkCharacters(raw) ?? checkHyphens(raw) ?? checkNotReserved(raw);
}

function checkLength(raw: string): ShortCodeViolation | undefined {
    // Spread counts characters (code points), not UTF-16 units, so "😀" is 1.
    const length = [...raw].length;
    if (length < MIN_LENGTH) return { kind: "too_short", min: MIN_LENGTH, actual: length };
    if (length > MAX_LENGTH) return { kind: "too_long", max: MAX_LENGTH, actual: length };
    return undefined;
}

function checkCharacters(raw: string): ShortCodeViolation | undefined {
    const invalid = [...new Set([...raw].filter((char) => !ALLOWED_CHARACTER.test(char)))];
    return invalid.length > 0 ? { kind: "invalid_characters", invalid } : undefined;
}

function checkHyphens(raw: string): ShortCodeViolation | undefined {
    return MISPLACED_HYPHEN.test(raw) ? { kind: "invalid_hyphen_placement" } : undefined;
}

function checkNotReserved(raw: string): ShortCodeViolation | undefined {
    const word = raw.toLowerCase();
    return RESERVED_WORDS.has(word) ? { kind: "reserved", word } : undefined;
}
