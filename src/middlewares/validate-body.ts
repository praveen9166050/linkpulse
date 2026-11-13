/**
 * ROUTE MIDDLEWARE: checks the request body BEFORE the controller runs.
 *
 *   router.post(path, validateBody(parseCreateLinkDto), controller.create)
 *
 * The parser checks the body's shape and returns a typed DTO, which
 * replaces `req.body`, so the controller receives input that is already
 * valid. A body that fails throws the parser's BadRequestError: Express
 * catches a throw from middleware and passes it to the error handler,
 * so the request ends with a 400 and the controller never runs.
 *
 * One job per link in the chain (Chain of Responsibility): later links,
 * such as authenticate() and rateLimit(), sit before this one in a route.
 */
import type { RequestHandler } from "express";

export function validateBody<T>(parse: (raw: unknown) => T): RequestHandler {
    return (req, _res, next) => {
        // express.json() parsed the JSON; it is still unchecked until `parse` says so.
        req.body = parse(req.body as unknown);
        next();
    };
}
