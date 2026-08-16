# Python Version Policy

- **Minimum**: Python 3.10+ (`requires-python = ">=3.10"`)
- **Target**: Python 3.12+ for new projects
- **CI matrix**: Test against >=3.10, <=3.13
- **Version pin**: `.python-version` file at project root
- **EOL policy**: Drop support when upstream reaches end‑of‑life

## Version‑Specific Features

| Python | Key features to leverage                                                  |
| ------ | ------------------------------------------------------------------------- |
| 3.10   | `match`/`case`, `X \| Y` union syntax, `TypeGuard`, `kw_only` dataclasses |
| 3.11   | `Self` type, `Never`, `@dataclass(slots=True)`, `asyncio.TaskGroup`       |
| 3.12   | `@override`, `type` statement, `typing.Unpack`, perf improvements         |
| 3.13   | Free‑threaded mode (experimental), JIT compiler, improved `locals()`      |
