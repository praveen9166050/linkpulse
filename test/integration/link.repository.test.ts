/**
 * REPOSITORY TEST: the behaviour LinkRepository must keep, whatever storage
 * it uses inside. In-memory today; stage 4 points these same tests at a
 * real MongoDB test database.
 */
import { describe, expect, it } from "vitest";
import { Link } from "#src/modules/links/database/entities/link.entity.ts";
import { LinkRepository } from "#src/modules/links/database/repositories/link.repository.ts";
import { ShortCode } from "#src/modules/links/short-code.value-object.ts";
import { TargetUrl } from "#src/modules/links/target-url.value-object.ts";

function link(code: string, target = "https://example.com/"): Link {
    return Link.create({
        code: ShortCode.create(code),
        target: TargetUrl.create(target),
        createdAt: new Date("2026-11-13T10:00:00Z"),
    });
}

describe("LinkRepository", () => {
    it("finds nothing for a code that was never added", async () => {
        expect(await new LinkRepository().findByCode(ShortCode.create("aZ3kP9q"))).toBeUndefined();
    });

    it("finds a link after adding it, with all its data intact", async () => {
        const links = new LinkRepository();
        const original = link("aZ3kP9q", "https://example.com/a");

        expect(await links.add(original)).toBe("added");
        const found = await links.findByCode(ShortCode.create("aZ3kP9q"));

        expect(found?.code.value).toBe("aZ3kP9q");
        expect(found?.target.value).toBe("https://example.com/a");
        expect(found?.createdAt).toEqual(original.createdAt);
    });

    it("refuses a second link with the same code and keeps the first", async () => {
        const links = new LinkRepository();
        await links.add(link("my-resume", "https://first.example/"));

        expect(await links.add(link("my-resume", "https://second.example/"))).toBe("code_taken");
        expect((await links.findByCode(ShortCode.create("my-resume")))?.target.value).toBe(
            "https://first.example/",
        );
    });

    it("treats codes as case-sensitive", async () => {
        const links = new LinkRepository();

        expect(await links.add(link("abc"))).toBe("added");
        expect(await links.add(link("ABC"))).toBe("added");
    });

    it("lets exactly one of two simultaneous adds of the same code win", async () => {
        const links = new LinkRepository();

        const outcomes = await Promise.all([
            links.add(link("race", "https://a.example/")),
            links.add(link("race", "https://b.example/")),
        ]);

        expect(outcomes.toSorted()).toEqual(["added", "code_taken"]);
    });
});
