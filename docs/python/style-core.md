# Python Core Style & Toolchain

## Required Toolchain

| Tool        | Purpose                               |
| ----------- | ------------------------------------- |
| `uv`        | Environment management + dependencies |
| `ruff`      | Linting + formatting                  |
| `mypy`      | Static type checking                  |
| `pytest`    | Test runner                           |
| `bandit`    | Security linting                      |
| `safety`    | Dependency vulnerability scanning     |
| `uv-secure` | Project dependency security scanning  |

## Standard Workflow

Ruff linting and formatting apply automatically to edited Python files via a `PostToolUse` hook.

```bash
uv sync                        # Install dependencies
uv run ruff check --fix .      # Lint and auto-fix
uv run ruff format .           # Format code
uv run mypy src/               # Type check (strict)
uv run pytest                  # Run tests
uv run bandit -r src/          # Security analysis
uv run safety check            # Dependency security
uv run uv-secure scan          # Project security scanning
```

## Security Scans

- `safety`: Medium+ severity = blocking. Halt until user confirms.
- `bandit`: HIGH severity or HIGH confidence = blocking. Report others.
- `uv-secure`: Any vulnerability = blocking. Halt until user confirms.

## Naming Conventions (PEP 8)

| Element                       | Convention            |
| ----------------------------- | --------------------- |
| Functions, variables, modules | `snake_case`          |
| Classes, exceptions           | `PascalCase`          |
| Constants                     | `UPPER_CASE`          |
| Private attributes            | `_leading_underscore` |

## Import Organization

1. Standard library
2. Third-party
3. Local application

Blank lines between groups. Absolute imports preferred. Prefer `from module import name` over `import module.name`.

### Detailed example

```python
# Standard library
import os
import sys
from pathlib import Path
from typing import Any

# Third-party
import httpx
from pydantic import BaseModel

# Local application
from app.config import settings
from app.models import User
```

Within each group, alphabetize. ruff's `I` rule enforces this.

`__init__.py` re-exports should be used sparingly — explicit imports are
usually clearer:

```python
# app/__init__.py
from .models import User, Order  # noqa: F401
```

### `__all__` for public API

```python
# app/parsers.py
__all__ = ["parse_yaml", "parse_toml"]

def parse_yaml(...): ...
def parse_toml(...): ...
def _internal_helper(): ...  # private; not in __all__
```

`__all__` documents intent and helps `ruff` enforce unused-export rules.

## Modern Python Basics — Why

| Construct                       | Replaces                      | Why                                          |
| ------------------------------- | ----------------------------- | -------------------------------------------- |
| f-strings                       | `%` / `.format()`             | Faster, more readable, no quoting issues     |
| `pathlib.Path`                  | `os.path`                     | Object-oriented, cross-platform, chainable   |
| `@dataclass`                    | manual `__init__`/`__repr__`  | Less boilerplate, type-checked fields        |
| `@dataclass(frozen=True)`       | mutable value-object classes  | Hashable, immutable                          |
| `match`/`case`                  | long `if/elif` chains         | Destructuring, exhaustiveness checks (3.10+) |
| Walrus `:=`                     | assign-then-test              | Single expression, fewer temp variables      |
| Context managers (`with` block) | `try`/`finally` for resources | Reusable, composable, error-safe             |

## `pathlib` over `os.path`

```python
from pathlib import Path

# Build
config_path = Path(base) / "config" / "settings.toml"

# Read
text = config_path.read_text(encoding="utf-8")
data = config_path.read_bytes()

# Write
config_path.write_text(text, encoding="utf-8")

# Glob
for py_file in Path("src").rglob("*.py"):
    print(py_file)

# Stat
size = config_path.stat().st_size
```

## Project layout

```
project/
  src/
    app/
      __init__.py
      main.py
      routers/
      services/
      models/
  tests/
    conftest.py
    test_main.py
  pyproject.toml
  uv.lock
  README.md
```

The `src/` layout (rather than flat) prevents accidental imports of in-tree
code without `uv sync` — a common debugging time-sink.

## Linting Configuration

Inline in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "ASYNC", "RUF"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # asserts are fine in tests
```

Run with: `uv run ruff check --fix .` and `uv run ruff format .`.

## Dependency Management

Use `uv`. No direct `pip install`. Use `pyproject.toml` and `uv.lock`. Update via `uv lock --upgrade`. Remove unused dependencies.

## CI/CD Integration

Canonical templates in `~/.claude/templates/`:

- `ci-python.yml` — copy to `.github/workflows/ci.yml`
- `pyproject.toml` — copy to project root
- `pre-commit-config.yaml` — copy to project root as `.pre-commit-config.yaml`
- `Dockerfile.python` — rename to `Dockerfile` and adapt ENTRYPOINT

### Pre-commit

Install hooks once per clone:

```bash
uv run pre-commit install
```

Run hooks on all files:

```bash
uv run pre-commit run --all-files
```
