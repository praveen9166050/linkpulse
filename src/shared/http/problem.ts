import type { ServerResponse } from "node:http";

/** One invalid request field. Matches `FieldError` in api/openapi.yaml. */
export interface FieldError {
    readonly field: string;
    readonly kind: string;
    readonly message: string;
}

/**
 * An HTTP error in RFC 9457 Problem Details format.
 * Matches the `Problem` schema in api/openapi.yaml.
 */
export interface Problem {
    /** Stable identifier of the problem kind; clients switch on it. */
    readonly type: string;
    /** Short summary of the problem kind. */
    readonly title: string;
    readonly status: number;
    /** What went wrong this time, for humans. */
    readonly detail?: string;
    /** The request path that failed. */
    readonly instance?: string;
    readonly errors?: readonly FieldError[];
}

/** Sends `problem` as the whole response, with the RFC 9457 media type. */
export function sendProblem(res: ServerResponse, problem: Problem): void {
    res.writeHead(problem.status, { "content-type": "application/problem+json" });
    res.end(JSON.stringify(problem));
}
