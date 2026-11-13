# make

> **LinkPulse uses npm scripts now, not make** (see
> [node-tooling.md](node-tooling.md) and [ADR 0002](../adr/0002-typescript-on-node.md)).
> This guide stays as general reference: you will meet Makefiles in many
> repos, especially Go, C and infrastructure projects. The example Makefile
> below is the one LinkPulse used while it was planned in Go.

## What it is

**make** is a program that reads a file called `Makefile` and runs the
commands listed under a name you give it. `make test` runs whatever the
Makefile says "test" means.

It was written in 1976 at Bell Labs to rebuild C programs. Recompiling a big
program took ages, so make compared file timestamps and rebuilt only the
files whose sources had changed. That still works, but most projects today,
including LinkPulse, mainly use make as a **task runner**: a short menu of
the project's standard commands.

## Why use it

- **One short name per task.** `make check` instead of four long commands.
- **The same commands everywhere.** You and CI run the identical command,
  so "works on my machine" problems shrink.
- **Self-documenting.** A new contributor runs `make help` and sees how to
  work with the project.
- **Everywhere already.** Pre-installed on Linux, macOS and CI runners, and
  the norm in Go projects.

Alternatives you may meet: `Taskfile`, `just`, npm scripts, plain shell
scripts.

## Anatomy of a rule

```make
target: prerequisites
	recipe line 1
	recipe line 2
```

| Part | Meaning |
| --- | --- |
| **target** | The name you type after `make`. Traditionally a file to build; for us usually a task name |
| **prerequisites** | Other targets to run first, left to right |
| **recipe** | Shell commands to run. **Each line must start with a TAB**, not spaces |

Rules to remember:

- **Each recipe line runs in its own shell.** A `cd` on one line does not
  carry over to the next.
- **make stops at the first failing command** (one that exits with a
  non-zero code). That is what you want in a `check`: fail fast.
- Before running a line, make prints it. Prefix it with `@` to hide it.

## How make decides whether to run a recipe

For a **file target**, make runs the recipe only if the file is missing or
older than one of its prerequisites:

```make
bin/api.exe: main.go
	go build -o bin/api.exe .
```

Run `make bin/api.exe` twice: the second time make says the file is up to
date and does nothing.

A **phony target** is just a name, not a file. Listing it under `.PHONY`
tells make to always run it, even if a file called `test` happens to exist.

## Example: a Go project's Makefile, line by line

```make
.DEFAULT_GOAL := help
```
Running plain `make` with no target runs `help`.

```make
.PHONY: help fmt vet lint test test-race tidy check
```
None of these are files; always run them.

```make
help: ## List available commands
	@echo Available commands:
	@echo   make fmt        Format all Go code
```
Prints the menu. `@` hides the `echo` command itself so only its text
shows. The `## ...` after the target is a comment describing it.

```make
fmt:
	gofmt -w .
```
`gofmt` formats Go code. `-w` **writes** the changes into the files;
without it, gofmt only prints what it would change. `.` means this folder
and everything below it.

```make
vet:
	go vet ./...
```
Checks every package for code that compiles but is probably wrong.

```make
lint:
	golangci-lint run
```
Runs the linters chosen in `.golangci.yml`.

```make
test:
	go test ./...

test-race:
	go test -race ./...
```
Run all tests. `-race` adds the **race detector**, which catches two
goroutines touching the same memory without synchronisation. It needs a C
compiler on Windows, so it runs in CI on Linux.

```make
tidy:
	go mod tidy
```
Makes `go.mod` and `go.sum` match the imports in the code.

```make
check: fmt vet lint test
```
A target with only prerequisites and no recipe: it runs `fmt`, then `vet`,
then `lint`, then `test`, and stops at the first failure. Run it before
every push.

## Useful flags

| Command | Does |
| --- | --- |
| `make -n check` | **Dry run:** print the commands without running them. Great for seeing what a target does |
| `make -k check` | **Keep going** after a failure, to see every problem at once |
| `make -j4 check` | Run up to 4 independent targets in parallel |
| `make -C some/dir test` | Run make as if you were in another folder |
| `make NAME=value build` | Override a variable (below) |

## Variables (we will use these soon)

```make
BINARY := linkpulse-api

build:
	go build -o bin/$(BINARY) ./cmd/api
```

- `NAME := value` sets a variable; `$(NAME)` uses it.
- To pass a literal `$` to the shell, write `$$`.

## make on Windows

We installed GNU Make 4.4.1 (the `ezwinports` build) with winget. It runs
recipes with `cmd.exe` unless a Unix shell (`sh.exe`) is on PATH. So
recipes must only use commands that work in both `cmd` and Linux `sh`:
`go`, `gofmt`, `golangci-lint`, `echo`. That is why `help` uses `echo`
rather than the Unix tools `grep` and `awk`. CI runs the same Makefile on
Linux with `/bin/sh`.

## Common errors

| Error | Cause |
| --- | --- |
| `*** missing separator.  Stop.` | A recipe line starts with spaces instead of a TAB. `.editorconfig` makes editors use tabs in Makefiles |
| `No rule to make target 'x'` | Typo, or the target does not exist |
| `make: *** [Makefile:21: vet] Error 1` | A command failed: line 21, target `vet`, exit code 1. Read the output just above it for the real error |
| `'make' is not recognized` | The terminal was opened before make was installed. Open a new one |
