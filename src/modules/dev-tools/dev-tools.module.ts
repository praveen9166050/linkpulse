/**
 * MODULE: development-only endpoints. app.ts mounts it ONLY when the config
 * says DEV_TOOLS=true; otherwise these routes don't exist (404).
 */
import express, { type Router } from "express";
import type { RequestLogService } from "#src/services/request-log.service.ts";
import { RequestStreamController } from "./request-stream.controller.ts";

/** The live stream's path; the request timer skips it (it never "finishes"). */
export const REQUEST_STREAM_PATH = "/api/v1/dev/requests";

export function devToolsModule(deps: {
    readonly requestLog: Pick<RequestLogService, "recent" | "subscribe">;
}): Router {
    const controller = new RequestStreamController({ requestLog: deps.requestLog });
    const router = express.Router({ caseSensitive: true, strict: true });
    router.get(REQUEST_STREAM_PATH, controller.stream);
    return router;
}
