import type { IncomingMessage } from "node:http";
import { err, ok, type Result } from "../result.ts";

export type BodyError =
    { readonly kind: "too_large"; readonly limitBytes: number } | { readonly kind: "invalid_json" };

/**
 * Reads the whole request body and parses it as JSON.
 *
 * A request body arrives as a STREAM of chunks, not all at once. We count
 * bytes as they arrive and stop at `limitBytes`: without a limit, one
 * client could send gigabytes and exhaust the server's memory (a
 * denial-of-service attack). A `Content-Length` header over the limit is
 * rejected before reading anything.
 */
export function readJsonBody(
    req: IncomingMessage,
    limitBytes: number,
): Promise<Result<unknown, BodyError>> {
    const declared = Number(req.headers["content-length"]);
    if (declared > limitBytes) return Promise.resolve(err({ kind: "too_large", limitBytes }));

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let received = 0;

        const onData = (chunk: Buffer): void => {
            received += chunk.length;
            if (received > limitBytes) {
                // Stop reading; the caller answers 413 and closes the connection.
                req.off("data", onData);
                req.pause();
                resolve(err({ kind: "too_large", limitBytes }));
                return;
            }
            chunks.push(chunk);
        };

        req.on("data", onData);
        req.once("end", () => resolve(parseJson(Buffer.concat(chunks).toString("utf8"))));
        req.once("error", reject);
    });
}

function parseJson(text: string): Result<unknown, BodyError> {
    try {
        return ok(JSON.parse(text) as unknown);
    } catch {
        return err({ kind: "invalid_json" });
    }
}
