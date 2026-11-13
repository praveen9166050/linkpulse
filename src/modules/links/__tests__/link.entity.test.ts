import { describe, expect, it } from "vitest";
import { Link } from "../database/entities/link.entity.ts";
import { ShortCode } from "../short-code.value-object.ts";
import { TargetUrl } from "../target-url.value-object.ts";

const CREATED_AT = new Date("2026-11-13T10:00:00Z");

function link(code: string, target: string, createdAt = CREATED_AT): Link {
    return Link.create({
        code: ShortCode.create(code),
        target: TargetUrl.create(target),
        createdAt,
    });
}

describe("Link", () => {
    it("holds its code, target and creation time", () => {
        const created = link("aZ3kP9q", "https://example.com/");

        expect(created.code.value).toBe("aZ3kP9q");
        expect(created.target.value).toBe("https://example.com/");
        expect(created.createdAt).toEqual(CREATED_AT);
    });

    describe("protects its creation time from outside changes", () => {
        // Date objects are mutable, so Link keeps and hands out copies.
        it("is not affected when the caller later changes the Date it passed in", () => {
            const createdAt = new Date("2026-11-13T10:00:00Z");
            const created = link("abc", "https://a.example/", createdAt);

            createdAt.setFullYear(1999);

            expect(created.createdAt.getFullYear()).toBe(2026);
        });

        it("is not affected when the caller changes the Date it got back", () => {
            const created = link("abc", "https://a.example/");

            created.createdAt.setFullYear(1999);

            expect(created.createdAt.getFullYear()).toBe(2026);
        });
    });

    describe("equality is by identity (the code), not by data", () => {
        it("treats links with the same code as the same link, even with different targets", () => {
            expect(
                link("abc", "https://old.example/").equals(link("abc", "https://new.example/")),
            ).toBe(true);
        });

        it("treats links with different codes as different links, even with the same target", () => {
            expect(
                link("abc", "https://a.example/").equals(link("xyz", "https://a.example/")),
            ).toBe(false);
        });
    });
});
