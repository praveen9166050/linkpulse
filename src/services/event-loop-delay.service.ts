/**
 * How late the event loop is running, from Node's perf_hooks.
 *
 * Node runs all JavaScript on ONE thread. While a callback is busy (heavy
 * JSON, a tight loop, sync crypto), nothing else runs: not timers, not other
 * requests. monitorEventLoopDelay schedules a timer every `resolution` ms
 * and records how late it actually fired; a high p99 means requests are
 * queueing behind CPU-bound work.
 */
import { type ELDHistogram, monitorEventLoopDelay } from "node:perf_hooks";

export interface EventLoopDelaySample {
    /** Median delay, in milliseconds. */
    readonly p50: number;
    /** 99th percentile: the worst delays, in milliseconds. */
    readonly p99: number;
}

const NANOSECONDS_PER_MS = 1_000_000;

export class EventLoopDelayService {
    readonly #histogram: ELDHistogram;

    constructor(resolutionMs = 10) {
        this.#histogram = monitorEventLoopDelay({ resolution: resolutionMs });
        this.#histogram.enable();
    }

    /** The delays since the previous sample, then starts a fresh window. */
    sample(): EventLoopDelaySample {
        const sample = {
            p50: toMs(this.#histogram.percentile(50)),
            p99: toMs(this.#histogram.percentile(99)),
        };
        this.#histogram.reset();
        return sample;
    }

    stop(): void {
        this.#histogram.disable();
    }
}

/** Nanoseconds to milliseconds, rounded to 0.01 ms. */
function toMs(nanoseconds: number): number {
    return Math.round((nanoseconds / NANOSECONDS_PER_MS) * 100) / 100;
}
