# Node and TypeScript tooling

Every config file in the repo root, what it does, and the commands that use
it. Why TypeScript on Node: [ADR 0002](../adr/0002-typescript-on-node.md).

## Everyday commands

Defined under `"scripts"` in `package.json`. Run any of them with `npm run <name>`.

| Command | Runs | Does |
| --- | --- | --- |
| `npm ci` | — | Install exactly what `package-lock.json` lists. Use after cloning or pulling |
| `npm start` | `node src/main.ts` | Run the API on port 3000, with settings from `.env` (see [database.md](database.md)). Ctrl+C shuts it down gracefully |
| `npm run db:ping` | `node src/commands/db-ping.ts` | Check this machine can reach MongoDB with the settings in `.env` |
| `npm run dev` | `node --watch src/main.ts` | Same, but restarts automatically when a file changes |
| `npm run check` | format:check, lint, lint:api, typecheck, test | Everything CI will run. **Run before every push** |
| `npm run format:check` | `prettier --check .` | Is every file formatted? (changes nothing) |
| `npm run format` | `prettier --write .` | Format every file |
| `npm run lint` | `eslint .` | Lint problems? |
| `npm run lint:fix` | `eslint . --fix` | Fix what can be fixed automatically |
| `npm run lint:api` | `redocly lint` | Is the OpenAPI contract valid? (see [api-contract.md](api-contract.md)) |
| `npm run typecheck` | `tsc` | Type errors? |
| `npm test` | `vitest run --passWithNoTests` | Run all tests once |
| `npm run test:watch` | `vitest` | Re-run tests on every save |

`check` chains its steps with `&&`: each runs only if the previous one
passed, so it stops at the first failure.

Run a TypeScript file directly, with no build step:

```powershell
node src/main.ts
```

## Trying the API with curl

Start the API with `npm start`, then in another terminal:

```powershell
# Shorten a URL (send JSON from a file: see the Windows note below)
Set-Content body.json '{"url": "https://example.com/articles/2026/how-dns-works"}' -NoNewline
curl.exe -i -X POST http://127.0.0.1:3000/api/v1/links -H "content-type: application/json" -d "@body.json"

# Follow the short link (curl shows the 302 instead of following it)
curl.exe -i http://127.0.0.1:3000/<code>
```

| Flag | Meaning |
| --- | --- |
| `-i` | Print the response headers too (status, `location`, `cache-control`) |
| `-X POST` | The HTTP method |
| `-H "..."` | Add a request header |
| `-d "@body.json"` | Send the contents of `body.json` as the request body |

**Windows note:** in Windows PowerShell 5.1, `curl` is an alias for
`Invoke-WebRequest`, so type `curl.exe`. And PowerShell 5.1 strips double
quotes from arguments passed to programs, so `-d '{"url": "..."}'` arrives
as `{url: ...}` (invalid JSON, answered with `400 invalid-json`). Sending
the body from a file avoids it. PowerShell 7 and Git Bash don't have this
problem.

## npm install vs npm ci

| | `npm install` | `npm ci` |
| --- | --- | --- |
| Use when | Adding or updating a package | Fresh clone, CI, "make it match the lockfile" |
| Lockfile | May update it | Never changes it; fails if it disagrees with `package.json` |
| `node_modules` | Updated in place | Deleted and rebuilt from scratch |

Adding a tool used only during development:

```powershell
npm install -D vitest      # -D = devDependency: never shipped to production
```

`package-lock.json` pins the exact version of every package **and every
package they depend on**, so everyone gets an identical install. Always
commit it.

## The config files

### `package.json`

| Field | Meaning |
| --- | --- |
| `"private": true` | Never publish this to the npm registry by accident |
| `"type": "module"` | `.js` files use ES modules (`import`/`export`), not CommonJS (`require`) |
| `"engines": { "node": ">=26" }` | The Node version the code needs |
| `"imports"` | **Subpath imports**: `#src/*` and `#test/*` map to `src/` and `test/`, so imports read `#src/errors/...` instead of long `../../..` paths (the plain-Node equivalent of n8n's `@/` alias). Understood by Node, TypeScript and Vitest (see [code-structure.md](code-structure.md)) |
| `"scripts"` | The commands above |
| `"dependencies"` | Packages the app needs to run: `express`, `mongoose` |
| `"devDependencies"` | Tools for development and CI, at exact versions |

### `.env` and `.env.example`

Settings that differ per machine or contain secrets (the MongoDB connection
string). `.env` holds the real values and is git-ignored; `.env.example` is
committed and lists every variable with placeholders. Details:
[database.md](database.md#settings-env).

### `.npmrc`

| Setting | Meaning |
| --- | --- |
| `engine-strict=true` | Refuse to install on a Node version that doesn't match `engines` |
| `save-exact=true` | Record `6.0.3`, not `^6.0.3`, so nothing upgrades silently |

### `.nvmrc`

The Node version (`26.13.1`). Read by CI (`actions/setup-node`) and by nvm
tools on other machines.

### `tsconfig.json`

TypeScript is used as a **type checker only** (`noEmit`). Node 26 runs `.ts`
files itself by stripping the types out, so these settings keep the code
runnable that way:

| Setting | Meaning |
| --- | --- |
| `module` / `moduleResolution: NodeNext` | Resolve imports exactly as Node does |
| `allowImportingTsExtensions` | Write `import { x } from "./x.ts"`, as Node requires |
| `erasableSyntaxOnly` | Only TypeScript features that can simply be deleted: no `enum`, `namespace` or constructor parameter properties (Node can't strip those) |
| `verbatimModuleSyntax` | Type-only imports must say `import type`, so Node knows they can be deleted |
| `strict` | All core strictness checks, including no implicit `any` and strict `null` checks |
| `noUncheckedIndexedAccess` | `arr[0]` has type `T \| undefined`: you must handle "not there" |
| `noUnused*`, `noImplicitReturns`, ... | Catch dead code and forgotten branches |

### `eslint.config.js`

ESLint's "flat config": a list of rule sets applied in order.

- `js.configs.recommended`: core JavaScript mistakes.
- `tseslint.configs.recommendedTypeChecked`: TypeScript rules that **read
  the types**. The most valuable is `no-floating-promises`, which catches a
  forgotten `await` whose errors would otherwise vanish silently.
- Anti-pattern rules from the learning plan: `complexity` (god functions),
  `max-depth`, `max-params`, `no-console` (use a logger), `eqeqeq`, no
  `any`, `import type`, exhaustive `switch`.
- `prettier` last: turns off any rule that would fight the formatter.

### `.prettierrc.json` and `.prettierignore`

Prettier formats the code; nobody argues about style in reviews. Settings:
**4-space indentation** (`tabWidth`), lines up to 100 characters, and a
trailing comma after the last item of multi-line lists (cleaner diffs when
an item is added). `.editorconfig` sets the same 4 spaces for editors.
Markdown is ignored, since Prettier would re-pad every hand-written table.

### `vitest.config.ts`

As in n8n, unit tests live in a `__tests__/` folder inside the folder they test, and tests through real HTTP or a real database live in `test/integration/` (`*.api.test.ts`, `*.repository.test.ts`). Coverage uses V8's
built-in coverage. Tests that touch the database need `.env` and network
access (see [database.md](database.md#tests-and-the-database)).

## Proving the checks work

On setup, a throwaway file with three deliberate bugs was checked:

```text
src/bad.ts  6:3   error  Promises must be awaited ...   @typescript-eslint/no-floating-promises
src/bad.ts  8:16  error  Expected '===' and instead saw '=='   eqeqeq
src/bad.ts(7,21): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

All three were caught before they could be committed.
