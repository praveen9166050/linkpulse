/**
 * MIDDLEWARE: turns anything thrown (or rejected, in Express 5) into an
 * RFC 9457 Problem response. Mount it LAST.
 *
 * Express recognises an error handler by its FOUR parameters
 * `(error, req, res, next)`: when a handler throws, Express skips every
 * normal middleware and jumps to the first one with four.
 */
import type { ErrorRequestHandler } from "express";
import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import { ContentTooLargeError } from "#src/errors/response-errors/content-too-large.error.ts";
import { ResponseError } from "#src/errors/response-errors/response.error.ts";
import { sendProblem, type Problem } from "#src/response-helper.ts";

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
    // Too late to send a Problem (part of the response is already out):
    // let Express's default handler close the connection.
    if (res.headersSent) {
        next(error);
        return;
    }

    const responseError = toResponseError(error);
    if (!responseError) {
        sendProblem(res, internalErrorProblem(error));
        return;
    }

    // A body we stopped reading part-way leaves the connection unusable.
    if (responseError instanceof ContentTooLargeError) res.setHeader("connection", "close");
    sendProblem(res, {
        type: responseError.type,
        title: responseError.title,
        status: responseError.status,
        detail: responseError.message,
        instance: req.path,
        errors: responseError.errors,
    });
};

/** Our own ResponseErrors as they are; express.json() failures translated. */
function toResponseError(error: unknown): ResponseError | undefined {
    if (error instanceof ResponseError) return error;
    if (!isBodyParserError(error)) return undefined;

    switch (error.type) {
        case "entity.too.large":
            return new ContentTooLargeError(
                `The body must be at most ${String(error.limit)} bytes.`,
            );
        case "entity.parse.failed":
            return new BadRequestError("The request body is not valid JSON.", {
                type: "/problems/invalid-json",
                title: "Invalid JSON",
            });
        default:
            // Rarer client mistakes (unsupported charset, aborted upload...).
            return new BadRequestError("The request body could not be read.", {
                type: "/problems/bad-request",
                title: "Bad request",
            });
    }
}

/** express.json() reports bad bodies with a `type` like "entity.too.large" and a 4xx `status`. */
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
