## What

<!-- One or two sentences: what does this PR change? -->

## Why

<!-- The problem it solves, or the phase checklist item it completes. -->

## How to test

<!-- Commands to run, or steps to check it works. -->

## Checklist

- [ ] Layers respected: handler → service → repository; no AWS or vendor SDK imports in `domain/`
- [ ] Unit tests for core logic; integration tests for adapters
- [ ] `make check` passes (fmt, vet, lint, tests with `-race`)
- [ ] No secrets, magic numbers or swallowed errors
- [ ] ADR added for any significant decision
- [ ] README / docs updated
