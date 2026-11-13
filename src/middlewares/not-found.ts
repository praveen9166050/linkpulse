import type { RequestHandler } from "express";
import { NotFoundError } from "#src/errors/response-errors/not-found.error.ts";

/**
 * MIDDLEWARE: any request no route handled becomes a NotFoundError, which
 * the error handler sends as a 404 Problem. Mount it after every router.
 */
export const notFound: RequestHandler = (req, _res, next) => {
    next(new NotFoundError(`No route for ${req.method} ${req.path}`));
};
