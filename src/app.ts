/**
 * Builds the Express app: the one place that creates real infrastructure,
 * assembles the middleware chain and mounts the feature modules.
 */
import cors from "cors";
import express, { type Express } from "express";
import type { DatabaseConnection } from "#src/databases/mongo.connection.ts";
import { errorHandler } from "#src/middlewares/error-handler.ts";
import { notFound } from "#src/middlewares/not-found.ts";
import { requestTimer } from "#src/middlewares/request-timer.ts";
import { devToolsModule, REQUEST_STREAM_PATH } from "#src/modules/dev-tools/dev-tools.module.ts";
import { healthModule } from "#src/modules/health/health.module.ts";
import { LinkRepository } from "#src/modules/links/database/repositories/link.repository.ts";
import { linksModule } from "#src/modules/links/links.module.ts";
import { ShortCodeGeneratorService } from "#src/modules/links/short-code-generator.service.ts";
import { ClockService } from "#src/services/clock.service.ts";
import { EventLoopDelayService } from "#src/services/event-loop-delay.service.ts";
import { RequestLogService } from "#src/services/request-log.service.ts";

/** Generous for a URL (2,048 characters) plus a code; small enough to stop abuse. */
const MAX_BODY_BYTES = 16 * 1024;

export interface CreateAppOptions {
    /** The address people use to reach LinkPulse, for building short URLs. */
    readonly publicBaseUrl: string;
    /** The app's one database connection (its pool), opened by main.ts. */
    readonly database: DatabaseConnection;
    /** Override the links collection (tests use one per test file). */
    readonly linksCollection?: string | undefined;
    /** Origins whose pages may call the API from a browser (CORS). Default: none. */
    readonly corsOrigins?: readonly string[] | undefined;
    /** Mount the dev-only endpoints (the live request stream). Default: off. */
    readonly devTools?: boolean | undefined;
    /** Event-loop p99 (ms) above which /health reports degraded. Default 200. */
    readonly healthEventLoopP99LimitMs?: number | undefined;
}

/** Preflight answers may be cached by the browser for this long (seconds). */
const CORS_MAX_AGE_SECONDS = 600;

export function createApp(config: CreateAppOptions): Express {
    const app = express();

    // Don't advertise "X-Powered-By: Express": it tells attackers which
    // framework (and its known vulnerabilities) to try.
    app.disable("x-powered-by");

    // The middleware chain. ORDER MATTERS: each request flows top to bottom.
    // 1. Time every request (first, so the time includes everything below).
    const requestLog = new RequestLogService();
    app.use(requestTimer(requestLog, { ignore: (path) => path === REQUEST_STREAM_PATH }));

    // 2. CORS: name an allowed Origin back to it; anything else gets no CORS
    //    headers, so a page on that origin can't read our responses.
    const allowedOrigins = new Set(config.corsOrigins ?? []);
    app.use(
        cors({
            origin: (origin, callback) => {
                callback(null, origin !== undefined && allowedOrigins.has(origin));
            },
            methods: ["GET", "POST"],
            allowedHeaders: ["content-type"],
            maxAge: CORS_MAX_AGE_SECONDS,
        }),
    );

    // 3. Parse JSON bodies (only when Content-Type is JSON), with a size limit.
    app.use(express.json({ limit: MAX_BODY_BYTES }));

    // 4. Dev-only endpoints, when switched on (never in production).
    if (config.devTools) app.use(devToolsModule({ requestLog }));

    // 5. Feature modules, each given its infrastructure. ORDER MATTERS here
    //    too: health first, because links' `GET /:code` matches any single
    //    path segment, including "/health".
    app.use(
        healthModule({
            database: config.database,
            eventLoopDelay: new EventLoopDelayService(),
            uptimeSeconds: () => process.uptime(),
            ...(config.healthEventLoopP99LimitMs === undefined
                ? {}
                : { eventLoopP99LimitMs: config.healthEventLoopP99LimitMs }),
        }),
    );
    app.use(
        linksModule({
            linkRepository: new LinkRepository(config.database.connection, {
                collection: config.linksCollection,
            }),
            shortCodeGenerator: new ShortCodeGeneratorService(),
            clock: new ClockService(),
            publicBaseUrl: config.publicBaseUrl,
        }),
    );

    // 6. Nothing matched: 404.
    app.use(notFound);

    // 7. Something threw: map it to a Problem. Error handlers go last.
    app.use(errorHandler);

    return app;
}
