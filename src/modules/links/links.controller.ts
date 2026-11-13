/**
 * CONTROLLER: translates between HTTP and LinksService, and nothing more.
 * Errors thrown by the service or the DTO reach the error-handler
 * middleware on their own (Express 5 forwards rejected async handlers).
 *
 * A class, as in n8n: its dependencies arrive through the constructor,
 * like every service and repository.
 *
 * THE `this` TRAP: Express receives each handler as a plain function
 * (`router.get(path, controller.follow)`). An ordinary method called that
 * way has no `this`, and crashes reading `this.#links`. So the handlers
 * are ARROW-FUNCTION FIELDS: an arrow function has no `this` of its own
 * and uses the instance it was created in, wherever it is called from.
 */
import type { Request, Response } from "express";
import { sendJson } from "#src/response-helper.ts";
import type { CreateLinkDto } from "./dto/create-link.dto.ts";
import { toLinkPageResponseDto } from "./dto/link-page-response.dto.ts";
import { toLinkResponseDto } from "./dto/link-response.dto.ts";
import { parseListLinksQuery } from "./dto/list-links.dto.ts";
import type { LinksService } from "./links.service.ts";

export interface LinksControllerDependencies {
    /**
     * Only the methods the controller calls (Interface Segregation): the
     * real LinksService fits, and so does a two-method stand-in in tests.
     */
    readonly linksService: Pick<LinksService, "createLink" | "listLinks" | "followLink">;
    /** The address people use to reach LinkPulse, for building `shortUrl`. */
    readonly publicBaseUrl: string;
}

export class LinksController {
    readonly #links: LinksControllerDependencies["linksService"];
    readonly #publicBaseUrl: string;

    constructor(deps: LinksControllerDependencies) {
        this.#links = deps.linksService;
        this.#publicBaseUrl = deps.publicBaseUrl;
    }

    /**
     * POST: shorten a URL. The route runs validateBody(parseCreateLinkDto)
     * first, so the body arrives as a checked CreateLinkDto. The third type
     * argument of Request<Params, ResBody, ReqBody> types `req.body`.
     */
    readonly create = async (
        req: Request<Record<string, never>, unknown, CreateLinkDto>,
        res: Response,
    ): Promise<void> => {
        const link = await this.#links.createLink(req.body);
        sendJson(res, 201, toLinkResponseDto(link, this.#publicBaseUrl));
    };

    /** GET: redirect a short code to its target. */
    /**
     * GET: one page of links, newest first.
     *
     * The query is parsed HERE, not by a middleware like validateBody: in
     * Express 5 `req.query` is a read-only getter, so a middleware can't
     * replace it with the parsed DTO the way validateBody replaces req.body.
     */
    readonly list = async (req: Request, res: Response): Promise<void> => {
        const page = await this.#links.listLinks(parseListLinksQuery(req.query));
        sendJson(res, 200, toLinkPageResponseDto(page, this.#publicBaseUrl));
    };

    readonly follow = async (req: Request<{ code: string }>, res: Response): Promise<void> => {
        const target = await this.#links.followLink(req.params.code);
        // 302, not 301, and no-store: every click must reach us to be counted (ADR 0003).
        res.set("cache-control", "no-store").redirect(302, target.value);
    };
}
