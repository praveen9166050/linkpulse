/**
 * MODULE: the health check, as one Router. app.ts mounts it BEFORE the links
 * module, whose `GET /:code` would otherwise treat "health" as a short code.
 */
import type { Router } from "express";
import { HealthController } from "./health.controller.ts";
import { healthRoutes } from "./health.routes.ts";
import { HealthService, type HealthServiceDependencies } from "./health.service.ts";

export function healthModule(deps: HealthServiceDependencies): Router {
    return healthRoutes(new HealthController({ healthService: new HealthService(deps) }));
}
