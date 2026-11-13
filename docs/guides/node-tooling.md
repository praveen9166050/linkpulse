# Node and TypeScript tooling

Every config file in the repo root, what it does, and the commands that use
it. Why TypeScript on Node: [ADR 0002](../adr/0002-typescript-on-node.md).

## Everyday commands

Defined under `"scripts"` in `package.json`. Run any of them with `npm run <name>`.

| Command | Runs | Does |
| --- | --- | --- |
| `npm ci` | — | Install exactly what `package-lock.json` lists. Use after cloning or pulling |
| `npm run check` | all four below | Everything CI will run. **Run before every push** |
| `npm run format:check` | `prettier --check .` | Is every file formatted? (changes nothing) |
| `npm run format` | `prettier --write .` | Format every file |
| `npm run lint` | `eslint .` | Lint problems? |
| `npm run lint:fix` | `eslint . --fix` | Fix what can be fixed automatically |
| `npm run typecheck` | `tsc` | Type errors? |
| `npm test` | `vitest run --passWithNoTests` | Run all tests once |
| `npm run test:watch` | `vitest` | Re-run tests on every save |

`check` chains its steps with `&&`: each runs only if the previous one
passed, so it stops at the first failure.

Run a TypeScript file directly, with no build step:

```powershell
node src/apps/api/main.ts
```

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
| `"scripts"` | The commands above |
| `"devDependencies"` | Tools for development and CI, at exact versions |

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

Prettier formats the code; nobody argues about style in reviews. Markdown is
ignored, since Prettier would re-pad every hand-written table.

### `vitest.config.ts`

Tests are files ending `.test.ts` in `src/` or `test/`. Coverage uses V8's
built-in coverage.

## Proving the checks work

On setup, a throwaway file with three deliberate bugs was checked:

```text
src/bad.ts  6:3   error  Promises must be awaited ...   @typescript-eslint/no-floating-promises
src/bad.ts  8:16  error  Expected '===' and instead saw '=='   eqeqeq
src/bad.ts(7,21): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

All three were caught before they could be committed.
