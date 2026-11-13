/**
 * UNIT TEST: requestTimer times each request and records it when the
 * response finishes. A response is an EventEmitter, so a stand-in emits
 * "finish" exactly as Node does once the last byte is handed to the OS.
 */
import { EventEmitter } from "node:events";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { RequestLogService } from "#src/services/request-log.service.ts";
import { requestTimer } from "../request-timer.ts";

function fakeExchange(method: string, originalUrl: string, statusCode: number) {
    const req = { method, originalUrl } as Request;
    const res = Object.assign(new EventEmitter(), { statusCode }) as unknown as Response;
    return { req, res };
}

const next: NextFunction = () => undefined;

describe("requestTimer", () => {
    it("records method, path, status and duration when the response finishes", () => {
        const log = new RequestLogService();
        const { req, res } = fakeExchange("POST", "/api/v1/links", 201);

        requestTimer(log)(req, res, next);
        expect(log.recent()).toHaveLength(0); // nothing until the response is done
        res.emit("finish");

        expect(log.recent()).toEqual([
            {
                id: 1,
                at: expect.any(String) as unknown,
                method: "POST",
                path: "/api/v1/links",
                status: 201,
                durationMs: expect.any(Number) as unknown,
            },
        ]);
        expect(log.recent()[0]?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("leaves out the query string, which can hold cursors and other noise", () => {
        const log = new RequestLogService();
        const { req, res } = fakeExchange("GET", "/api/v1/links?limit=10&cursor=abc", 200);

        requestTimer(log)(req, res, next);
        res.emit("finish");

        expect(log.recent()[0]?.path).toBe("/api/v1/links");
    });

    it("skips paths it's told to ignore (the live stream itself)", () => {
        const log = new RequestLogService();
        const { req, res } = fakeExchange("GET", "/api/v1/dev/requests", 200);

        requestTimer(log, { ignore: (path) => path === "/api/v1/dev/requests" })(req, res, next);
        res.emit("finish");

        expect(log.recent()).toHaveLength(0);
    });
});
