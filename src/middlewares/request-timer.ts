/**
 * APP-WIDE MIDDLEWARE: times every request and records it in the request
 * log once the response has finished (status known, last byte handed to the
 * OS). Mounted first, so the time includes everything after it.
 *
 * process.hrtime.bigint() is a monotonic clock in nanoseconds: unlike
 * Date.now() it never jumps when the system clock is adjusted, so a
 * duration can't come out negative.
 */
import type { RequestHandler } from "express";
import type { RequestLogService } from "#src/services/request-log.service.ts";

const NANOSECONDS_PER_MS = 1_000_000n;

export interface RequestTimerOptions {
    /** Paths not to record, such as the live stream (which "finishes" only on disconnect). */
    readonly ignore?: (path: string) => boolean;
}

export function requestTimer(
    log: Pick<RequestLogService, "record">,
    options: RequestTimerOptions = {},
): RequestHandler {
    return (req, res, next) => {
        const started = process.hrtime.bigint();

        res.once("finish", () => {
            // No query string: it can hold cursors and other noise.
            const path = req.originalUrl.split("?", 1)[0] ?? req.originalUrl;
            if (options.ignore?.(path)) return;

            const elapsed = process.hrtime.bigint() - started;
            log.record({
                at: new Date().toISOString(),
                method: req.method,
                path,
                status: res.statusCode,
                // Whole microseconds as a bigint, then to ms with 2 decimals.
                durationMs: Number((elapsed * 100n) / NANOSECONDS_PER_MS) / 100,
            });
        });

        next();
    };
}
