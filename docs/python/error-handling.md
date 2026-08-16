# Explicit Error Handling

**Forbidden:** Bare `except:`, `except Exception:` without re‑raise or logging, `pass` in except without comment.

**Required:** Catch specific exceptions, `try/finally` or `with` for resources, `raise ... from original_exc`, log with context.

## Logging (No `print` in Production)

Use `logging` module. `logger = logging.getLogger(__name__)`. Use `logger.info()`, `.warning()`, `.error()`, `.debug()`.

Use `%`-style positional args in logging calls (`logger.info("User %s logged in", username)`) for lazy formatting. Do not use f‑strings in logging.
