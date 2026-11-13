import type { Result } from "../../src/shared/result.ts";

/** Returns the value of a successful Result, or fails the test with the error. */
export function unwrap<T, E>(result: Result<T, E>): T {
    if (!result.ok) throw new Error(`expected success, got error: ${JSON.stringify(result.error)}`);
    return result.value;
}

/** Returns the error of a failed Result, or fails the test. */
export function unwrapError<T, E>(result: Result<T, E>): E {
    if (result.ok) throw new Error("expected an error, got success");
    return result.error;
}
