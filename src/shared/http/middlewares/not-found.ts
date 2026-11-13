import type { RequestHandler } from "express";
import { sendProblem } from "../problem.ts";

/**
 * MIDDLEWARE: answers any request no route handled with a 404 Problem.
 * Mount it after every router, so it only sees unmatched requests.
 */
export const notFound: RequestHandler = (req, res) => {
    sendProblem(res, {
        type: "/problems/not-found",
        title: "Not found",
        status: 404,
        detail: `No route for ${req.method} ${req.path}`,
        instance: req.path,
    });
};
