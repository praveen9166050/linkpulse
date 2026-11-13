/**
 * CONTROLLER: translates between HTTP and the use cases, and nothing more.
 * Request -> use-case input; Result -> status code and body. No business
 * rules live here.
 *
 * Built by a factory function rather than a class: handlers are passed to
 * Express as plain functions, and a class method passed that way
 * (`router.get(path, controller.follow)`) loses `this` and crashes.
 * Closures over `deps` can't have that bug.
 */
import type { Request, RequestHandler } from "express";
import { sendProblem } from "../../../../shared/http/problem.ts";
import { sendJson } from "../../../../shared/http/send-json.ts";
import type { CreateLink } from "../../application/create-link.ts";
import type { FollowLink } from "../../application/follow-link.ts";
import { parseCreateLinkRequest } from "./create-link.request.ts";
import { createLinkProblem, linkNotFoundProblem, validationProblem } from "./link.problems.ts";
import { toLinkResponse } from "./link.response.ts";

export interface LinkControllerDependencies {
    readonly createLink: CreateLink;
    readonly followLink: FollowLink;
    /** The address people use to reach LinkPulse, for building `shortUrl`. */
    readonly publicBaseUrl: string;
}

export interface LinkController {
    /** POST: shorten a URL. */
    readonly create: RequestHandler;
    /** GET: redirect a short code to its target. */
    readonly follow: RequestHandler<{ code: string }>;
}

export function createLinkController(deps: LinkControllerDependencies): LinkController {
    return {
        create: async (req, res) => {
            // express.json() has already parsed (and size-limited) the body;
            // it is untyped JSON until the request DTO checks its shape.
            const input = parseCreateLinkRequest(req.body as unknown);
            if (!input.ok) return sendProblem(res, validationProblem(input.error, pathOf(req)));

            const result = await deps.createLink.execute(input.value);
            if (!result.ok) return sendProblem(res, createLinkProblem(result.error, pathOf(req)));

            sendJson(res, 201, toLinkResponse(result.value, deps.publicBaseUrl));
        },

        follow: async (req, res) => {
            const { code } = req.params;
            const result = await deps.followLink.execute(code);
            if (!result.ok) return sendProblem(res, linkNotFoundProblem(code, pathOf(req)));

            // 302, not 301, and no-store: every click must reach us to be counted (ADR 0003).
            res.set("cache-control", "no-store").redirect(302, result.value.value);
        },
    };
}

/** The full request path, even if the module's router is mounted under a prefix. */
function pathOf(req: Request): string {
    return req.baseUrl + req.path;
}
