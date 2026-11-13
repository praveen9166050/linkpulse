/**
 * API TEST: GET /api/v1/links over real HTTP, against the real test database.
 * (Exact ordering and ties are pinned down in the repository test, where
 * createdAt can be controlled.)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startServer, type RunningServer } from "#src/server.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";

interface LinkPage {
    items: { code: string; shortUrl: string; url: string }[];
    nextCursor: string | null;
}

describe("GET /api/v1/links", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        server = await startServer({
            port: 0,
            database: database.databaseConnection,
            linksCollection: database.linksCollection,
        });
    });

    beforeEach(async () => {
        await database.clear();
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    async function create(code: string): Promise<void> {
        const response = await fetch(`${server.baseUrl}/api/v1/links`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: `https://example.com/${code}`, code }),
        });
        expect(response.status).toBe(201);
    }

    async function list(query = ""): Promise<{ status: number; body: unknown }> {
        const response = await fetch(`${server.baseUrl}/api/v1/links${query}`);
        return { status: response.status, body: await response.json() };
    }

    it("answers an empty page when there are no links", async () => {
        expect(await list()).toEqual({ status: 200, body: { items: [], nextCursor: null } });
    });

    it("walks every link exactly once by following nextCursor", async () => {
        await create("one");
        await create("two");
        await create("three");

        const first = (await list("?limit=2")).body as LinkPage;
        expect(first.items).toHaveLength(2);
        expect(first.nextCursor).toEqual(expect.any(String));

        const second = (await list(`?limit=2&cursor=${String(first.nextCursor)}`)).body as LinkPage;
        expect(second.items).toHaveLength(1);
        expect(second.nextCursor).toBeNull();

        const seen = [...first.items, ...second.items].map((item) => item.code);
        expect(seen.toSorted()).toEqual(["one", "three", "two"]);
        expect(first.items[0]).toMatchObject({
            shortUrl: expect.stringMatching(/\/(one|two|three)$/) as unknown,
            url: expect.stringMatching(/^https:\/\/example\.com\//) as unknown,
        });
    });

    it.each([
        ["limit out of range", "?limit=500", "limit"],
        ["a cursor this API never produced", "?cursor=not-a-real-cursor", "cursor"],
        ["an unknown parameter", "?limt=5", "limt"],
    ])("answers 400 for %s", async (_label, query, field) => {
        const { status, body } = await list(query);

        expect(status).toBe(400);
        expect(body).toMatchObject({
            type: "/problems/validation-error",
            errors: [expect.objectContaining({ field }) as unknown],
        });
    });
});
