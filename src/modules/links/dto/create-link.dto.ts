import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import type { FieldError } from "#src/response-helper.ts";

/** The body of POST /api/v1/links, after its shape is checked. */
export interface CreateLinkDto {
    /** The long URL to shorten. */
    readonly url: string;
    /** A custom short code; a random one is generated when absent. */
    readonly code?: string;
}

/** Fields of CreateLinkRequest in api/openapi.yaml. */
const KNOWN_FIELDS: ReadonlySet<string> = new Set(["url", "code", "expiresAt"]);

type JsonObject = Readonly<Record<string, unknown>>;

/**
 * Checks the SHAPE of a parsed JSON body (an object, with strings where
 * strings belong, and no unknown fields) and returns the DTO. Whether the
 * values MEAN something valid (a real URL, an allowed code) is checked by
 * the value objects in LinksService.
 *
 * @throws BadRequestError listing every shape problem at once
 */
export function parseCreateLinkDto(body: unknown): CreateLinkDto {
    if (!isJsonObject(body)) {
        throw invalid([
            field("(body)", "not_an_object", "The request body must be a JSON object."),
        ]);
    }

    const errors = [
        ...unknownFields(body),
        ...checkUrl(body.url),
        ...checkOptionalString("code", body.code),
        ...checkExpiresAt(body.expiresAt),
    ];

    // `url` must be a string here: otherwise checkUrl reported an error.
    if (errors.length > 0 || typeof body.url !== "string") throw invalid(errors);
    return typeof body.code === "string" ? { url: body.url, code: body.code } : { url: body.url };
}

function invalid(errors: FieldError[]): BadRequestError {
    return new BadRequestError("One or more fields are invalid.", { errors });
}

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rejected rather than ignored: a misspelt field should be an error, not a silent no-op. */
function unknownFields(body: JsonObject): FieldError[] {
    return Object.keys(body)
        .filter((key) => !KNOWN_FIELDS.has(key))
        .map((key) => field(key, "unknown_field", `Unknown field "${key}".`));
}

function checkUrl(url: unknown): FieldError[] {
    if (url === undefined) return [field("url", "required", "This field is required.")];
    return checkOptionalString("url", url);
}

function checkOptionalString(name: string, value: unknown): FieldError[] {
    return value === undefined || typeof value === "string"
        ? []
        : [field(name, "not_a_string", "Must be a string.")];
}

/** In the contract, but expiry is not built yet: say so instead of silently ignoring it. */
function checkExpiresAt(value: unknown): FieldError[] {
    return value === undefined
        ? []
        : [field("expiresAt", "not_supported_yet", "Link expiry is not available yet.")];
}

function field(name: string, kind: string, message: string): FieldError {
    return { field: name, kind, message };
}
