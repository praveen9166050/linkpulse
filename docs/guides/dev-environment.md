# Development environment

Everything installed on the development machine (Windows 11), why it is
there, and the exact commands used.

## Installed tools

| Tool | Version | What it is for | Installed with |
| --- | --- | --- | --- |
| Git | pre-installed | Version control | (already there) |
| GitHub CLI (`gh`) | pre-installed | Create repos, PRs and issues from the terminal | (already there) |
| AWS CLI (`aws`) | pre-installed | Talk to AWS from the terminal | (already there) |
| Node.js | pre-installed | Frontend tooling (Phase 27) | (already there) |
| Python | 3.13.7 | Needed by `pre-commit` | (already there) |
| Go | 1.27.4 | The language LinkPulse is written in | `winget` |
| golangci-lint | 2.15.0 | Runs many Go linters at once | `winget` |
| GNU Make | 4.4.1 | Runs the project's named commands (see [make.md](make.md)) | `winget` |
| pre-commit | 4.7.0 | Runs checks automatically on `git commit` (see [pre-commit.md](pre-commit.md)) | `pip` |
| Docker | — | Containers, LocalStack | Postponed |

Check any tool is installed and see where it lives:

```powershell
go version              # prints the version
Get-Command go          # shows the full path of the go.exe that runs (like `which` on Linux)
```

## winget: the Windows package manager

`winget` is built into Windows 10 and 11. It installs software from a
central catalogue and checks each installer's hash (a fingerprint) so you
know the download was not tampered with. That is the
"Successfully verified installer hash" line you see during an install.

The command used for Go:

```powershell
winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements --silent
```

| Part | Meaning |
| --- | --- |
| `winget install` | Install a package |
| `--id GoLang.Go` | The package's unique ID in the catalogue |
| `-e` | **Exact** match on that ID, so nothing with a similar name is picked |
| `--accept-source-agreements` | Accept the catalogue's terms without a prompt |
| `--accept-package-agreements` | Accept the package's licence without a prompt |
| `--silent` | Run the installer with no windows or questions |

The same pattern installed `GolangCI.golangci-lint` and `ezwinports.make`.

Other useful winget commands:

```powershell
winget search golang            # find a package ID
winget list                     # everything installed
winget upgrade --id GoLang.Go   # update one package
winget upgrade --all            # update everything
```

## pip: the Python package manager

```powershell
python -m pip install --user --quiet pre-commit
```

| Part | Meaning |
| --- | --- |
| `python -m pip` | Run pip as a module of **this** Python, so the package goes to the right Python install even if several exist |
| `install pre-commit` | Download and install the `pre-commit` package |
| `--user` | Install into your own user folder; no admin rights needed |
| `--quiet` | Print less output |

With `--user`, command-line programs land in
`C:\Users\Admin\AppData\Roaming\Python\Python313\Scripts`, which must be on
PATH (it already was).

## PATH: how Windows finds commands

When you type `go`, Windows searches a list of folders, the **PATH**, for
`go.exe`. Installers add their folder to it. There are two parts:

- **Machine PATH:** for all users (needs admin to change).
- **User PATH:** just for you.

A terminal reads PATH once, when it opens. After installing something, **open
a new terminal** or the new command is "not recognised".

To reload PATH inside an already-open PowerShell window:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

This reads the saved Machine and User PATH values and joins them with `;`
(the separator on Windows) into the current window's `$env:Path`.

## The Go toolchain

```powershell
go version          # go version go1.27.4 windows/amd64
go env GOROOT GOPATH GOOS GOARCH
```

| Setting | Value here | Meaning |
| --- | --- | --- |
| `GOROOT` | `C:\Program Files\Go` | Where Go itself lives: compiler, standard library, tools |
| `GOPATH` | `C:\Users\Admin\go` | Cache of downloaded dependencies (`pkg\mod`) and tools you install (`bin`) |
| `GOOS` / `GOARCH` | `windows` / `amd64` | The platform Go builds for by default. Set `GOOS=linux GOARCH=arm64` to build for AWS Lambda from this machine (cross-compiling) |

The commands you will use every day:

| Command | Does |
| --- | --- |
| `go run .` | Compile and run the package in this folder, without keeping a binary |
| `go build ./...` | Compile every package; reports errors |
| `go test ./...` | Run every test |
| `go vet ./...` | Report suspicious code that still compiles |
| `go mod tidy` | Add missing and remove unused dependencies in `go.mod` / `go.sum` |
| `go doc fmt.Println` | Show documentation for anything |

`./...` means "this folder and every folder below it".

## Go modules

A **module** is a project with its own list of dependencies. It is created
once:

```powershell
go mod init github.com/praveen9166050/linkpulse
```

That writes `go.mod`:

```text
module github.com/praveen9166050/linkpulse

go 1.27.4
```

- **`module`** is the module path. It is the prefix of every import inside
  the project (for example `github.com/praveen9166050/linkpulse/internal/link`)
  and, by convention, where the code lives on GitHub.
- **`go`** is the Go version the code is written for.

A module can live in any folder; it does not need to be inside `GOPATH`.

## Not installed yet

- **Docker:** postponed. Needed for LocalStack (Phase 0) and from Phase 5 on.
- **A C compiler (gcc):** needed only for `go test -race` on Windows. CI on
  Linux runs the race detector instead.
