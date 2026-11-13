/**
 * UNIT TEST: the query string of GET /api/v1/links. Query values always
 * arrive as strings (or arrays, when a parameter is repeated), so every one
 * is checked and converted here.
 */
import { describe, expect, it } from "vitest";
import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import { thrownBy } from "#test/shared/thrown.ts";
import { parseListLinksQuery } from "../dto/list-links.dto.ts";

function fieldErrors(query: unknown) {
    const error = thrownBy(() => parseListLinksQuery(query));
    expect(error).toBeInstanceOf(BadRequestError);
    return (error as BadRequestError).errors?.map(({ field, kind }) => ({ field, kind }));
}

describe("parseListLinksQuery", () => {
    it("defaults to 20 links and the first page", () => {
        expect(parseListLinksQuery({})).toEqual({ limit: 20 });
    });

    it("reads limit and cursor", () => {
        expect(parseListLinksQuery({ limit: "5", cursor: "abc" })).toEqual({
            limit: 5,
            cursor: "abc",
        });
    });

    it.each(["0", "101", "abc", "2.5", "-1", "", " 5"])(
        "rejects limit=%j: whole numbers from 1 to 100 only",
        (limit) => {
            expect(fieldErrors({ limit })).toEqual([{ field: "limit", kind: "out_of_range" }]);
        },
    );

    it("rejects a repeated parameter (?limit=1&limit=2)", () => {
        expect(fieldErrors({ limit: ["1", "2"] })).toEqual([{ field: "limit", kind: "repeated" }]);
    });

    it("rejects an empty cursor", () => {
        expect(fieldErrors({ cursor: "" })).toEqual([{ field: "cursor", kind: "invalid" }]);
    });

    it("rejects unknown parameters, so a typo like ?limt=5 isn't silently ignored", () => {
        expect(fieldErrors({ limt: "5" })).toEqual([{ field: "limt", kind: "unknown_field" }]);
    });

    it("reports every problem at once", () => {
        expect(fieldErrors({ limit: "0", cursor: "", page: "2" })).toEqual([
            { field: "page", kind: "unknown_field" },
            { field: "limit", kind: "out_of_range" },
            { field: "cursor", kind: "invalid" },
        ]);
    });
});
