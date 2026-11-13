/**
 * API TEST: GET /health over real HTTP, against the real test database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseConnection } from "#src/databases/mongo.connection.ts";
import { loadAppConfig } from "#src/config/app.config.ts";
import { startServer, type RunningServer } from "#src/server.ts";
import {
    connectTestDatabase,
    TEST_DATABASE,
    type TestDatabase,
} from "#test/shared/test-database.ts";

describe("GET /health", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        server = await startServer({
            port: 0,
            database: database.databaseConnection,
            linksCollection: database.linksCollection,
            // This test checks the response's shape and the database ping. Event-loop
            // lag depends on how busy the machine is (26 test files run in parallel),
            // which a test mustn't depend on; "lagging loop -> degraded" is covered
            // deterministically by the HealthService unit tests.
            healthEventLoopP99LimitMs: 60_000,
        });
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    it("answers 200 ok, with the database ping, event-loop delay and uptime", async () => {
        const response = await fetch(`${server.baseUrl}/health`);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toMatch(/^application\/json/);
        expect(response.headers.get("cache-control")).toBe("no-store");

        const body = (await response.json()) as Record<string, unknown>;
        expect(body).toMatchObject({
            status: "ok",
            database: { status: "up", latencyMs: expect.any(Number) as unknown },
            eventLoopDelayMs: {
                p50: expect.any(Number) as unknown,
                p99: expect.any(Number) as unknown,
            },
            uptimeSeconds: expect.any(Number) as unknown,
        });
    });

    it("is the health check, not a short code (it's mounted before /:code)", async () => {
        const response = await fetch(`${server.baseUrl}/health`);

        expect(response.headers.get("content-type")).not.toMatch(/problem\+json/);
    });
});

describe("GET /health when the database is gone", () => {
    let database: DatabaseConnection;
    let server: RunningServer;

    beforeAll(async () => {
        database = new DatabaseConnection({
            uri: loadAppConfig().mongodb.uri,
            database: TEST_DATABASE,
        });
        await database.connect();
        server = await startServer({ port: 0, database });
        await database.close(); // the database disappears while the server keeps running
    });

    afterAll(async () => {
        await server.stop();
    });

    it("answers 503 degraded, database down, so a load balancer moves traffic away", async () => {
        const response = await fetch(`${server.baseUrl}/health`);

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toMatchObject({
            status: "degraded",
            database: { status: "down", latencyMs: null },
        });
    });
});
