/**
 * CONTROLLER: GET /health. 200 when ok, 503 when degraded, the same body
 * either way, and never cached: a stale "ok" would hide an outage.
 */
import type { Request, Response } from "express";
import { sendJson } from "#src/response-helper.ts";
import type { HealthService } from "./health.service.ts";

export interface HealthControllerDependencies {
    readonly healthService: Pick<HealthService, "check">;
}

export class HealthController {
    readonly #health: HealthControllerDependencies["healthService"];

    constructor(deps: HealthControllerDependencies) {
        this.#health = deps.healthService;
    }

    /** An arrow-function field, so Express can call it without losing `this`. */
    readonly check = async (_req: Request, res: Response): Promise<void> => {
        const report = await this.#health.check();
        res.set("cache-control", "no-store");
        sendJson(res, report.status === "ok" ? 200 : 503, report);
    };
}
