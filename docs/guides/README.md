# Guides

Reference notes for every tool, command and workflow used in LinkPulse.
They grow as the project grows: each new tool gets written up here when it
first appears.

| Guide | Covers |
| --- | --- |
| [Code structure](code-structure.md) | Where each kind of code goes, import rules, naming, where tests go, checklist for adding a feature |
| [Development environment](dev-environment.md) | Every installed tool, how it was installed, nvm, PATH |
| [Node and TypeScript tooling](node-tooling.md) | npm scripts, `npm ci`, and every config file: `package.json`, `tsconfig.json`, ESLint, Prettier, Vitest |
| [The API contract](api-contract.md) | OpenAPI: what the contract holds, its conventions, Redocly commands |
| [Git, GitHub and commits](git.md) | Every git and gh command used, conventional commits, rewriting history safely |
| [Git hooks and pre-commit](pre-commit.md) | What hooks are, our pre-commit config line by line, everyday commands |
| [make](make.md) | General reference: what make is and how a Makefile works (not used by LinkPulse now) |

Your own learning notes live in [`docs/phases/`](../phases/); decisions live
in [`docs/adr/`](../adr/); the project's vocabulary is in the
[glossary](../glossary.md).
