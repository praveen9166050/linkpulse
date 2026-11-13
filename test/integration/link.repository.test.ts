/**
 * REPOSITORY TEST: LinkRepository against a real MongoDB test database.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Link } from "#src/modules/links/database/entities/link.entity.ts";
import {
    LinkRepository,
    listQuery,
} from "#src/modules/links/database/repositories/link.repository.ts";
import { ShortCode } from "#src/modules/links/short-code.value-object.ts";
import { TargetUrl } from "#src/modules/links/target-url.value-object.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";

function link(
    code: string,
    target = "https://example.com/",
    createdAt = new Date("2026-11-13T10:00:00Z"),
): Link {
    return Link.create({
        code: ShortCode.create(code),
        target: TargetUrl.create(target),
        createdAt,
    });
}

/** A link created `minute` minutes after 10:00, for ordering tests. */
function linkAt(code: string, minute: number): Link {
    return link(code, "https://example.com/", new Date(Date.UTC(2026, 10, 13, 10, minute)));
}

function codes(page: { links: readonly Link[] }): string[] {
    return page.links.map((l) => l.code.value);
}

describe("LinkRepository (MongoDB)", () => {
    let database: TestDatabase;
    let links: LinkRepository;

    beforeAll(async () => {
        database = await connectTestDatabase();
        links = new LinkRepository(database.connection, {
            collection: database.linksCollection,
        });
    });

    beforeEach(async () => {
        await database.clear();
    });

    afterAll(async () => {
        await database.dispose();
    });

    it("finds nothing for a code that was never added", async () => {
        expect(await links.findByCode(ShortCode.create("aZ3kP9q"))).toBeUndefined();
    });

    it("finds a link after adding it, with all its data intact", async () => {
        const original = link("aZ3kP9q", "https://example.com/a");

        expect(await links.add(original)).toBe("added");
        const found = await links.findByCode(ShortCode.create("aZ3kP9q"));

        expect(found).toBeInstanceOf(Link); // rebuilt as a real domain object
        expect(found?.code.value).toBe("aZ3kP9q");
        expect(found?.target.value).toBe("https://example.com/a");
        expect(found?.createdAt).toEqual(original.createdAt);
    });

    it("stores the short code as the document's _id", async () => {
        await links.add(link("aZ3kP9q", "https://example.com/a"));

        const stored = await database.connection
            .collection(database.linksCollection)
            .findOne({ _id: "aZ3kP9q" as never });

        expect(stored).toMatchObject({ _id: "aZ3kP9q", target: "https://example.com/a" });
    });

    it("refuses a second link with the same code and keeps the first", async () => {
        await links.add(link("my-resume", "https://first.example/"));

        expect(await links.add(link("my-resume", "https://second.example/"))).toBe("code_taken");
        expect((await links.findByCode(ShortCode.create("my-resume")))?.target.value).toBe(
            "https://first.example/",
        );
    });

    it("treats codes as case-sensitive", async () => {
        expect(await links.add(link("abc"))).toBe("added");
        expect(await links.add(link("ABC"))).toBe("added");
    });

    it("lets exactly one of two simultaneous adds of the same code win", async () => {
        const outcomes = await Promise.all([
            links.add(link("race", "https://a.example/")),
            links.add(link("race", "https://b.example/")),
        ]);

        expect(outcomes.toSorted()).toEqual(["added", "code_taken"]);
    });

    describe("list (keyset pagination)", () => {
        it("returns links newest first", async () => {
            await links.add(linkAt("aaa", 0));
            await links.add(linkAt("ccc", 2));
            await links.add(linkAt("bbb", 1));

            expect(codes(await links.list({ limit: 10 }))).toEqual(["ccc", "bbb", "aaa"]);
        });

        it("splits into pages, each continuing after the previous page's last link", async () => {
            for (const [i, code] of ["aaa", "bbb", "ccc", "ddd", "eee"].entries()) {
                await links.add(linkAt(code, i));
            }

            const first = await links.list({ limit: 2 });
            const second = await links.list({ limit: 2, after: positionOf(first) });
            const third = await links.list({ limit: 2, after: positionOf(second) });

            expect([codes(first), first.hasMore]).toEqual([["eee", "ddd"], true]);
            expect([codes(second), second.hasMore]).toEqual([["ccc", "bbb"], true]);
            expect([codes(third), third.hasMore]).toEqual([["aaa"], false]);
        });

        it("breaks ties on createdAt by code, so links in the same millisecond page correctly", async () => {
            await links.add(linkAt("aaa", 0));
            await links.add(linkAt("bbb", 0));
            await links.add(linkAt("ccc", 0));

            const first = await links.list({ limit: 2 });
            const second = await links.list({ limit: 2, after: positionOf(first) });

            expect(codes(first)).toEqual(["ccc", "bbb"]);
            expect(codes(second)).toEqual(["aaa"]);
        });

        it("stays stable when links are created between pages: no duplicates, none skipped", async () => {
            for (const [i, code] of ["aaa", "bbb", "ccc", "ddd"].entries()) {
                await links.add(linkAt(code, i));
            }
            const first = await links.list({ limit: 2 });

            await links.add(linkAt("new", 59)); // newer than everything: belongs before page 1
            const second = await links.list({ limit: 2, after: positionOf(first) });

            expect(codes(first)).toEqual(["ddd", "ccc"]);
            expect(codes(second)).toEqual(["bbb", "aaa"]); // with skip(2), "ccc" would repeat
        });

        it("answers from the { createdAt: -1, _id: -1 } index, not a collection scan", async () => {
            await links.ensureIndexes();
            for (const [i, code] of ["aaa", "bbb", "ccc"].entries()) {
                await links.add(linkAt(code, i));
            }
            const { filter, sort } = listQuery({ createdAt: new Date(), code: "zzz" });

            const plan = await database.connection
                // Typed: our _id is the string short code, not the driver's default ObjectId.
                .collection<{ _id: string; createdAt: Date }>(database.linksCollection)
                .find(filter)
                .sort(sort)
                .limit(3)
                .explain("queryPlanner");
            const winningPlan = JSON.stringify(plan.queryPlanner);

            expect(winningPlan).toContain('"stage":"IXSCAN"');
            expect(winningPlan).toContain("createdAt_-1__id_-1");
            expect(winningPlan).not.toContain("COLLSCAN");
        });
    });
});

/** Where a page ended: what the API puts in its opaque cursor. */
function positionOf(page: { links: readonly Link[] }) {
    const last = page.links.at(-1);
    if (!last) throw new Error("expected a non-empty page");
    return { createdAt: last.createdAt, code: last.code.value };
}
