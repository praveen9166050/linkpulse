import { ResponseError, type ResponseErrorOptions } from "./response.error.ts";

/** 409: the request clashes with the current state, such as a taken code. */
export class ConflictError extends ResponseError {
    constructor(detail: string, options?: ResponseErrorOptions) {
        super(409, detail, { type: "/problems/conflict", title: "Conflict" }, options);
    }
}
