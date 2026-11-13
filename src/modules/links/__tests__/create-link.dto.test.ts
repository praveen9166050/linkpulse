import { describe, expect, it } from "vitest";
import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import type { FieldError } from "#src/response-helper.ts";
import { thrownBy } from "#test/shared/thrown.ts";
import { parseCreateLinkDto } from "../dto/create-link.dto.ts";

/** The field errors reported for a body parseCreateLinkDto must reject. */
function fieldErrorsOf(body: unknown): readonly FieldError[] | undefined {
    const error = thrownBy(() => parseCreateLinkDto(body));
    if (!(error instanceof BadRequestError)) throw error;
    return error.errors;
}

describe("parseCreateLinkDto", () => {
    it("accepts a body with just a url", () => {
        expect(parseCreateLinkDto({ url: "https://example.com/" })).toEqual({
            url: "https://example.com/",
        });
    });

    it("accepts a body with a url and a custom code", () => {
        expect(parseCreateLinkDto({ url: "https://example.com/", code: "my-resume" })).toEqual({
            url: "https://example.com/",
            code: "my-resume",
        });
    });

    it.each([null, [], "https://example.com/", 42])(
        "rejects %j because it is not an object",
        (body) => {
            expect(fieldErrorsOf(body)).toEqual([
                {
                    field: "(body)",
                    kind: "not_an_object",
                    message: "The request body must be a JSON object.",
                },
            ]);
        },
    );

    it("requires url", () => {
        expect(fieldErrorsOf({})).toEqual([
            { field: "url", kind: "required", message: "This field is required." },
        ]);
    });

    it.each([
        ["url", { url: 123 }],
        ["code", { url: "https://example.com/", code: 7 }],
    ])("requires %s to be a string", (field, body) => {
        expect(fieldErrorsOf(body)).toEqual([
            { field, kind: "not_a_string", message: "Must be a string." },
        ]);
    });

    it("rejects fields the API does not know, rather than silently ignoring them", () => {
        expect(fieldErrorsOf({ url: "https://example.com/", target: "x" })).toEqual([
            { field: "target", kind: "unknown_field", message: 'Unknown field "target".' },
        ]);
    });

    it("rejects expiresAt until link expiry is built", () => {
        expect(
            fieldErrorsOf({ url: "https://example.com/", expiresAt: "2027-01-01T00:00:00Z" }),
        ).toEqual([
            {
                field: "expiresAt",
                kind: "not_supported_yet",
                message: "Link expiry is not available yet.",
            },
        ]);
    });

    it("reports every problem at once", () => {
        expect(fieldErrorsOf({ code: 7, extra: true })).toEqual([
            { field: "extra", kind: "unknown_field", message: 'Unknown field "extra".' },
            { field: "url", kind: "required", message: "This field is required." },
            { field: "code", kind: "not_a_string", message: "Must be a string." },
        ]);
    });
});
