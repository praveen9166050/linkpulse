import { describe, expect, it } from "vitest";
import { scriptedRandom } from "#test/shared/test-doubles.ts";
import { BASE62_ALPHABET, ShortCodeGeneratorService } from "../short-code-generator.service.ts";

const SAMPLE = 10_000;

describe("ShortCodeGeneratorService", () => {
    const generated = Array.from(
        { length: SAMPLE },
        () => new ShortCodeGeneratorService().generate().value,
    );

    it("generates 7-character base62 codes", () => {
        for (const code of generated) expect(code).toMatch(/^[0-9A-Za-z]{7}$/);
    });

    it("does not repeat itself in 10,000 codes", () => {
        // Expected collisions here: about 10,000² / (2 × 62⁷) ≈ 0.00001.
        expect(new Set(generated).size).toBe(SAMPLE);
    });

    it("uses every character of the alphabet", () => {
        expect(new Set(generated.join("")).size).toBe(BASE62_ALPHABET.length);
    });

    it("skips a code that happens to spell a reserved word", () => {
        const generator = new ShortCodeGeneratorService({
            randomIndex: scriptedRandom("billing", "aZ3kP9q"),
        });

        expect(generator.generate().value).toBe("aZ3kP9q");
    });
});
