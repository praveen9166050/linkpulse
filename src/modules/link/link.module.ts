/**
 * The link module's public face: wires its use cases, controller and
 * routes, and hands back one Express Router to mount.
 *
 * The module does NOT choose its infrastructure: the repository, code
 * generator and clock are passed in through its ports, so the app decides
 * between in-memory and DynamoDB without touching this module
 * (dependency inversion). New modules follow the same shape, and the app
 * mounts each with one line (open/closed).
 */
import type { Router } from "express";
import type { Clock, CodeGenerator, LinkRepository } from "./application/ports.ts";
import { CreateLink } from "./application/create-link.ts";
import { FollowLink } from "./application/follow-link.ts";
import { createLinkController } from "./adapters/http/link.controller.ts";
import { linkRoutes } from "./adapters/http/link.routes.ts";

export interface LinkModuleDependencies {
    readonly links: LinkRepository;
    readonly codes: CodeGenerator;
    readonly clock: Clock;
    /** The address people use to reach LinkPulse, for building short URLs. */
    readonly publicBaseUrl: string;
}

export function linkModule(deps: LinkModuleDependencies): Router {
    const createLink = new CreateLink({ links: deps.links, codes: deps.codes, clock: deps.clock });
    const followLink = new FollowLink({ links: deps.links });

    const controller = createLinkController({
        createLink,
        followLink,
        publicBaseUrl: deps.publicBaseUrl,
    });

    return linkRoutes(controller);
}
