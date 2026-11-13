import { ResponseError, type ResponseErrorOptions } from "./response.error.ts";

/** 413: the request body is over the size limit. */
export class ContentTooLargeError extends ResponseError {
    constructor(detail: string, options?: ResponseErrorOptions) {
        super(
            413,
            detail,
            { type: "/problems/body-too-large", title: "Request body too large" },
            options,
        );
    }
}
