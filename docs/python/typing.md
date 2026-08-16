# Python Type Hints

## Strict Type Hint Rules

**Forbidden:** Missing type hints, `Any` (unless justified), bare `list`/`dict`, mixing `Union[A, B]` and `A | B`.

**Required:** Full signatures, `T | None` for nullable (3.10+, prefer `|`), variable annotations, generic types, `Protocol`, `TypeVar`, `Literal`, `TypedDict`, `Final`, `NoReturn`, `Self` (3.11+), `NotRequired`/`Required` for `TypedDict` (3.11+).

## Type Checker Selection

| Situation                                                             | Use                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| New project, no existing type config                                  | `mypy --strict`                                              |
| Existing project already configured with `mypy`                       | Keep `mypy` — do not migrate mid-project                     |
| `mypy.ini` or `[tool.mypy]` in `pyproject.toml` present               | `mypy`                                                       |
| Using Pydantic v1, Django, SQLAlchemy legacy, Netmiko, NAPALM, NORNIR | Prefer `mypy`                                                |
| Using Pydantic v2, FastAPI, modern stdlib only                        | Either works; `mypy` preferred                               |
| Both configs present                                                  | Follow `pyproject.toml` — do not introduce the other checker |

Never add a second type checker to a project that already has one configured.

`pyright-lsp` (editor) and `mypy` (CI) may disagree. `mypy` output is authoritative for CI and pre-merge verification.

---

## Common Patterns

### `T | None` for nullable

```python
def find_user(user_id: int) -> User | None:
    ...
```

`Optional[User]` is the same type under the hood, but `User | None` is the
modern syntax. ruff rules `UP007` and `UP045` enforce the migration.

### `Literal` for closed sets

```python
from typing import Literal

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR"]

def set_log_level(level: LogLevel) -> None:
    ...
```

### `TypedDict` for structured dicts

```python
from typing import TypedDict, NotRequired

class UserDict(TypedDict):
    id: int
    name: str
    email: NotRequired[str]  # 3.11+
```

Use `TypedDict` when a dict shape is part of the public API. Reach for
`@dataclass` if you need methods or computed default values.

### `Protocol` for structural typing

```python
from typing import Protocol

class SupportsClose(Protocol):
    def close(self) -> None: ...

def cleanup(resource: SupportsClose) -> None:
    resource.close()
```

`Protocol` matches by shape, not inheritance. This is particularly useful
for test doubles — any mock with a `.close()` method satisfies the protocol
without needing to inherit from a base class.

### `Self` (3.11+) for fluent return types

```python
from collections.abc import Callable
from typing import Self

class Query:
    def filter(self, predicate: Callable) -> Self:
        self._predicates.append(predicate)
        return self
```

Without `Self`, the return type would have to be hard-coded as `"Query"`,
which breaks under inheritance. `Self` follows the calling subclass.

### `Final` for constants

```python
from typing import Final

MAX_RETRIES: Final = 3
# mypy errors on: MAX_RETRIES = 4
```

### `TypeVar` for generic functions

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T | None:
    return items[0] if items else None
```

### `@override` (3.12+) for explicit subclass overrides

```python
from typing import override

class MyWidget(Widget):
    @override
    def render(self) -> str:
        return "<my-widget/>"
```

With `mypy --enable-error-code=override`, a `@override`-decorated method that
does not actually override a parent method is an error.

---

## Generics

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None: ...
    def pop(self) -> T: ...
```

Use `TypeVar` constrained to specific types when the generic should only work
with a subset:

```python
from typing import TypeVar

Number = TypeVar("Number", int, float)

def double(value: Number) -> Number:
    return value * 2
```

---

## Common Pitfalls

| Mistake                                     | Correct                                        |
| ------------------------------------------- | ---------------------------------------------- |
| `list[T]` without importing `T`             | `from typing import TypeVar; T = TypeVar("T")` |
| `callable` (lowercase) as annotation        | `from collections.abc import Callable`         |
| `Dict[str, int]`                            | `dict[str, int]` (3.9+)                        |
| Bare `Any` to silence mypy                  | `cast(T, value)` or fix the underlying type    |
| `Optional[X]` and `X \| None` mixed         | Pick one; ruff `UP` rules enforce `X \| None`  |
| Missing `__init__` return annotation        | `def __init__(self) -> None:`                  |
| Ignoring non-`None` default with `Optional` | `X \| None = None` (not `Optional[X] = None`)  |
