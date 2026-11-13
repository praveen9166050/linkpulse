import {
    InvalidTargetUrlError,
    type TargetUrlViolation,
} from "#src/errors/invalid-target-url.error.ts";

/** Matches `maxLength` of `url` in api/openapi.yaml. */
const MAX_LENGTH = 2048;

/** Only web links. `javascript:` or `data:` targets would run code in visitors' browsers. */
const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

/**
 * VALUE OBJECT: where a short link sends visitors.
 *
 * Holds the URL in canonical form, as produced by the WHATWG URL parser
 * (the one browsers use): lower-case scheme and host, punycode for
 * international domains, percent-encoded spaces, and a `/` path for a bare
 * origin. Two spellings of the same URL are equal.
 */
export class TargetUrl {
    readonly #value: string;

    private constructor(value: string) {
        this.#value = value;
    }

    /** @throws InvalidTargetUrlError when `raw` breaks a rule. */
    static create(raw: string): TargetUrl {
        const length = [...raw].length;
        if (length > MAX_LENGTH) {
            throw new InvalidTargetUrlError({ kind: "too_long", max: MAX_LENGTH, actual: length });
        }

        // URL.parse returns null instead of throwing, so no try/catch is needed.
        const url = URL.parse(raw);
        if (url === null) throw new InvalidTargetUrlError({ kind: "malformed" });

        const violation = checkProtocol(url) ?? checkNoCredentials(url);
        if (violation) throw new InvalidTargetUrlError(violation);
        return new TargetUrl(url.href);
    }

    /** The canonical URL, for example `https://example.com/a%20b`. */
    get value(): string {
        return this.#value;
    }

    equals(other: TargetUrl): boolean {
        return this.#value === other.#value;
    }

    toString(): string {
        return this.#value;
    }
}

function checkProtocol(url: URL): TargetUrlViolation | undefined {
    return ALLOWED_PROTOCOLS.has(url.protocol)
        ? undefined
        : { kind: "unsupported_scheme", scheme: url.protocol.slice(0, -1) }; // "ftp:" -> "ftp"
}

/**
 * `https://user:pass@host` would put a password in every click, and
 * `https://google.com@evil.example` is a phishing trick: it reads like
 * google.com but the host is evil.example.
 */
function checkNoCredentials(url: URL): TargetUrlViolation | undefined {
    return url.username || url.password ? { kind: "credentials_not_allowed" } : undefined;
}
