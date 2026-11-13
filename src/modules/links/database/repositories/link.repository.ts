import type { ShortCode } from "../../short-code.value-object.ts";
import type { Link } from "../entities/link.entity.ts";

export type AddLinkOutcome = "added" | "code_taken";

/**
 * REPOSITORY: stores and finds links.
 *
 * Keeps them in memory for now; stage 4 replaces the inside of this class
 * with MongoDB while keeping the same public methods.
 */
export class LinkRepository {
    /** Keyed by the code's exact value: codes are case-sensitive. */
    readonly #links = new Map<string, Link>();

    /**
     * Stores a new link ONLY IF its code is free, as one atomic step.
     * Never "check, then save": two requests could both see the code free
     * and one would overwrite the other. In memory this is atomic for
     * free: nothing between `has` and `set` can yield to another request.
     */
    add(link: Link): Promise<AddLinkOutcome> {
        if (this.#links.has(link.code.value)) return Promise.resolve("code_taken");
        this.#links.set(link.code.value, link);
        return Promise.resolve("added");
    }

    findByCode(code: ShortCode): Promise<Link | undefined> {
        return Promise.resolve(this.#links.get(code.value));
    }
}
