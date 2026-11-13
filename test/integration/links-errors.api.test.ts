/**
 * Acceptance tests for every error path in api/openapi.yaml, plus the
 * custom-code happy path. Real HTTP, real server.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer, type RunningServer } from "../../src/server.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";

describe("creating and following links: the error paths", () => {
    let database: TestDatabase;
    let server: RunningServer;

    beforeAll(async () => {
        database = await connectTestDatabase();
        server = await startServer({
            port: 0,
            mongo: database.connection,
            linksCollection: database.linksCollection,
        });
    });

    afterAll(async () => {
        await server.stop();
        await database.dispose();
    });

    function post(body: string): Promise<Response> {
        return fetch(`${server.baseUrl}/api/v1/links`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
        });
    }

    async function expectProblem(
        response: Response,
        status: number,
        type: string,
    ): Promise<unknown> {
        expect(response.status).toBe(status);
        expect(response.headers.get("content-type")).toBe("application/problem+json");
        const problem = (await response.json()) as { type: string; status: number };
        expect(problem.type).toBe(type);
        expect(problem.status).toBe(status);
        return problem;
    }

    it("creates a link with a custom code, then follows it", async () => {
        const created = await post(
            JSON.stringify({ url: "https://example.com/cv.pdf", code: "my-resume" }),
        );
        expect(created.status).toBe(201);

        const followed = await fetch(`${server.baseUrl}/my-resume`, { redirect: "manual" });
        expect(followed.status).toBe(302);
        expect(followed.headers.get("location")).toBe("https://example.com/cv.pdf");
    });

    it("answers 409 when the custom code is taken", async () => {
        await post(JSON.stringify({ url: "https://first.example/", code: "taken-code" }));

        const second = await post(
            JSON.stringify({ url: "https://second.example/", code: "taken-code" }),
        );

        await expectProblem(second, 409, "/problems/code-taken");
    });

    it("answers 400 listing every invalid field", async () => {
        const response = await post(JSON.stringify({ url: "javascript:alert(1)", code: "api" }));

        const problem = (await expectProblem(response, 400, "/problems/validation-error")) as {
            errors: { field: string; kind: string }[];
        };
        expect(problem.errors.map(({ field, kind }) => ({ field, kind }))).toEqual([
            { field: "url", kind: "unsupported_scheme" },
            { field: "code", kind: "reserved" },
        ]);
    });

    it("answers 400 for a body that is not valid JSON", async () => {
        await expectProblem(await post("{not json"), 400, "/problems/invalid-json");
    });

    it("answers 413 for a body over the size limit", async () => {
        const huge = JSON.stringify({ url: `https://example.com/${"a".repeat(20_000)}` });

        await expectProblem(await post(huge), 413, "/problems/body-too-large");
    });

    it("answers 404 for an unknown short code", async () => {
        const response = await fetch(`${server.baseUrl}/zzzzzzz`, { redirect: "manual" });

        await expectProblem(response, 404, "/problems/link-not-found");
    });
});
