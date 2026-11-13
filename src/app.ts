/**
 * Builds the Express app: the one place that creates real infrastructure,
 * assembles the middleware chain and mounts the feature modules.
 */
import express, { type Express } from "express";
import { errorHandler } from "#src/middlewares/error-handler.ts";
import { notFound } from "#src/middlewares/not-found.ts";
import { LinkRepository } from "#src/modules/links/database/repositories/link.repository.ts";
import { linksModule } from "#src/modules/links/links.module.ts";
import { ShortCodeGeneratorService } from "#src/modules/links/short-code-generator.service.ts";
import { ClockService } from "#src/services/clock.service.ts";

/** Generous for a URL (2,048 characters) plus a code; small enough to stop abuse. */
const MAX_BODY_BYTES = 16 * 1024;

export interface AppConfig {
    /** The address people use to reach LinkPulse, for building short URLs. */
    readonly publicBaseUrl: string;
}

export function createApp(config: AppConfig): Express {
    const app = express();

    // Don't advertise "X-Powered-By: Express": it tells attackers which
    // framework (and its known vulnerabilities) to try.
    app.disable("x-powered-by");

    // The middleware chain. ORDER MATTERS: each request flows top to bottom.
    // 1. Parse JSON bodies (only when Content-Type is JSON), with a size limit.
    app.use(express.json({ limit: MAX_BODY_BYTES }));

    // 2. Feature modules, each given its infrastructure.
    app.use(
        linksModule({
            linkRepository: new LinkRepository(),
            shortCodeGenerator: new ShortCodeGeneratorService(),
            clock: new ClockService(),
            publicBaseUrl: config.publicBaseUrl,
        }),
    );

    // 3. Nothing matched: 404.
    app.use(notFound);

    // 4. Something threw: map it to a Problem. Error handlers go last.
    app.use(errorHandler);

    return app;
}
