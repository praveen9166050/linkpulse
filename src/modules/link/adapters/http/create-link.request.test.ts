import { describe, expect, it } from "vitest";
import { unwrap, unwrapError } from "../../../../../test/support/result.ts";
import { parseCreateLinkRequest } from "./create-link.request.ts";

describe("parseCreateLinkRequest", () => {
    it("accepts a body with just a url", () => {
        expect(unwrap(parseCreateLinkRequest({ url: "https://example.com/" }))).toEqual({
            url: "https://example.com/",
        });
    });

    it("accepts a body with a url and a custom code", () => {
        expect(
            unwrap(parseCreateLinkRequest({ url: "https://example.com/", code: "my-resume" })),
        ).toEqual({ url: "https://example.com/", code: "my-resume" });
    });

    it.each([null, [], "https://example.com/", 42])(
        "rejects %j because it is not an object",
        (body) => {
            expect(unwrapError(parseCreateLinkRequest(body))).toEqual([
                {
                    field: "(body)",
                    kind: "not_an_object",
                    message: "The request body must be a JSON object.",
                },
            ]);
        },
    );

    it("requires url", () => {
        expect(unwrapError(parseCreateLinkRequest({}))).toEqual([
            { field: "url", kind: "required", message: "This field is required." },
        ]);
    });

    it.each([
        ["url", { url: 123 }],
        ["code", { url: "https://example.com/", code: 7 }],
    ])("requires %s to be a string", (field, body) => {
        expect(unwrapError(parseCreateLinkRequest(body))).toEqual([
            { field, kind: "not_a_string", message: "Must be a string." },
        ]);
    });

    it("rejects fields the API does not know, rather than silently ignoring them", () => {
        expect(
            unwrapError(parseCreateLinkRequest({ url: "https://example.com/", target: "x" })),
        ).toEqual([{ field: "target", kind: "unknown_field", message: 'Unknown field "target".' }]);
    });

    it("rejects expiresAt until link expiry is built", () => {
        expect(
            unwrapError(
                parseCreateLinkRequest({
                    url: "https://example.com/",
                    expiresAt: "2027-01-01T00:00:00Z",
                }),
            ),
        ).toEqual([
            {
                field: "expiresAt",
                kind: "not_supported_yet",
                message: "Link expiry is not available yet.",
            },
        ]);
    });

    it("reports every problem at once", () => {
        expect(unwrapError(parseCreateLinkRequest({ code: 7, extra: true }))).toEqual([
            { field: "extra", kind: "unknown_field", message: 'Unknown field "extra".' },
            { field: "url", kind: "required", message: "This field is required." },
            { field: "code", kind: "not_a_string", message: "Must be a string." },
        ]);
    });
});
