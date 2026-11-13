/**
 * UNIT TEST: HealthService decides whether this instance is fit to take
 * traffic. Stand-ins replace the database and the event-loop monitor, so
 * every outcome (healthy, database down, database hanging, CPU-bound) can
 * be produced on demand, in milliseconds.
 */
import { describe, expect, it } from "vitest";
import { HealthService } from "../health.service.ts";

const QUIET_LOOP = { sample: () => ({ p50: 10.1, p99: 12.4 }) };

function service(overrides: Partial<ConstructorParameters<typeof HealthService>[0]> = {}) {
    return new HealthService({
        database: { ping: () => Promise.resolve(32) },
        eventLoopDelay: QUIET_LOOP,
        uptimeSeconds: () => 3600.5,
        ...overrides,
    });
}

describe("HealthService", () => {
    it("reports ok when the database answers and the event loop is quiet", async () => {
        expect(await service().check()).toEqual({
            status: "ok",
            database: { status: "up", latencyMs: 32 },
            eventLoopDelayMs: { p50: 10.1, p99: 12.4 },
            uptimeSeconds: 3600.5,
        });
    });

    it("reports degraded, database down, when the ping fails", async () => {
        const report = await service({
            database: { ping: () => Promise.reject(new Error("connection refused")) },
        }).check();

        expect(report.status).toBe("degraded");
        expect(report.database).toEqual({ status: "down", latencyMs: null });
    });

    it("gives up on a hanging ping after the timeout, instead of hanging too", async () => {
        const started = performance.now();

        const report = await service({
            database: { ping: () => new Promise<number>(() => undefined) }, // never settles
            pingTimeoutMs: 50,
        }).check();

        expect(report.database).toEqual({ status: "down", latencyMs: null });
        expect(performance.now() - started).toBeLessThan(1000);
    });

    it("reports degraded when the event loop lags past the limit (CPU-bound work)", async () => {
        const report = await service({
            eventLoopDelay: { sample: () => ({ p50: 40, p99: 250 }) },
            eventLoopP99LimitMs: 200,
        }).check();

        expect(report.status).toBe("degraded");
        expect(report.database.status).toBe("up"); // the database is fine; the loop isn't
    });

    it("treats a p99 exactly at the limit as healthy", async () => {
        const report = await service({
            eventLoopDelay: { sample: () => ({ p50: 40, p99: 200 }) },
            eventLoopP99LimitMs: 200,
        }).check();

        expect(report.status).toBe("ok");
    });
});
