# The API contract (OpenAPI)

LinkPulse is built **API-first**: the HTTP contract in
[`api/openapi.yaml`](../../api/openapi.yaml) is written and reviewed before
the code. The server must match it; clients (the dashboard in Phase 27) are
generated from it.

## Everyday commands

| Command | Does |
| --- | --- |
| `npm run lint:api` | Lint the contract (also part of `npm run check`) |
| `npx redocly preview-docs api/openapi.yaml` | Open a live documentation site for the contract in the browser |
| `npx redocly build-docs api/openapi.yaml` | Build the docs as a single HTML file (`redoc-static.html`) |
| `npx redocly lint --generate-ignore-file` | Record the current warnings as deliberately ignored (add a reason to each) |

## What an OpenAPI file holds

| Section | Holds |
| --- | --- |
| `info` | Title, version, licence, description |
| `servers` | Where the API runs |
| `security` | How clients authenticate (`[]` = none yet, stated on purpose) |
| `paths` | Each URL and HTTP method: parameters, request body, responses |
| `components/schemas` | Reusable data shapes (JSON Schema), referenced with `$ref` |
| `components/responses` | Reusable responses, such as our error responses |

`operationId` names each operation (`createLink`); code generators turn it
into a function name.

## Conventions in this contract

| Convention | Rule |
| --- | --- |
| URL layout | Management API under `/api/v1/...`; redirects at `/{code}`; health at `/health` |
| Versioning | In the path. A breaking change means `/api/v2`, with `/v1` kept running until clients move |
| Redirects | `302 Found` + `Cache-Control: no-store`, so every click is counted ([ADR 0003](../adr/0003-redirect-with-302.md)) |
| Errors | RFC 9457 Problem Details, `application/problem+json`, with an `errors` list for invalid fields |
| Status codes | `201` created, `400` invalid input, `404` not found or expired, `409` conflict, `503` unhealthy |
| Unknown fields | Request bodies set `additionalProperties: false`: a misspelt field is an error, not silently ignored |

## Linting and ignored warnings

`redocly.yaml` applies Redocly's `recommended` rules. Deliberate exceptions
live in `.redocly.lint-ignore.yaml`, **one entry per occurrence, each with a
reason**. Suppressing a rule for the whole project would also hide future,
real problems.
