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
import { parseCreateLinkDto } from "./dto/create-link.dto.ts";
import { toLinkResponseDto } from "./dto/link-response.dto.ts";
import type { LinksService } from "./links.service.ts";

export interface LinksControllerDependencies {
    /**
     * Only the methods the controller calls (Interface Segregation): the
     * real LinksService fits, and so does a two-method stand-in in tests.
     */
    readonly linksService: Pick<LinksService, "createLink" | "followLink">;
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

    /** POST: shorten a URL. */
    readonly create = async (req: Request, res: Response): Promise<void> => {
        // express.json() has already parsed (and size-limited) the body;
        // it is untyped JSON until the DTO checks its shape.
        const dto = parseCreateLinkDto(req.body as unknown);
        const link = await this.#links.createLink(dto);
        sendJson(res, 201, toLinkResponseDto(link, this.#publicBaseUrl));
    };

    /** GET: redirect a short code to its target. */
    readonly follow = async (req: Request<{ code: string }>, res: Response): Promise<void> => {
        const target = await this.#links.followLink(req.params.code);
        // 302, not 301, and no-store: every click must reach us to be counted (ADR 0003).
        res.set("cache-control", "no-store").redirect(302, target.value);
    };
}
