/** Returns what `fn` throws, or fails the test if it doesn't throw. */
export function thrownBy(fn: () => unknown): unknown {
    try {
        fn();
    } catch (error) {
        return error;
    }
    throw new Error("expected the call to throw, but it returned normally");
}

/** Returns what `promise` rejects with, or fails the test if it resolves. */
export async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected the promise to reject, but it resolved");
}
