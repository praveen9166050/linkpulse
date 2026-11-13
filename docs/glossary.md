# Glossary

The **ubiquitous language** of LinkPulse: one word per idea, used the same
way in conversation, code, the API and these docs. If code uses a different
word for one of these, the code should change.

## The business

| Term | Meaning | In code |
| --- | --- | --- |
| **Link** | One short link: a short code paired with the URL it sends people to. Its identity is its short code | `Link` (entity) |
| **Short code** | The part after the domain that identifies a link: `aZ3kP9q` in `lnkp.dev/aZ3kP9q`. 3 to 32 letters, digits or hyphens; case-sensitive | `ShortCode` (value object) |
| **Generated code** | A short code LinkPulse picks: 7 random base62 characters | `ShortCodeGeneratorService` |
| **Custom code** | A short code the user chooses, such as `my-resume` | `CreateLinkDto.code` |
| **Reserved word** | A name a short code can't be, because LinkPulse uses that path itself (`api`, `health`, `links`...) | `RESERVED_WORDS` in `short-code.value-object.ts` |
| **Target URL** | Where a link sends visitors. Only `http` or `https`, stored in canonical form | `TargetUrl` (value object) |
| **Short URL** | The full link people share: the public base URL plus the short code | `shortUrl` in the API |
| **Create a link** | Shorten a URL, with a custom or generated code | `LinksService.createLink` |
| **Follow a link** | Visit a short URL and get redirected (302) to its target | `LinksService.followLink` |
| **Click** | One visit to a link (counted from Phase 4) | Analytics, later |
| **Expiry** | When a link stops working (not built yet) | `expiresAt` in the API |

## The architecture

| Term | Meaning | In LinkPulse |
| --- | --- | --- |
| **Bounded context** | A part of the business with its own language, rules and data | Links now; Identity, Analytics, Billing later |
| **Module** | One bounded context's code: its service, controller, routes, DTOs and database code | `src/modules/links/`, wired by `links.module.ts` |
| **Service** | A class holding a feature's business logic, one method per operation | `LinksService` |
| **Controller** | Translates an HTTP request into a service call, and its result into a response | `links.controller.ts` |
| **Routes** | Which method and path call which controller function | `links.routes.ts` |
| **DTO** | Data Transfer Object: the shape data takes crossing the HTTP boundary | `create-link.dto.ts`, `link-response.dto.ts` |
| **Entity** | An object defined by its identity, not its data | `Link` (`link.entity.ts`) |
| **Value object** | An immutable object defined only by its value, valid by construction | `ShortCode`, `TargetUrl` |
| **Repository** | The class that stores and finds one kind of entity | `LinkRepository` |
| **Domain error** | An error a value object or service throws when a business rule is broken, with a typed `reason` | `InvalidShortCodeError`, `InvalidTargetUrlError` |
| **Response error** | An error that becomes an HTTP response with its status and Problem type | `ResponseError` and `BadRequestError` (400), `NotFoundError` (404), `ConflictError` (409), `ContentTooLargeError` (413) |
| **Middleware** | A function every request passes through, in order | `express.json`, `notFound`, `errorHandler` |
| **Problem Details** | The standard JSON error format (RFC 9457) | `application/problem+json` responses |
| **Unit test** | Tests one file in isolation, fast, no server | `__tests__/*.test.ts` |
| **Integration test** | Tests through real HTTP or a real database | `test/integration/*.test.ts` |
