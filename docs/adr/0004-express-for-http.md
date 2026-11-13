# 0004. Use Express for the HTTP layer

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

The walking skeleton (PR #3) runs on plain `node:http`, with a hand-written
router and JSON body reader. That was deliberate: writing them once shows
what a framework does. It doesn't scale: the coming phases need
authentication middleware (Phase 3), rate limiting (Phase 5), CORS for the
dashboard, request validation and more routes. Writing all of that by hand
would be reinventing the wheel.

The hexagonal design keeps the framework inside the HTTP adapter: domain,
use cases and the other adapters never import it, so switching touches only
`src/shared/http`, the link module's `adapters/http` and the composition
root.

## Options considered

1. **Stay on `node:http`.** No dependencies, full control. Every feature
   above becomes our own code to write, test and secure.
2. **Express 5.** The most widely used Node framework, with the largest
   middleware ecosystem; most Node developers already know it. Version 5
   (2024) forwards errors from async handlers to error middleware
   automatically, removing Express 4's biggest pitfall. Slower than Fastify,
   and validation needs an extra library.
3. **Fastify.** Faster, TypeScript-first, validation built in via JSON
   Schema. Smaller ecosystem; less familiar.
4. **Hono.** Small, built on web-standard `Request`/`Response`, runs
   natively on Lambda and edge runtimes. Youngest ecosystem.

## Decision

Express 5, chosen by the project owner for its ubiquity and familiarity.

- `express.json({ limit })` replaces the hand-written body reader, and
  Express routing replaces the hand-written router.
- Error-handling middleware maps body-parser errors to `400`/`413` and
  anything unexpected to a generic `500`, all as RFC 9457 Problem Details.
- `x-powered-by` is disabled so responses don't advertise the framework.
- `server.ts` keeps its own `listen` and graceful shutdown: an Express app is
  a plain `node:http` request listener.

## Consequences

- Less of our own plumbing to maintain; middleware for later phases comes
  from a mature ecosystem.
- The acceptance tests must pass **unchanged** across the switch, which
  proves only the adapter changed.
- Request validation needs a library (decided when the API grows; the
  OpenAPI schemas are the source of truth).
- Running on Lambda needs an adapter that turns Lambda events into Node
  requests; to be chosen when we deploy.
- Revisit if HTTP overhead shows up in Phase 11 profiling: Fastify would be
  the swap, again touching only the adapter.
