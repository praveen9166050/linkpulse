/** MongoDB's error code for "a document with this unique key already exists". */
const DUPLICATE_KEY = 11_000;

/**
 * True when MongoDB rejected a write because a unique key (such as `_id`)
 * already exists: the server-side, atomic equivalent of "already taken".
 *
 * Checks the shape rather than `instanceof`, so it works whichever copy of
 * the driver created the error.
 */
export function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === DUPLICATE_KEY
    );
}
