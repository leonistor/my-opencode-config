# Python Development Rules Index

Modular Python standards. Load individual files or this index for the full structure.

## Tooling

- [Package Management](./tooling/package-management.md) – `uv` workflows, project vs script flow, CI/CD recipes
- [Docker & uv](./tooling/docker-management.md) – Containerizing Python apps with `uv`

## Core

- [Core Style & Toolchain](./python/style-core.md) – `uv`, `ruff`, `mypy`, workflow, naming, imports, modern Python basics
- [Type Hints](./python/typing.md) – `mypy --strict`, protocols, generics, `TypedDict`, type checker selection
- [Docstrings](./python/docstrings.md) – Google‑style docstrings, `Args:`, `Returns:`, `Raises:`

## Safety & Correctness

- [Error Handling](./python/error-handling.md) – specific exceptions, `raise from`, context managers, logging
- [Security](./python/security.md) – secrets, `eval()`, SQL injection, `subprocess`, password hashing
- [Testing](./python/testing.md) – (separate file) AAA pattern, coverage, pytest

## Performance & Concurrency

- [Performance](./python/performance.md) – generators, `itertools`, `functools.lru_cache`, `set`, `heapq`, `str.join`
- [Async](./python/async.md) – `async`/`await`, `gather`, `TaskGroup`, `timeout`, `async with`

## Frameworks & Versioning

- [Framework Specifics](./python/frameworks.md) – FastAPI, Django, Flask
- [Python Version Policy](./python/version.md) – minimum versions, feature tables, EOL policy
