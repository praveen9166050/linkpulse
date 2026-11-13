/**
 * UNIT TEST: validateBody, the route middleware that checks a request body
 * BEFORE the controller runs. Called directly with stand-in req/res/next,
 * the way Express calls it in a route's chain.
 */
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import { validateBody } from "../validate-body.ts";

interface Greeting {
    readonly name: string;
}

/** A stand-in parser: accepts `{ name: string }`, throws otherwise (like parseCreateLinkDto). */
function parseGreeting(raw: unknown): Greeting {
    if (typeof raw === "object" && raw !== null && "name" in raw && typeof raw.name === "string") {
        return { name: raw.name.trim() };
    }
    throw new BadRequestError("A greeting needs a name");
}

function requestWithBody(body: unknown): Request {
    return { body } as Request;
}

const res = {} as Response;

/**
 * A stand-in `next` that records each call's arguments. Hand-written rather
 * than vi.fn<NextFunction>(): NextFunction is OVERLOADED (next(), next(err),
 * next("route")...), and a mock only copies one signature. A function that
 * accepts any arguments matches every overload.
 */
function nextSpy(): { next: NextFunction; calls: unknown[][] } {
    const calls: unknown[][] = [];
    const next: NextFunction = (...args: unknown[]) => {
        calls.push(args);
    };
    return { next, calls };
}

describe("validateBody", () => {
    it("replaces the body with the parsed value and calls next()", () => {
        const req = requestWithBody({ name: "  Ada  " });
        const { next, calls } = nextSpy();

        validateBody(parseGreeting)(req, res, next);

        expect(req.body).toEqual({ name: "Ada" }); // the PARSED value, not the raw JSON
        expect(calls).toEqual([[]]); // called once, with no argument: carry on to the next handler
    });

    it("throws the parser's error and never calls next(), so the handler never runs", () => {
        const req = requestWithBody({ nom: "Ada" });
        const { next, calls } = nextSpy();

        // Express catches a throw from middleware and passes it to the error handler.
        expect(() => {
            validateBody(parseGreeting)(req, res, next);
        }).toThrow(BadRequestError);
        expect(calls).toEqual([]); // never called
    });

    it("hands a missing body (no JSON content type) to the parser to reject", () => {
        const parse = vi.fn(parseGreeting);

        expect(() => {
            validateBody(parse)(requestWithBody(undefined), res, nextSpy().next);
        }).toThrow(BadRequestError);
        expect(parse).toHaveBeenCalledWith(undefined);
    });
});
