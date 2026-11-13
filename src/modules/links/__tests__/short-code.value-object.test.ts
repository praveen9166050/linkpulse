import { describe, expect, it } from "vitest";
import {
    InvalidShortCodeError,
    type ShortCodeViolation,
} from "#src/errors/invalid-short-code.error.ts";
import { thrownBy } from "#test/shared/thrown.ts";
import { ShortCode } from "../short-code.value-object.ts";

/** The broken rule, for a string ShortCode must reject. */
function violationOf(raw: string): ShortCodeViolation {
    const error = thrownBy(() => ShortCode.create(raw));
    if (!(error instanceof InvalidShortCodeError)) throw error;
    return error.reason;
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
            expect(ShortCode.create(raw).value).toBe(raw);
        });
    });

    it.each(["", "a", "ab"])("rejects %j as too short", (raw) => {
        expect(violationOf(raw)).toEqual({ kind: "too_short", min: 3, actual: raw.length });
    });

    it("rejects codes longer than 32 characters", () => {
        expect(violationOf("a".repeat(33))).toEqual({ kind: "too_long", max: 32, actual: 33 });
    });

    it.each<[string, string[]]>([
        ["my resume", [" "]],
        [" abc", [" "]], // surrounding spaces are not trimmed here
        ["my_code", ["_"]],
        ["a/b", ["/"]],
        ["café", ["é"]],
        ["a b_c d", [" ", "_"]], // each bad character reported once
    ])("rejects %j for invalid characters", (raw, invalid) => {
        expect(violationOf(raw)).toEqual({ kind: "invalid_characters", invalid });
    });

    it.each(["-abc", "abc-", "a--b"])("rejects %j for hyphen placement", (raw) => {
        expect(violationOf(raw)).toEqual({ kind: "invalid_hyphen_placement" });
    });

    it.each<[string, string]>([
        ["api", "api"],
        ["API", "api"],
        ["Health", "health"],
        ["links", "links"],
        ["admin", "admin"],
    ])("rejects %j as the reserved word %j, regardless of case", (raw, word) => {
        expect(violationOf(raw)).toEqual({ kind: "reserved", word });
    });

    it("explains the broken rule in the error message", () => {
        expect(thrownBy(() => ShortCode.create("api"))).toHaveProperty(
            "message",
            '"api" is reserved and cannot be used as a short code.',
        );
    });

    describe("equality is by value", () => {
        it("treats two codes with the same characters as equal", () => {
            expect(ShortCode.create("my-resume").equals(ShortCode.create("my-resume"))).toBe(true);
        });

        it("is case-sensitive", () => {
            expect(ShortCode.create("Abc").equals(ShortCode.create("abc"))).toBe(false);
        });
    });

    it("prints as its plain value", () => {
        expect(String(ShortCode.create("aZ3kP9q"))).toBe("aZ3kP9q");
    });
});
