/**
 * The outcome of an operation that can fail in an EXPECTED way:
 * bad input, a business rule broken, something not found.
 *
 * Unexpected failures (bugs, a database that is down) still throw.
 *
 * It is a discriminated union: checking `result.ok` tells TypeScript
 * which branch you are in, so you can only read `value` after success
 * and `error` after failure.
 *
 * @example
 * const result = ShortCode.create(input);
 * if (!result.ok) return badRequest(result.error);
 * use(result.value);
 */
export type Result<T, E> =
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Wrap a successful value. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Wrap an expected failure. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
