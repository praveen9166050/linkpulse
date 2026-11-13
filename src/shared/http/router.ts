import type { IncomingMessage, ServerResponse } from "node:http";
import { sendProblem } from "./problem.ts";

export type RouteParams = Readonly<Record<string, string>>;

export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    params: RouteParams,
) => Promise<void>;

export interface Route {
    readonly method: string;
    /** Literal segments and `:name` placeholders, for example `/api/v1/links` or `/:code`. */
    readonly path: string;
    readonly handler: RouteHandler;
}

export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * A minimal router: the first route whose method and path match handles
 * the request; anything else gets a 404. Routes are checked in order, so
 * list literal paths before catch-alls like `/:code`.
 */
export function createRouter(routes: readonly Route[]): RequestHandler {
    return async (req, res) => {
        const path = pathOf(req.url);
        for (const route of routes) {
            if (route.method !== req.method) continue;
            const params = matchPath(route.path, path);
            if (params) return route.handler(req, res, params);
        }
        sendProblem(res, {
            type: "/problems/not-found",
            title: "Not found",
            status: 404,
            detail: `No route for ${req.method ?? "?"} ${path}`,
            instance: path,
        });
    };
}

/** The path without any query string: `/abc?x=1` becomes `/abc`. */
function pathOf(url: string | undefined): string {
    return URL.parse(url ?? "/", "http://localhost")?.pathname ?? "/";
}

/** Returns the `:name` values if `path` fits `pattern`, otherwise undefined. */
function matchPath(pattern: string, path: string): RouteParams | undefined {
    const expected = pattern.split("/");
    const actual = path.split("/");
    if (expected.length !== actual.length) return undefined;

    const params: Record<string, string> = {};
    for (const [index, segment] of expected.entries()) {
        const value = actual.at(index) ?? "";
        if (segment.startsWith(":")) {
            if (value === "") return undefined;
            params[segment.slice(1)] = decodeSegment(value);
        } else if (segment !== value) {
            return undefined;
        }
    }
    return params;
}

/** `%41` becomes `A`; a malformed escape is kept as typed and simply won't match a code. */
function decodeSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}
