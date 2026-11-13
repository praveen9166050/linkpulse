/**
 * API TEST: CORS. Browsers only let a page on ANOTHER origin read our
 * responses when we name that origin in Access-Control-Allow-Origin.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer, type RunningServer } from "#src/server.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";

const DASHBOARD = "http://localhost:3001";

describe("CORS", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        server = await startServer({
            port: 0,
            database: database.databaseConnection,
            linksCollection: database.linksCollection,
            corsOrigins: [DASHBOARD],
        });
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    it("names an allowed origin, and says the answer depends on Origin (for caches)", async () => {
        const response = await fetch(`${server.baseUrl}/health`, {
            headers: { origin: DASHBOARD },
        });

        expect(response.headers.get("access-control-allow-origin")).toBe(DASHBOARD);
        expect(response.headers.get("vary")).toMatch(/origin/i);
    });

    it("gives any other origin no CORS headers, so its browser blocks the response", async () => {
        const response = await fetch(`${server.baseUrl}/health`, {
            headers: { origin: "https://evil.example" },
        });

        expect(response.status).toBe(200); // the request still runs: CORS is enforced by browsers
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("answers a preflight for a JSON POST", async () => {
        const response = await fetch(`${server.baseUrl}/api/v1/links`, {
            method: "OPTIONS",
            headers: {
                origin: DASHBOARD,
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type",
            },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("access-control-allow-origin")).toBe(DASHBOARD);
        expect(response.headers.get("access-control-allow-methods")).toMatch(/POST/);
        expect(response.headers.get("access-control-allow-headers")).toMatch(/content-type/i);
    });
});
