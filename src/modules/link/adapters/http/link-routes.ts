/**
 * ADAPTER (driving side): HTTP in, use cases out. Handlers only translate:
 * request -> use-case input, and Result -> HTTP response. No business
 * rules live here.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendProblem, type Problem } from "../../../../shared/http/problem.ts";
import { readJsonBody, type BodyError } from "../../../../shared/http/read-json-body.ts";
import type { Route } from "../../../../shared/http/router.ts";
import { sendJson } from "../../../../shared/http/send-json.ts";
import type { CreateLink } from "../../application/create-link.ts";
import type { FollowLink } from "../../application/follow-link.ts";
import type { Link } from "../../domain/link.ts";
import { parseCreateLinkBody } from "./create-link-body.ts";
import { createLinkProblem, linkNotFoundProblem, validationProblem } from "./link-problems.ts";

/** Generous for a URL (2,048 characters) plus a code; small enough to stop abuse. */
const MAX_BODY_BYTES = 16 * 1024;

const CREATE_LINK_PATH = "/api/v1/links";

export interface LinkRoutesDependencies {
    readonly createLink: CreateLink;
    readonly followLink: FollowLink;
    /** The address people use to reach LinkPulse, for building `shortUrl`. */
    readonly publicBaseUrl: string;
}

/** `/:code` matches almost anything, so it must come after literal paths. */
export function linkRoutes(deps: LinkRoutesDependencies): Route[] {
    return [
        {
            method: "POST",
            path: CREATE_LINK_PATH,
            handler: (req, res) => handleCreateLink(deps, req, res),
        },
        {
            method: "GET",
            path: "/:code",
            handler: (_req, res, params) => handleFollowLink(deps, res, params.code ?? ""),
        },
    ];
}

async function handleCreateLink(
    deps: LinkRoutesDependencies,
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if (!body.ok) return sendBodyProblem(res, body.error);

    const input = parseCreateLinkBody(body.value);
    if (!input.ok) return sendProblem(res, validationProblem(input.error, CREATE_LINK_PATH));

    const result = await deps.createLink.execute(input.value);
    if (!result.ok) return sendProblem(res, createLinkProblem(result.error, CREATE_LINK_PATH));

    sendJson(res, 201, toLinkResponse(result.value, deps.publicBaseUrl));
}

async function handleFollowLink(
    deps: LinkRoutesDependencies,
    res: ServerResponse,
    code: string,
): Promise<void> {
    const result = await deps.followLink.execute(code);
    if (!result.ok) return sendProblem(res, linkNotFoundProblem(code, `/${code}`));

    // 302, not 301, and no-store: every click must reach us to be counted (ADR 0003).
    res.writeHead(302, { location: result.value.value, "cache-control": "no-store" });
    res.end();
}

function sendBodyProblem(res: ServerResponse, error: BodyError): void {
    const problem: Problem =
        error.kind === "too_large"
            ? {
                  type: "/problems/body-too-large",
                  title: "Request body too large",
                  status: 413,
                  detail: `The body must be at most ${String(error.limitBytes)} bytes.`,
                  instance: CREATE_LINK_PATH,
              }
            : {
                  type: "/problems/invalid-json",
                  title: "Invalid JSON",
                  status: 400,
                  detail: "The request body is not valid JSON.",
                  instance: CREATE_LINK_PATH,
              };
    // After a body that is too large we stopped reading, so the connection can't be reused.
    if (error.kind === "too_large") res.setHeader("connection", "close");
    sendProblem(res, problem);
}

/** The `Link` schema in api/openapi.yaml. */
function toLinkResponse(link: Link, publicBaseUrl: string): object {
    return {
        code: link.code.value,
        shortUrl: `${publicBaseUrl}/${link.code.value}`,
        url: link.target.value,
        createdAt: link.createdAt.toISOString(),
        expiresAt: null,
    };
}
