# Python Testing Standards

Use pytest. AAA pattern. Tests fully independent. No shared mutable state.
Coverage targets: business logic ≥95%, APIs ≥90%, models ≥85%.
All existing tests must pass before you make any changes.

---

## Pre-Change Gate

Existing tests must pass before changes. Document existing failures; do not treat them as regressions.

## Every Task Requires

- [ ] Static checks pass (lint + types)
- [ ] Positive test case (expected behavior)
- [ ] Negative test case (bad/edge input)
- [ ] Regression tests still pass

## Coverage Thresholds (branch coverage)

| Scope          | Minimum Target |
| -------------- | -------------- |
| Business logic | ≥ 95%          |
| APIs           | ≥ 90%          |
| Models         | ≥ 85%          |

These are targets, not hard gates. When below thresholds, note the gap.

## Test Authoring Rules

- Follow **AAA pattern**: Arrange → Act → Assert
- Tests are fully **independent** — no shared mutable state
- No test chaining; no flaky tests; minimize mocking
- Never delete, weaken, or skip a test to make a diff pass — surface the failure instead

## Test Organization

- Place tests in `tests/` directory
- Mirror source structure: `src/module.py` → `tests/test_module.py`
- Use descriptive names: `test_calculate_total_with_discount()`
- Group related tests in classes: `class TestCalculator:`

## Test Patterns

### Basic Unit Test

```python
def test_addition():
    assert Calculator.add(2, 3) == 5
```

### Parametrized Test

```python
@pytest.mark.parametrize("a,b,expected", [
    (2, 3, 5),
    (-1, 1, 0),
])
def test_addition_parametrized(a, b, expected):
    assert Calculator.add(a, b) == expected
```

### Property-Based Test

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert Calculator.add(a, b) == Calculator.add(b, a)
```

### Test with Fixture

```python
@pytest.fixture
def calculator():
    return Calculator()

def test_calculator_initial_state(calculator):
    assert calculator.memory == 0
```

### Error Condition Testing

```python
def test_division_by_zero():
    with pytest.raises(ZeroDivisionError):
        Calculator().divide(5, 0)
```

## Security Testing

- Test SQL injection prevention (parameterized queries)
- Test unauthorized access returns 401/403
- Validate input sanitization
- Test authentication/authorization boundaries

## Commands

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-branch --cov-fail-under=85

# Run specific test file
uv run pytest tests/test_module.py

# Run specific test function
uv run pytest tests/test_module.py::test_function_name

# Show missing coverage lines
uv run pytest --cov=src --cov-report=term-missing

# Run with verbose output
uv run pytest -v

# Generate HTML coverage report
uv run pytest --cov=src --cov-report=html
```

## Best Practices

- **Naming**: `test_` prefix, descriptive names, include expected outcome
- **Structure**: AAA pattern — Arrange, Act, Assert
- **Isolation**: Each test independent, use fixtures, no shared mutable state
- **Documentation**: Docstrings for complex test cases, explain edge case importance
- **Coverage**: Track gaps with `--cov-report=term-missing` and address them
- **Security**: Mock sensors and API clients for integration testing
