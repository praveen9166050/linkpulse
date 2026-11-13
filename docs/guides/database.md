# The database (MongoDB Atlas)

How LinkPulse connects to MongoDB, how to set it up on a new machine, and
how tests use it. Why MongoDB and Mongoose: [ADR 0006](../adr/0006-mongodb-for-links.md).

## What runs where

```
your machine                              MongoDB Atlas (AWS ap-south-1)
┌──────────────────────────┐   TLS        ┌───────────────────────────────┐
│ LinkPulse (npm start)    │ ──────────►  │ Cluster0 (M0, free)           │
│   one connection pool    │  port 27017  │   linkpulse_dev   app data    │
│   (up to 10 connections) │              │   linkpulse_test  test data   │
└──────────────────────────┘              └───────────────────────────────┘
   settings from .env                        user: linkpulse-app
                                             (readWrite on those two only)
```

## Setting up a new machine

1. **Atlas > Database Access:** the user `linkpulse-app` exists, with
   `readWrite` on `linkpulse_dev` and `linkpulse_test` only. Never use an
   admin user in an app: a bug or a leaked password would expose every
   database.
2. **Atlas > Network Access:** add this machine's IP address
   ("Add current IP address"). **Never add `0.0.0.0/0`**: that allows
   connections from anywhere, leaving only the password between the
   internet and the data.
3. **Create `.env`** from the template and fill in the real values:

   ```powershell
   Copy-Item .env.example .env
   ```

   `MONGODB_URI` comes from Atlas > Clusters > Connect > Drivers; replace
   `<db_password>` with the real password. `.env` is git-ignored: **never
   commit it**, and never paste the connection string into chats or issues.
4. **Check the connection:**

   ```powershell
   npm run db:ping
   ```

   ```text
   Connecting to cluster0.etrfymo.mongodb.net, database "linkpulse_dev"...
   OK: connected and pinged in 461 ms
   ```

## When `db:ping` fails

| Message | Likely cause | Fix |
| --- | --- | --- |
| `authentication failed` | Wrong user or password in `MONGODB_URI` | Reset the password in Database Access and update `.env`. Special characters in a password must be URL-encoded (`@` as `%40`) |
| `couldn't reach the cluster. Is this machine's IP in Atlas > Network Access?` | This machine's IP isn't allowed (it changes on new networks), or no internet | Add the current IP in Network Access; wait a minute for it to apply |
| `Invalid configuration: - MONGODB_URI is required (see .env.example)` | No `.env`, or the variable is missing | Step 3 above |
| `MONGODB_URI still contains the <db_password> placeholder` | The template value wasn't replaced | Put the real password in |

The app (`npm start`) runs the same checks at startup and stops with
`LinkPulse failed to start: ...` instead of starting without a database.

## Settings (`.env`)

Read once at startup by `src/config/app.config.ts`, using Node's built-in
`process.loadEnvFile()` (no `dotenv` package needed). Variables already set
in the shell win over `.env`, so CI and hosting platforms set them directly.

| Variable | Required | Default | Rule |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | | Starts with `mongodb://` or `mongodb+srv://`. Never printed in errors or logs |
| `MONGODB_DATABASE` | Yes | | Letters, digits, `_` or `-`, up to 38 characters |
| `PORT` | No | `3000` | A whole number from 0 to 65535 |
| `PUBLIC_BASE_URL` | No | Where the server listens | `http` or `https`; a trailing `/` is removed |

All problems are reported together, so one run shows everything to fix.

## The connection lifecycle

| Moment | What happens | Where |
| --- | --- | --- |
| Startup | Config, then connect (fails after 10 s if the cluster is unreachable), then start HTTP | `main.ts`, `databases/mongo.connection.ts` |
| Each request | The repository borrows a connection from the pool and returns it | `link.repository.ts` (Mongoose does it) |
| Ctrl+C / SIGTERM | Stop HTTP (finish open requests), then close the pool | `main.ts` |

The **connection pool** keeps up to 10 open connections ready. Opening one
costs a TCP handshake, a TLS handshake and authentication (hundreds of
milliseconds to Atlas), so doing it per request would be slow; reusing them
makes each query cost one round trip.

## What a link looks like in the database

Collection `links`, one document per link:

```json
{ "_id": "GgIZpmO", "target": "https://example.com/survives-a-restart", "createdAt": ISODate("2026-11-13T...") }
```

- `_id` **is the short code**: unique and indexed automatically.
- No `__v` field (Mongoose's version key is turned off: nothing uses it).
- The shape is declared in `src/modules/links/database/entities/link.schema.ts`.

To look at the data, use Atlas > Clusters > Browse Collections, or MongoDB
Compass with the same connection string.

## Tests and the database

Repository, service and API tests run against the real `linkpulse_test`
database, using `test/shared/test-database.ts`:

```ts
let database: TestDatabase;

beforeAll(async () => {
    database = await connectTestDatabase(); // own collection: links_test_<random>
});
beforeEach(() => database.clear()); // empty it: every test starts clean
afterAll(() => database.dispose()); // drop the collection, close the connection
```

Vitest runs test files in parallel, so each file gets its **own uniquely
named collection**: one file's `clear()` can never delete data another file
is using. After a full run, `linkpulse_test` should have no collections
left; if a run was killed halfway, leftover `links_test_*` collections are
safe to drop in Atlas.

Tests need the same `.env` and network access as the app. Offline, every
database test fails with the "couldn't reach the cluster" error.
