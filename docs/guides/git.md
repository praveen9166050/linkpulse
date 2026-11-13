# Git, GitHub and commits

## Commands used so far

### Who am I logged in as?

```powershell
gh auth status
```
Shows each GitHub account the GitHub CLI is logged into and which one is
**active**. This machine has two; `praveen9166050` is the active one and
owns LinkPulse.

```powershell
git config --global user.name
git config --global user.email
```
The name and email stamped on every commit you make. **The email is public**
in a public repo's history. GitHub offers a private address
(`<id>+<username>@users.noreply.github.com`) if you would rather hide it.

### Creating the repo

```powershell
gh repo create linkpulse --public --description "..." --license mit --clone
```

| Part | Meaning |
| --- | --- |
| `gh repo create linkpulse` | Create a repo called `linkpulse` on GitHub under the active account |
| `--public` | Anyone can see it (it is a portfolio) |
| `--description "..."` | The one-line summary on the repo page |
| `--license mit` | Add an MIT `LICENSE` file in a first commit. MIT lets anyone reuse the code if they keep your copyright notice |
| `--clone` | Also download it into a folder of the same name here |

### The everyday loop

```powershell
git status --short      # what changed. A = added, M = modified, D = deleted, ?? = untracked
git add -A              # stage ALL changes (new, modified, deleted) for the next commit
git add package.json    # or stage just one file
git commit -m "feat: add lab 00"   # save the staged changes as a commit
git push origin main    # upload new commits to GitHub's copy of main
git log --oneline       # history, one line per commit
```

**Staging** is a waiting area: `git add` chooses exactly what goes into the
next commit, so one commit holds one logical change.

A commit message can have a **subject** and a **body**, separated by a blank
line. The subject says *what*, the body says *why*:

```text
build: make Makefile and hooks work on Windows

Replace grep/awk help target with echo, run test-race only in CI
(needs cgo on Windows), and run file hooks once per commit.
```

### Rewriting the last commit

```powershell
git commit --amend -m "new message"
git push --force-with-lease origin main
```

- `--amend` **replaces** the last commit with a new one (new hash), here to
  change its message. Any staged changes are folded in too.
- The remote still has the old commit, so a normal push is refused. A
  **force push** overwrites the remote history.
- `--force-with-lease` is the safe force: it refuses if someone else pushed
  since you last fetched, so you cannot wipe out their work. Never use
  plain `--force`.
- **Only rewrite history nobody else has pulled.** Fine on a solo repo or
  your own feature branch; never on a shared `main`.

## Conventional commits

Every commit message follows this shape (a hook enforces it, see
[pre-commit.md](pre-commit.md)):

```text
type(optional scope): short description in the imperative
```

| Type | Use for | Example |
| --- | --- | --- |
| `feat` | A new feature | `feat(link): add custom short codes` |
| `fix` | A bug fix | `fix(redirect): return 404 for expired links` |
| `docs` | Documentation only | `docs: explain make in guides` |
| `test` | Adding or fixing tests | `test(link): cover code collisions` |
| `refactor` | Code change with no behaviour change | `refactor: extract code generator` |
| `perf` | Performance | `perf(redirect): cache popular links` |
| `build` | Build system, tooling, dependencies | `build: add eslint config` |
| `ci` | CI pipelines | `ci: run tests on pull requests` |
| `chore` | Anything else (maintenance) | `chore: scaffold repo layout` |

A breaking change adds `!` (`feat(api)!: remove v1 endpoints`) or a
`BREAKING CHANGE:` line in the body.

**Why bother:** the history reads like a changelog, and from Phase 2 tools
can generate release notes and version numbers from it: `fix` bumps
`1.2.3 → 1.2.4`, `feat` bumps `1.2.3 → 1.3.0`, a breaking change bumps
`1.2.3 → 2.0.0` (**semantic versioning**).
