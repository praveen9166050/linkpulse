/**
 * API TEST: the live request log, streamed with Server-Sent Events.
 * Reads the stream exactly as a browser's EventSource would: one long HTTP
 * response, delivered in chunks, never finished.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer, type RunningServer } from "#src/server.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";

const STREAM = "/api/v1/dev/requests";

/** Reads from the stream until `done(text)` is true, or fails after `timeoutMs`. */
async function readUntil(
    body: ReadableStream<Uint8Array>,
    done: (text: string) => boolean,
    timeoutMs = 5000,
): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    const deadline = Date.now() + timeoutMs;
    try {
        while (!done(text)) {
            if (Date.now() > deadline) throw new Error(`stream timed out; got:\n${text}`);
            const { value, done: ended } = await reader.read();
            if (ended) break;
            text += decoder.decode(value, { stream: true });
        }
        return text;
    } finally {
        reader.releaseLock();
    }
}

describe("GET /api/v1/dev/requests (DEV_TOOLS on)", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        server = await startServer({
            port: 0,
            database: database.databaseConnection,
            linksCollection: database.linksCollection,
            devTools: true,
        });
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    it("replays recent requests, then streams new ones as they happen", async () => {
        await fetch(`${server.baseUrl}/before-connecting`); // a 404, recorded before we listen
        const controller = new AbortController();
        const response = await fetch(`${server.baseUrl}${STREAM}`, { signal: controller.signal });
        const body = response.body;
        if (!body) throw new Error("no body");

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toMatch(/^text\/event-stream/);
        expect(response.headers.get("cache-control")).toBe("no-store");

        const replayed = await readUntil(body, (t) => t.includes("/before-connecting"));
        expect(replayed).toMatch(
            /event: request\ndata: \{.*"path":"\/before-connecting".*"status":404/,
        );

        // A probe whose result never varies. Not /health: it may correctly answer 503
        // when the machine is busy (many test files run in parallel).
        await fetch(`${server.baseUrl}/while-connected`); // happens WHILE we're connected
        const live = await readUntil(body, (t) => t.includes('"path":"/while-connected"'));
        expect(live).toMatch(
            /id: \d+\nevent: request\ndata: \{.*"method":"GET","path":"\/while-connected","status":404/,
        );
        expect(live).not.toContain(STREAM); // the stream doesn't log itself

        controller.abort();
    });
});

describe("GET /api/v1/dev/requests (DEV_TOOLS off, the default)", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        server = await startServer({ port: 0, database: database.databaseConnection });
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    it("doesn't exist: 404, so production can't leak request data by accident", async () => {
        expect((await fetch(`${server.baseUrl}${STREAM}`)).status).toBe(404);
    });
});

describe("stopping the server while a stream is open", () => {
    it("ends open streams after the grace period instead of waiting forever", async () => {
        const database = await connectTestDatabase();
        const server = await startServer({
            port: 0,
            database: database.databaseConnection,
            devTools: true,
            shutdownGraceMs: 200,
        });
        const response = await fetch(`${server.baseUrl}${STREAM}`); // never ends by itself
        expect(response.status).toBe(200);

        const started = performance.now();
        await server.stop();

        expect(performance.now() - started).toBeLessThan(2000);
        await database.dispose();
    });
});
