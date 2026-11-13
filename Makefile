# Common commands. Run `make help` to list them.
.DEFAULT_GOAL := help

.PHONY: help fmt vet lint test test-race tidy check

# Plain echo lines so this works on Windows (cmd.exe), Linux and macOS alike.
help: ## List available commands
	@echo Available commands:
	@echo   make fmt        Format all Go code
	@echo   make vet        Run go vet (catches suspicious code)
	@echo   make lint       Run golangci-lint
	@echo   make test       Run all tests
	@echo   make test-race  Run tests with the race detector
	@echo   make tidy       Sync go.mod and go.sum with the code
	@echo   make check      Everything CI will run

fmt: ## Format all Go code
	gofmt -w .

vet: ## Run go vet (catches suspicious code)
	go vet ./...

lint: ## Run golangci-lint
	golangci-lint run

test: ## Run all tests
	go test ./...

# -race needs cgo (a C compiler) on Windows; CI on Linux runs it.
test-race: ## Run tests with the race detector
	go test -race ./...

tidy: ## Sync go.mod and go.sum with the code
	go mod tidy

check: fmt vet lint test ## Everything CI will run (CI adds test-race)
