.PHONY: help install dev serve format format-fix lint lint-js lint-css test test-ui check clean

help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

install: ## install format/lint/test tooling and the Playwright browser
	npm install
	npx playwright install --with-deps chromium

dev: serve ## alias for serve
serve: ## run the game locally at http://localhost:8000 (no build step, no npm needed)
	python3 -m http.server 8000

format: ## check formatting (no changes)
	npx prettier --check .
format-fix: ## fix formatting
	npx prettier --write .

lint: lint-js lint-css ## lint the inline <script> and <style> in index.html
lint-js:
	npx eslint .
lint-css:
	npx stylelint index.html

test: ## run the Playwright smoke-test suite headlessly
	npx playwright test
test-ui: ## run the Playwright suite in headed/UI mode for debugging
	npx playwright test --ui

check: format lint test ## run everything (format + lint + test)

clean: ## remove installed tooling and test artifacts
	rm -rf node_modules test-results playwright-report
