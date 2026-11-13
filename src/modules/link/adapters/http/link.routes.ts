/**
 * ROUTES: which HTTP method and path call which controller function.
 * Nothing else: no logic, no knowledge of use cases.
 */
import express, { type Router } from "express";
import type { LinkController } from "./link.controller.ts";

export function linkRoutes(controller: LinkController): Router {
    // caseSensitive: `/API/V1/LINKS` is not our route (Express ignores case by default).
    // strict: `/abc/` (trailing slash) is not the code `abc`.
    const router = express.Router({ caseSensitive: true, strict: true });

    router.post("/api/v1/links", controller.create);

    // Registered after literal paths: `/:code` matches any single segment.
    router.get("/:code", controller.follow);

    return router;
}
