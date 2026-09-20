.PHONY: help install build build-watch dev serve dev-down format format-fix lint lint-js lint-css test report check shell clean

PORT ?= 8080
REPORT_PORT ?= 9223
DC_RUN = docker compose run --rm app

help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

install: ## build the tooling image (npm install runs inside it — nothing touches the host)
	docker compose build

build: ## bundle src/ into the single self-contained index.html at the repo root
	$(DC_RUN) node build.js

dev: serve ## alias for serve
serve: ## build, then serve the game at http://localhost:$(PORT), rebuilding on save (fully containerized; override with PORT=...)
	docker compose run --rm -p $(PORT):$(PORT) app sh -c "node build.js && (node build.js --watch & npx http-server . -p $(PORT))"
dev-down: ## stop a `make dev`/`make serve` left running (e.g. in another terminal, or after a crash)
	docker compose kill
	docker compose down --remove-orphans

format: ## check formatting (no changes)
	$(DC_RUN) npx prettier --check .
format-fix: ## fix formatting
	$(DC_RUN) npx prettier --write .

lint: lint-js lint-css ## lint src/ (JS via eslint, CSS via stylelint)
lint-js:
	$(DC_RUN) npx eslint .
lint-css:
	$(DC_RUN) npx stylelint "src/styles/**/*.css"

test: ## run the Playwright smoke-test suite headlessly
	$(DC_RUN) npx playwright test
report: ## serve the last Playwright HTML report at http://localhost:$(REPORT_PORT)
	docker compose run --rm -p $(REPORT_PORT):$(REPORT_PORT) app npx playwright show-report --host 0.0.0.0 --port $(REPORT_PORT)

check: format lint test ## run everything (format + lint + test)

shell: ## open a shell in the tooling container
	$(DC_RUN) bash

clean: ## remove containers, the built image, and volumes (nothing to clean on the host)
	docker compose down --rmi local -v
