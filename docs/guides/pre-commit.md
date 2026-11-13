# Git hooks and pre-commit

## Git hooks

A **hook** is a script git runs automatically at a certain moment. They live
in `.git/hooks/`. The ones we use:

| Hook | Runs | We use it to |
| --- | --- | --- |
| `pre-commit` | After `git commit`, before the commit is created | Check the files you staged |
| `commit-msg` | After you write the message | Check the message format |

If a hook fails (exits non-zero), **git cancels the commit**. Fix the problem,
`git add` again, commit again.

Problem: `.git/hooks/` is not part of the repo, so hooks are not shared with
other people or other machines.

## The pre-commit framework

**pre-commit** solves that. The hook list lives in a committed file,
`.pre-commit-config.yaml`, and each developer runs one install command. It
also downloads and caches each hook's tools for you.

```powershell
pre-commit install --hook-type pre-commit --hook-type commit-msg
```
Writes small scripts into `.git/hooks/pre-commit` and `.git/hooks/commit-msg`
that hand over to the framework. Run once per clone.

The first time a hook runs, pre-commit downloads its environment into
`C:\Users\Admin\.cache\pre-commit`. That is the "Initializing environment ...
This may take a few minutes" message. Later runs reuse it.

## Our config, line by line

```yaml
default_stages: [pre-commit]
```
Hooks run on `git commit` unless they say otherwise. Without this, the file
checks would also run again during the message check.

```yaml
    - repo: https://github.com/pre-commit/pre-commit-hooks
      rev: v5.0.0
```
A hook collection from GitHub, pinned to version `v5.0.0` so everyone runs
identical checks. `pre-commit autoupdate` bumps the versions.

| Hook | Catches |
| --- | --- |
| `trailing-whitespace` | Spaces at the ends of lines (fixes them) |
| `end-of-file-fixer` | Files that do not end with exactly one newline (fixes them) |
| `check-yaml` | Broken YAML (CI and CloudFormation files are YAML) |
| `check-json` | Broken JSON (`package.json`). Skips `tsconfig.json`: it is **JSONC** (JSON with comments), which strict JSON parsers reject; `tsc` validates it instead |
| `check-merge-conflict` | Leftover `<<<<<<<` conflict markers |
| `check-added-large-files` | Files over 500 KB (binaries do not belong in git) |
| `detect-private-key` | Private keys. Bots scan public repos and abuse leaked keys within minutes |

When a hook **fixes** a file, the commit still fails: review the fix,
`git add` it and commit again.

```yaml
    - repo: https://github.com/compilerla/conventional-pre-commit
      rev: v4.0.0
      hooks:
          - id: conventional-pre-commit
            stages: [commit-msg]
```
Rejects messages that are not [conventional commits](git.md#conventional-commits).
`stages: [commit-msg]` makes it check the message, not the files.

```yaml
    - repo: local
      hooks:
          - id: eslint
            entry: npx eslint --fix
            language: system
            types_or: [ts, javascript]
          - id: typecheck
            entry: npx tsc
            language: system
            pass_filenames: false
            types: [ts]
```
- `repo: local`: hooks defined right here rather than downloaded.
- `entry`: the command to run. `npx` runs the version in this repo's
  `node_modules/`, so the hook uses exactly the pinned tool.
- `language: system`: use what is already installed (our `node_modules`),
  rather than pre-commit building its own environment.
- `types_or: [ts, javascript]`: only run when such files are staged; the
  changed file names are appended to `entry`.
- `pass_filenames: false`: run once on the whole project instead. `tsc`
  needs the whole project to check types across files.

The three local hooks are `prettier` (formats in place), `eslint` (fixes
what it can, fails on the rest) and `typecheck`.

## Everyday commands

| Command | Does |
| --- | --- |
| `pre-commit run --all-files` | Run every hook on the whole repo, not just staged files |
| `pre-commit run eslint --all-files` | Run one hook |
| `pre-commit autoupdate` | Update hook versions in the config |
| `pre-commit install ...` | Set up the hooks in a fresh clone (above) |
| `git commit --no-verify` | Skip the hooks. **Don't.** CI runs the same checks anyway (Phase 2) |

## What a run looks like

```text
trim trailing whitespace.................................................Passed
detect private key.......................................................Passed
eslint...............................................(no files to check)Skipped
Conventional Commit......................................................Failed
[Bad commit message] >> updated makefile
```
`updated makefile` failed: no type. `build: make Makefile and hooks work on
Windows` passed.
