# 0005. n8n-style module layout

- **Status:** Accepted (supersedes the folder layout in [0001](0001-repo-structure.md))
- **Date:** 2026-11-13

## Context

LinkPulse started as `src/apps/` (entry points) and `src/modules/<context>/`
with hexagonal layers (`domain/`, `application/` with ports, `adapters/`),
use-case classes, and expected failures returned as `Result` values.

Before growing it further we studied three well-known Node codebases:

- **Practica.js** (Node.js Best Practices): business components with entry
  points, domain and data-access tiers; shared `libraries/`.
- **Novu** (NestJS, production): `apps/` + `libs/`, one folder per use case
  with a command, a central data-access library.
- **n8n** (Express, production, 200k+ GitHub stars): one backend package,
  `src/modules/<feature>/` with `<feature>.module.ts`, `.controller.ts`,
  `.service.ts`, `dto/`, `database/{entities,repositories}/` and
  `__tests__/`; HTTP-aware error classes (`NotFoundError` = 404) thrown from
  services and mapped by one helper; integration tests in
  `test/integration/*.api.test.ts`.

LinkPulse runs on plain Express (ADR 0004), so n8n is the closest match.

## Options considered

1. **Keep hexagonal + use cases + Result.** Strict and swappable, but more
   files and concepts than a single-database product needs.
2. **Novu layout.** Built around NestJS conventions and several apps
   sharing a central data-access library.
3. **n8n layout and patterns.**

## Decision

Option 3, as n8n does it:

| Pattern | n8n | LinkPulse |
| --- | --- | --- |
| Feature folders | `src/modules/favorites/` | `src/modules/links/` |
| Business logic | One service per feature | `LinksService` |
| Expected failures | Thrown `ResponseError` subclasses | `BadRequestError`, `NotFoundError`, `ConflictError`, `ContentTooLargeError` |
| Error to HTTP | `response-helper.ts` | `middlewares/error-handler.ts` + `response-helper.ts` |
| Data access | Inside the feature, concrete classes | `modules/links/database/repositories/link.repository.ts` |
| Unit tests | `__tests__/` in each folder | Same |
| HTTP and database tests | `test/integration/*.api.test.ts` | Same |
| File names | kebab-case + role suffix | `links.service.ts`, `link.entity.ts`, `not-found.error.ts` |

Not adopted from n8n:

- **Route decorators and a DI container** (`@RestController`, `@Service`):
  `links.routes.ts` and constructor arguments do the same job in plain
  Express and TypeScript.
- **Internal packages** (`@n8n/errors`, `@n8n/db`...): one package with Node
  subpath imports (`#src/*`, `#test/*`) instead. Node's built-in TypeScript
  support won't strip types under `node_modules`, so workspace packages
  would need a build step.

Kept from before, beyond n8n: **value objects** (`ShortCode`, `TargetUrl`),
which hold the validation rules in one place and throw domain errors
(`InvalidShortCodeError`, `InvalidTargetUrlError`) carrying a typed
`reason`.

## Consequences

- Fewer files and concepts: no ports, no `Result`, no per-feature problems
  mapping, no use-case and command pairs.
- **Services can grow large.** One class per feature collects every
  operation; split a service when it gains unrelated responsibilities.
- **Services know HTTP statuses** through the error classes they throw.
  Reusing a service from a queue worker means treating those errors as
  plain failures there.
- **Swapping databases means editing the repository and its callers**: no
  interface stands between `LinksService` and `LinkRepository`. Moving links
  to DynamoDB on AWS will rewrite `link.repository.ts` behind the same
  public methods.
- The API did not change: the API tests moved to `test/integration/` with
  only their import line changed.
