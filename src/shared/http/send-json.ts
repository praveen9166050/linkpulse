import type { ServerResponse } from "node:http";

/** Sends `body` as the whole response, as JSON. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
}
