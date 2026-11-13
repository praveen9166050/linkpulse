import { describe, expect, it } from "vitest";
import { BASE62_ALPHABET, RandomCodeGenerator } from "./random-code-generator.ts";

const SAMPLE = 10_000;

/** A fake random source that spells out the given words, one character at a time. */
function spelling(...words: string[]): (max: number) => number {
    const indexes = words.flatMap((word) => [...word].map((char) => BASE62_ALPHABET.indexOf(char)));
    return () => {
        const next = indexes.shift();
        if (next === undefined) throw new Error("ran out of scripted characters");
        return next;
    };
}

describe("RandomCodeGenerator", () => {
    const generated = Array.from(
        { length: SAMPLE },
        () => new RandomCodeGenerator().generate().value,
    );

    it("generates 7-character base62 codes", () => {
        for (const code of generated) expect(code).toMatch(/^[0-9A-Za-z]{7}$/);
    });

    it("does not repeat itself in 10,000 codes", () => {
        // Expected collisions here: about 10,000² / (2 × 62⁷) ≈ 0.00001.
        expect(new Set(generated).size).toBe(SAMPLE);
    });

    it("uses every character of the alphabet", () => {
        const used = new Set(generated.join(""));
        expect(used.size).toBe(BASE62_ALPHABET.length);
    });

    it("skips a code that happens to spell a reserved word", () => {
        const generator = new RandomCodeGenerator({ randomIndex: spelling("billing", "aZ3kP9q") });

        expect(generator.generate().value).toBe("aZ3kP9q");
    });
});
