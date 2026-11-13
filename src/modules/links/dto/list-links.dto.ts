import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import type { FieldError } from "#src/response-helper.ts";

/** The query of GET /api/v1/links, after it's checked. */
export interface ListLinksDto {
    /** Links per page, 1 to 100. */
    readonly limit: number;
    /** The previous page's nextCursor; absent for the first page. */
    readonly cursor?: string;
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Parameters of listLinks in api/openapi.yaml. */
const KNOWN_PARAMS: ReadonlySet<string> = new Set(["limit", "cursor"]);

/** A whole number with no sign, spaces or leading zero ("5", not "+5", " 5" or "05"). */
const WHOLE_NUMBER = /^[1-9]\d*$/;

/**
 * Checks the query string and converts it. Query values arrive as strings,
 * or arrays when a parameter is repeated (?limit=1&limit=2).
 *
 * Whether a cursor DECODES to a real position is checked by LinksService:
 * that is the cursor's meaning, not its shape.
 *
 * @throws BadRequestError listing every problem at once
 */
export function parseListLinksQuery(query: unknown): ListLinksDto {
    const params: Readonly<Record<string, unknown>> =
        typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};

    const errors = [
        ...unknownParams(params),
        ...checkLimit(params.limit),
        ...checkCursor(params.cursor),
    ];
    if (errors.length > 0) {
        throw new BadRequestError("One or more query parameters are invalid.", { errors });
    }

    const limit = typeof params.limit === "string" ? Number(params.limit) : DEFAULT_LIMIT;
    return typeof params.cursor === "string" ? { limit, cursor: params.cursor } : { limit };
}

/** Rejected rather than ignored: ?limt=5 should be an error, not a silent default. */
function unknownParams(params: Readonly<Record<string, unknown>>): FieldError[] {
    return Object.keys(params)
        .filter((key) => !KNOWN_PARAMS.has(key))
        .map((key) => field(key, "unknown_field", `Unknown query parameter "${key}".`));
}

function checkLimit(value: unknown): FieldError[] {
    if (value === undefined) return [];
    if (Array.isArray(value)) return [field("limit", "repeated", "Give limit only once.")];
    if (typeof value === "string" && WHOLE_NUMBER.test(value) && Number(value) <= MAX_LIMIT) {
        return [];
    }
    return [
        field(
            "limit",
            "out_of_range",
            `Must be a whole number from 1 to ${String(MAX_LIMIT)} (got ${JSON.stringify(value)}).`,
        ),
    ];
}

function checkCursor(value: unknown): FieldError[] {
    if (value === undefined) return [];
    if (Array.isArray(value)) return [field("cursor", "repeated", "Give cursor only once.")];
    if (typeof value === "string" && value !== "") return [];
    return [field("cursor", "invalid", "Pass the nextCursor of a previous page.")];
}

function field(name: string, kind: string, message: string): FieldError {
    return { field: name, kind, message };
}
