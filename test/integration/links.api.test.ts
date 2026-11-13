/**
 * Acceptance test: drives LinkPulse from the outside, over real HTTP, the
 * way a real client would. It knows nothing about the classes inside, so
 * they can be rebuilt freely while this keeps passing.
 *
 * Mirrors api/openapi.yaml: POST /api/v1/links, then GET /{code}.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer, type RunningServer } from "../../src/server.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";

interface CreatedLink {
    code: string;
    shortUrl: string;
    url: string;
}

describe("shorten a URL, then follow the short link", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        // Port 0 asks the OS for any free port, so tests never clash.
        server = await startServer({
            port: 0,
            database: database.databaseConnection,
            linksCollection: database.linksCollection,
        });
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    it("redirects the short link to the original URL", async () => {
        const longUrl = "https://example.com/articles/2026/how-dns-works";

        // Shorten
        const created = await fetch(`${server.baseUrl}/api/v1/links`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: longUrl }),
        });

        expect(created.status).toBe(201);
        const link = (await created.json()) as CreatedLink;
        expect(link.url).toBe(longUrl);
        expect(link.shortUrl).toBe(`${server.baseUrl}/${link.code}`);

        // Follow: "manual" stops fetch from following the redirect itself,
        // so we can inspect the 302 response.
        const followed = await fetch(link.shortUrl, { redirect: "manual" });

        expect(followed.status).toBe(302);
        expect(followed.headers.get("location")).toBe(longUrl);
        expect(followed.headers.get("cache-control")).toBe("no-store");
    });
});
