/**
 * UNIT TEST: RequestLogService, the in-process event bus behind the live
 * request log (the Observer pattern: publishers don't know their subscribers).
 */
import { describe, expect, it } from "vitest";
import { type RequestLogEntry, RequestLogService } from "../request-log.service.ts";

function entry(path: string) {
    return { at: "2026-11-14T10:00:00.000Z", method: "GET", path, status: 200, durationMs: 1.5 };
}

describe("RequestLogService", () => {
    it("numbers entries in order", () => {
        const log = new RequestLogService();

        expect(log.record(entry("/a")).id).toBe(1);
        expect(log.record(entry("/b")).id).toBe(2);
    });

    it("tells every subscriber about each entry, until they unsubscribe", () => {
        const log = new RequestLogService();
        const seen: string[] = [];
        const unsubscribe = log.subscribe((e) => seen.push(e.path));

        log.record(entry("/a"));
        unsubscribe();
        log.record(entry("/b"));

        expect(seen).toEqual(["/a"]);
        expect(log.subscriberCount).toBe(0);
    });

    it("keeps only the most recent entries, oldest first (a ring buffer)", () => {
        const log = new RequestLogService({ capacity: 3 });
        for (const path of ["/1", "/2", "/3", "/4", "/5"]) log.record(entry(path));

        expect(log.recent().map((e) => e.path)).toEqual(["/3", "/4", "/5"]);
    });

    it("keeps notifying the others when one subscriber throws", () => {
        const log = new RequestLogService();
        const seen: RequestLogEntry[] = [];
        log.subscribe(() => {
            throw new Error("broken subscriber");
        });
        log.subscribe((e) => seen.push(e));

        expect(() => log.record(entry("/a"))).not.toThrow();
        expect(seen).toHaveLength(1);
    });
});
