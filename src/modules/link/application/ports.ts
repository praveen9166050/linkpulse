/**
 * PORTS: what the use cases need from the outside world, defined as
 * interfaces the application owns. Adapters (in-memory, DynamoDB, the
 * system clock, a random generator) implement them. This is the
 * dependency inversion principle: use cases depend on these
 * abstractions, never on a database or SDK.
 */
import type { Link } from "../domain/link.ts";
import type { ShortCode } from "../domain/short-code.ts";

export type AddLinkOutcome = "added" | "code_taken";

export interface LinkRepository {
    /**
     * Stores a new link ONLY IF its code is free, as one atomic step
     * (a conditional write). Never "check, then save": two requests could
     * both see the code free and one would overwrite the other.
     */
    add(link: Link): Promise<AddLinkOutcome>;

    findByCode(code: ShortCode): Promise<Link | undefined>;
}

export interface CodeGenerator {
    /** A new random code. Free of collisions in practice, not guaranteed. */
    generate(): ShortCode;
}

export interface Clock {
    now(): Date;
}
