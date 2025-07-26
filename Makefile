.PHONY: all format lint test tests integration_tests coverage help

all: help

format:
	poetry run ruff format src tests

lint:
	./scripts/check_pydantic.sh . || true
	./scripts/lint_imports.sh || true
	poetry run ruff check src tests

coverage:
	poetry run pytest --cov=anna_agent \
	--cov-report xml \
	--cov-report term-missing:skip-covered tests/unit_tests

test tests:
	poetry run pytest tests/unit_tests

integration_tests:
	poetry run pytest tests/integration_tests

help:
	@echo -- LINTING --
	@echo "format               - run code formatters"
	@echo "lint                 - run linters"
	@echo -- TESTS --
	@echo "coverage             - run unit tests with coverage"
	@echo "test                 - run unit tests"
	@echo "integration_tests    - run integration tests"
