/**
 * Test doubles for the link module's ports, so use cases can be tested
 * with no randomness and no real clock. For storage, tests use the real
 * InMemoryLinkRepository: it already passes the repository contract, so
 * a separate fake would only duplicate it.
 */
import type { Clock, CodeGenerator } from "../../src/modules/link/application/ports.ts";
import { ShortCode } from "../../src/modules/link/domain/short-code.ts";
import { unwrap } from "./result.ts";

/** A STUB: hands out the codes it was given, in order, so tests can force collisions. */
export class SequenceCodeGenerator implements CodeGenerator {
    readonly #codes: string[];
    #calls = 0;

    constructor(codes: readonly string[]) {
        this.#codes = [...codes];
    }

    generate(): ShortCode {
        this.#calls += 1;
        const next = this.#codes.shift();
        if (next === undefined) throw new Error("SequenceCodeGenerator ran out of codes");
        return unwrap(ShortCode.create(next));
    }

    /** How many times generate() was called. */
    get calls(): number {
        return this.#calls;
    }
}

/** A clock frozen at one moment, so timestamps in tests are predictable. */
export class FixedClock implements Clock {
    readonly #now: Date;

    constructor(now: Date) {
        this.#now = new Date(now.getTime());
    }

    now(): Date {
        return new Date(this.#now.getTime());
    }
}
