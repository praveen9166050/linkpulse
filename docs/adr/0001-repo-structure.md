# 0001. Repository structure

- **Status:** Accepted (folder names amended by [0002](0002-typescript-on-node.md))
- **Date:** 2026-11-13

## Context

LinkPulse will grow from one API into several services (management API,
redirect service, workers, Kafka consumers), plus a web frontend and
Kubernetes deployment config. We need a layout that:

- lets each part be built, tested and released on its own;
- keeps the backend services sharing domain code without copy-paste;
- does not create repos before they are needed.

## Options considered

1. **One monorepo for everything** (backend, frontend, deploy config).
   Simple to start, but mixes deploy config changes with code commits and
   couples frontend and backend release cycles.
2. **A repo per service.** Maximum independence, but the backend services
   share domain code, so this forces versioned shared packages early and
   multiplies CI setup. Risks a distributed monolith spread across repos.
3. **Three repos by toolchain and lifecycle.** Backend monorepo, frontend
   repo, GitOps repo.

## Decision

Option 3:

| Repo | Holds | Created in |
| --- | --- | --- |
| `linkpulse` | All backend services, infrastructure code, CI, docs, CS labs | Phase 0 |
| `linkpulse-web` | Next.js dashboard | Phase 27 |
| `linkpulse-gitops` | Kubernetes manifests watched by Argo CD | Phase 10.5 |

Inside `linkpulse`, code is grouped by bounded context
(`src/modules/link`, `src/modules/identity`, `src/modules/analytics`, ...),
each with hexagonal layers (`domain/`, `application/`, `adapters/`).
Entry points, one per deployable, live in `src/apps/`.

Repos talk only through versioned contracts: `api/openapi.yaml` for HTTP and
versioned event schemas for Kafka. No shared code across repos; if sharing
becomes necessary, publish a versioned npm package.

## Consequences

- Splitting a new service out of the backend is cheap: add an entry in
  `src/apps/`.
- The frontend cannot drift from the API, since its client is generated
  from `openapi.yaml`.
- Deploys happen by changing `linkpulse-gitops`, never by committing code.
- Revisit if a backend service needs a different language or release cycle
  (for example the hot-path rewrite in Phase 24).
