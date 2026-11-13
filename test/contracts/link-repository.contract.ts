/**
 * CONTRACT TEST: the behaviour every LinkRepository must have. Each
 * adapter (in-memory now, DynamoDB later) runs this same suite, which
 * proves they are interchangeable (Liskov substitution, the L in SOLID).
 */
import { describe, expect, it } from "vitest";
import type { LinkRepository } from "../../src/modules/link/application/ports.ts";
import { Link } from "../../src/modules/link/domain/link.ts";
import { ShortCode } from "../../src/modules/link/domain/short-code.ts";
import { TargetUrl } from "../../src/modules/link/domain/target-url.ts";
import { unwrap } from "../support/result.ts";

const code = (raw: string): ShortCode => unwrap(ShortCode.create(raw));

function link(rawCode: string, target = "https://example.com/"): Link {
    return Link.create({
        code: code(rawCode),
        target: unwrap(TargetUrl.create(target)),
        createdAt: new Date("2026-11-13T10:00:00Z"),
    });
}

/** Registers the contract tests for one adapter. `create` returns a fresh, empty repository. */
export function describeLinkRepositoryContract(
    name: string,
    create: () => LinkRepository | Promise<LinkRepository>,
): void {
    describe(`${name} (LinkRepository contract)`, () => {
        it("finds nothing for a code that was never added", async () => {
            const links = await create();

            expect(await links.findByCode(code("aZ3kP9q"))).toBeUndefined();
        });

        it("finds a link after adding it, with all its data intact", async () => {
            const links = await create();
            const original = link("aZ3kP9q", "https://example.com/a");

            expect(await links.add(original)).toBe("added");
            const found = await links.findByCode(code("aZ3kP9q"));

            expect(found?.code.value).toBe("aZ3kP9q");
            expect(found?.target.value).toBe("https://example.com/a");
            expect(found?.createdAt).toEqual(original.createdAt);
        });

        it("refuses a second link with the same code and keeps the first", async () => {
            const links = await create();
            await links.add(link("my-resume", "https://first.example/"));

            expect(await links.add(link("my-resume", "https://second.example/"))).toBe(
                "code_taken",
            );
            expect((await links.findByCode(code("my-resume")))?.target.value).toBe(
                "https://first.example/",
            );
        });

        it("treats codes as case-sensitive", async () => {
            const links = await create();

            expect(await links.add(link("abc"))).toBe("added");
            expect(await links.add(link("ABC"))).toBe("added");
        });

        it("lets exactly one of two simultaneous adds of the same code win", async () => {
            const links = await create();

            const outcomes = await Promise.all([
                links.add(link("race", "https://a.example/")),
                links.add(link("race", "https://b.example/")),
            ]);

            expect(outcomes.toSorted()).toEqual(["added", "code_taken"]);
        });
    });
}
