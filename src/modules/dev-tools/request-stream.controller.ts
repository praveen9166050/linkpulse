/**
 * CONTROLLER: GET /api/v1/dev/requests, the live request log as
 * SERVER-SENT EVENTS (SSE).
 *
 * SSE is one ordinary HTTP response that never ends: the server writes a
 * small text block per event, and the browser's EventSource reads them as
 * they arrive (and reconnects by itself if the connection drops):
 *
 *   id: 42
 *   event: request
 *   data: {"method":"GET","path":"/health","status":200,...}
 *   <blank line ends the event>
 *
 * Server -> browser only. That's all a log needs, so SSE beats WebSockets
 * (two-way, a different protocol) and polling (late, and wasteful).
 */
import type { Request, Response } from "express";
import type { RequestLogEntry, RequestLogService } from "#src/services/request-log.service.ts";

/** A comment line every 15 s, so proxies and browsers don't drop an idle connection. */
const HEARTBEAT_MS = 15_000;
/** Tells EventSource how long to wait before reconnecting. */
const RETRY_MS = 3000;

export interface RequestStreamControllerDependencies {
    readonly requestLog: Pick<RequestLogService, "recent" | "subscribe">;
}

export class RequestStreamController {
    readonly #log: RequestStreamControllerDependencies["requestLog"];

    constructor(deps: RequestStreamControllerDependencies) {
        this.#log = deps.requestLog;
    }

    readonly stream = (req: Request, res: Response): void => {
        res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-store",
            connection: "keep-alive",
            // Tells reverse proxies such as nginx not to buffer the stream.
            "x-accel-buffering": "no",
        });
        res.write(`retry: ${String(RETRY_MS)}\n\n`);

        const send = (entry: RequestLogEntry): void => {
            // BACKPRESSURE: if this client isn't reading fast enough, Node's
            // buffer for it fills up. Drop the event rather than let memory
            // grow without bound: for a live log, a gap is better than a crash.
            if (res.writableNeedDrain) return;
            res.write(
                `id: ${String(entry.id)}\nevent: request\ndata: ${JSON.stringify(entry)}\n\n`,
            );
        };

        for (const entry of this.#log.recent()) send(entry); // history first
        const unsubscribe = this.#log.subscribe(send); // then live
        const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), HEARTBEAT_MS);

        // The client went away (tab closed, page reloaded): stop everything for it.
        req.once("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
        });
    };
}
