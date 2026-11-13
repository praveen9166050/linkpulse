import { describe, expect, it } from "vitest";
import { ShortCode, type ShortCodeError } from "./short-code.ts";

// Helpers keep each test to one line of intent (Arrange-Act-Assert).
function validCode(raw: string): ShortCode {
    const result = ShortCode.create(raw);
    if (!result.ok) throw new Error(`expected "${raw}" to be valid, got ${result.error.kind}`);
    return result.value;
}

function rejectionOf(raw: string): ShortCodeError {
    const result = ShortCode.create(raw);
    if (result.ok) throw new Error(`expected "${raw}" to be rejected`);
    return result.error;
}

describe("ShortCode", () => {
    describe("accepts valid codes", () => {
        it.each([
            "abc", // shortest allowed
            "aZ3kP9q", // a generated 7-character base62 code
            "my-resume", // a custom code with a hyphen
            "Q4-2026",
            "a-b-c",
            "apis", // contains a reserved word, but is not one
            "healthy",
            "a".repeat(32), // longest allowed
        ])("%s", (raw) => {
            expect(validCode(raw).value).toBe(raw);
        });
    });

    it.each(["", "a", "ab"])("rejects %j as too short", (raw) => {
        expect(rejectionOf(raw)).toEqual({ kind: "too_short", min: 3, actual: raw.length });
    });

    it("rejects codes longer than 32 characters", () => {
        expect(rejectionOf("a".repeat(33))).toEqual({ kind: "too_long", max: 32, actual: 33 });
    });

    it.each<[string, string[]]>([
        ["my resume", [" "]],
        [" abc", [" "]], // surrounding spaces are not trimmed here
        ["my_code", ["_"]],
        ["a/b", ["/"]],
        ["café", ["é"]],
        ["a b_c d", [" ", "_"]], // each bad character reported once
    ])("rejects %j for invalid characters", (raw, invalid) => {
        expect(rejectionOf(raw)).toEqual({ kind: "invalid_characters", invalid });
    });

    it.each(["-abc", "abc-", "a--b"])("rejects %j for hyphen placement", (raw) => {
        expect(rejectionOf(raw)).toEqual({ kind: "invalid_hyphen_placement" });
    });

    it.each<[string, string]>([
        ["api", "api"],
        ["API", "api"],
        ["Health", "health"],
        ["links", "links"],
        ["admin", "admin"],
    ])("rejects %j as the reserved word %j, regardless of case", (raw, word) => {
        expect(rejectionOf(raw)).toEqual({ kind: "reserved", word });
    });

    describe("equality is by value", () => {
        it("treats two codes with the same characters as equal", () => {
            expect(validCode("my-resume").equals(validCode("my-resume"))).toBe(true);
        });

        it("is case-sensitive", () => {
            expect(validCode("Abc").equals(validCode("abc"))).toBe(false);
        });
    });

    it("prints as its plain value", () => {
        expect(String(validCode("aZ3kP9q"))).toBe("aZ3kP9q");
    });
});
