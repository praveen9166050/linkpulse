# Common commands. Run `make help` to list them.
.DEFAULT_GOAL := help

.PHONY: help fmt vet lint test test-race tidy check

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

fmt: ## Format all Go code
	gofmt -w .

vet: ## Run go vet (catches suspicious code)
	go vet ./...

lint: ## Run golangci-lint
	golangci-lint run

test: ## Run all tests
	go test ./...

test-race: ## Run tests with the race detector
	go test -race ./...

tidy: ## Sync go.mod and go.sum with the code
	go mod tidy

check: fmt vet lint test-race ## Everything CI will run
