/**
 * MODULE: the links feature's public face. Builds its service and
 * controller, and hands back one Express Router to mount.
 *
 * Infrastructure (repository, code generator, clock) is passed in by
 * app.ts, so tests and later stages (MongoDB) can supply their own. New
 * features follow the same shape and are mounted with one line in app.ts.
 */
import type { Router } from "express";
import type { ClockService } from "#src/services/clock.service.ts";
import type { LinkRepository } from "./database/repositories/link.repository.ts";
import { LinksController } from "./links.controller.ts";
import { linksRoutes } from "./links.routes.ts";
import { LinksService } from "./links.service.ts";
import type { ShortCodeGeneratorService } from "./short-code-generator.service.ts";

export interface LinksModuleDependencies {
    readonly linkRepository: LinkRepository;
    readonly shortCodeGenerator: ShortCodeGeneratorService;
    readonly clock: ClockService;
    /** The address people use to reach LinkPulse, for building short URLs. */
    readonly publicBaseUrl: string;
}

export function linksModule(deps: LinksModuleDependencies): Router {
    const linksService = new LinksService({
        linkRepository: deps.linkRepository,
        shortCodeGenerator: deps.shortCodeGenerator,
        clock: deps.clock,
    });

    return linksRoutes(new LinksController({ linksService, publicBaseUrl: deps.publicBaseUrl }));
}
