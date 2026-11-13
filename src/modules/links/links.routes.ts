/**
 * ROUTES: each route's method, path and its whole MIDDLEWARE CHAIN, in the
 * order a request passes through it, ending with the controller:
 *
 *   router.post(path, [authenticate(),] [rateLimit(...),] validateBody(...), controller.x)
 *
 * Every link either calls next() or ends the request (401, 429, 400...),
 * so the controller only runs once every check has passed.
 */
import express, { type Router } from "express";
import { validateBody } from "#src/middlewares/validate-body.ts";
import { parseCreateLinkDto } from "./dto/create-link.dto.ts";
import type { LinksController } from "./links.controller.ts";

export function linksRoutes(controller: LinksController): Router {
    // caseSensitive: `/API/V1/LINKS` is not our route (Express ignores case by default).
    // strict: `/abc/` (trailing slash) is not the code `abc`.
    const router = express.Router({ caseSensitive: true, strict: true });

    router.get("/api/v1/links", controller.list);
    router.post("/api/v1/links", validateBody(parseCreateLinkDto), controller.create);

    // Registered after literal paths: `/:code` matches any single segment.
    router.get("/:code", controller.follow);

    return router;
}
