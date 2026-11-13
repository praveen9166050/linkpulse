/**
 * ROUTES: which HTTP method and path call which controller function.
 * The plain-Express equivalent of n8n's @Get/@Post route decorators.
 */
import express, { type Router } from "express";
import type { LinksController } from "./links.controller.ts";

export function linksRoutes(controller: LinksController): Router {
    // caseSensitive: `/API/V1/LINKS` is not our route (Express ignores case by default).
    // strict: `/abc/` (trailing slash) is not the code `abc`.
    const router = express.Router({ caseSensitive: true, strict: true });

    router.post("/api/v1/links", controller.create);

    // Registered after literal paths: `/:code` matches any single segment.
    router.get("/:code", controller.follow);

    return router;
}
