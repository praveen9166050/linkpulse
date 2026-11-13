/**
 * Test doubles for the links module's dependencies: no real clock and no
 * real randomness, so tests are repeatable.
 */
import { BASE62_ALPHABET } from "#src/modules/links/short-code-generator.service.ts";
import type { ClockService } from "#src/services/clock.service.ts";

/**
 * A clock frozen at one moment. ClockService has no private fields, so a
 * plain object with the same `now()` method fits its type (TypeScript
 * compares shapes).
 */
export function fixedClock(at: Date): ClockService {
    return { now: () => new Date(at.getTime()) };
}

/**
 * A scripted random source for ShortCodeGeneratorService that spells out
 * the given codes in order, so a test can force a collision or a reserved
 * word. Fails loudly if asked for more characters than scripted.
 */
export function scriptedRandom(...codes: string[]): (max: number) => number {
    const indexes = codes.flatMap((code) => [...code].map((char) => BASE62_ALPHABET.indexOf(char)));
    return () => {
        const next = indexes.shift();
        if (next === undefined) throw new Error("scriptedRandom ran out of scripted characters");
        return next;
    };
}
