/**
 * SERVICE: is this instance fit to take traffic? (a READINESS check)
 *
 * Degraded when MongoDB doesn't answer a ping in time, or when the event
 * loop is lagging. A load balancer sends traffic elsewhere while it is.
 *
 * A health check must itself be fast and safe: the ping has a short
 * timeout, so a hanging database makes the check answer "down" quickly
 * instead of hanging the check too.
 */
import type { DatabaseConnection } from "#src/databases/mongo.connection.ts";
import type {
    EventLoopDelaySample,
    EventLoopDelayService,
} from "#src/services/event-loop-delay.service.ts";

export interface HealthReport {
    readonly status: "ok" | "degraded";
    readonly database: { readonly status: "up" | "down"; readonly latencyMs: number | null };
    readonly eventLoopDelayMs: EventLoopDelaySample;
    readonly uptimeSeconds: number;
}

export interface HealthServiceDependencies {
    readonly database: Pick<DatabaseConnection, "ping">;
    readonly eventLoopDelay: Pick<EventLoopDelayService, "sample">;
    /** Seconds since the process started (process.uptime in production). */
    readonly uptimeSeconds: () => number;
    /** How long to wait for the database ping. Default 2000 ms. */
    readonly pingTimeoutMs?: number;
    /** Above this event-loop p99 the instance is degraded. Default 200 ms. */
    readonly eventLoopP99LimitMs?: number;
}

const DEFAULT_PING_TIMEOUT_MS = 2000;
const DEFAULT_EVENT_LOOP_P99_LIMIT_MS = 200;

export class HealthService {
    readonly #deps: HealthServiceDependencies;

    constructor(deps: HealthServiceDependencies) {
        this.#deps = deps;
    }

    async check(): Promise<HealthReport> {
        const database = await this.#pingDatabase();
        const eventLoopDelayMs = this.#deps.eventLoopDelay.sample();
        const loopIsLagging =
            eventLoopDelayMs.p99 >
            (this.#deps.eventLoopP99LimitMs ?? DEFAULT_EVENT_LOOP_P99_LIMIT_MS);

        return {
            status: database.status === "up" && !loopIsLagging ? "ok" : "degraded",
            database,
            eventLoopDelayMs,
            uptimeSeconds: this.#deps.uptimeSeconds(),
        };
    }

    async #pingDatabase(): Promise<HealthReport["database"]> {
        try {
            const latencyMs = await withTimeout(
                this.#deps.database.ping(),
                this.#deps.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS,
            );
            return { status: "up", latencyMs };
        } catch {
            // Refused, closed, or too slow: either way, not fit for traffic.
            return { status: "down", latencyMs: null };
        }
    }
}

/** Rejects if `promise` hasn't settled after `ms`; always clears its timer. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Timed out after ${String(ms)} ms`));
        }, ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        clearTimeout(timer);
    }
}
