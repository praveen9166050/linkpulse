import type { AddLinkOutcome, LinkRepository } from "../../application/ports.ts";
import type { Link } from "../../domain/link.ts";
import type { ShortCode } from "../../domain/short-code.ts";

/**
 * ADAPTER: keeps links in a Map, in this process's memory.
 *
 * Used to run LinkPulse locally before DynamoDB exists (and in tests).
 * Everything is lost on restart, and each process has its own copy, so it
 * can't be used behind a load balancer.
 *
 * `add` is atomic for free: JavaScript runs one callback at a time on the
 * event loop, and nothing between `has` and `set` can yield, so no other
 * request can slip in between the check and the write.
 */
export class InMemoryLinkRepository implements LinkRepository {
    /** Keyed by the code's exact value: codes are case-sensitive. */
    readonly #links = new Map<string, Link>();

    add(link: Link): Promise<AddLinkOutcome> {
        if (this.#links.has(link.code.value)) return Promise.resolve("code_taken");
        this.#links.set(link.code.value, link);
        return Promise.resolve("added");
    }

    findByCode(code: ShortCode): Promise<Link | undefined> {
        return Promise.resolve(this.#links.get(code.value));
    }
}
