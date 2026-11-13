import type { ShortCode } from "./short-code.ts";
import type { TargetUrl } from "./target-url.ts";

export interface LinkProps {
    readonly code: ShortCode;
    readonly target: TargetUrl;
    /** Passed in rather than read from the clock, so tests control time. */
    readonly createdAt: Date;
}

/**
 * A short link: the code people share and where it sends them.
 *
 * An ENTITY: its identity is its `code`. Two `Link` objects with the same
 * code are the same link, even if other data differs (for example after
 * its target is edited). Compare `ShortCode`, a value object, which is
 * equal only when its value is.
 *
 * `create` cannot fail: every part is already a validated value object,
 * so the types guarantee a valid Link.
 */
export class Link {
    readonly #code: ShortCode;
    readonly #target: TargetUrl;
    readonly #createdAt: Date;

    private constructor(props: LinkProps) {
        this.#code = props.code;
        this.#target = props.target;
        // Date is mutable: keep a private copy so the caller can't change ours.
        this.#createdAt = new Date(props.createdAt.getTime());
    }

    static create(props: LinkProps): Link {
        return new Link(props);
    }

    get code(): ShortCode {
        return this.#code;
    }

    get target(): TargetUrl {
        return this.#target;
    }

    /** A copy, so callers can't change the link's creation time. */
    get createdAt(): Date {
        return new Date(this.#createdAt.getTime());
    }

    /** Same identity: same code. */
    equals(other: Link): boolean {
        return this.#code.equals(other.#code);
    }
}
