import { ResponseError, type ResponseErrorOptions } from "./response.error.ts";

/** 404: no such resource. */
export class NotFoundError extends ResponseError {
    constructor(detail: string, options?: ResponseErrorOptions) {
        super(404, detail, { type: "/problems/not-found", title: "Not found" }, options);
    }
}
