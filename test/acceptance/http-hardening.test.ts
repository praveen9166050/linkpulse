/**
 * Acceptance tests for HTTP behaviours that came with Express and must not
 * silently regress: the framework is not advertised, and routes match
 * case-sensitively.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer, type RunningServer } from "../../src/apps/api/server.ts";

describe("HTTP hardening", () => {
    let server: RunningServer;

    beforeAll(async () => {
        server = await startServer({ port: 0 });
    });

    afterAll(async () => {
        await server.stop();
    });

    function createLink(path: string): Promise<Response> {
        return fetch(`${server.baseUrl}${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: "https://example.com/" }),
        });
    }

    describe("does not reveal the framework in an X-Powered-By header", () => {
        it("on a successful response", async () => {
            const response = await createLink("/api/v1/links");

            expect(response.status).toBe(201);
            expect(response.headers.has("x-powered-by")).toBe(false);
        });

        it("on an error response", async () => {
            const response = await fetch(`${server.baseUrl}/no/such/route`);

            expect(response.status).toBe(404);
            expect(response.headers.has("x-powered-by")).toBe(false);
        });
    });

    it("matches routes case-sensitively: /API/V1/LINKS is not our route", async () => {
        const response = await createLink("/API/V1/LINKS");

        expect(response.status).toBe(404);
        expect(((await response.json()) as { type: string }).type).toBe("/problems/not-found");
    });
});
