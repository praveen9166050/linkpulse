# Development environment

Everything installed on the development machine (Windows 11), why it is
there, and the exact commands used.

## Installed tools

| Tool | Version | What it is for | Installed with |
| --- | --- | --- | --- |
| Git | pre-installed | Version control | (already there) |
| GitHub CLI (`gh`) | pre-installed | Create repos, PRs and issues from the terminal | (already there) |
| AWS CLI (`aws`) | pre-installed | Talk to AWS from the terminal | (already there) |
| nvm for Windows | 1.2.2 | Install and switch between Node versions | (already there) |
| Node.js | 26.13.1 (LTS) | Runs LinkPulse; ships with npm | `nvm` |
| Python | 3.13.7 | Needed by `pre-commit` | (already there) |
| pre-commit | 4.7.0 | Runs checks automatically on `git commit` (see [pre-commit.md](pre-commit.md)) | `pip` |
| GNU Make | 4.4.1 | Not used by LinkPulse now (see [make.md](make.md)) | `winget` |
| Go, golangci-lint | 1.27.4, 2.15.0 | Not used now; kept for the Phase 24 rewrite (see [ADR 0002](../adr/0002-typescript-on-node.md)) | `winget` |
| Docker | — | Containers, LocalStack | Postponed |

Project tools (TypeScript, ESLint, Prettier, Vitest) are **not** installed
globally. They live in the repo's `node_modules/`, pinned in
`package.json`; see [node-tooling.md](node-tooling.md).

Check any tool is installed and see where it lives:

```powershell
node --version          # prints the version
Get-Command node        # the full path of the node.exe that runs (like `which` on Linux)
```

## nvm: switching Node versions

**nvm** (Node Version Manager) keeps several Node versions side by side and
switches between them. Different projects can need different versions.

```powershell
nvm list                # installed versions; * marks the one in use
nvm install 26.13.1     # download a version (others are untouched)
nvm use 26.13.1         # switch to it   ← run in an ADMIN terminal
nvm root                # where versions are stored
```

How it works: PATH contains `C:\nvm4w\nodejs`, a **link** that points to
one version's folder, such as `C:\Users\Admin\AppData\Local\nvm\v26.13.1`.
`nvm use` deletes the link and recreates it pointing at another version.

**Run `nvm use` in an admin terminal** (right-click PowerShell → Run as
administrator). Creating a symbolic link needs admin rights on Windows. In a
normal terminal, nvm deletes the old link, fails to create the new one, and
`node` stops working everywhere.

If that happens, recreate the link as a **directory junction**, which works
like a folder link and needs no admin rights:

```powershell
New-Item -ItemType Junction -Path C:\nvm4w\nodejs -Target C:\Users\Admin\AppData\Local\nvm\v26.13.1
```

The repo's `.nvmrc` file records the Node version the project expects. CI
reads it to install the same version.

### LTS vs Current

Node ships a new major version every six months. **Even** versions (22, 24,
26) become **LTS** (Long-Term Support) each October and get about three years
of fixes. Odd versions are short-lived. Use the newest LTS for anything real;
AWS Lambda only offers LTS runtimes.

## winget: the Windows package manager

`winget` is built into Windows 10 and 11. It installs software from a
central catalogue and checks each installer's hash (a fingerprint) so you
know the download was not tampered with. That is the
"Successfully verified installer hash" line you see during an install.

```powershell
winget install --id GolangCI.golangci-lint -e --accept-source-agreements --accept-package-agreements --silent
```

| Part | Meaning |
| --- | --- |
| `winget install` | Install a package |
| `--id GolangCI.golangci-lint` | The package's unique ID in the catalogue |
| `-e` | **Exact** match on that ID, so nothing with a similar name is picked |
| `--accept-source-agreements` | Accept the catalogue's terms without a prompt |
| `--accept-package-agreements` | Accept the package's licence without a prompt |
| `--silent` | Run the installer with no windows or questions |

Other useful winget commands:

```powershell
winget search nodejs            # find a package ID
winget list                     # everything installed
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

When you type `node`, Windows searches a list of folders, the **PATH**, for
`node.exe`. Installers add their folder to it. There are two parts:

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

## Not installed yet

- **Docker:** postponed. Needed for LocalStack (Phase 0) and from Phase 5 on.
