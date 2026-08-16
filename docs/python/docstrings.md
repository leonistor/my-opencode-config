# Google‑Style Docstrings (PEP 257)

All public modules, classes, and functions must have Google‑style docstrings.

**Forbidden**: Missing docstrings on public entities; Sphinx/reST or NumPy style.

**Required:** Triple quotes, `Args:` section, `Returns:` section, `Raises:` section for known exceptions, module‑level and class docstrings.

## Example

```python
def fetch_user(user_id: int) -> dict:
    """Fetches a user profile from the database.

    Args:
        user_id: The unique identifier of the user.

    Returns:
        A dictionary containing the user's profile data.

    Raises:
        ValueError: If user_id is negative.
    """
    ...
```
