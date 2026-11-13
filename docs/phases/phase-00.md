# Phase 0 — Setup (week 1)

<!-- YOUR NOTES. Write in your own words as you go; this file is for you
     (and for interviews). Short answers are fine. -->

## Checklist

- [x] Public GitHub repo `linkpulse` with README and `docs/`
- [ ] Install AWS CLI, Go and Docker — Go and AWS CLI done; Docker postponed
- [ ] Run LocalStack and create a DynamoDB table locally (needs Docker)
- [ ] Linting and pre-commit hooks working (`make check`, `pre-commit run --all-files`)
- [ ] Lab 00: goroutines vs OS threads
- [ ] ADR 0002: monolith first (you write it, from `docs/adr/0000-template.md`)
- [ ] README written in your own words

## Concepts — explain each in 2–3 sentences

### AWS regions and availability zones
<!-- What is a region? An AZ? Why pick one region close to your users? -->

### IAM: users, roles, policies
<!-- What is least privilege? Why should you not use the root account? -->

### The AWS CLI and credentials
<!-- Where does the CLI read credentials from? What is a profile? -->

### Why develop against an emulator first
<!-- Cost, speed, safety. What can an emulator NOT tell you? -->

## CS fundamentals

- **OS:** processes vs threads vs goroutines; the Go scheduler (M:N)
- **Networks:** OSI and TCP/IP layers
- **Databases:** what a DBMS does
- **System design:** how to approach a design interview

<!-- One paragraph each, after the lab. -->

## Engineering standards this phase

Repo structure, linting, formatting, pre-commit hooks, conventional commits.

<!-- What does each linter in .golangci.yml catch? Pick three and explain. -->

## What I learned / what surprised me

<!-- Free-form. -->
