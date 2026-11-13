import { describe, expect, it } from "vitest";
import { ClockService } from "../clock.service.ts";

describe("ClockService", () => {
    it("returns the current time", () => {
        const before = Date.now();
        const now = new ClockService().now().getTime();
        const after = Date.now();

        expect(now).toBeGreaterThanOrEqual(before);
        expect(now).toBeLessThanOrEqual(after);
    });
});
