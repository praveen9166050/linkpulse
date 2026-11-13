import { describe, expect, it } from "vitest";
import { unwrap } from "../../../../test/support/result.ts";
import { Link } from "./link.ts";
import { ShortCode } from "./short-code.ts";
import { TargetUrl } from "./target-url.ts";

const code = (raw: string): ShortCode => unwrap(ShortCode.create(raw));
const target = (raw: string): TargetUrl => unwrap(TargetUrl.create(raw));

describe("Link", () => {
    it("holds its code, target and creation time", () => {
        const createdAt = new Date("2026-11-13T10:00:00Z");

        const link = Link.create({
            code: code("aZ3kP9q"),
            target: target("https://example.com/"),
            createdAt,
        });

        expect(link.code.value).toBe("aZ3kP9q");
        expect(link.target.value).toBe("https://example.com/");
        expect(link.createdAt).toEqual(createdAt);
    });

    describe("protects its creation time from outside changes", () => {
        // Date objects are mutable, so Link keeps and hands out copies.
        it("is not affected when the caller later changes the Date it passed in", () => {
            const createdAt = new Date("2026-11-13T10:00:00Z");
            const link = Link.create({
                code: code("abc"),
                target: target("https://a.example/"),
                createdAt,
            });

            createdAt.setFullYear(1999);

            expect(link.createdAt.getFullYear()).toBe(2026);
        });

        it("is not affected when the caller changes the Date it got back", () => {
            const link = Link.create({
                code: code("abc"),
                target: target("https://a.example/"),
                createdAt: new Date("2026-11-13T10:00:00Z"),
            });

            link.createdAt.setFullYear(1999);

            expect(link.createdAt.getFullYear()).toBe(2026);
        });
    });

    describe("equality is by identity (the code), not by data", () => {
        const createdAt = new Date("2026-11-13T10:00:00Z");

        it("treats links with the same code as the same link, even with different targets", () => {
            const before = Link.create({
                code: code("abc"),
                target: target("https://old.example/"),
                createdAt,
            });
            const after = Link.create({
                code: code("abc"),
                target: target("https://new.example/"),
                createdAt,
            });

            expect(before.equals(after)).toBe(true);
        });

        it("treats links with different codes as different links, even with the same target", () => {
            const one = Link.create({
                code: code("abc"),
                target: target("https://a.example/"),
                createdAt,
            });
            const two = Link.create({
                code: code("xyz"),
                target: target("https://a.example/"),
                createdAt,
            });

            expect(one.equals(two)).toBe(false);
        });
    });
});
