# 0006. MongoDB (via Mongoose) for links

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

Links were kept in memory: every restart lost them, and two instances of
the API would each have had their own links. LinkPulse needs a real
database.

How links are used decides the database. In Phase 1 the access patterns are:

| Operation | How often | Query |
| --- | --- | --- |
| Follow a link | Very often (every click) | Find one link by its short code |
| Create a link | Far less often | Insert, only if the code is free |

There are no joins, no reports and no multi-row transactions. It's a
key-value lookup: the short code is the key, the link is the value. Later
phases add users and analytics; the plan puts Postgres on Supabase in
Phase 9 for relational data, and DynamoDB in the AWS phases.

Already available: a free MongoDB Atlas cluster (M0, AWS `ap-south-1`) and a
Supabase Postgres project.

## Options considered

**The database:**

1. **PostgreSQL (Supabase).** Strong consistency, schemas, SQL, joins.
   But none of that is needed to look a link up by its key, and learning it
   now would mean migrations and SQL before the API even persists anything.
   Better learned later with data that is actually relational (users,
   workspaces, billing).
2. **DynamoDB.** The eventual AWS target, and an exact fit for a key-value
   lookup. But it needs the AWS account, IAM and either the cloud or a local
   emulator, which Phase 0 deliberately postponed to the first Lambda deploy.
3. **MongoDB (Atlas).** A document database: each link is one document,
   found by its `_id`. Ready now, free, managed, and close to DynamoDB's
   model (one item per key, no joins), so moving later is a small step.

**The library:**

1. **The native `mongodb` driver.** Thin and fast; everything is plain objects.
2. **Mongoose.** An ODM (Object Document Mapper) on top of that driver:
   declared schemas, casting, validation, models. The most widely used way
   to reach MongoDB from Node, and what n8n-style Express apps typically use.

## Decision

**MongoDB Atlas through Mongoose**, with these rules:

- **The short code is the document's `_id`.** `_id` always has a unique
  index, so "find by code" uses it and no second index is needed.
- **Creating a link is one atomic insert.** No "check if free, then insert":
  two requests could both see the code free between the two steps (a race).
  Instead the insert runs, and MongoDB rejects a duplicate `_id` with error
  **E11000**, which `LinkRepository.add` turns into `"code_taken"`. The
  server makes the check and the write one step.
- **The stored shape (`link.schema.ts`) is separate from the `Link` entity.**
  The repository converts between them and rebuilds `Link` through the value
  objects, so data read from the database is validated too.
- **One connection pool for the whole app**, opened in `main.ts` before the
  HTTP server starts and closed after it stops, then passed down to the
  repository. Nothing else opens connections.
- **Settings come from the environment** (`MONGODB_URI`, `MONGODB_DATABASE`),
  loaded from a git-ignored `.env` and validated at startup: a bad setting
  stops the app with a clear message, never later on the first request.
- **Least privilege:** the app's database user can only read and write
  `linkpulse_dev` and `linkpulse_test`. The Atlas IP access list names
  specific addresses; never `0.0.0.0/0` (anyone).
- **Tests use a real database**, `linkpulse_test`, with a uniquely named
  collection per test file so files running in parallel never touch each
  other's data.

## Consequences

- **Links survive restarts**, and several API instances can share them.
- **Tests now need the network and Atlas.** They are slower (seconds, not
  milliseconds) and fail when offline or when this machine's IP isn't in
  the access list. In exchange they test the real duplicate-key behaviour,
  which an in-memory fake could only imitate.
- **The free tier has limits** (512 MB storage, shared CPU, no backups). Fine
  for learning; a paid tier or another database for production.
- **Mongoose adds a layer.** Its schemas duplicate rules the value objects
  already enforce; they are kept minimal (types and `required`) for that
  reason. Its errors and connection model must be learned as well as
  MongoDB's.
- **Moving to DynamoDB** later rewrites `link.repository.ts` and
  `link.schema.ts` behind the same public methods (`add`, `findByCode`).
  The service, controller and API tests stay unchanged, as they did for
  this move.
