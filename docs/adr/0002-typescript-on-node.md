# 0002. Backend language: TypeScript on Node.js

- **Status:** Accepted (replaces the original choice of Go)
- **Date:** 2026-11-13

## Context

The project's goal is learning backend and cloud engineering: architecture,
data stores, messaging, distributed systems, AWS, operations. The plan first
chose Go. Learning a new language at the same time as all of that would slow
progress on the concepts that matter. Node.js is already familiar.

## Options considered

1. **Go.** Fast, simple concurrency (goroutines), strong in cloud tooling.
   Cost: a new language to learn before the real topics.
2. **JavaScript on Node.js.** Familiar, no new syntax. But no interfaces or
   static types, so patterns like dependency inversion stay informal and
   many bugs appear only at runtime.
3. **TypeScript on Node.js.** Familiar runtime; interfaces and types make
   SOLID, DDD and hexagonal architecture explicit; strict type checks and
   type-aware linting catch bugs before commit. Industry standard for
   Node backends.

## Decision

TypeScript on Node.js 26 (LTS), pinned in `.nvmrc`.

- TypeScript is used as a **type checker** (`tsc` with `noEmit`). Node 26
  runs `.ts` files directly by stripping types, so the code sticks to
  erasable syntax (`erasableSyntaxOnly`: no enums, namespaces or
  constructor parameter properties).
- Lambda bundles are built with esbuild from Phase 1.
- Tooling: ESLint (type-aware), Prettier, Vitest, npm scripts.

## Consequences

- Concurrency lessons move from goroutines to the event loop, libuv's
  thread pool and `worker_threads`. CPU-heavy work needs care, since
  JavaScript runs on one thread per process.
- Profiling uses `node --cpu-prof`, Chrome DevTools and clinic.js
  instead of `pprof`.
- A compiled language still appears in Phase 24 (rewriting the hot path in
  Go or Rust), where the hexagonal design lets a new adapter replace the old
  one behind the same ports.
