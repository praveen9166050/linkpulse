/**
 * COMPOSITION ROOT: the one place that picks real implementations for
 * every port and wires them together (manual dependency injection).
 * Everything else receives its dependencies instead of creating them,
 * which is why it can all be tested with fakes. Swapping the in-memory
 * repository for DynamoDB later is a one-line change here.
 */
import { InMemoryLinkRepository } from "../../modules/link/adapters/in-memory/in-memory-link-repository.ts";
import { linkRoutes } from "../../modules/link/adapters/http/link-routes.ts";
import { RandomCodeGenerator } from "../../modules/link/adapters/random/random-code-generator.ts";
import { CreateLink } from "../../modules/link/application/create-link.ts";
import { FollowLink } from "../../modules/link/application/follow-link.ts";
import { createRouter, type RequestHandler } from "../../shared/http/router.ts";
import { SystemClock } from "../../shared/system-clock.ts";

export interface AppConfig {
    /** The address people use to reach LinkPulse, for building short URLs. */
    readonly publicBaseUrl: string;
}

export function createApp(config: AppConfig): RequestHandler {
    const links = new InMemoryLinkRepository();

    const createLink = new CreateLink({
        links,
        codes: new RandomCodeGenerator(),
        clock: new SystemClock(),
    });
    const followLink = new FollowLink({ links });

    return createRouter([
        ...linkRoutes({ createLink, followLink, publicBaseUrl: config.publicBaseUrl }),
    ]);
}
