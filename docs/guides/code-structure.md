# Code structure

Where each kind of code lives, how files are named, and which code may
import which. The layout follows n8n: see
[ADR 0005](../adr/0005-n8n-style-layout.md). Terms: [glossary](../glossary.md).

## The layout

```
src/
├── main.ts                  entry point: read config, start, shut down gracefully
├── server.ts                HTTP lifecycle: listen, stop
├── app.ts                   builds the Express app: creates infrastructure,
│                            middleware chain, mounts feature modules
├── response-helper.ts       sendJson, sendProblem (RFC 9457 Problem Details)
├── errors/                  error classes
│   ├── <name>.error.ts          domain errors, e.g. invalid-short-code.error.ts
│   └── response-errors/         errors that become HTTP responses:
│                                response.error.ts (base), bad-request, not-found,
│                                conflict, content-too-large (.error.ts)
├── middlewares/             error-handler.ts, not-found.ts (plain names)
├── services/                services shared by every feature: clock.service.ts
│   └── __tests__/
└── modules/                 ONE FOLDER PER FEATURE
    └── links/
        ├── links.module.ts          builds the service and controller, returns a Router
        ├── links.controller.ts      request -> service -> response
        ├── links.routes.ts          method + path -> controller function
        ├── links.service.ts         the feature's business logic
        ├── <name>.service.ts        other feature services (short-code-generator.service.ts)
        ├── <name>.value-object.ts   self-validating values (short-code, target-url)
        ├── dto/                     request and response shapes
        ├── database/
        │   ├── entities/            link.entity.ts
        │   └── repositories/        link.repository.ts
        └── __tests__/               unit tests for this module
test/
├── integration/             tests through real HTTP or a real database
│   ├── <feature>.api.test.ts        API tests
│   └── <entity>.repository.test.ts  repository tests
└── shared/                  helpers used by any test
```

## What goes where

| Code | Goes in |
| --- | --- |
| A rule about one value (format, length) | That value's value object, throwing a domain error |
| A business operation (create a link) | The feature's service |
| Turning a request body into typed input | `dto/<verb>-<noun>.dto.ts` |
| Turning a result into response JSON | `dto/<noun>-response.dto.ts` |
| Reading HTTP, calling the service, writing the response | The controller (thin: no rules) |
| Storing and finding an entity | `database/repositories/<entity>.repository.ts` |
| An expected failure the client should see | Throw a `ResponseError` subclass from `errors/response-errors/` |
| A bug | Let it throw (a plain `Error`): the error handler logs it and answers 500 |

## Which code may import which

- **Modules don't import each other's internals.** If one feature needs
  another, it goes through that feature's service, never its repository.
- **Express stays in the HTTP layer:** `app.ts`, `server.ts`,
  `middlewares/`, controllers and routes. Services, value objects,
  entities and repositories never import Express.
- **Database drivers stay in repositories.**

## How to write an import

| Importing | Write |
| --- | --- |
| A file in the same module | a relative path: `./links.service.ts`, `../dto/create-link.dto.ts` |
| Shared code outside the module | `#src/<path>.ts`, e.g. `#src/errors/response-errors/not-found.error.ts` |
| A test helper | `#test/shared/<file>.ts` |

The aliases are Node **subpath imports** (`"imports"` in `package.json`),
the plain-Node equivalent of n8n's `@/` alias.

**No barrel files** (`index.ts` re-exporting a folder): they hide circular
imports and slow tests. Import the file that defines the thing.

## Naming (as in n8n)

Files are `kebab-case`, with a dot-suffix naming their role:
`<name>.<role>.ts`. Classes and types are `PascalCase`; functions and
variables `camelCase`. Indentation is 4 spaces.

| Role | File | Export |
| --- | --- | --- |
| Module | `links.module.ts` | `linksModule` |
| Controller | `links.controller.ts` | `createLinksController` |
| Routes | `links.routes.ts` | `linksRoutes` |
| Service | `links.service.ts`, `clock.service.ts` | `LinksService`, `ClockService` |
| Value object | `short-code.value-object.ts` | `ShortCode` |
| Entity | `link.entity.ts` | `Link` |
| Repository | `link.repository.ts` | `LinkRepository` |
| DTO | `create-link.dto.ts`, `link-response.dto.ts` | `CreateLinkDto` + `parseCreateLinkDto`, `toLinkResponseDto` |
| Error | `not-found.error.ts`, `invalid-short-code.error.ts` | `NotFoundError`, `InvalidShortCodeError` |
| Middleware | `error-handler.ts` (no suffix) | `errorHandler` |
| Unit test | `__tests__/links.service.test.ts` | |
| API test | `test/integration/links.api.test.ts` | |

## Adding a feature or operation (checklist)

1. Update `api/openapi.yaml` first if the HTTP contract changes.
2. Write the API test in `test/integration/<feature>.api.test.ts` (it fails).
3. Write a failing unit test in the module's `__tests__/`.
4. Add the logic as a method on the feature's service. New value rules go
   in a value object; expected failures throw a `ResponseError` subclass.
5. Add the DTO, the controller function and the route.
6. A new feature? Create `src/modules/<feature>/` with the same files and
   mount `<feature>Module(...)` in `app.ts`.
7. `npm run check`, then commit.
