import { describe, expect, it } from "vitest";
import { unwrap, unwrapError } from "../../../../test/support/result.ts";
import { TargetUrl } from "./target-url.ts";

const MAX_LENGTH = 2048;

describe("TargetUrl", () => {
    describe("accepts http and https URLs", () => {
        it.each([
            "https://example.com/articles/2026/how-dns-works",
            "http://example.com/",
            "https://example.com:8443/path?q=1#section",
        ])("%s", (raw) => {
            expect(unwrap(TargetUrl.create(raw)).value).toBe(raw);
        });
    });

    it("accepts a URL of exactly the maximum length", () => {
        const raw = `https://example.com/${"a".repeat(MAX_LENGTH - "https://example.com/".length)}`;
        expect(unwrap(TargetUrl.create(raw)).value).toBe(raw);
    });

    describe("normalises to the canonical form", () => {
        it.each([
            ["HTTPS://Example.COM/a", "https://example.com/a"], // scheme and host are case-insensitive
            ["https://example.com", "https://example.com/"], // an origin gets its root path
            ["https://example.com/a b", "https://example.com/a%20b"], // spaces are percent-encoded
        ])("%s becomes %s", (raw, normalised) => {
            expect(unwrap(TargetUrl.create(raw)).value).toBe(normalised);
        });

        it("encodes international domain names as punycode", () => {
            expect(unwrap(TargetUrl.create("https://例子.测试/")).value).toMatch(/^https:\/\/xn--/);
        });
    });

    it("rejects URLs longer than the maximum", () => {
        const raw = `https://example.com/${"a".repeat(MAX_LENGTH)}`;
        expect(unwrapError(TargetUrl.create(raw))).toEqual({
            kind: "too_long",
            max: MAX_LENGTH,
            actual: raw.length,
        });
    });

    it.each(["", "not a url", "https://", "//example.com/relative"])(
        "rejects %j as malformed",
        (raw) => {
            expect(unwrapError(TargetUrl.create(raw))).toEqual({ kind: "malformed" });
        },
    );

    it.each<[string, string]>([
        ["javascript:alert(1)", "javascript"], // runs code in the visitor's browser
        ["data:text/html,<h1>hi</h1>", "data"],
        ["ftp://example.com/file", "ftp"],
        ["mailto:someone@example.com", "mailto"],
    ])("rejects %j because %j is not http or https", (raw, scheme) => {
        expect(unwrapError(TargetUrl.create(raw))).toEqual({ kind: "unsupported_scheme", scheme });
    });

    it.each([
        "https://user:secret@example.com/", // leaks a password into every click
        "https://google.com@evil.example/", // phishing: looks like google.com, goes to evil.example
    ])("rejects %j because it contains credentials", (raw) => {
        expect(unwrapError(TargetUrl.create(raw))).toEqual({ kind: "credentials_not_allowed" });
    });

    it("compares by normalised value", () => {
        const a = unwrap(TargetUrl.create("https://Example.com"));
        const b = unwrap(TargetUrl.create("https://example.com/"));
        expect(a.equals(b)).toBe(true);
    });
});
