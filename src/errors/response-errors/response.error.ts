import type { FieldError } from "#src/response-helper.ts";

export interface ResponseErrorOptions {
    /** Stable problem identifier, such as `/problems/link-not-found`. */
    readonly type?: string;
    /** Short summary of the problem kind. */
    readonly title?: string;
    /** One entry per invalid field (validation errors only). */
    readonly errors?: readonly FieldError[];
}

/**
 * Base class for errors that become an HTTP response.
 *
 * Throw a subclass (NotFoundError, ConflictError...) anywhere in a request;
 * the error-handler middleware turns it into an RFC 9457 Problem Details
 * response with this status. The message becomes the problem's `detail`,
 * so it must be safe to show to clients.
 */
export abstract class ResponseError extends Error {
    readonly status: number;
    readonly type: string;
    readonly title: string;
    readonly errors: readonly FieldError[] | undefined;

    protected constructor(
        status: number,
        detail: string,
        defaults: { type: string; title: string },
        options: ResponseErrorOptions = {},
    ) {
        super(detail);
        this.name = new.target.name;
        this.status = status;
        this.type = options.type ?? defaults.type;
        this.title = options.title ?? defaults.title;
        this.errors = options.errors;
    }
}
