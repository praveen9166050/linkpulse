/** ROUTES: the health module's one route. */
import express, { type Router } from "express";
import type { HealthController } from "./health.controller.ts";

export function healthRoutes(controller: HealthController): Router {
    const router = express.Router({ caseSensitive: true, strict: true });
    router.get("/health", controller.check);
    return router;
}
