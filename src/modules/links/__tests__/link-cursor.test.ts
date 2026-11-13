/**
 * UNIT TEST: the opaque page cursor. It encodes WHERE the previous page
 * ended (the last link's createdAt and code), not a page number.
 */
import { describe, expect, it } from "vitest";
import { decodeLinkCursor, encodeLinkCursor } from "../link-cursor.ts";

const POSITION = { createdAt: new Date("2026-11-14T09:30:00.123Z"), code: "aZ3kP9q" };

describe("link cursor", () => {
    it("decodes back to the position it encoded", () => {
        expect(decodeLinkCursor(encodeLinkCursor(POSITION))).toEqual(POSITION);
    });

    it("is URL-safe: no + / or = to escape in a query string", () => {
        expect(encodeLinkCursor(POSITION)).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it.each([
        ["not base64 at all", "%%%"],
        ["base64, but not JSON", Buffer.from("hello").toString("base64url")],
        ["JSON, but the wrong shape", Buffer.from('{"page":2}').toString("base64url")],
        [
            "an impossible date",
            Buffer.from('{"createdAt":"yesterday","code":"abc"}').toString("base64url"),
        ],
        [
            "a code that can't exist",
            Buffer.from('{"createdAt":"2026-11-14T09:30:00.000Z","code":"a"}').toString(
                "base64url",
            ),
        ],
        ["empty", ""],
    ])("rejects a cursor that is %s", (_label, cursor) => {
        expect(decodeLinkCursor(cursor)).toBeUndefined();
    });
});
