/**
 * UNIT TEST: EventLoopDelayService measures how late the event loop runs
 * timers, using Node's real perf_hooks monitor. A busy-wait blocks the loop
 * on purpose, exactly what CPU-bound code does to a Node server.
 */
import { setTimeout as sleep } from "node:timers/promises";
import { afterEach, describe, expect, it } from "vitest";
import { EventLoopDelayService } from "../event-loop-delay.service.ts";

/** Keeps the single JS thread busy: no timer, request or callback can run meanwhile. */
function blockTheLoop(ms: number): void {
    const until = performance.now() + ms;
    while (performance.now() < until) {
        // spin
    }
}

describe("EventLoopDelayService", () => {
    let monitor: EventLoopDelayService;

    afterEach(() => {
        monitor.stop();
    });

    it("reports small delays in milliseconds when the loop is free", async () => {
        monitor = new EventLoopDelayService();
        await sleep(60);

        const { p50, p99 } = monitor.sample();

        expect(p50).toBeGreaterThanOrEqual(0);
        expect(p99).toBeGreaterThanOrEqual(p50);
        expect(p99).toBeLessThan(80);
    });

    it("shows a blocked loop as a large p99", async () => {
        monitor = new EventLoopDelayService();
        await sleep(30);

        blockTheLoop(150);
        await sleep(30); // let the monitor's timer run once, late

        expect(monitor.sample().p99).toBeGreaterThanOrEqual(100);
    });

    it("starts afresh after each sample, so old spikes don't linger", async () => {
        monitor = new EventLoopDelayService();
        blockTheLoop(150);
        await sleep(30);
        monitor.sample(); // reads (and clears) the spike

        await sleep(60);

        expect(monitor.sample().p99).toBeLessThan(80);
    });
});
