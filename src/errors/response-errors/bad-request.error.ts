import { ResponseError, type ResponseErrorOptions } from "./response.error.ts";

/** 400: the request is invalid. Fix it before retrying. */
export class BadRequestError extends ResponseError {
    constructor(detail: string, options?: ResponseErrorOptions) {
        super(
            400,
            detail,
            { type: "/problems/validation-error", title: "Invalid request" },
            options,
        );
    }
}
