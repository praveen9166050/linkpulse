/**
 * COMPOSITION ROOT: the one place that chooses real implementations for
 * every port, and assembles the Express middleware chain. Modules receive
 * their infrastructure instead of creating it, which is why everything
 * can be tested with fakes. Swapping the in-memory repository for
 * DynamoDB later is a one-line change here.
 */
import express, { type Express } from "express";
import { InMemoryLinkRepository } from "../../modules/link/adapters/in-memory/in-memory-link-repository.ts";
import { RandomCodeGenerator } from "../../modules/link/adapters/random/random-code-generator.ts";
import { linkModule } from "../../modules/link/link.module.ts";
import { errorHandler } from "../../shared/http/middlewares/error-handler.ts";
import { notFound } from "../../shared/http/middlewares/not-found.ts";
import { SystemClock } from "../../shared/system-clock.ts";

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

    // 2. Modules, each given its infrastructure.
    app.use(
        linkModule({
            links: new InMemoryLinkRepository(),
            codes: new RandomCodeGenerator(),
            clock: new SystemClock(),
            publicBaseUrl: config.publicBaseUrl,
        }),
    );

    // 3. Nothing matched: 404.
    app.use(notFound);

    // 4. Something threw: map it to a Problem. Error handlers go last.
    app.use(errorHandler);

    return app;
}
