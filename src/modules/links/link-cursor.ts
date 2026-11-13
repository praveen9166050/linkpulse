/**
 * The page cursor for GET /api/v1/links: WHERE the previous page ended
 * (its last link's createdAt and code), encoded as an opaque URL-safe token.
 *
 * Opaque on purpose: clients pass it back unchanged and never build one, so
 * its format can change without breaking them. Anything that doesn't decode
 * to a real position is rejected (decode returns undefined -> 400).
 */
import type { LinkPosition } from "./database/repositories/link.repository.ts";
import { ShortCode } from "./short-code.value-object.ts";

export function encodeLinkCursor(position: LinkPosition): string {
    const json = JSON.stringify({
        createdAt: position.createdAt.toISOString(),
        code: position.code,
    });
    return Buffer.from(json, "utf8").toString("base64url");
}

/** The position a cursor encodes, or undefined if it isn't one of ours. */
export function decodeLinkCursor(cursor: string): LinkPosition | undefined {
    const parsed = parseJson(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
        !isRecord(parsed) ||
        typeof parsed.createdAt !== "string" ||
        typeof parsed.code !== "string"
    ) {
        return undefined;
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || !isShortCode(parsed.code)) return undefined;

    return { createdAt, code: parsed.code };
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShortCode(value: string): boolean {
    try {
        ShortCode.create(value);
        return true;
    } catch {
        return false;
    }
}
