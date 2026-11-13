/**
 * MIDDLEWARE: turns anything thrown (or rejected, in Express 5) into an
 * RFC 9457 Problem response. Mount it LAST.
 *
 * Express recognises an error handler by its FOUR parameters
 * `(error, req, res, next)`: when a handler throws, Express skips every
 * normal middleware and jumps to the first one with four.
 */
import type { ErrorRequestHandler, Request } from "express";
import { sendProblem, type Problem } from "../problem.ts";

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
    // Too late to send a Problem (part of the response is already out):
    // let Express's default handler close the connection.
    if (res.headersSent) {
        next(error);
        return;
    }

    const problem = bodyParserProblem(error, req) ?? internalErrorProblem(error);
    // A body we stopped reading part-way leaves the connection unusable.
    if (problem.status === 413) res.setHeader("connection", "close");
    sendProblem(res, problem);
};

/**
 * express.json() reports bad bodies as errors with a `type` such as
 * "entity.too.large" and an HTTP `status`. Maps them to Problem Details.
 */
function bodyParserProblem(error: unknown, req: Request): Problem | undefined {
    if (!isBodyParserError(error)) return undefined;

    switch (error.type) {
        case "entity.too.large":
            return {
                type: "/problems/body-too-large",
                title: "Request body too large",
                status: 413,
                detail: `The body must be at most ${String(error.limit)} bytes.`,
                instance: req.path,
            };
        case "entity.parse.failed":
            return {
                type: "/problems/invalid-json",
                title: "Invalid JSON",
                status: 400,
                detail: "The request body is not valid JSON.",
                instance: req.path,
            };
        default:
            // Rarer client mistakes (unsupported charset, aborted upload...).
            return {
                type: "/problems/bad-request",
                title: "Bad request",
                status: error.status,
                instance: req.path,
            };
    }
}

interface BodyParserError {
    readonly type: string;
    readonly status: number;
    readonly limit?: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
    return (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        typeof error.type === "string" &&
        "status" in error &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
    );
}

/**
 * Last line of defence for bugs: log the details for us, and send the
 * client a generic 500 that leaks nothing about the internals.
 */
function internalErrorProblem(error: unknown): Problem {
    const details = error instanceof Error ? (error.stack ?? error.message) : String(error);
    // Replaced by a structured logger in Phase 10.
    process.stderr.write(`Unhandled error: ${details}\n`);
    return { type: "/problems/internal-error", title: "Internal server error", status: 500 };
}
