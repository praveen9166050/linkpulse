# Code structure

Where each kind of code lives, how files are named, and which code may
import which. The layout follows n8n: see
[ADR 0005](../adr/0005-n8n-style-layout.md). Terms: [glossary](../glossary.md).

## The layout

```
src/
├── main.ts                  entry point: config -> database -> HTTP; shuts down in reverse
├── server.ts                HTTP lifecycle: listen, stop
├── app.ts                   builds the Express app: creates infrastructure,
│                            middleware chain, mounts feature modules
├── response-helper.ts       sendJson, sendProblem (RFC 9457 Problem Details)
├── config/                  app.config.ts: reads and validates environment settings
├── databases/               shared database code, used by every feature:
│                            mongo.connection.ts (the pool), mongo-errors.ts
├── commands/                scripts run with npm, not by the server: db-ping.ts
├── errors/                  error classes
│   ├── <name>.error.ts          domain errors, e.g. invalid-short-code.error.ts
│   └── response-errors/         errors that become HTTP responses:
│                                response.error.ts (base), bad-request, not-found,
│                                conflict, content-too-large (.error.ts)
├── middlewares/             app-wide: error-handler.ts, not-found.ts;
│                            per route: validate-body.ts (plain names)
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
        │   ├── entities/            link.entity.ts (the domain object),
        │   │                        link.schema.ts (its stored shape)
        │   └── repositories/        link.repository.ts
        └── __tests__/               unit tests for this module
test/
├── integration/             tests through real HTTP or a real database
│   ├── <feature>.api.test.ts        API tests
│   └── <entity>.repository.test.ts  repository tests
└── shared/                  helpers used by any test, including
                             test-database.ts (a private collection per test file)
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
| How an entity is stored (fields, collection) | `database/entities/<entity>.schema.ts` |
| Database code every feature shares (connecting, error checks) | `src/databases/` |
| A new setting (environment variable) | `src/config/app.config.ts`, plus `.env.example` |
| A script run with `npm run`, not by the server | `src/commands/<name>.ts` |
| An expected failure the client should see | Throw a `ResponseError` subclass from `errors/response-errors/` |
| A bug | Let it throw (a plain `Error`): the error handler logs it and answers 500 |

## Which code may import which

- **Modules don't import each other's internals.** If one feature needs
  another, it goes through that feature's service, never its repository.
- **Express stays in the HTTP layer:** `app.ts`, `server.ts`,
  `middlewares/`, controllers and routes. Services, value objects,
  entities and repositories never import Express.
- **Database libraries stay in the database layer:** repositories,
  schemas, `src/databases/` and the wiring in `main.ts`, `server.ts` and
  `app.ts`. Services, value objects and entities never import Mongoose.
- **Only `main.ts` opens the connection.** Everything else receives it.

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
| Controller | `links.controller.ts` | `LinksController` |
| Routes | `links.routes.ts` | `linksRoutes` |
| Service | `links.service.ts`, `clock.service.ts` | `LinksService`, `ClockService` |
| Value object | `short-code.value-object.ts` | `ShortCode` |
| Entity | `link.entity.ts` | `Link` |
| Schema | `link.schema.ts` | `LinkDocument`, `linkModel` |
| Config | `app.config.ts` | `AppConfig`, `loadAppConfig` |
| Repository | `link.repository.ts` | `LinkRepository` |
| DTO | `create-link.dto.ts`, `link-response.dto.ts` | `CreateLinkDto` + `parseCreateLinkDto`, `toLinkResponseDto` |
| Error | `not-found.error.ts`, `invalid-short-code.error.ts` | `NotFoundError`, `InvalidShortCodeError` |
| Middleware | `error-handler.ts`, `validate-body.ts` (no suffix) | `errorHandler`, `validateBody` |
| Unit test | `__tests__/links.service.test.ts` | |
| API test | `test/integration/links.api.test.ts` | |

## Middleware per route

A route lists its whole chain: every function a request passes through,
in order, ending with the controller.

```ts
router.post("/api/v1/links", validateBody(parseCreateLinkDto), controller.create);
// later: router.post(path, authenticate(), authorize(...), rateLimit(...), validateBody(...), controller.create)
```

| Order | Middleware | Ends the request with | Why here |
| --- | --- | --- | --- |
| 1 | `authenticate()` (later) | 401 | Who is calling? Everything after may depend on it |
| 2 | `authorize(...)` (later) | 403 | Are they allowed? Needs the user from step 1 |
| 3 | `rateLimit(...)` (later) | 429 | Cheap; stops abuse before any real work |
| 4 | `validateBody(parse)` | 400 | Checks the body's shape; the controller gets a typed DTO |
| 5 | The controller | 2xx/3xx | Only runs once every check passed |

Rules:

- **A middleware either calls `next()` or ends the request, never both.**
  To reject, throw a `ResponseError` (Express passes it to `errorHandler`).
- **Cheap and security checks first.** No work is spent on a request that
  will be refused.
- **Validated input is typed:** after `validateBody`, the controller
  declares `Request<Params, unknown, TheDto>` and uses `req.body` as is,
  with no second parse and no cast.
- **App-wide middleware** (every request: `express.json`, `notFound`,
  `errorHandler`) goes in `app.ts`; **route middleware** goes in the routes file.

## Class or function?

**A class when something holds state or dependencies and has behaviour
around them; a plain function when it just turns input into output.**

| Write a class for | Examples |
| --- | --- |
| Services, repositories, controllers: dependencies arrive through the constructor | `LinksService`, `LinkRepository`, `LinksController` |
| Something with a lifecycle or state to guard | `DatabaseConnection` (connected or not) |
| Entities and value objects: data plus the rules that protect it | `Link`, `ShortCode`, `TargetUrl` |
| Errors: `instanceof`, inheritance, stack traces | `NotFoundError`, `ConfigError` |

| Keep a function for | Examples |
| --- | --- |
| Express middleware: Express's contract is a function | `errorHandler`, `notFound` |
| DTO parsers and mappers: pure, no state | `parseCreateLinkDto`, `toLinkResponseDto` |
| Small checks and one-off setup | `isDuplicateKeyError`, `loadAppConfig`, `linksModule`, `linksRoutes` |

Rules that go with it:

- **No static-only classes** (`class Utils { static parse() }`): a module
  of exported functions already is that container.
- **`#private` fields**, not TypeScript's `private`: `#` is enforced at
  runtime and is syntax Node can run directly.
- **Handlers passed to Express are arrow-function fields**
  (`readonly follow = async (req, res) => {...}`). An ordinary method
  passed as a callback loses `this` and crashes; ESLint's
  `unbound-method` rule reports it.
- **Depend on what you use:** a constructor can ask for
  `Pick<LinksService, "createLink" | "followLink">` rather than the whole
  class, so a small stand-in works in unit tests.

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
