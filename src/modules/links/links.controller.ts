/**
 * CONTROLLER: translates between HTTP and LinksService, and nothing more.
 * Errors thrown by the service or the DTO reach the error-handler
 * middleware on their own (Express 5 forwards rejected async handlers).
 *
 * Built by a factory function rather than a class: handlers are passed to
 * Express as plain functions, and a class method passed that way
 * (`router.get(path, controller.follow)`) loses `this` and crashes.
 */
import type { RequestHandler } from "express";
import { sendJson } from "#src/response-helper.ts";
import { parseCreateLinkDto } from "./dto/create-link.dto.ts";
import { toLinkResponseDto } from "./dto/link-response.dto.ts";
import type { LinksService } from "./links.service.ts";

export interface LinksControllerDependencies {
    readonly linksService: LinksService;
    /** The address people use to reach LinkPulse, for building `shortUrl`. */
    readonly publicBaseUrl: string;
}

export interface LinksController {
    /** POST: shorten a URL. */
    readonly create: RequestHandler;
    /** GET: redirect a short code to its target. */
    readonly follow: RequestHandler<{ code: string }>;
}

export function createLinksController(deps: LinksControllerDependencies): LinksController {
    return {
        create: async (req, res) => {
            // express.json() has already parsed (and size-limited) the body;
            // it is untyped JSON until the DTO checks its shape.
            const dto = parseCreateLinkDto(req.body as unknown);
            const link = await deps.linksService.createLink(dto);
            sendJson(res, 201, toLinkResponseDto(link, deps.publicBaseUrl));
        },

        follow: async (req, res) => {
            const target = await deps.linksService.followLink(req.params.code);
            // 302, not 301, and no-store: every click must reach us to be counted (ADR 0003).
            res.set("cache-control", "no-store").redirect(302, target.value);
        },
    };
}
